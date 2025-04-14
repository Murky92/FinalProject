// Firebase Cloud Function to send promotional notifications
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
      const batch = db.batch();
      let deliveryCount = 0;
      let errorCount = 0;
      
      // Determine which users to target based on notification settings
      let userQuery = db.collection('Users');
      
      // Targeting specific user segments
      if (notification.target === 'followers') {
        // Query users who follow this shop
        userQuery = userQuery.where(`followedShops.${notification.shopId}`, '==', true);
      } else if (notification.target === 'recent') {
        // For recent customers, we'd need to check their reservation history
        // This is a simplified version - in production you'd do a more sophisticated query
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
      const message = {
        notification: {
          title: notification.title,
          body: notification.message
        },
        data: {
          shopId: notification.shopId,
          notificationId: context.params.notificationId,
          type: notification.type,
          timestamp: notification.createdAt.toDate().toISOString()
        },
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
            icon: '/images/logo-transparent-png.png',
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
      
      // Prepare user batches
      eligibleUsersSnapshot.forEach(doc => {
        const user = doc.data();
        
        // Only include users with FCM tokens
        if (user.fcmToken) {
          userBatch.push({
            id: user.id,
            fcmToken: user.fcmToken,
            email: user.email,
            name: user.name
          });
          
          // Create new batch when we reach max size
          if (userBatch.length === MAX_BATCH_SIZE) {
            tokenBatches.push([...userBatch]);
            userBatch.length = 0; // Clear the array
          }
        }
      });
      
      // Add the remaining users to a batch if any exist
      if (userBatch.length > 0) {
        tokenBatches.push([...userBatch]);
      }
      
      // Send FCM messages in batches
      for (let i = 0; i < tokenBatches.length; i++) {
        const userBatch = tokenBatches[i];
        const tokens = userBatch.map(user => user.fcmToken);
        
        // Log attempt for all users in this batch
        userBatch.forEach(user => {
          const logEntry = deliveryLogRef.doc(user.id);
          batch.set(logEntry, {
            userId: user.id,
            userName: user.name || 'Unknown',
            userEmail: user.email || 'Unknown',
            deliveryStatus: 'attempted',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
          });
        });
        
        try {
          // Send the batch notification
          const response = await admin.messaging().sendMulticast({
            tokens: tokens,
            ...message
          });
          
          console.log(`Batch ${i+1}/${tokenBatches.length}: ${response.successCount} successful, ${response.failureCount} failed`);
          
          // Update delivery logs with success/failure
          response.responses.forEach((resp, index) => {
            const user = userBatch[index];
            const logEntry = deliveryLogRef.doc(user.id);
            
            if (resp.success) {
              batch.update(logEntry, {
                deliveryStatus: 'delivered',
                deliveredAt: admin.firestore.FieldValue.serverTimestamp()
              });
              deliveryCount++;
            } else {
              batch.update(logEntry, {
                deliveryStatus: 'failed',
                errorMessage: resp.error ? resp.error.message : 'Unknown error'
              });
              errorCount++;
            }
          });
        } catch (error) {
          console.error('Error sending notification batch:', error);
          
          // Mark all as failed in this batch
          userBatch.forEach(user => {
            const logEntry = deliveryLogRef.doc(user.id);
            batch.update(logEntry, {
              deliveryStatus: 'failed',
              errorMessage: error.message || 'Batch sending error'
            });
          });
          
          errorCount += userBatch.length;
        }
      }
      
      // Commit all the delivery log entries
      await batch.commit();
      
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