/**
 * shop-event-bookings.js
 * Manages event bookings for shops
 */

// Main Event Bookings Manager Object
const EventBookingsManager = {
    // Properties
    shopId: null,
    shopData: null,
    allBookings: [],
    shopEvents: [],
    upcomingBookings: [],
    pastBookings: [],
    currentTab: 'upcoming',
    
    // Initialize the module
    init: function() {
        // Verify shop owner access
        window.shopAuth.verifyShopOwner((user, shopData) => {
            // Store shop ID and data
            this.shopId = shopData.id;
            this.shopData = shopData;
            
            // Load shop events for filters
            this.loadShopEvents();
            
            // Load bookings for this shop
            this.loadAllBookings();
            
            // Set up event listeners
            this.setupEventListeners();
        });
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            const modals = document.getElementsByClassName('modal');
            for (let i = 0; i < modals.length; i++) {
                if (event.target == modals[i]) {
                    modals[i].style.display = "none";
                }
            }
        });
    },
    
    // Switch between tabs
    switchTab: function(tabId) {
        // Store current tab
        this.currentTab = tabId;
        
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show the selected tab
        document.getElementById(tabId + '-content').classList.add('active');
        
        // Add active class to the clicked button
        document.getElementById('tab-' + tabId).classList.add('active');
        
        // Apply filters
        this.applyFilters();
    },
    
    // Load all events for this shop
    loadShopEvents: function() {
        if (!this.shopId) {
            console.error('Shop ID not available');
            return;
        }
        
        // Query events collection
        window.shopAuth.db.collection('Events')
            .where('shopId', '==', this.shopId)
            .get()
            .then((snapshot) => {
                this.shopEvents = [];
                
                snapshot.forEach((doc) => {
                    const event = doc.data();
                    event.id = doc.id;
                    this.shopEvents.push(event);
                });
                
                // Populate event filter dropdowns
                this.populateEventFilters();
            })
            .catch((error) => {
                console.error('Error loading shop events:', error);
                this.showMessage('Error loading events: ' + error.message, 'error');
            });
    },
    
    // Populate event filter dropdowns
    populateEventFilters: function() {
        const upcomingFilter = document.getElementById('event-filter');
        const pastFilter = document.getElementById('past-event-filter');
        
        // Clear existing options except the first one
        while (upcomingFilter.options.length > 1) {
            upcomingFilter.remove(1);
        }
        
        while (pastFilter.options.length > 1) {
            pastFilter.remove(1);
        }
        
        // Add options for each event
        this.shopEvents.forEach((event) => {
            const option1 = document.createElement('option');
            option1.value = event.id;
            option1.textContent = event.eventName || 'Unnamed Event';
            upcomingFilter.appendChild(option1);
            
            const option2 = document.createElement('option');
            option2.value = event.id;
            option2.textContent = event.eventName || 'Unnamed Event';
            pastFilter.appendChild(option2);
        });
    },
    
    // Load all bookings from EventBookings collection
    loadAllBookings: function() {
        if (!this.shopId) {
            console.error('Shop ID not available');
            return;
        }
        
        // Set loading state
        document.getElementById('upcoming-bookings-list').innerHTML = '<div class="loading-message">Loading event bookings...</div>';
        document.getElementById('past-bookings-list').innerHTML = '<div class="loading-message">Loading past event bookings...</div>';
        
        // Query EventBookings collection
        window.shopAuth.db.collection('EventBookings')
            .where('shopId', '==', this.shopId)
            .get()
            .then((snapshot) => {
                this.allBookings = [];
                
                snapshot.forEach((doc) => {
                    const booking = doc.data();
                    booking.id = doc.id;
                    this.allBookings.push(booking);
                });
                
                // Sort and separate bookings into upcoming and past
                this.processBookings();
                
                // Apply filters based on current tab
                this.applyFilters();
            })
            .catch((error) => {
                console.error('Error loading bookings:', error);
                this.showMessage('Error loading bookings: ' + error.message, 'error');
                
                // Show error in lists
                document.getElementById('upcoming-bookings-list').innerHTML = '<div class="error-message">Error loading bookings</div>';
                document.getElementById('past-bookings-list').innerHTML = '<div class="error-message">Error loading bookings</div>';
            });
    },
    
    // Process and sort bookings into upcoming and past
    processBookings: function() {
        const now = new Date();
        
        // Split bookings into upcoming and past
        this.upcomingBookings = [];
        this.pastBookings = [];
        
        this.allBookings.forEach((booking) => {
            let eventDate;
            
            // Handle event date based on data format
            if (booking.eventDate && booking.eventDate.seconds) {
                // If it's a Firestore timestamp
                eventDate = new Date(booking.eventDate.seconds * 1000);
            } else if (booking.eventDate) {
                // If it's already a date string
                eventDate = new Date(booking.eventDate);
            } else {
                // If no date is available, consider it past
                eventDate = new Date(0);
            }
            
            if (eventDate >= now) {
                this.upcomingBookings.push(booking);
            } else {
                this.pastBookings.push(booking);
            }
        });
        
        // Sort upcoming bookings by date (soonest first)
        this.upcomingBookings.sort((a, b) => {
            const dateA = a.eventDate && a.eventDate.seconds ? new Date(a.eventDate.seconds * 1000) : new Date(a.eventDate);
            const dateB = b.eventDate && b.eventDate.seconds ? new Date(b.eventDate.seconds * 1000) : new Date(b.eventDate);
            return dateA - dateB;
        });
        
        // Sort past bookings by date (most recent first)
        this.pastBookings.sort((a, b) => {
            const dateA = a.eventDate && a.eventDate.seconds ? new Date(a.eventDate.seconds * 1000) : new Date(a.eventDate);
            const dateB = b.eventDate && b.eventDate.seconds ? new Date(b.eventDate.seconds * 1000) : new Date(b.eventDate);
            return dateB - dateA;
        });
    },
    
    // Apply filters to bookings
    applyFilters: function() {
        // Determine which tab is active
        const isUpcoming = this.currentTab === 'upcoming';
        const bookings = isUpcoming ? this.upcomingBookings : this.pastBookings;
        
        // Get filter values
        const eventFilter = document.getElementById(isUpcoming ? 'event-filter' : 'past-event-filter').value;
        const statusFilter = document.getElementById(isUpcoming ? 'status-filter' : 'past-status-filter').value;
        
        // Filter bookings
        let filteredBookings = bookings;
        
        if (eventFilter !== 'all') {
            filteredBookings = filteredBookings.filter(booking => booking.eventId === eventFilter);
        }
        
        if (statusFilter !== 'all') {
            filteredBookings = filteredBookings.filter(booking => booking.status === statusFilter);
        }
        
        // Display filtered bookings
        this.displayBookings(filteredBookings, isUpcoming);
    },
    
    // Display filtered bookings
    displayBookings: function(bookings, isUpcoming) {
        const listElement = document.getElementById(isUpcoming ? 'upcoming-bookings-list' : 'past-bookings-list');
        const emptyElement = document.getElementById(isUpcoming ? 'no-upcoming-bookings' : 'no-past-bookings');
        
        // Clear current content
        listElement.innerHTML = '';
        
        // Show empty state if no bookings
        if (bookings.length === 0) {
            emptyElement.classList.remove('hidden');
            return;
        }
        
        // Hide empty state
        emptyElement.classList.add('hidden');
        
        // Create booking cards
        bookings.forEach((booking) => {
            const bookingCard = document.createElement('div');
            bookingCard.className = 'booking-card';
            
            // Format event date
            let formattedDate = 'Unknown Date';
            let bookingDate;
            
            if (booking.eventDate && booking.eventDate.seconds) {
                bookingDate = new Date(booking.eventDate.seconds * 1000);
                formattedDate = bookingDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            } else if (booking.eventDate) {
                bookingDate = new Date(booking.eventDate);
                formattedDate = bookingDate.toLocaleDateString('en-US', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
            
            // Determine status label and class
            let statusLabel = booking.status || 'pending';
            let statusClass = 'status-pending';
            
            switch (statusLabel) {
                case 'confirmed':
                    statusClass = 'status-confirmed';
                    statusLabel = 'Confirmed';
                    break;
                case 'pending':
                    statusClass = 'status-pending';
                    statusLabel = 'Pending';
                    break;
                case 'cancelled':
                    statusClass = 'status-cancelled';
                    statusLabel = 'Cancelled';
                    break;
                case 'completed':
                    statusClass = 'status-completed';
                    statusLabel = 'Completed';
                    break;
            }
            
            // Customer name
            const customerName = booking.customerName || 'Unknown Customer';
            
            // Event name
            const eventName = booking.eventName || 'Unnamed Event';
            
            // Number of participants
            const participants = booking.participants || 1;
            
            // Event time string
            const timeString = booking.eventTimeString || 'Time not specified';
            
            bookingCard.innerHTML = `
                <div class="booking-header">
                    <div>
                        <div class="booking-title">${customerName}</div>
                        <div class="booking-event-name">${eventName}</div>
                        <div class="booking-date">${formattedDate} • ${timeString}</div>
                    </div>
                    <span class="status-label ${statusClass}">${statusLabel}</span>
                </div>
                <div class="booking-details">
                    <div class="detail-item">
                        <div class="detail-label">Customer</div>
                        <div>${customerName}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Contact</div>
                        <div>${booking.customerPhone || booking.customerEmail || 'Not provided'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Participants</div>
                        <div>${participants} ${participants === 1 ? 'person' : 'people'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Booking ID</div>
                        <div>${booking.id ? booking.id.substring(0, 8) : 'Unknown'}</div>
                    </div>
                </div>
                <div class="booking-actions">
                    <button class="primary-btn" onclick="EventBookingsManager.viewBookingDetails('${booking.id}')">View Details</button>
                </div>
            `;
            
            listElement.appendChild(bookingCard);
        });
    },
    
    // View booking details
    viewBookingDetails: function(bookingId) {
        // Find booking
        const booking = this.allBookings.find(b => b.id === bookingId);
        if (!booking) return;
        
        const detailsContent = document.getElementById('booking-details-content');
        const actionsContainer = document.getElementById('booking-action-buttons');
        
        // Format event date
        let formattedDate = 'Unknown Date';
        let bookingDate;
        
        if (booking.eventDate && booking.eventDate.seconds) {
            bookingDate = new Date(booking.eventDate.seconds * 1000);
            formattedDate = bookingDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } else if (booking.eventDate) {
            bookingDate = new Date(booking.eventDate);
            formattedDate = bookingDate.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        }
        
        // Format created at date
        let createdDate = 'Unknown';
        if (booking.createdAt && booking.createdAt.seconds) {
            createdDate = new Date(booking.createdAt.seconds * 1000).toLocaleString();
        } else if (booking.createdAt) {
            createdDate = new Date(booking.createdAt).toLocaleString();
        }
        
        // Determine status label and class
        let statusLabel = booking.status || 'pending';
        let statusClass = 'status-pending';
        
        switch (statusLabel) {
            case 'confirmed':
                statusClass = 'status-confirmed';
                statusLabel = 'Confirmed';
                break;
            case 'pending':
                statusClass = 'status-pending';
                statusLabel = 'Pending';
                break;
            case 'cancelled':
                statusClass = 'status-cancelled';
                statusLabel = 'Cancelled';
                break;
            case 'completed':
                statusClass = 'status-completed';
                statusLabel = 'Completed';
                break;
        }
        
        // Build content
        detailsContent.innerHTML = `
            <div class="booking-header">
                <h3>Booking Details</h3>
                <span class="status-label ${statusClass}">${statusLabel}</span>
            </div>
            
            <div class="section-title">Event Information</div>
            <div class="booking-details" style="margin-top: 10px;">
                <div class="detail-item">
                    <div class="detail-label">Event</div>
                    <div>${booking.eventName || 'Unnamed Event'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div>${formattedDate}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Time</div>
                    <div>${booking.eventTimeString || 'Not specified'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Shop</div>
                    <div>${booking.shopName || 'Unknown Shop'}</div>
                </div>
            </div>
            
            <div class="section-title" style="margin-top: 15px;">Customer Information</div>
            <div class="booking-details" style="margin-top: 10px;">
                <div class="detail-item">
                    <div class="detail-label">Name</div>
                    <div>${booking.customerName || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div>${booking.customerEmail || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone</div>
                    <div>${booking.customerPhone || 'Not provided'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Participants</div>
                    <div>${booking.participants || 1} ${booking.participants === 1 ? 'person' : 'people'}</div>
                </div>
            </div>
            
            <div class="section-title" style="margin-top: 15px;">Booking Information</div>
            <div class="booking-details" style="margin-top: 10px;">
                <div class="detail-item">
                    <div class="detail-label">Booking ID</div>
                    <div>${booking.id ? booking.id.substring(0, 8) + '...' : 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Created At</div>
                    <div>${createdDate}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Created By</div>
                    <div>${booking.createdBy ? (booking.createdBy.includes('@') ? 'Customer' : 'System') : 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Customer Reference</div>
                    <div>${booking.userId ? booking.userId.substring(0, 8) + '...' : 'Not available'}</div>
                </div>
            </div>
        `;
        
        // Add notes if available
        if (booking.notes) {
            detailsContent.innerHTML += `
                <div class="notes-container">
                    <div class="notes-label">Customer Notes:</div>
                    <div>${booking.notes}</div>
                </div>
            `;
        }
        
        // Set action buttons based on status
        actionsContainer.innerHTML = '';
        
        if (booking.status === 'pending') {
            actionsContainer.innerHTML = `
                <button class="primary-btn" onclick="EventBookingsManager.confirmBooking('${booking.id}')">Confirm</button>
                <button class="danger-btn" onclick="EventBookingsManager.cancelBooking('${booking.id}')">Cancel</button>
                <button class="primary-btn" onclick="EventBookingsManager.closeModal('booking-details-modal')">Close</button>
            `;
        } else if (booking.status === 'confirmed') {
            const now = new Date();
            const eventDate = booking.eventDate && booking.eventDate.seconds ? 
                new Date(booking.eventDate.seconds * 1000) : 
                (booking.eventDate ? new Date(booking.eventDate) : new Date(0));
            
            if (eventDate < now) {
                // Event is in the past, allow marking as completed
                actionsContainer.innerHTML = `
                    <button class="success-btn" onclick="EventBookingsManager.completeBooking('${booking.id}')">Mark Completed</button>
                    <button class="danger-btn" onclick="EventBookingsManager.cancelBooking('${booking.id}')">Cancel</button>
                    <button class="primary-btn" onclick="EventBookingsManager.closeModal('booking-details-modal')">Close</button>
                `;
            } else {
                actionsContainer.innerHTML = `
                    <button class="danger-btn" onclick="EventBookingsManager.cancelBooking('${booking.id}')">Cancel</button>
                    <button class="primary-btn" onclick="EventBookingsManager.closeModal('booking-details-modal')">Close</button>
                `;
            }
        } else {
            // For completed or cancelled bookings, just show close button
            actionsContainer.innerHTML = `
                <button class="primary-btn" onclick="EventBookingsManager.closeModal('booking-details-modal')">Close</button>
            `;
        }
        
        // Show modal
        document.getElementById('booking-details-modal').style.display = 'block';
    },
    
    // Confirm a booking
    confirmBooking: function(bookingId) {
        window.shopAuth.db.collection('EventBookings').doc(bookingId).update({
            status: 'confirmed',
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
            confirmedBy: window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid,
        })
        .then(() => {
            this.showMessage('Booking confirmed successfully!', 'success');
            this.closeModal('booking-details-modal');
            this.refreshBookings();
        })
        .catch((error) => {
            console.error('Error confirming booking:', error);
            this.showMessage('Error confirming booking: ' + error.message, 'error');
        });
    },
    
    // Mark booking as completed
    completeBooking: function(bookingId) {
        window.shopAuth.db.collection('EventBookings').doc(bookingId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            completedBy: window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid,
        })
        .then(() => {
            this.showMessage('Booking marked as completed!', 'success');
            this.closeModal('booking-details-modal');
            this.refreshBookings();
        })
        .catch((error) => {
            console.error('Error completing booking:', error);
            this.showMessage('Error completing booking: ' + error.message, 'error');
        });
    },
    
    // Cancel a booking
    cancelBooking: function(bookingId) {
        if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
            return;
        }
        
        window.shopAuth.db.collection('EventBookings').doc(bookingId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
            cancelledBy: window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid,
        })
        .then(() => {
            this.showMessage('Booking cancelled successfully!', 'success');
            this.closeModal('booking-details-modal');
            this.refreshBookings();
        })
        .catch((error) => {
            console.error('Error cancelling booking:', error);
            this.showMessage('Error cancelling booking: ' + error.message, 'error');
        });
    },
    
    // Refresh bookings
    refreshBookings: function() {
        this.loadAllBookings();
        this.showMessage('Refreshing bookings...', 'success');
    },
    
    // Close a modal
    closeModal: function(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },
    
    // Show message
    showMessage: function(message, type) {
        const messageElement = document.getElementById('bookings-message');
        messageElement.textContent = message;
        messageElement.className = type === 'error' ? 'message error-message' : 'message success-message';
        messageElement.classList.remove('hidden');
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000);
    }
};