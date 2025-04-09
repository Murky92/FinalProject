/**
 * shop-notifications.js
 * Manages in-app notifications and customer notification sending
 */

// Notification Manager Object
const NotificationManager = {
    // Properties
    popupTimeout: null,
    
    // Initialize the notifications system
    init: function() {
        // Listen for incoming notifications or system messages
        this.setupListeners();
    },
    
    // Set up notification listeners
    setupListeners: function() {
        // Listen for Firestore updates if needed
        // This could be used for real-time updates from other admins
    },
    
    // Show a notification popup
    showNotification: function(message, type = 'info') {
        const notificationPopup = document.getElementById('notification-popup');
        const notificationMessage = document.getElementById('notification-message');
        
        if (!notificationPopup || !notificationMessage) return;
        
        // Set the message
        notificationMessage.textContent = message;
        
        // Set the type class
        notificationPopup.className = 'notification-popup';
        notificationPopup.classList.add(`notification-${type}`);
        
        // Show the popup
        notificationPopup.classList.add('active');
        
        // Clear any existing timeout
        if (this.popupTimeout) {
            clearTimeout(this.popupTimeout);
        }
        
        // Auto-hide after 5 seconds
        this.popupTimeout = setTimeout(() => {
            this.close();
        }, 5000);
    },
    
    // Close the notification popup
    close: function() {
        const notificationPopup = document.getElementById('notification-popup');
        if (notificationPopup) {
            notificationPopup.classList.remove('active');
        }
        
        // Clear the timeout
        if (this.popupTimeout) {
            clearTimeout(this.popupTimeout);
            this.popupTimeout = null;
        }
    },
    
    // Send a new reservation notification to customer
    sendNewReservationNotification: function(reservationId) {
        // First get the reservation details
        this.getReservationDetails(reservationId, (reservation) => {
            if (!reservation) return;
            
            // Show success message in app
            this.showNotification('Reservation created successfully!', 'success');
            
            // In a real app, you would send an email or SMS to the customer
            // This would typically be handled by a Cloud Function or server-side code
            console.log('Sending new reservation notification to customer:', reservation.customerEmail || reservation.customerPhone);
            
            // For demo purposes, let's just log what would be sent
            this.logCustomerNotification(
                reservation,
                'Reservation Confirmation',
                `Your reservation for ${reservation.partySize} people at our shop has been created. We look forward to seeing you!`
            );
        });
    },
    
    // Send reservation status update to customer
    sendReservationStatusUpdate: function(reservationId, status, reason = '') {
        // First get the reservation details
        this.getReservationDetails(reservationId, (reservation) => {
            if (!reservation) return;
            
            let title = '';
            let message = '';
            
            // Create appropriate message based on status
            switch (status) {
                case 'confirmed':
                    title = 'Reservation Confirmed';
                    message = `Your reservation for ${reservation.partySize} people has been confirmed. We look forward to seeing you!`;
                    break;
                case 'cancelled':
                    title = 'Reservation Cancelled';
                    message = `Your reservation has been cancelled.`;
                    if (reason) message += ` Reason: ${reason}`;
                    break;
            }
            
            // Show success message in app
            this.showNotification(`Reservation ${status} notification sent to customer`, 'success');
            
            // Log the notification for demo purposes
            this.logCustomerNotification(reservation, title, message);
        });
    },
    
    // Get reservation details from Firestore
    getReservationDetails: function(reservationId, callback) {
        window.shopAuth.db.collection('Reservations').doc(reservationId).get()
            .then((doc) => {
                if (doc.exists) {
                    const reservation = doc.data();
                    reservation.id = doc.id;
                    callback(reservation);
                } else {
                    console.error('Reservation not found:', reservationId);
                    callback(null);
                }
            })
            .catch((error) => {
                console.error('Error getting reservation:', error);
                callback(null);
            });
    },
    
    // Log customer notification (for demo purposes)
    logCustomerNotification: function(reservation, title, message) {
        const dateTime = new Date(reservation.reservationTime.seconds * 1000);
        const formattedDate = dateTime.toLocaleDateString();
        const formattedTime = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        console.log('=== CUSTOMER NOTIFICATION ===');
        console.log('To:', reservation.customerName);
        console.log('Email:', reservation.customerEmail || 'N/A');
        console.log('Phone:', reservation.customerPhone || 'N/A');
        console.log('---');
        console.log('Subject:', title);
        console.log('---');
        console.log('Message Body:');
        console.log(`Dear ${reservation.customerName},`);
        console.log('');
        console.log(message);
        console.log('');
        console.log('Reservation Details:');
        console.log(`Date: ${formattedDate}`);
        console.log(`Time: ${formattedTime}`);
        console.log(`Table: ${reservation.tableNumber}`);
        console.log(`Party Size: ${reservation.partySize} people`);
        console.log('');
        console.log('Thank you for choosing our shop!');
        console.log('============================');
    }
};

// Initialize the notification manager when the document is ready
document.addEventListener('DOMContentLoaded', function() {
    NotificationManager.init();
});