/**
 * Data Manager Module
 * Handles data operations with Firebase
 */
const DataManager = {
    // Shop ID retrieved from authentication
    shopId: null,
    
    /**
     * Initialize the data manager with the shop ID
     * @param {string} id - The shop ID
     */
    init: function(id) {
        this.shopId = id;
    },
    
    /**
     * Load all upcoming events for the shop
     * @param {function} callback - Callback function to handle the loaded events
     */
    loadEvents: function(callback) {
        if (!this.shopId) {
            console.error('Shop ID not available');
            return;
        }

        // Get current date
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        // Query Firestore for events
        window.shopAuth.db.collection('Events')
            .where('shopId', '==', this.shopId)
            .where('date', '>=', now)
            .orderBy('date')
            .get()
            .then((querySnapshot) => {
                const events = [];
                querySnapshot.forEach((doc) => {
                    const event = doc.data();
                    event.id = doc.id;
                    events.push(event);
                });
                callback(events);
            })
            .catch((error) => {
                console.error('Error loading events:', error);
                UIManager.showMessage('Error loading events: ' + error.message, 'error');
                callback([]);
            });
    },
    
    /**
     * Get a single event by ID
     * @param {string} eventId - The event ID
     * @returns {Promise} - Promise resolving with the event data
     */
    getEvent: function(eventId) {
        return window.shopAuth.db.collection('Events').doc(eventId).get()
            .then((doc) => {
                if (doc.exists) {
                    const event = doc.data();
                    event.id = doc.id;
                    return event;
                } else {
                    throw new Error('Event not found');
                }
            });
    },
    
    /**
     * Save a new event to the database
     * @param {object} eventData - The event data
     * @returns {Promise} - Promise resolving when save completes
     */
    saveEvent: function(eventData) {
        return window.shopAuth.db.collection('Events').doc().set({
            ...eventData,
            shopId: this.shopId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },
    
    /**
     * Update an existing event
     * @param {string} eventId - The event ID
     * @param {object} eventData - The updated event data
     * @returns {Promise} - Promise resolving when update completes
     */
    updateEvent: function(eventId, eventData) {
        return window.shopAuth.db.collection('Events').doc(eventId).update({
            ...eventData,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    },
    
    /**
     * Delete an event
     * @param {string} eventId - The event ID
     * @returns {Promise} - Promise resolving when delete completes
     */
    deleteEvent: function(eventId) {
        return window.shopAuth.db.collection('Events').doc(eventId).delete();
    },
    
    /**
     * Create a batch for batch operations
     * @returns {FirestoreBatch} - A new Firestore batch
     */
    createBatch: function() {
        return window.shopAuth.db.batch();
    },
    
    /**
     * Get child events of a recurring parent
     * @param {string} parentId - The parent event ID
     * @returns {Promise} - Promise resolving with child events
     */
    getChildEvents: function(parentId) {
        return window.shopAuth.db.collection('Events')
            .where('parentEventId', '==', parentId)
            .get()
            .then((querySnapshot) => {
                const events = [];
                querySnapshot.forEach((doc) => {
                    events.push({
                        id: doc.id,
                        ...doc.data()
                    });
                });
                return events;
            });
    },
    
    /**
     * Send a notification about an event
     * @param {object} notification - The notification data
     * @returns {Promise} - Promise resolving when notification is sent
     */
    sendNotification: function(notification) {
        const shopData = window.shopAuth.getShopData();
        return window.shopAuth.db.collection('Notifications').add({
            ...notification,
            shopId: this.shopId,
            shopName: shopData.storeName || 'Shop',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
};