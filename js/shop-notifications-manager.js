// shop-notification-manager.js - Manages shop's outgoing notification system

// Store shop ID and data after verification
let shopId = null;
let shopData = null;
let notificationsCollection = [];
let currentFilter = 'all';

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', function() {
    // Setup event listeners
    setupEventListeners();
    
    // Initialize character counters
    document.getElementById('title-length').textContent = '0';
    document.getElementById('message-length').textContent = '0';
});

// Setup event listeners
function setupEventListeners() {
    // Character counter for title and message
    document.getElementById('notification-title').addEventListener('input', function() {
        document.getElementById('title-length').textContent = this.value.length;
    });
    
    document.getElementById('notification-message').addEventListener('input', function() {
        document.getElementById('message-length').textContent = this.value.length;
    });
    
    // Submit notification form
    document.getElementById('notification-form').addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate form
        const title = document.getElementById('notification-title').value;
        const message = document.getElementById('notification-message').value;
        
        if (!title || !message) {
            showMessage('Please fill out all required fields', 'error');
            return;
        }
        
        // Show popup instead of confirmation modal
        showPopup();
        
        // IMPORTANT: Return false to prevent any default form submission behavior
        return false;
    });
    
    // Ensure the Send Notification button ONLY triggers our popup
    document.querySelector('#notification-form .success-btn').addEventListener('click', function(e) {
        e.preventDefault();
        
        // Get form data and validate
        const title = document.getElementById('notification-title').value;
        const message = document.getElementById('notification-message').value;
        
        if (!title || !message) {
            showMessage('Please fill out all required fields', 'error');
            return;
        }
        
        // Show our popup
        showPopup();
        
        // Prevent any default behavior or event bubbling
        e.stopPropagation();
        return false;
    });
    
    // Set up filter buttons
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.addEventListener('click', function() {
            const filterType = this.getAttribute('data-filter');
            filterNotifications(filterType);
        });
    });
    
    // Close popup when clicking outside
    window.addEventListener('click', function(event) {
        const popup = document.getElementById('popup-overlay');
        if (event.target === popup) {
            closePopup();
        }
    });
}

// Verify shop owner and initialize data
function initializeShopData(user, shopInfo) {
    // Store shop ID and data
    shopId = shopInfo.id;
    shopData = shopInfo;
    
    // Load notifications for this shop
    loadNotifications();
}

// Switch between tabs
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab
    document.getElementById(tabId + '-tab').classList.add('active');
    
    // Add active class to the clicked button
    document.querySelectorAll('.tab-button')[tabId === 'compose' ? 0 : 1].classList.add('active');
    
    // If switching to history tab, refresh the list
    if (tabId === 'history') {
        loadNotifications();
    }
}

// Load notifications from Firestore
function loadNotifications() {
    if (!shopId) {
        console.error('Shop ID not available');
        return;
    }
    
    // Show loading message
    document.getElementById('notification-list').innerHTML = '<div class="loading-message">Loading notification history...</div>';
    
    // Query Firestore for notifications
    window.shopAuth.db.collection('Notifications')
        .where('shopId', '==', shopId)
        .orderBy('createdAt', 'desc')
        .get()
        .then((querySnapshot) => {
            notificationsCollection = [];
            
            querySnapshot.forEach((doc) => {
                const notification = doc.data();
                notification.id = doc.id;
                notificationsCollection.push(notification);
            });
            
            // Display notifications based on current filter
            filterNotifications(currentFilter);
        })
        .catch((error) => {
            console.error('Error loading notifications:', error);
            document.getElementById('notification-list').innerHTML = `
                <div class="error-message">
                    Error loading notifications: ${error.message}
                </div>
            `;
        });
}

