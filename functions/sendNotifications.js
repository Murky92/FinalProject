const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Firestore reference
const db = admin.firestore();

/**
 * Cloud Function that triggers when a new notification is created
 * Handles different notification types with appropriate targeting
 */
exports.sendNotifications = functions.firestore
  .document('Notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
    
    console.log(`Processing notification of type: ${notification.type} - ${notification.title}`);
    
    try {
      // Update notification with processing status
      await snapshot.ref.update({
        processingStatus: 'processing',
        processingStarted: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Create a batch to update stats
      let batch = db.batch();
      let deliveryCount = 0;
      let errorCount = 0;
      
      // Determine which users to target based on notification type and settings
      let userQuery = db.collection('Users');
      let eligibleUserIds = new Set();
      
      // Apply different targeting logic based on notification type
      switch(notification.type) {
        case 'promo':
          // Promotional notifications require opt-in
          userQuery = userQuery.where('notificationPreferences.promotionalOffers', '==', true);
          break;
        
        case 'update':
          // Shop updates go to all followers or recent customers by default
          // No additional filter needed as these are considered essential communications
          break;
        
        case 'event':
          // Event announcements go to users who have opted in for event notifications
          userQuery = userQuery.where('notificationPreferences.eventAnnouncements', '==', true);
          break;
          
        default:
          console.log(`Unknown notification type: ${notification.type}, treating as update`);
      }
      
      // Apply targeting filters
      if (notification.target === 'followers') {
        // Query users who follow this shop
        userQuery = userQuery.where(`followedShops.${notification.shopId}`, '==', true);
      } else if (notification.target === 'recent') {
        // For recent customers, we need to check their reservation history
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Get customer IDs who had reservations or event bookings in last 30 days
        const [recentReservationsSnapshot, recentEventBookingsSnapshot] = await Promise.all([
          db.collection('Reservations')
            .where('shopId', '==', notification.shopId)
            .where('reservationTime', '>=', thirtyDaysAgo)
            .get(),
          db.collection('EventBookings')
            .where('shopId', '==', notification.shopId)
            .where('eventDate', '>=', thirtyDaysAgo)
            .get()
        ]);
        
        // Collect customer IDs from both reservations and event bookings
        recentReservationsSnapshot.forEach(doc => {
          const reservation = doc.data();
          if (reservation.userId) {
            eligibleUserIds.add(reservation.userId);
          }
        });
        
        recentEventBookingsSnapshot.forEach(doc => {
          const booking = doc.data();
          if (booking.userId) {
            eligibleUserIds.add(booking.userId);
          }
        });
        
        // If we have recent customers, add this to the query
        if (eligibleUserIds.size > 0) {
          // Convert to array for Firestore 'in' query
          // Note: Firestore 'in' query supports up to 10 values, so we'll need to batch if more
          // For simplicity in this implementation, we'll just use the first 10
          const userIdBatch = Array.from(eligibleUserIds).slice(0, 10);
          userQuery = userQuery.where('id', 'in', userIdBatch);
        } else {
          console.log('No recent customers found, notification will not be sent');
          await snapshot.ref.update({
            processingStatus: 'completed',
            processingCompleted: admin.firestore.FieldValue.serverTimestamp(),
            stats: {
              eligibleUsers: 0,
              deliveryAttempted: 0,
              deliverySucceeded: 0,
              deliveryFailed: 0
            }
          });
          return null;
        }
      }
      
      // Get eligible users
      const eligibleUsersSnapshot = await userQuery.get();
      console.log(`Found ${eligibleUsersSnapshot.size} eligible users for ${notification.type} notification`);
      
      // If no eligible users, update notification and exit
      if (eligibleUsersSnapshot.empty) {
        await snapshot.ref.update({
          processingStatus: 'completed',
          processingCompleted: admin.firestore.FieldValue.serverTimestamp(),
          stats: {
            eligibleUsers: 0,
            deliveryAttempted: 0,
            deliverySucceeded: 0,
            deliveryFailed: 0
          }
        });
        return null;
      }
      
      // Create FCM message
      const messagePayload = {
        notification: {
          title: notification.title,
          // Include the shop name in the message body
          body: notification.shopName ? `From ${notification.shopName}: ${notification.message}` : notification.message
        },
        data: {
          shopId: notification.shopId || '',
          shopName: notification.shopName || '',
          notificationId: context.params.notificationId,
          type: notification.type,
          timestamp: notification.createdAt ? notification.createdAt.toDate().toISOString() : new Date().toISOString()
        }
      };
      
      // Customize FCM options based on notification type
      const options = {
        priority: 'high',
        timeToLive: 60 * 60 * 24, // 24 hours
        android: {
          notification: {
            icon: 'notification_icon',
            color: '#4a6ee0'
          }
        },
        apns: {
          payload: {
            aps: {
              badge: 1,
              sound: 'default'
            }
          }
        },
        webpush: {
          notification: {
            icon: '/images/tabletoplogo.png',
            badge: '/images/notification-badge.png'
          }
        }
      };
      
      // Customize click action based on notification type
      switch(notification.type) {
        case 'promo':
          options.android.notification.clickAction = 'OPEN_PROMOTION_DETAILS';
          options.webpush.fcmOptions = { link: `/promotion?id=${context.params.notificationId}` };
          break;
        case 'event':
          options.android.notification.clickAction = 'OPEN_EVENT_DETAILS';
          // If we have an eventId, include it in the link
          if (notification.eventId) {
            options.webpush.fcmOptions = { link: `/event?id=${notification.eventId}` };
            messagePayload.data.eventId = notification.eventId;
          } else {
            options.webpush.fcmOptions = { link: `/shop?id=${notification.shopId}#events` };
          }
          break;
        case 'update':
          options.android.notification.clickAction = 'OPEN_SHOP_DETAILS';
          options.webpush.fcmOptions = { link: `/shop?id=${notification.shopId}` };
          break;
      }
      
      // Create a delivery log subcollection in the notification document
      const deliveryLogRef = snapshot.ref.collection('deliveryLog');
      
      // Batch size for FCM is limited to 500 messages
      const tokenBatches = [];
      const userBatch = [];
      const MAX_BATCH_SIZE = 500;
      
      // Prepare user batches with validation
      eligibleUsersSnapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id; // Use document ID as the user ID
        
        // Skip users without FCM tokens (they can't receive push notifications)
        if (!user.fcmToken) {
          console.log(`User ${userId} has no FCM token, skipping`);
          return;
        }
        
        userBatch.push({
          id: userId,
          fcmToken: user.fcmToken,
          email: user.email || 'Unknown',
          name: user.name || 'Unknown'
        });
        
        // Create new batch when we reach max size
        if (userBatch.length === MAX_BATCH_SIZE) {
          tokenBatches.push([...userBatch]);
          userBatch.length = 0; // Clear the array
        }
      });
      
      // Add the remaining users to a batch if any exist
      if (userBatch.length > 0) {
        tokenBatches.push([...userBatch]);
      }
      
      // Process tokens batch by batch
      for (let i = 0; i < tokenBatches.length; i++) {
        const userBatch = tokenBatches[i];
        console.log(`Processing batch ${i+1}/${tokenBatches.length} with ${userBatch.length} users`);
        
        // Create log entries for this batch
        let batchCount = 0;
        for (const user of userBatch) {
          try {
            if (!user.id || typeof user.id !== 'string') {
              console.error('Invalid user ID:', user);
              errorCount++;
              continue;
            }
            
            const logEntry = deliveryLogRef.doc(user.id);
            batch.set(logEntry, {
              userId: user.id,
              userName: user.name || 'Unknown',
              userEmail: user.email || 'Unknown',
              deliveryStatus: 'attempted',
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
            batchCount++;
            
            // Commit batch every 500 operations to avoid hitting limits
            if (batchCount >= 500) {
              await batch.commit();
              batch = db.batch(); // Create a new batch
              batchCount = 0;
            }
          } catch (error) {
            console.error(`Error creating delivery log for user ${user.id}:`, error);
            errorCount++;
          }
        }
        
        // Commit any remaining operations in the batch
        if (batchCount > 0) {
          await batch.commit();
          batch = db.batch(); // Create a new batch for status updates
        }
        
        // Send notifications individually
        for (const user of userBatch) {
          try {
            // Skip users with no token or invalid ID
            if (!user.fcmToken || !user.id) {
              continue;
            }
            
            // Create a message specifically for this device
            const message = {
              token: user.fcmToken,
              notification: messagePayload.notification,
              data: messagePayload.data,
              android: options.android,
              apns: options.apns,
              webpush: options.webpush
            };
            
            // Send the message
            const response = await admin.messaging().send(message);
            console.log(`Successfully sent message to ${user.id}:`, response);
            
            // Update the delivery log
            const logEntry = deliveryLogRef.doc(user.id);
            batch.update(logEntry, {
              deliveryStatus: 'delivered',
              deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
              messageId: response
            });
            
            deliveryCount++;
            
            // Commit batch every 500 operations
            if (batch._ops && batch._ops.length >= 500) {
              await batch.commit();
              batch = db.batch();
            }
          } catch (error) {
            console.error(`Error sending to user ${user.id}:`, error);
            
            // Log the failure
            try {
              const logEntry = deliveryLogRef.doc(user.id);
              batch.update(logEntry, {
                deliveryStatus: 'failed',
                errorMessage: error.message || 'Unknown error'
              });
              
              errorCount++;
              
              // Commit batch every 500 operations
              if (batch._ops && batch._ops.length >= 500) {
                await batch.commit();
                batch = db.batch();
              }
            } catch (logError) {
              console.error(`Error updating delivery log for user ${user.id}:`, logError);
            }
          }
        }
        
        // Commit any remaining status updates
        if (batch._ops && batch._ops.length > 0) {
          await batch.commit();
          batch = db.batch(); // Create a new batch for the next iteration
        }
      }
      
      // Update the notification with final status
      await snapshot.ref.update({
        processingStatus: 'completed',
        processingCompleted: admin.firestore.FieldValue.serverTimestamp(),
        stats: {
          eligibleUsers: eligibleUsersSnapshot.size,
          deliveryAttempted: deliveryCount + errorCount,
          deliverySucceeded: deliveryCount,
          deliveryFailed: errorCount
        }
      });
      
      console.log(`Notification processed. Delivered to ${deliveryCount} users with ${errorCount} failures.`);
      return { success: true, deliveryCount, errorCount };
    } catch (error) {
      console.error('Error processing notification:', error);
      
      // Update notification with error status
      await snapshot.ref.update({
        processingStatus: 'error',
        processingError: error.message,
        processingCompleted: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { success: false, error: error.message };
    }
  });