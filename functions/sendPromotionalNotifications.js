const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');

// Initialize admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Firestore reference
const db = admin.firestore();

/**
 * Cloud Function that triggers when a new promotional notification is created
 * Sends push notifications only to users who have opted in for promotional offers
 */
exports.sendPromotionalNotifications = functions.firestore
  .document('Notifications/{notificationId}')
  .onCreate(async (snapshot, context) => {
    const notification = snapshot.data();
    
    // Only process if it's a promotional notification
    if (notification.type !== 'promo') {
      console.log('Not a promotional notification, skipping');
      return null;
    }
    
    console.log(`Processing promotional notification: ${notification.title}`);
    
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
      
      // Determine which users to target based on notification settings
      let userQuery = db.collection('Users');
      
      // Targeting specific user segments
      if (notification.target === 'followers') {
        // Query users who follow this shop
        userQuery = userQuery.where(`followedShops.${notification.shopId}`, '==', true);
      } else if (notification.target === 'recent') {
        // Get the date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Get customer IDs who had reservations in last 30 days
        const recentReservationsSnapshot = await db.collection('Reservations')
          .where('shopId', '==', notification.shopId)
          .where('reservationTime', '>=', thirtyDaysAgo)
          .get();
        
        const recentCustomerIds = new Set();
        recentReservationsSnapshot.forEach(doc => {
          const reservation = doc.data();
          if (reservation.userId) {
            recentCustomerIds.add(reservation.userId);
          }
        });
        
        // If we have recent customers, add this to the query
        if (recentCustomerIds.size > 0) {
          userQuery = userQuery.where('id', 'in', Array.from(recentCustomerIds));
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
      
      // Only include users who have opted in for promotional offers
      userQuery = userQuery.where('notificationPreferences.promotionalOffers', '==', true);
      
      // Get eligible users
      const eligibleUsersSnapshot = await userQuery.get();
      console.log(`Found ${eligibleUsersSnapshot.size} eligible users for promotional notification`);
      
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
          shopName: notification.shopName || '',  // Also include shop name in the data
          notificationId: context.params.notificationId,
          type: notification.type,
          timestamp: notification.createdAt ? notification.createdAt.toDate().toISOString() : new Date().toISOString()
        }
      };
      
      // Options for FCM
      const options = {
        priority: 'high',
        timeToLive: 60 * 60 * 24, // 24 hours
        android: {
          notification: {
            icon: 'notification_icon',
            color: '#4a6ee0',
            clickAction: 'OPEN_PROMOTION_DETAILS'
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
          },
          fcmOptions: {
            link: `/promotion?id=${context.params.notificationId}`
          }
        }
      };
      
      // Create a delivery log subcollection in the notification document
      const deliveryLogRef = snapshot.ref.collection('deliveryLog');
      
      // Batch size for FCM is limited to 500 messages
      const tokenBatches = [];
      const userBatch = [];
      const MAX_BATCH_SIZE = 500;
      
      // Prepare user batches with validation
      eligibleUsersSnapshot.forEach(doc => {
        const user = doc.data();
        const userId = doc.id; // Use document ID instead of relying on user.id field
        
        // Skip users without FCM tokens (they can't receive push notifications)
        if (!user.fcmToken) {
          console.log(`User ${userId} has no FCM token, skipping`);
          return;
        }
        
        userBatch.push({
          id: userId, // Use document ID as the user ID
          fcmToken: user.fcmToken,
          email: user.email || 'Unknown',
          name: user.name || 'Unknown'
        });
        
      
        if (userBatch.length === MAX_BATCH_SIZE) {
          tokenBatches.push([...userBatch]);
          userBatch.length = 0; // Clear the array
        }
      });
      
      // Add the remaining users to a batch if any exist
      if (userBatch.length > 0) {
        tokenBatches.push([...userBatch]);
      }
      
      // Process tokens one by one
      for (let i = 0; i < tokenBatches.length; i++) {
        const userBatch = tokenBatches[i];
        console.log(`Processing batch ${i+1}/${tokenBatches.length} with ${userBatch.length} users`);
        
        // Log attempts for this batch
        userBatch.forEach(user => {
          try {
            if (!user.id || typeof user.id !== 'string') {
              console.error('Invalid user ID:', user);
              errorCount++;
              return;
            }
            
            const logEntry = deliveryLogRef.doc(user.id);
            batch.set(logEntry, {
              userId: user.id,
              userName: user.name || 'Unknown',
              userEmail: user.email || 'Unknown',
              deliveryStatus: 'attempted',
              timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
          } catch (error) {
            console.error(`Error creating delivery log for user ${user.id}:`, error);
            errorCount++;
          }
        });
        
        // Commit the batch to record all attempts
        await batch.commit();
        
        // Create a new batch for status updates
        const updateBatch = db.batch();
        
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
              notification: {
                title: notification.title,
                // Include the shop name in the message body
                body: notification.shopName ? `From ${notification.shopName}: ${notification.message}` : notification.message
              },
              data: {
                shopId: notification.shopId || '',
                shopName: notification.shopName || '',  // Also include shop name in the data
                notificationId: context.params.notificationId,
                type: notification.type,
                timestamp: notification.createdAt 
                  ? notification.createdAt.toDate().toISOString() 
                  : new Date().toISOString()
              },
              android: options.android,
              apns: options.apns,
              webpush: options.webpush
            };
            
            // Send the message using the send() method
            const response = await admin.messaging().send(message);
            console.log(`Successfully sent message to ${user.id}:`, response);
            
            // Update the delivery log
            const logEntry = deliveryLogRef.doc(user.id);
            updateBatch.update(logEntry, {
              deliveryStatus: 'delivered',
              deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
              messageId: response
            });
            
            deliveryCount++;
          } catch (error) {
            console.error(`Error sending to user ${user.id}:`, error);
            
            // Log the failure
            const logEntry = deliveryLogRef.doc(user.id);
            updateBatch.update(logEntry, {
              deliveryStatus: 'failed',
              errorMessage: error.message || 'Unknown error'
            });
            
            errorCount++;
          }
        }
        
        // Commit the status updates
        await updateBatch.commit();
        
        // Create a new batch for the next iteration
        batch = db.batch();
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