// Event Notification Component
// To be included in shop-events.js or main.js

const EventNotificationManager = {
    shopData: null,
    userData: null,
    selectedEvent: null,
    
    // Initialize with shop data and user data
    initialize: function(userData, shopData) {
        this.userData = userData;
        this.shopData = shopData;
        
        // Add event listeners for notification buttons
        this.setupEventListeners();
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // This would be called after events are loaded in the UI
        document.querySelectorAll('.notify-event-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.getAttribute('data-event-id');
                this.showNotificationModal(eventId);
            });
        });
    },
    
    // Show notification modal for event
    showNotificationModal: function(eventId) {
        // Fetch event data
        firebase.firestore().collection('Events')
            .doc(eventId)
            .get()
            .then(doc => {
                if (doc.exists) {
                    this.selectedEvent = doc.data();
                    this.selectedEvent.id = doc.id;
                    
                    // Show modal
                    this.openEventNotificationModal();
                } else {
                    console.error('Event not found');
                    alert('Event not found');
                }
            })
            .catch(error => {
                console.error('Error fetching event:', error);
                alert('Error fetching event details');
            });
    },
    
    // Open event notification modal
    openEventNotificationModal: function() {
        // Create modal if it doesn't exist
        if (!document.getElementById('event-notification-modal')) {
            this.createEventNotificationModal();
        }
        
        // Set event details in modal
        document.getElementById('event-notification-title').value = `Join us for: ${this.selectedEvent.title || this.selectedEvent.name}`;
        
        // Create a default message based on event details
        const eventDate = this.selectedEvent.date ? new Date(this.selectedEvent.date.seconds * 1000) : new Date();
        const formattedDate = eventDate.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long'
        });
        
        const formattedTime = this.selectedEvent.startTime || '18:00';
        
        let defaultMessage = `We're hosting ${this.selectedEvent.title || this.selectedEvent.name} on ${formattedDate} at ${formattedTime}. `;
        
        if (this.selectedEvent.description && this.selectedEvent.description.length > 100) {
            defaultMessage += "Don't miss out!";
        } else if (this.selectedEvent.description) {
            defaultMessage += this.selectedEvent.description;
        } else {
            defaultMessage += "We hope to see you there!";
        }
        
        // Truncate if too long
        if (defaultMessage.length > 200) {
            defaultMessage = defaultMessage.substring(0, 197) + '...';
        }
        
        document.getElementById('event-notification-message').value = defaultMessage;
        document.getElementById('event-message-length').textContent = defaultMessage.length;
        
        // Show modal
        document.getElementById('event-notification-modal').style.display = 'block';
    },
    
    // Create event notification modal if it doesn't exist
    createEventNotificationModal: function() {
        const modalHtml = `
            <div id="event-notification-modal" class="modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <div class="modal-title">Send Event Notification</div>
                        <button class="modal-close" onclick="EventNotificationManager.closeModal()">&times;</button>
                    </div>
                    
                    <form id="event-notification-form">
                        <div class="form-group">
                            <label for="event-notification-title">Title*</label>
                            <input type="text" id="event-notification-title" maxlength="50" required>
                            <div class="message-length"><span id="event-title-length">0</span>/50</div>
                        </div>
                        
                        <div class="form-group">
                            <label for="event-notification-message">Message*</label>
                            <textarea id="event-notification-message" maxlength="200" required></textarea>
                            <div class="message-length"><span id="event-message-length">0</span>/200</div>
                        </div>
                        
                        <div class="form-group">
                            <label>Target Recipients*</label>
                            <div class="target-options">
                                <label class="checkbox-label">
                                    <input type="radio" name="event-target" value="all" checked>
                                    All Customers
                                </label>
                                <label class="checkbox-label">
                                    <input type="radio" name="event-target" value="followers">
                                    Followers Only
                                </label>
                                <label class="checkbox-label">
                                    <input type="radio" name="event-target" value="recent">
                                    Recent Customers (last 30 days)
                                </label>
                            </div>
                        </div>
                        
                        <div class="modal-buttons">
                            <button type="button" onclick="EventNotificationManager.closeModal()" class="primary-btn">Cancel</button>
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
        document.getElementById('event-notification-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.sendEventNotification();
        });
        
        document.getElementById('event-notification-title').addEventListener('input', (e) => {
            document.getElementById('event-title-length').textContent = e.target.value.length;
        });
        
        document.getElementById('event-notification-message').addEventListener('input', (e) => {
            document.getElementById('event-message-length').textContent = e.target.value.length;
        });
    },
    
    // Close modal
    closeModal: function() {
        document.getElementById('event-notification-modal').style.display = 'none';
    },
    
    // Send event notification
    sendEventNotification: function() {
        // Get form values
        const title = document.getElementById('event-notification-title').value.trim();
        const message = document.getElementById('event-notification-message').value.trim();
        const target = document.querySelector('input[name="event-target"]:checked').value;
        
        // Create notification object
        const notification = {
            shopId: this.shopData.id,
            shopName: this.shopData.storeName,
            title: title,
            message: message,
            type: 'event',
            target: target,
            eventId: this.selectedEvent.id,
            eventName: this.selectedEvent.title || this.selectedEvent.name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdBy: this.userData.uid,
            createdByName: this.userData.displayName || this.userData.email,
            processingStatus: 'pending'
        };
        
        // Show sending message
        alert('Sending notification...');
        
        // Add notification to Firestore
        firebase.firestore().collection('Notifications')
            .add(notification)
            .then(docRef => {
                console.log("Event notification created with ID: ", docRef.id);
                alert('Notification sent successfully!');
                this.closeModal();
            })
            .catch(error => {
                console.error("Error sending notification: ", error);
                alert('Error sending notification: ' + error.message);
            });
    },
    
    // Add notification button to event card
    addNotificationButtonToEvent: function(eventElement, eventId) {
        if (!eventElement) return;
        
        // Check if button already exists
        if (eventElement.querySelector('.notify-event-btn')) return;
        
        // Create button
        const button = document.createElement('button');
        button.className = 'notify-event-btn';
        button.setAttribute('data-event-id', eventId);
        button.innerHTML = '<i class="notification-icon">📣</i> Notify';
        button.title = 'Send notification about this event';
        
        // Add button to event actions
        const actionsDiv = eventElement.querySelector('.event-actions');
        if (actionsDiv) {
            actionsDiv.appendChild(button);
            
            // Add event listener
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.showNotificationModal(eventId);
            });
        }
    }
};

// Export the manager
window.EventNotificationManager = EventNotificationManager;