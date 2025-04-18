/**
 * functions/shop-reservations-list.js
 * Manages the list view of shop reservations and common reservation functionality
 */

// Main Reservations Manager Object
const ReservationsManager = {
    // Properties
    shopId: null,
    shopData: null,
    shopTables: [],
    allReservations: [],
    selectedDate: new Date(),
    currentFilter: 'all',
    
    // Initialize the module
    init: function() {
        // Verify shop owner access
        window.shopAuth.verifyShopOwner((user, shopData) => {
            // Store shop ID and data
            this.shopId = shopData.id;
            this.shopData = shopData;
            
            // Initialize date to today
            this.updateDateDisplay();
            
            // Set date picker to today
            document.getElementById('date-picker').valueAsDate = this.selectedDate;
            
            // Load tables for this shop
            this.loadTables();
            
            // Load reservations for today
            this.loadReservations(this.selectedDate);
            
            // Set up form event listeners
            this.setupEventListeners();
            
            // Initialize calendar view if needed
            if (typeof CalendarView !== 'undefined') {
                CalendarView.init(this.shopId);
            }
        });
    },
    
    // Set up event listeners
    setupEventListeners: function() {
        // Reservation form submission
        document.getElementById('reservation-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReservation();
        });
        
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
        
        // If switching to calendar view, refresh it
        if (tabId === 'calendar' && typeof CalendarView !== 'undefined') {
            CalendarView.refreshCalendar();
        }
    },
    
    // Load tables for this shop
    loadTables: function() {
        if (!this.shopId) {
            console.error('Shop ID not available');
            return;
        }
        
        // Query ALL tables for this shop
        window.shopAuth.db.collection('Tables')
            .where('shopId', '==', this.shopId)
            .get()
            .then((querySnapshot) => {
                this.shopTables = [];
                
                querySnapshot.forEach((doc) => {
                    const table = doc.data();
                    table.id = doc.id;
                    this.shopTables.push(table);
                });
                
                // Sort tables by name
                this.shopTables.sort((a, b) => {
                    // Get display names for sorting
                    const nameA = a.tableName || (a.tableNumber ? `Table ${a.tableNumber}` : 'Unnamed Table');
                    const nameB = b.tableName || (b.tableNumber ? `Table ${b.tableNumber}` : 'Unnamed Table');
                    return nameA.localeCompare(nameB);
                });
                
                // Populate table select in add reservation modal
                this.populateTableSelect();
            })
            .catch((error) => {
                console.error('Error loading tables:', error);
                this.showMessage('Error loading tables: ' + error.message, 'error');
            });
    },
    
    // Populate the table select dropdown
    populateTableSelect: function() {
        const tableSelect = document.getElementById('reservation-table');
        if (!tableSelect) return;
        
        tableSelect.innerHTML = '<option value="">Select a table</option>';
        
        // Only include active tables in the dropdown
        const activeTables = this.shopTables.filter(table => table.isActive !== false);
        
        if (activeTables.length === 0) {
            tableSelect.innerHTML += '<option value="" disabled>No active tables available</option>';
        } else {
            activeTables.forEach(table => {
                const option = document.createElement('option');
                option.value = table.id;
                
                // Get table display name (support both naming methods)
                const displayName = table.tableName || (table.tableNumber ? `Table ${table.tableNumber}` : 'Unnamed Table');
                
                option.textContent = `${displayName} (Capacity: ${table.capacity})`;
                tableSelect.appendChild(option);
            });
        }
        
        // Add listeners to check availability when table, date, time or duration changes
        tableSelect.addEventListener('change', this.checkTableAvailability.bind(this));
        document.getElementById('reservation-date').addEventListener('change', this.checkTableAvailability.bind(this));
        document.getElementById('reservation-time').addEventListener('change', this.checkTableAvailability.bind(this));
        document.getElementById('reservation-duration').addEventListener('change', this.checkTableAvailability.bind(this));
    },
    
    // Load reservations for a specific date
    loadReservations: function(date) {
        if (!this.shopId) {
            console.error('Shop ID not available');
            return;
        }
        
        // Set date range for the selected day (midnight to midnight)
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        
        // Update displayed date
        this.selectedDate = date;
        this.updateDateDisplay();
        
        // Show loading state
        document.getElementById('reservations-list').innerHTML = '<div class="loading-reservations">Loading reservations...</div>';
        document.getElementById('empty-state').classList.add('hidden');
        
        // Query Firestore for reservations
        window.shopAuth.db.collection('Reservations')
            .where('shopId', '==', this.shopId)
            .where('reservationTime', '>=', startOfDay)
            .where('reservationTime', '<=', endOfDay)
            .orderBy('reservationTime')
            .get()
            .then((querySnapshot) => {
                this.allReservations = [];
                
                querySnapshot.forEach((doc) => {
                    const reservation = doc.data();
                    reservation.id = doc.id;
                    this.allReservations.push(reservation);
                });
                
                // Display filtered reservations
                this.displayReservations(this.allReservations);
                
                // Update calendar if in that view
                if (typeof CalendarView !== 'undefined') {
                    CalendarView.updateSelectedDayReservations(date);
                }
            })
            .catch((error) => {
                console.error('Error fetching reservations:', error);
                document.getElementById('reservations-list').innerHTML = `
                    <div class="error-message">
                        Error loading reservations: ${error.message}
                    </div>
                `;
            });
    },
    
    // Display reservations after filtering
    displayReservations: function(reservations) {
        const reservationsList = document.getElementById('reservations-list');
        reservationsList.innerHTML = '';
        
        // Filter by status if not 'all'
        let filteredReservations = reservations;
        if (this.currentFilter !== 'all') {
            filteredReservations = reservations.filter(r => r.status === this.currentFilter);
        }
        
        // Show empty state if no reservations
        if (filteredReservations.length === 0) {
            document.getElementById('empty-state').classList.remove('hidden');
            return;
        }
        
        document.getElementById('empty-state').classList.add('hidden');
        
        // Create reservation items
        filteredReservations.forEach((reservation) => {
            const reservationItem = document.createElement('div');
            reservationItem.className = 'reservation-item';
            
            // Format reservation time
            const reservationTime = reservation.reservationTime ? new Date(reservation.reservationTime.seconds * 1000) : new Date();
            const formattedTime = reservationTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            
            // Find table details
            let tableDetails = 'Unknown Table';
            if (reservation.tableId) {
                const table = this.shopTables.find(t => t.id === reservation.tableId);
                if (table) {
                    // Use tableName if available, fall back to tableNumber
                    tableDetails = table.tableName || (table.tableNumber ? `Table ${table.tableNumber}` : 'Unnamed Table');
                } else if (reservation.tableName) {
                    tableDetails = reservation.tableName;
                } else if (reservation.tableNumber) {
                    tableDetails = `Table ${reservation.tableNumber}`;
                }
            }
            
            // Determine status label and class
            let statusLabel = 'Unknown';
            let statusClass = '';
            
            switch (reservation.status) {
                case 'pending':
                    statusLabel = 'Pending';
                    statusClass = 'status-pending';
                    break;
                case 'confirmed':
                    statusLabel = 'Confirmed';
                    statusClass = 'status-confirmed';
                    break;
                case 'completed':
                    statusLabel = 'Completed';
                    statusClass = 'status-completed';
                    break;
                case 'cancelled':
                    statusLabel = 'Cancelled';
                    statusClass = 'status-cancelled';
                    break;
            }
            
            reservationItem.innerHTML = `
                <div class="reservation-header">
                    <div class="reservation-title">${tableDetails} - ${formattedTime}</div>
                    <span class="status-label ${statusClass}">${statusLabel}</span>
                </div>
                <div class="reservation-details">
                    <div class="detail-item">
                        <div class="detail-label">Customer</div>
                        <div>${reservation.customerName || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Party Size</div>
                        <div>${reservation.partySize || 'N/A'}</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Duration</div>
                        <div>${reservation.duration || 'N/A'} hour(s)</div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Contact</div>
                        <div>${reservation.customerPhone || 'N/A'}</div>
                    </div>
                </div>
                <div class="reservation-actions">
                    <button class="primary-btn" onclick="ReservationsManager.viewReservation('${reservation.id}')">View Details</button>
                    <button class="edit-btn" onclick="ReservationsManager.editReservation('${reservation.id}')">Edit</button>
                    ${reservation.status !== 'cancelled' ? `<button class="danger-btn" onclick="ReservationsManager.showCancelModal('${reservation.id}')">Cancel</button>` : ''}
                </div>
            `;
            
            reservationsList.appendChild(reservationItem);
        });
    },
    
    // Change displayed date
    changeDate: function(offset) {
        const newDate = new Date(this.selectedDate);
        newDate.setDate(newDate.getDate() + offset);
        
        // Set the date picker value
        document.getElementById('date-picker').valueAsDate = newDate;
        
        // Load reservations for new date
        this.loadReservations(newDate);
    },
    
    // Pick a specific date from the date picker
    pickDate: function(dateString) {
        const selectedDate = new Date(dateString);
        this.loadReservations(selectedDate);
    },
    
    // Update the date display
    updateDateDisplay: function() {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        const formattedDate = this.selectedDate.toLocaleDateString('en-US', options);
        document.getElementById('current-date').textContent = formattedDate;
        document.getElementById('date-picker').valueAsDate = this.selectedDate;
    },
    
    // Filter reservations by status
    filterByStatus: function(status) {
        this.currentFilter = status;
        
        // Update active status in filter buttons
        document.querySelectorAll('.status-filter').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.status-filter[data-status="${status}"]`).classList.add('active');
        
        // Filter and display reservations
        this.displayReservations(this.allReservations);
    },
    
    // Refresh reservations
    refreshReservations: function() {
        this.loadReservations(this.selectedDate);
        this.showMessage('Reservations refreshed', 'success');
    },
    
    // Show add reservation modal
    showAddReservationModal: function() {
        // Reset form
        document.getElementById('reservation-form').reset();
        document.getElementById('edit-reservation-id').value = '';
        document.getElementById('reservation-modal-title').textContent = 'Add New Reservation';
        
        // Set default date to selected date
        document.getElementById('reservation-date').value = this.selectedDate.toISOString().split('T')[0];
        
        // Set default time to current hour
        const now = new Date();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = '00'; // Default to start of hour
        document.getElementById('reservation-time').value = `${hours}:${minutes}`;
        
        // Clear error message
        document.getElementById('reservation-error').classList.add('hidden');
        
        // Show modal
        document.getElementById('reservation-modal').style.display = 'block';
    },
    
    // Edit reservation
    editReservation: function(reservationId) {
        const reservation = this.allReservations.find(r => r.id === reservationId);
        if (!reservation) return;
        
        // Set form values
        document.getElementById('edit-reservation-id').value = reservationId;
        document.getElementById('reservation-modal-title').textContent = 'Edit Reservation';
        
        // Format date and time
        const reservationTime = reservation.reservationTime ? new Date(reservation.reservationTime.seconds * 1000) : new Date();
        const formattedDate = reservationTime.toISOString().split('T')[0];
        const formattedTime = reservationTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }).replace(' ', '');
        
        document.getElementById('reservation-date').value = formattedDate;
        document.getElementById('reservation-time').value = formattedTime;
        document.getElementById('reservation-table').value = reservation.tableId || '';
        document.getElementById('reservation-duration').value = reservation.duration || '1';
        document.getElementById('reservation-status').value = reservation.status || 'pending';
        document.getElementById('customer-name').value = reservation.customerName || '';
        document.getElementById('customer-phone').value = reservation.customerPhone || '';
        document.getElementById('customer-email').value = reservation.customerEmail || '';
        document.getElementById('party-size').value = reservation.partySize || '1';
        document.getElementById('customer-notes').value = reservation.notes || '';
        document.getElementById('shop-notes').value = reservation.shopNotes || '';
        
        // Clear error message
        document.getElementById('reservation-error').classList.add('hidden');
        
        // Show modal
        document.getElementById('reservation-modal').style.display = 'block';
    },
    
    // View reservation details
    viewReservation: function(reservationId) {
        const reservation = this.allReservations.find(r => r.id === reservationId);
        if (!reservation) return;
        
        const detailsContent = document.getElementById('reservation-details-content');
        const actionsContainer = document.getElementById('reservation-actions');
        
        // Format reservation time
        const reservationTime = reservation.reservationTime ? new Date(reservation.reservationTime.seconds * 1000) : new Date();
        const formattedDate = reservationTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        const formattedTime = reservationTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        
        // Find table details
        let tableDetails = 'Unknown Table';
        if (reservation.tableId) {
            const table = this.shopTables.find(t => t.id === reservation.tableId);
            if (table) {
                // Use tableName if available, fall back to tableNumber
                tableDetails = table.tableName || (table.tableNumber ? `Table ${table.tableNumber}` : 'Unnamed Table');
            } else if (reservation.tableName) {
                tableDetails = reservation.tableName;
            } else if (reservation.tableNumber) {
                tableDetails = `Table ${reservation.tableNumber}`;
            }
        }
        
        // Determine status label and class
        let statusLabel = 'Unknown';
        let statusClass = '';
        
        switch (reservation.status) {
            case 'pending':
                statusLabel = 'Pending';
                statusClass = 'status-pending';
                break;
            case 'confirmed':
                statusLabel = 'Confirmed';
                statusClass = 'status-confirmed';
                break;
            case 'completed':
                statusLabel = 'Completed';
                statusClass = 'status-completed';
                break;
            case 'cancelled':
                statusLabel = 'Cancelled';
                statusClass = 'status-cancelled';
                break;
        }
        
        detailsContent.innerHTML = `
            <div class="reservation-header">
                <h3>Reservation #${reservation.id.slice(-6)}</h3>
                <span class="status-label ${statusClass}">${statusLabel}</span>
            </div>
            
            <div class="reservation-details" style="margin-top: 20px;">
                <div class="detail-item">
                    <div class="detail-label">Date</div>
                    <div>${formattedDate}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Time</div>
                    <div>${formattedTime}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Table</div>
                    <div>${tableDetails}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Duration</div>
                    <div>${reservation.duration || 'N/A'} hour(s)</div>
                </div>
            </div>
            
            <h4 style="margin-top: 20px;">Customer Information</h4>
            <div class="reservation-details">
                <div class="detail-item">
                    <div class="detail-label">Name</div>
                    <div>${reservation.customerName || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Phone</div>
                    <div>${reservation.customerPhone || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Email</div>
                    <div>${reservation.customerEmail || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Party Size</div>
                    <div>${reservation.partySize || 'N/A'} people</div>
                </div>
            </div>
        `;
        
        // Add notes if available
        if (reservation.notes) {
            detailsContent.innerHTML += `
                <div class="notes-container">
                    <div class="notes-label">Customer Notes:</div>
                    <div>${reservation.notes}</div>
                </div>
            `;
        }
        
        // Add shop notes if available
        if (reservation.shopNotes) {
            detailsContent.innerHTML += `
                <div class="notes-container" style="background-color: #e9f5ff;">
                    <div class="notes-label">Shop Notes:</div>
                    <div>${reservation.shopNotes}</div>
                </div>
            `;
        }
        
        // Add cancellation info if cancelled
        if (reservation.status === 'cancelled' && reservation.cancellationReason) {
            detailsContent.innerHTML += `
                <div class="notes-container" style="background-color: #ffd4d4;">
                    <div class="notes-label">Cancellation Reason:</div>
                    <div>${reservation.cancellationReason}</div>
                </div>
            `;
        }
        
        // Set action buttons based on status
        actionsContainer.innerHTML = '';
        
        if (reservation.status === 'pending') {
            actionsContainer.innerHTML = `
                <button class="back-btn" onclick="ReservationsManager.closeModal('view-reservation-modal')">Back</button>
                <div style="display: flex; gap: 10px; margin-left: auto;">
                    <button class="primary-btn" onclick="ReservationsManager.confirmReservation('${reservation.id}')">Confirm</button>
                    <button class="edit-btn" onclick="ReservationsManager.closeModal('view-reservation-modal'); ReservationsManager.editReservation('${reservation.id}')">Edit</button>
                    <button class="danger-btn" onclick="ReservationsManager.showCancelModal('${reservation.id}')">Cancel Reservation</button>
                </div>
            `;
        } else if (reservation.status === 'confirmed') {
            actionsContainer.innerHTML = `
                <button class="back-btn" onclick="ReservationsManager.closeModal('view-reservation-modal')">Back</button>
                <div style="display: flex; gap: 10px; margin-left: auto;">
                    <button class="edit-btn" onclick="ReservationsManager.closeModal('view-reservation-modal'); ReservationsManager.editReservation('${reservation.id}')">Edit</button>
                    <button class="danger-btn" onclick="ReservationsManager.showCancelModal('${reservation.id}')">Cancel Reservation</button>
                </div>
            `;
        } else {
            // For completed or cancelled reservations
            actionsContainer.innerHTML = `
                <button class="back-btn" onclick="ReservationsManager.closeModal('view-reservation-modal')">Back</button>
                <div style="display: flex; gap: 10px; margin-left: auto;">
                    <button class="edit-btn" onclick="ReservationsManager.closeModal('view-reservation-modal'); ReservationsManager.editReservation('${reservation.id}')">Edit</button>
                </div>
            `;
        }
        
        // Add close event listener to modal background
        const modal = document.getElementById('view-reservation-modal');
        const closeOnBackground = function(event) {
            if (event.target === modal) {
                ReservationsManager.closeModal('view-reservation-modal');
                modal.removeEventListener('click', closeOnBackground);
            }
        };
        modal.addEventListener('click', closeOnBackground);
        
        // Show modal
        modal.style.display = 'block';
    },
    
    // Confirm a reservation
    confirmReservation: function(reservationId) {
        window.shopAuth.db.collection('Reservations').doc(reservationId).update({
            status: 'confirmed',
            confirmedAt: firebase.firestore.FieldValue.serverTimestamp(),
            confirmedBy: window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid,
        })
        .then(() => {
            this.showMessage('Reservation confirmed successfully!', 'success');
            this.closeModal('view-reservation-modal');
            this.loadReservations(this.selectedDate);
            
            // Notify customer if needed
            if (typeof NotificationManager !== 'undefined') {
                NotificationManager.sendReservationStatusUpdate(reservationId, 'confirmed');
            }
        })
        .catch((error) => {
            console.error('Error confirming reservation:', error);
            this.showMessage('Error confirming reservation: ' + error.message, 'error');
        });
    },
    
    // Complete a reservation
    completeReservation: function(reservationId) {
        window.shopAuth.db.collection('Reservations').doc(reservationId).update({
            status: 'completed',
            completedAt: firebase.firestore.FieldValue.serverTimestamp(),
            completedBy: window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid,
        })
        .then(() => {
            this.showMessage('Reservation marked as completed!', 'success');
            this.closeModal('view-reservation-modal');
            this.loadReservations(this.selectedDate);
        })
        .catch((error) => {
            console.error('Error completing reservation:', error);
            this.showMessage('Error completing reservation: ' + error.message, 'error');
        });
    },
    
    // Show cancel modal
    showCancelModal: function(reservationId) {
        document.getElementById('cancel-reservation-id').value = reservationId;
        document.getElementById('cancellation-reason').value = '';
        this.closeModal('view-reservation-modal');
        document.getElementById('cancel-modal').style.display = 'block';
    },
    
    // Confirm reservation cancellation
    confirmCancelReservation: function() {
        const reservationId = document.getElementById('cancel-reservation-id').value;
        const reason = document.getElementById('cancellation-reason').value;
        
        window.shopAuth.db.collection('Reservations').doc(reservationId).update({
            status: 'cancelled',
            cancelledAt: firebase.firestore.FieldValue.serverTimestamp(),
            cancelledBy: window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid,
            cancellationReason: reason,
        })
        .then(() => {
            this.showMessage('Reservation cancelled!', 'success');
            this.closeModal('cancel-modal');
            this.loadReservations(this.selectedDate);
            
            
            if (window.NotificationManager && typeof window.NotificationManager.sendReservationStatusUpdate === 'function') {
                window.NotificationManager.sendReservationStatusUpdate(reservationId, 'cancelled', reason);
            }
        })
        .catch((error) => {
            console.error('Error canceling reservation:', error);
            this.showMessage('Error canceling reservation: ' + error.message, 'error');
        });
    },
    
    // Check table availability and show warning if already booked
    checkTableAvailability: function() {
        const tableId = document.getElementById('reservation-table').value;
        const reservationId = document.getElementById('edit-reservation-id').value;
        const reservationDate = document.getElementById('reservation-date').value;
        const reservationTime = document.getElementById('reservation-time').value;
        const duration = document.getElementById('reservation-duration').value;
        const errorElement = document.getElementById('reservation-error');
        
        // Clear previous error
        errorElement.textContent = '';
        errorElement.classList.add('hidden');
        
        // Only check if all necessary values are present
        if (!tableId || !reservationDate || !reservationTime || !duration) {
            return;
        }
        
        // Create datetime for reservation
        const reservationDateTime = new Date(reservationDate + 'T' + reservationTime);
        
        // Check for conflicts
        this.checkTableAvailable(
            tableId, 
            reservationDateTime, 
            parseInt(duration), 
            reservationId
        ).then(isAvailable => {
            if (!isAvailable) {
                errorElement.textContent = 'Warning: This table is already booked during this time period';
                errorElement.classList.remove('hidden');
            }
        });
    },
    
    // Check if a table is available for booking
    checkTableAvailable: function(tableId, startTime, duration, reservationId) {
        return new Promise((resolve, reject) => {
            // Calculate end time
            const endTime = new Date(startTime.getTime() + (duration * 60 * 60 * 1000));
            
            // Find reservations for the same table
            window.shopAuth.db.collection('Reservations')
                .where('tableId', '==', tableId)
                .where('status', 'in', ['pending', 'confirmed'])
                .get()
                .then((snapshot) => {
                    let isAvailable = true;
                    
                    snapshot.forEach((doc) => {
                      
                        if (reservationId && doc.id === reservationId) return;
                        
                        const res = doc.data();
                        const resStart = res.reservationTime.toDate();
                        const resEnd = new Date(resStart.getTime() + (res.duration * 60 * 60 * 1000));
                        
                        // Check for overlap
                        if ((startTime < resEnd) && (endTime > resStart)) {
                            isAvailable = false;
                        }
                    });
                    
                    resolve(isAvailable);
                })
                .catch((error) => {
                    console.error("Error checking availability:", error);
                    // If there's an error, assume it's available to avoid blocking legitimate bookings
                    resolve(true);
                });
        });
    },
    
    // Save reservation
    saveReservation: function() {
        if (!this.shopId) {
            console.error('Shop ID not available');
            return;
        }
        
        // Get form values
        const reservationId = document.getElementById('edit-reservation-id').value;
        const reservationDate = document.getElementById('reservation-date').value;
        const reservationTime = document.getElementById('reservation-time').value;
        const tableId = document.getElementById('reservation-table').value;
        const duration = document.getElementById('reservation-duration').value;
        const status = document.getElementById('reservation-status').value;
        const customerName = document.getElementById('customer-name').value;
        const customerPhone = document.getElementById('customer-phone').value;
        const customerEmail = document.getElementById('customer-email').value;
        const partySize = document.getElementById('party-size').value;
        const customerNotes = document.getElementById('customer-notes').value;
        const shopNotes = document.getElementById('shop-notes').value;
        
        // Validate table selection
        if (!tableId) {
            document.getElementById('reservation-error').textContent = 'Please select a table';
            document.getElementById('reservation-error').classList.remove('hidden');
            return;
        }
        
        // Create datetime for reservation
        const reservationDateTime = new Date(reservationDate + 'T' + reservationTime);
        const durationHours = parseInt(duration);
        
        // Check availability first
        this.checkTableAvailable(tableId, reservationDateTime, durationHours, reservationId)
            .then(isAvailable => {
                if (!isAvailable) {
                    document.getElementById('reservation-error').textContent = 'This table is already booked during this time';
                    document.getElementById('reservation-error').classList.remove('hidden');
                    return;
                }
                
                // Get table details
                const table = this.shopTables.find(t => t.id === tableId);
                let tableName = 'Unknown Table';
                
                if (table) {
                    // Use tableName if available, fall back to tableNumber
                    tableName = table.tableName || (table.tableNumber ? `Table ${table.tableNumber}` : 'Unnamed Table');
                }
                
                // Create reservation data
                const reservationData = {
                    shopId: this.shopId,
                    tableId: tableId,
                    tableName: tableName, // Store the table name instead of number
                    reservationTime: firebase.firestore.Timestamp.fromDate(reservationDateTime),
                    duration: durationHours,
                    status: status,
                    customerName: customerName,
                    customerPhone: customerPhone,
                    customerEmail: customerEmail || null,
                    partySize: parseInt(partySize),
                    notes: customerNotes || null,
                    shopNotes: shopNotes || null,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                
                // Add timestamps based on status
                if (status === 'confirmed') {
                    reservationData.confirmedAt = firebase.firestore.FieldValue.serverTimestamp();
                    reservationData.confirmedBy = window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid;
                } else if (status === 'completed') {
                    reservationData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
                    reservationData.completedBy = window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid;
                } else if (status === 'cancelled') {
                    reservationData.cancelledAt = firebase.firestore.FieldValue.serverTimestamp();
                    reservationData.cancelledBy = window.shopAuth.auth.currentUser.email || window.shopAuth.auth.currentUser.uid;
                }
                
                // If new reservation, add createdAt field
                if (!reservationId) {
                    reservationData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    reservationData.createdBy = 'shop';
                }
                
                // Save to Firestore
                const reservationRef = reservationId ?
                    window.shopAuth.db.collection('Reservations').doc(reservationId) :
                    window.shopAuth.db.collection('Reservations').doc();
                
                const savePromise = reservationId ?
                    reservationRef.update(reservationData) :
                    reservationRef.set(reservationData);
                
                savePromise
                    .then(() => {
                        this.showMessage(reservationId ? 'Reservation updated successfully!' : 'Reservation added successfully!', 'success');
                        this.closeModal('reservation-modal');
                        this.loadReservations(this.selectedDate);
                        
                        // Notify customer if needed
                        if (!reservationId && typeof NotificationManager !== 'undefined') {
                            NotificationManager.sendNewReservationNotification(reservationRef.id);
                        }
                    })
                    .catch((error) => {
                        console.error('Error saving reservation:', error);
                        document.getElementById('reservation-error').textContent = 'Error saving reservation: ' + error.message;
                        document.getElementById('reservation-error').classList.remove('hidden');
                    });
            });
    },
    
    // Close a modal
    closeModal: function(modalId) {
        document.getElementById(modalId).style.display = 'none';
    },
    
    // Show message
    showMessage: function(message, type) {
        const messageElement = document.getElementById('reservation-message');
        messageElement.textContent = message;
        messageElement.className = type === 'error' ? 'message error-message' : 'message success-message';
        messageElement.classList.remove('hidden');
        
        // Hide message after 5 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000);
    }
};