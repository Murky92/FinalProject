// Shop Notifications Manager
// Handles sending and managing shop notifications

const shopNotificationManager = {
    shopData: null,
    userData: null,
    currentTab: 'compose',
    notificationData: {
        title: '',
        message: '',
        type: 'update',
        target: 'all',
        eventId: null
    },
    
    // Templates for different notification types
    templates: {
        'discount': {
            type: 'promo',
            title: 'Special Discount Today!',
            message: 'Get 15% off all purchases today. Show this notification at checkout to redeem. Valid today only!'
        },
        'flash-sale': {
            type: 'promo',
            title: 'Flash Sale: Today Only!',
            message: 'One-day flash sale happening now! Visit us today for special deals on your favorite games and accessories.'
        },
        'new-event': {
            type: 'event',
            title: 'New Event Announced!',
            message: 'We just added a new event to our calendar. Check our schedule and reserve your spot before it fills up!'
        },
        'tournament': {
            type: 'event',
            title: 'Tournament Reminder',
            message: 'Just a reminder about our upcoming tournament this weekend. Limited spots remain - register now!'
        },
        'tables-available': {
            type: 'availability',
            title: 'Tables Available Now!',
            message: 'We have several gaming tables available right now. Drop in or book online to secure your spot!'
        },
        'weekend-tables': {
            type: 'availability',
            title: 'Weekend Tables Available',
            message: 'Planning your weekend? We have tables available this Saturday and Sunday. Book now to avoid disappointment!'
        },
        'new-games': {
            type: 'update',
            title: 'New Games Just Arrived!',
            message: 'We\'ve just added new games to our collection! Come check them out and be the first to play.'
        },
        'hours-change': {
            type: 'update',
            title: 'Updated Opening Hours',
            message: 'Please note our opening hours have changed. Check our website or app for the new schedule.'
        }
    },
    
    // Initialize with shop data
    initializeShopData: function(user, shopInfo) {
        this.userData = user;
        this.shopData = shopInfo;
        
        // Hide loading message
        document.getElementById('loading-message').style.display = 'none';
        document.getElementById('shop-content').classList.remove('hidden');
        
        // Set shop name in header
        if (shopInfo.storeName) {
            document.getElementById('shop-name-header').textContent = ` - ${shopInfo.storeName}`;
        }
        
        // Show approval banner if needed
        if (!shopInfo.isApproved) {
            document.getElementById('approval-banner').classList.remove('hidden');
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load notification history
        this.loadNotificationHistory();
        
        console.log("Shop notification manager initialized");
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // Form submission
        document.getElementById('notification-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.showConfirmationPopup();
        });
        
        // Character count updates
        document.getElementById('notification-title').addEventListener('input', (e) => {
            document.getElementById('title-length').textContent = e.target.value.length;
        });
        
        document.getElementById('notification-message').addEventListener('input', (e) => {
            document.getElementById('message-length').textContent = e.target.value.length;
        });
        
        // Filter buttons
        document.querySelectorAll('.filter-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-filter');
                this.filterNotifications(filter);
            });
        });
        
        // Notification type change
        document.getElementById('notification-type').addEventListener('change', (e) => {
            // Show/hide event selection for event announcements
            const eventSelection = document.getElementById('event-selection');
            if (e.target.value === 'event') {
                eventSelection.classList.remove('hidden');
            } else {
                eventSelection.classList.add('hidden');
            }
        });
        
        // Event selection change
        if (document.getElementById('event-select')) {
            document.getElementById('event-select').addEventListener('change', (e) => {
                if (!e.target.value) return;
                
                // Store selected event ID
                this.notificationData.eventId = e.target.value;
            });
        }
    },
    
    // Switch between tabs
    switchTab: function(tab) {
        this.currentTab = tab;
        
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`.tab-button[onclick="window.shopNotificationManager.switchTab('${tab}')"]`).classList.add('active');
        
        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tab}-tab`).classList.add('active');
        
        // Refresh notifications when switching to history tab
        if (tab === 'history') {
            this.loadNotificationHistory();
        }
    },
    
    // Show confirmation popup
    showConfirmationPopup: function() {
        // Get form values
        const title = document.getElementById('notification-title').value.trim();
        const message = document.getElementById('notification-message').value.trim();
        const type = document.getElementById('notification-type').value;
        const target = document.querySelector('input[name="target"]:checked').value;
        
        // Store notification data
        this.notificationData = {
            title,
            message,
            type,
            target
        };
        
        // Add event ID if applicable
        if (type === 'event' && document.getElementById('event-select').value) {
            this.notificationData.eventId = document.getElementById('event-select').value;
        }
        
        // Update preview
        document.getElementById('preview-title').textContent = title;
        document.getElementById('preview-message').textContent = message;
        
        // Set recipient text based on target
        let recipientText = '';
        switch(target) {
            case 'all':
                recipientText = 'all customers';
                break;
            case 'followers':
                recipientText = 'followers only';
                break;
            case 'recent':
                recipientText = 'recent customers (last 30 days)';
                break;
        }
        document.getElementById('recipient-count').textContent = recipientText;
        
        // Show popup
        document.getElementById('popup-overlay').style.display = 'flex';
    },
    
    // Close popup
    closePopup: function() {
        document.getElementById('popup-overlay').style.display = 'none';
    },
    
    // Send notification
    sendNotification: function() {
        // Close popup
        this.closePopup();
        
        // Show sending message
        this.showMessage('Sending notification...', 'info');
        
        // Create notification object
        const notification = {
            shopId: this.shopData.id,
            shopName: this.shopData.storeName,
            title: this.notificationData.title,
            message: this.notificationData.message,
            type: this.notificationData.type,
            target: this.notificationData.target,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: this.userData.uid,
            createdByName: this.userData.displayName || this.userData.email,
            processingStatus: 'pending'
        };
        
        // Add event-specific data if applicable
        if (this.notificationData.type === 'event' && this.notificationData.eventId) {
            notification.eventId = this.notificationData.eventId;
        }
        
        // For availability notifications, add subtype
        if (this.notificationData.type === 'availability') {
            notification.subtype = 'availability';
        }
        
        // Add notification to Firestore
        firebase.firestore().collection('Notifications')
            .add(notification)
            .then(docRef => {
                console.log("Notification created with ID: ", docRef.id);
                this.showMessage('Notification sent successfully!', 'success');
                
                // Reset form
                document.getElementById('notification-form').reset();
                document.getElementById('title-length').textContent = '0';
                document.getElementById('message-length').textContent = '0';
                
                // Hide event selection
                document.getElementById('event-selection').classList.add('hidden');
                
                // Refresh notification history
                this.loadNotificationHistory();
            })
            .catch(error => {
                console.error("Error sending notification: ", error);
                this.showMessage('Error sending notification: ' + error.message, 'error');
            });
    },
    
    // Use a notification template
    useTemplate: function(templateId) {
        // Get template
        const template = this.templates[templateId];
        if (!template) return;
        
        // Switch to compose tab
        this.switchTab('compose');
        
        // Set form values
        document.getElementById('notification-type').value = template.type;
        document.getElementById('notification-title').value = template.title;
        document.getElementById('notification-message').value = template.message;
        
        // Update character counts
        document.getElementById('title-length').textContent = template.title.length;
        document.getElementById('message-length').textContent = template.message.length;
        
        // Show/hide event selection based on type
        const eventSelection = document.getElementById('event-selection');
        if (template.type === 'event') {
            eventSelection.classList.remove('hidden');
        } else {
            eventSelection.classList.add('hidden');
        }
        
        // Show success message
        this.showMessage('Template loaded! Customize it for your needs.', 'success');
    },
    
    // Load notification history
    loadNotificationHistory: function() {
        if (!this.shopData || !this.shopData.id) return;
        
        const notificationList = document.getElementById('notification-list');
        notificationList.innerHTML = '<div class="loading-message">Loading notification history...</div>';
        
        firebase.firestore().collection('Notifications')
            .where('shopId', '==', this.shopData.id)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get()
            .then(querySnapshot => {
                // Hide loading message
                document.getElementById('empty-notifications').classList.add('hidden');
                
                if (querySnapshot.empty) {
                    document.getElementById('empty-notifications').classList.remove('hidden');
                    notificationList.innerHTML = '';
                    return;
                }
                
                // Create notification items
                notificationList.innerHTML = '';
                querySnapshot.forEach(doc => {
                    const notification = doc.data();
                    
                    // Format date
                    const date = notification.createdAt ? new Date(notification.createdAt.seconds * 1000) : new Date();
                    const formattedDate = date.toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                    });
                    const formattedTime = date.toLocaleTimeString('en-GB', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    
                    // Format status
                    let statusText = 'Processing';
                    let statusClass = 'status-processing';
                    
                    if (notification.processingStatus === 'completed') {
                        statusText = 'Sent';
                        statusClass = 'status-sent';
                    } else if (notification.processingStatus === 'error') {
                        statusText = 'Failed';
                        statusClass = 'status-failed';
                    }
                    
                    // Format type
                    let typeText = 'Update';
                    let typeClass = 'type-update';
                    
                    if (notification.type === 'promo') {
                        typeText = 'Promotion';
                        typeClass = 'type-promo';
                    } else if (notification.type === 'event') {
                        typeText = 'Event';
                        typeClass = 'type-event';
                    } else if (notification.type === 'availability' || notification.subtype === 'availability') {
                        typeText = 'Availability';
                        typeClass = 'type-availability';
                    }
                    
                    // Format target
                    let targetText = 'All Customers';
                    
                    if (notification.target === 'followers') {
                        targetText = 'Followers Only';
                    } else if (notification.target === 'recent') {
                        targetText = 'Recent Customers';
                    }
                    
                    // Create notification item
                    const notificationItem = document.createElement('div');
                    notificationItem.className = 'notification-item';
                    notificationItem.setAttribute('data-type', notification.type);
                    
                    notificationItem.innerHTML = `
                        <div class="notification-header">
                            <div class="notification-title">${notification.title}</div>
                            <div class="notification-type ${typeClass}">${typeText}</div>
                        </div>
                        <div class="notification-message">${notification.message}</div>
                        <div class="notification-meta">
                            <div class="notification-date">${formattedDate} at ${formattedTime}</div>
                            <div class="notification-status ${statusClass}">${statusText}</div>
                        </div>
                        <div class="notification-details">
                            <div class="detail-item">
                                <span class="detail-label">Sent to:</span>
                                <span class="detail-value">${targetText}</span>
                            </div>
                            ${notification.stats ? `
                            <div class="detail-item">
                                <span class="detail-label">Delivered:</span>
                                <span class="detail-value">${notification.stats.deliverySucceeded || 0} / ${notification.stats.deliveryAttempted || 0}</span>
                            </div>
                            ` : ''}
                            ${notification.eventId ? `
                            <div class="detail-item">
                                <span class="detail-label">Event:</span>
                                <span class="detail-value">${notification.eventName || 'Event #' + notification.eventId.substring(0, 6)}</span>
                            </div>
                            ` : ''}
                        </div>
                    `;
                    
                    notificationList.appendChild(notificationItem);
                });
            })
            .catch(error => {
                console.error("Error loading notifications: ", error);
                notificationList.innerHTML = `
                    <div class="error-message">
                        Error loading notifications: ${error.message}
                    </div>
                `;
            });
    },
    
    // Filter notifications
    filterNotifications: function(filter) {
        // Update filter buttons
        document.querySelectorAll('.filter-button').forEach(button => {
            button.classList.remove('active');
        });
        document.querySelector(`.filter-button[data-filter="${filter}"]`).classList.add('active');
        
        // Filter notification items
        document.querySelectorAll('.notification-item').forEach(item => {
            if (filter === 'all' || item.getAttribute('data-type') === filter) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    },
    
    // Show message
    showMessage: function(message, type) {
        const messageElement = document.getElementById('notifications-message');
        messageElement.textContent = message;
        messageElement.className = 'message ' + type;
        messageElement.classList.remove('hidden');
        
        // Hide after 5 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000);
    }
};

// Expose to window
window.shopNotificationManager = shopNotificationManager;