// Filter notifications by type
function filterNotifications(filterType) {
    currentFilter = filterType;
    
    // Update active filter button
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-button[data-filter="${filterType}"]`).classList.add('active');
    
    // Apply filter
    let filteredNotifications = notificationsCollection;
    if (filterType !== 'all') {
        filteredNotifications = notificationsCollection.filter(n => n.type === filterType);
    }
    
    // Display notifications
    displayNotifications(filteredNotifications);
}

// Display notifications in the list
function displayNotifications(notifications) {
    const notificationList = document.getElementById('notification-list');
    const emptyState = document.getElementById('empty-notifications');
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    let notificationsHtml = '';
    
    notifications.forEach((notification) => {
        // Format date
        const createdAt = notification.createdAt ? new Date(notification.createdAt.seconds * 1000) : new Date();
        const formattedDate = createdAt.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Get icon based on type
        let iconClass = 'icon-update';
        let typeLabel = 'Update';
        
        if (notification.type === 'promo') {
            iconClass = 'icon-promo';
            typeLabel = 'Promo';
        } else if (notification.type === 'event') {
            iconClass = 'icon-event';
            typeLabel = 'Event';
        }
        
        // Format recipients
        let recipientsText = 'All Customers';
        if (notification.target === 'followers') {
            recipientsText = 'Followers Only';
        } else if (notification.target === 'recent') {
            recipientsText = 'Recent Customers';
        }
        
        // Add delivery status
        let statusHtml = '';
        if (notification.processingStatus) {
            let statusClass = '';
            let statusText = '';
            
            switch (notification.processingStatus) {
                case 'pending':
                    statusClass = 'status-pending';
                    statusText = 'Pending';
                    break;
                case 'processing':
                    statusClass = 'status-pending';
                    statusText = 'Processing';
                    break;
                case 'completed':
                    if (notification.stats && notification.stats.deliverySucceeded > 0) {
                        statusClass = 'status-confirmed';
                        statusText = `Delivered to ${notification.stats.deliverySucceeded} users`;
                    } else {
                        statusClass = 'status-warning';
                        statusText = 'No deliveries';
                    }
                    break;
                case 'error':
                    statusClass = 'status-cancelled';
                    statusText = 'Error';
                    break;
            }
            
            if (statusText) {
                statusHtml = `<span class="status-label ${statusClass}" style="margin-left: 10px;">${statusText}</span>`;
            }
        }
        
        // Create notification card
        notificationsHtml += `
            <div class="notification-card">
                <div class="notification-header">
                    <div class="notification-title">
                        <span class="notification-type-icon ${iconClass}">${typeLabel[0]}</span>
                        ${notification.title} ${statusHtml}
                    </div>
                    <div class="notification-date">${formattedDate}</div>
                </div>
                <div class="notification-content">${notification.message}</div>
                <div class="notification-stats">
                    <span class="recipients-chip">${recipientsText}</span>
                    ${notification.stats ? `
                        <span class="notification-delivery-stats">
                            <strong>Eligible:</strong> ${notification.stats.eligibleUsers || 0} • 
                            <strong>Delivered:</strong> ${notification.stats.deliverySucceeded || 0} • 
                            <strong>Failed:</strong> ${notification.stats.deliveryFailed || 0}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    notificationList.innerHTML = notificationsHtml;
}

// Show popup
function showPopup() {
    const title = document.getElementById('notification-title').value;
    const message = document.getElementById('notification-message').value;
    const target = document.querySelector('input[name="target"]:checked').value;
    
    // Set preview content
    document.getElementById('preview-title').textContent = title;
    
    // Include shop name in the preview message
    const storeNameDisplay = shopData && shopData.storeName ? `From ${shopData.storeName}: ` : '';
    document.getElementById('preview-message').textContent = `${storeNameDisplay}${message}`;
    
    // Set recipient text
    let recipientText = getTargetDescription(target);
    document.getElementById('recipient-count').textContent = recipientText;
    
    // Show popup
    document.getElementById('popup-overlay').style.display = 'flex';
}

// Helper function to get a human-readable description of the target audience
function getTargetDescription(target) {
    switch(target) {
        case 'followers':
            return 'followers';
        case 'recent':
            return 'recent customers';
        default:
            return 'all customers';
    }
}

// Close popup with button reset
function closePopup() {
    // Hide the popup
    document.getElementById('popup-overlay').style.display = 'none';
    
    // Reset the button state
    const sendButton = document.querySelector('#popup-overlay .success-btn');
    if (sendButton) {
        sendButton.disabled = false;
        sendButton.textContent = 'Send Notification';
    }
}

// Send notification - ENHANCED VERSION
function sendNotification() {
    if (!shopId) {
        console.error('Shop ID not available');
        showMessage('Shop ID not available', 'error');
        return;
    }
    
    const type = document.getElementById('notification-type').value;
    const title = document.getElementById('notification-title').value;
    const message = document.getElementById('notification-message').value;
    const target = document.querySelector('input[name="target"]:checked').value;
    
    // Show sending indicator
    const sendButton = document.querySelector('#popup-overlay .success-btn');
    const originalText = sendButton.textContent || 'Send Notification';
    sendButton.disabled = true;
    sendButton.textContent = 'Sending...';
    
    // Create notification data
    const notificationData = {
        shopId: shopId,
        shopName: shopData.storeName || 'Shop',
        type: type,
        title: title,
        message: message,
        target: target,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdBy: window.shopAuth.auth.currentUser ? 
            (window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid) : 
            'Unknown',
        processingStatus: 'pending'
    };
    
    // Add this to override any default confirmation dialog
    window.onbeforeunload = null;
    
    // Set a timeout to ensure button is reset even if Firebase fails
    const resetTimeout = setTimeout(() => {
        sendButton.disabled = false;
        sendButton.textContent = originalText;
    }, 10000); // 10 second safeguard
    
    // Save to Firestore
    window.shopAuth.db.collection('Notifications')
        .add(notificationData)
        .then((docRef) => {
            // Clear the safety timeout
            clearTimeout(resetTimeout);
            
            // Show success message with enhanced details
            showMessage(`Notification created and queued for delivery to ${getTargetDescription(target)}!`, 'success');
            
            // Reset form and close popup
            document.getElementById('notification-form').reset();
            document.getElementById('title-length').textContent = '0';
            document.getElementById('message-length').textContent = '0';
            
            // Reset button state BEFORE closing popup
            sendButton.disabled = false;
            sendButton.textContent = originalText;
            
            // Close the popup
            closePopup();
            
            // Set up a listener to monitor this notification's status
            monitorNotificationStatus(docRef.id);
            
            // Switch to history tab
            switchTab('history');
        })
        .catch((error) => {
            // Clear the safety timeout
            clearTimeout(resetTimeout);
            
            console.error('Error sending notification:', error);
            showMessage('Error sending notification: ' + error.message, 'error');
            
            // Reset button state BEFORE closing popup
            sendButton.disabled = false;
            sendButton.textContent = originalText;
            
            // Close popup
            closePopup();
        });
}

// This function monitors a notification's status after creation
function monitorNotificationStatus(notificationId) {
    // Set up a listener with a timeout
    const maxWaitTime = 60000; // 1 minute
    const startTime = Date.now();
    
    const unsubscribe = window.shopAuth.db.collection('Notifications').doc(notificationId)
        .onSnapshot((doc) => {
            const notification = doc.data();
            
            // Check if processing is complete or if we've waited too long
            if (notification.processingStatus === 'completed' || 
                notification.processingStatus === 'error' ||
                (Date.now() - startTime > maxWaitTime)) {
                
                // Unsubscribe from updates
                unsubscribe();
                
                // Show appropriate message based on status
                if (notification.processingStatus === 'completed') {
                    const stats = notification.stats || {};
                    const successCount = stats.deliverySucceeded || 0;
                    const totalCount = stats.eligibleUsers || 0;
                    
                    if (totalCount === 0) {
                        showMessage(`No eligible users found for this notification. Check that users have opted in.`, 'warning');
                    } else {
                        showMessage(`Notification delivered to ${successCount} of ${totalCount} eligible users!`, 'success');
                    }
                } else if (notification.processingStatus === 'error') {
                    showMessage(`Error delivering notification: ${notification.processingError}`, 'error');
                } else if (Date.now() - startTime > maxWaitTime) {
                    showMessage(`Notification is processing. Check the history tab for final status.`, 'info');
                }
            }
        }, (error) => {
            console.error("Error monitoring notification:", error);
            unsubscribe();
        });
}

// Show message in the UI
function showMessage(message, type) {
    const messageElement = document.getElementById('notifications-message');
    messageElement.textContent = message;
    messageElement.className = 'message ' + (type === 'error' ? 'error-message' : 'success-message');
    messageElement.classList.remove('hidden');
    
    // Hide message after 5 seconds
    setTimeout(() => {
        messageElement.classList.add('hidden');
    }, 5000);
}

// Export functions that need to be accessed globally
window.shopNotificationManager = {
    initializeShopData,
    switchTab,
    showPopup,
    closePopup,
    sendNotification,
    filterNotifications
};