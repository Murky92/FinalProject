// Table Availability Notification Component
// For notifying users about table availability

const TableAvailabilityNotifier = {
    shopData: null,
    userData: null,
    
    // Initialize with shop data
    initialize: function(userData, shopData) {
        this.userData = userData;
        this.shopData = shopData;
        
        // Add notification button to dashboard if many tables are free
        this.checkTableAvailability();
    },
    
    // Check table availability
    checkTableAvailability: function() {
        if (!this.shopData || !this.shopData.id) return;
        
        const db = firebase.firestore();
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get all active tables
        db.collection('Tables')
            .where('shopId', '==', this.shopData.id)
            .where('isActive', '==', true)
            .get()
            .then(tablesSnapshot => {
                const totalTables = tablesSnapshot.size;
                
                if (totalTables === 0) return;
                
                // Get today's reservations
                const tomorrow = new Date(today);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                db.collection('Reservations')
                    .where('shopId', '==', this.shopData.id)
                    .where('status', 'in', ['pending', 'confirmed'])
                    .where('reservationTime', '>=', today)
                    .where('reservationTime', '<', tomorrow)
                    .get()
                    .then(reservationsSnapshot => {
                        // Count reserved tables
                        const reservedTableIds = new Set();
                        reservationsSnapshot.forEach(doc => {
                            const reservation = doc.data();
                            if (reservation.tableId) {
                                reservedTableIds.add(reservation.tableId);
                            }
                        });
                        
                        const reservedTablesCount = reservedTableIds.size;
                        const availableTablesCount = totalTables - reservedTablesCount;
                        
                        // If many tables are available, show notification button
                        if (availableTablesCount > 0 && availableTablesCount >= totalTables * 0.5) {
                            this.showAvailabilityNotificationButton(availableTablesCount, totalTables);
                        }
                    })
                    .catch(error => {
                        console.error('Error checking reservations:', error);
                    });
            })
            .catch(error => {
                console.error('Error checking tables:', error);
            });
    },
    
    // Show availability notification button
    showAvailabilityNotificationButton: function(availableCount, totalCount) {
        // Add button to shop home page if we're on that page
        const dashboardElement = document.querySelector('.stats-grid');
        if (dashboardElement) {
            // Create notification card
            const notificationCard = document.createElement('div');
            notificationCard.className = 'stat-card availability-card';
            notificationCard.innerHTML = `
                <div class="stat-icon">🔔</div>
                <div class="stat-value">${availableCount}/${totalCount}</div>
                <div class="stat-label">Tables Available Today</div>
                <button class="primary-btn notify-availability-btn">Notify Customers</button>
            `;
            
            // Add to dashboard
            dashboardElement.appendChild(notificationCard);
            
            // Add event listener
            notificationCard.querySelector('.notify-availability-btn').addEventListener('click', () => {
                this.showAvailabilityNotificationModal(availableCount, totalCount);
            });
        }
    },
    
    // Show availability notification modal
    showAvailabilityNotificationModal: function(availableCount, totalCount) {
        // Create modal if it doesn't exist
        if (!document.getElementById('availability-notification-modal')) {
            this.createAvailabilityNotificationModal();
        }
        
        // Set default values
        const currentHour = new Date().getHours();
        let timeframe = 'today';
        
        if (currentHour >= 18) {
            timeframe = 'tonight';
        } else if (currentHour >= 12) {
            timeframe = 'this afternoon';
        } else {
            timeframe = 'today';
        }
        
        document.getElementById('availability-notification-title').value = `Tables Available ${timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}`;
        
        // Create message based on availability
        let message = `We have ${availableCount} gaming tables available ${timeframe}! `;
        
        if (availableCount === totalCount) {
            message += 'All our tables are free and waiting for you.';
        } else {
            message += `Book now to secure your spot.`;
        }
        
        document.getElementById('availability-notification-message').value = message;
        document.getElementById('availability-message-length').textContent = message.length;
        
        // Show modal
        document.getElementById('availability-notification-modal').style.display = 'block';
    },
    
    // Create availability notification modal
    createAvailabilityNotificationModal: function() {
        const modalHtml = `
            <div id="availability-notification-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Send Table Availability Notification</div>
                        <button class="modal-close" onclick="TableAvailabilityNotifier.closeModal()">&times;</button>
                    </div>
                    
                    <form id="availability-notification-form">
                        <div class="form-group">
                            <label for="availability-notification-title">Title*</label>
                            <input type="text" id="availability-notification-title" maxlength="50" required>
                            <div class="message-length"><span id="availability-title-length">0</span>/50</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="availability-notification-message">Message*</label>
                            <textarea id="availability-notification-message" maxlength="200" required></textarea>
                            <div class="message-length"><span id="availability-message-length">0</span>/200</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Target Recipients*</label>
                            <div class="target-options">
                                <label class="checkbox-label">
                                    <input type="radio" name="availability-target" value="all" checked>
                                    All Customers
                                </label>
                                <label class="checkbox-label">
                                    <input type="radio" name="availability-target" value="followers">
                                    Followers Only
                                </label>
                                <label class="checkbox-label">
                                    <input type="radio" name="availability-target" value="recent">
                                    Recent Customers (last 30 days)
                                </label>
                            </div>
                        </div>
                        
                        <div class="modal-buttons">
                            <button type="button" onclick="TableAvailabilityNotifier.closeModal()" class="primary-btn">Cancel</button>
                            <button type="submit" class="success-btn">Send Notification</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        // Append modal to body
        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHtml;
        document.body.appendChild(modalContainer.firstElementChild);
        
        // Add event listeners
        document.getElementById('availability-notification-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendAvailabilityNotification();
        });
        
        document.getElementById('availability-notification-title').addEventListener('input', (e) => {
            document.getElementById('availability-title-length').textContent = e.target.value.length;
        });
        
        document.getElementById('availability-notification-message').addEventListener('input', (e) => {
            document.getElementById('availability-message-length').textContent = e.target.value.length;
        });
    },
    
    // Close modal
    closeModal: function() {
        document.getElementById('availability-notification-modal').style.display = 'none';
    },
    
    // Send availability notification
    sendAvailabilityNotification: function() {
        // Get form values
        const title = document.getElementById('availability-notification-title').value.trim();
        const message = document.getElementById('availability-notification-message').value.trim();
        const target = document.querySelector('input[name="availability-target"]:checked').value;
        
        // Create notification object
        const notification = {
            shopId: this.shopData.id,
            shopName: this.shopData.storeName,
            title: title,
            message: message,
            type: 'update', // Use 'update' type for availability notifications
            subtype: 'availability', // Add subtype for more specific handling
            target: target,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: this.userData.uid,
            createdByName: this.userData.displayName || this.userData.email,
            processingStatus: 'pending'
        };
        
        // Show sending message
        alert('Sending availability notification...');
        
        // Add notification to Firestore
        firebase.firestore().collection('Notifications')
            .add(notification)
            .then(docRef => {
                console.log("Availability notification created with ID: ", docRef.id);
                alert('Notification sent successfully!');
                this.closeModal();
            })
            .catch(error => {
                console.error("Error sending notification: ", error);
                alert('Error sending notification: ' + error.message);
            });
    }
};

// Export the notifier
window.TableAvailabilityNotifier = TableAvailabilityNotifier;