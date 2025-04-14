/**
 * functions/shop-reservations-calendar.js
 * Manages the calendar view of shop reservations
 */

// Calendar View Object
const CalendarView = {
    // Properties
    shopId: null,
    currentMonth: new Date(),
    selectedDate: new Date(),
    reservationsByDate: {},
    monthNames: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    dayNames: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    
    // Initialize the calendar
    init: function(shopId) {
        this.shopId = shopId;
        this.selectedDate = new Date();
        
        // Set current month to today's month
        this.currentMonth = new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1);
        
        // Render the initial calendar
        this.renderCalendar();
        
        // Set up navigation buttons
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('prev-month')) {
                CalendarView.previousMonth();
            } else if (e.target.classList.contains('next-month')) {
                CalendarView.nextMonth();
            }
        });
    },
    
    // Refresh calendar data and view
    refreshCalendar: function() {
        this.loadMonthData(this.currentMonth, () => {
            this.renderCalendar();
            this.updateSelectedDayReservations(this.selectedDate);
        });
    },
    
    // Navigate to previous month
    previousMonth: function() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() - 1);
        this.refreshCalendar();
    },
    
    // Navigate to next month
    nextMonth: function() {
        this.currentMonth.setMonth(this.currentMonth.getMonth() + 1);
        this.refreshCalendar();
    },
    
    // Render the calendar for current month
    renderCalendar: function() {
        const calendarContainer = document.getElementById('reservations-calendar');
        if (!calendarContainer) return;
        
        // Get details for the current month
        const year = this.currentMonth.getFullYear();
        const month = this.currentMonth.getMonth();
        
        // Create calendar structure
        let calendarHTML = `
            <div class="calendar-header">
                <button class="month-nav prev-month">&lt;</button>
                <h2>${this.monthNames[month]} ${year}</h2>
                <button class="month-nav next-month">&gt;</button>
            </div>
            <div class="calendar-days">
        `;
        
        // Add day headers
        for (let i = 0; i < this.dayNames.length; i++) {
            calendarHTML += `<div class="day-header">${this.dayNames[i]}</div>`;
        }
        
        // Get first day of month and total days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        
        // Add empty cells for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += '<div class="day empty"></div>';
        }
        
        // Add days of the month
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const dateKey = this.getDateKey(new Date(year, month, day));
            const reservations = this.reservationsByDate[dateKey] || [];
            const reservationCount = reservations.length;
            
            let isToday = today.getDate() === day && 
                          today.getMonth() === month && 
                          today.getFullYear() === year;
            
            let isSelected = this.selectedDate.getDate() === day && 
                             this.selectedDate.getMonth() === month && 
                             this.selectedDate.getFullYear() === year;
            
            // Determine day classes
            let dayClass = 'day';
            if (isToday) dayClass += ' today';
            if (isSelected) dayClass += ' selected';
            if (reservationCount > 0) dayClass += ' has-reservations';
            
            calendarHTML += `
                <div class="${dayClass}" data-date="${year}-${month+1}-${day}" onclick="CalendarView.selectDay(${year}, ${month}, ${day})">
                    <div class="day-number">${day}</div>
                    ${reservationCount > 0 ? `<div class="reservation-indicator">${reservationCount}</div>` : ''}
                </div>
            `;
        }
        
        // Close calendar days div
        calendarHTML += '</div>';
        
        // Set the HTML
        calendarContainer.innerHTML = calendarHTML;
    },
    
    // Select a specific day
    selectDay: function(year, month, day) {
        this.selectedDate = new Date(year, month, day);
        
        // Update visual selection
        document.querySelectorAll('.calendar-days .day').forEach(dayElement => {
            dayElement.classList.remove('selected');
        });
        
        const selectedElement = document.querySelector(`.calendar-days .day[data-date="${year}-${month+1}-${day}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }
        
        // Load and display reservations for this day
        this.updateSelectedDayReservations(this.selectedDate);
        
        // Update main reservation list view with the selected date
        if (ReservationsManager) {
            ReservationsManager.loadReservations(this.selectedDate);
        }
    },
    
    // Update the reservations list for the selected day
    updateSelectedDayReservations: function(date) {
        const dayReservationsContainer = document.getElementById('calendar-day-reservations');
        const dayTitleElement = document.getElementById('selected-day-title');
        const countElement = document.getElementById('day-reservation-count');
        
        if (!dayReservationsContainer || !dayTitleElement || !countElement) return;
        
        // Format the date for display
        const formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
        });
        
        dayTitleElement.textContent = `${formattedDate}`;
        
        // Get the reservations for this date
        const dateKey = this.getDateKey(date);
        const reservations = this.reservationsByDate[dateKey] || [];
        
        // Update the count
        countElement.textContent = reservations.length > 0 
            ? `${reservations.length} reservation${reservations.length > 1 ? 's' : ''}` 
            : 'No reservations';
        
        // Clear current content
        dayReservationsContainer.innerHTML = '';
        
        if (reservations.length === 0) {
            dayReservationsContainer.innerHTML = `
                <div class="no-reservations-message">
                    No reservations for this date
                </div>
            `;
            return;
        }
        
        // Sort reservations by time
        reservations.sort((a, b) => {
            return a.reservationTime.seconds - b.reservationTime.seconds;
        });
        
        // Add each reservation
        reservations.forEach(reservation => {
            // Format time
            const reservationTime = new Date(reservation.reservationTime.seconds * 1000);
            const formattedTime = reservationTime.toLocaleTimeString('en-US', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            // Get table info - use tableName when available, fall back to tableNumber
            let tableInfo = reservation.tableName || (reservation.tableNumber ? `Table ${reservation.tableNumber}` : 'Unknown Table');
            
            // Create status badge class based on status
            let statusClass = '';
            let statusLabel = reservation.status || 'pending';
            switch (statusLabel) {
                case 'pending':
                    statusClass = 'status-pending';
                    statusLabel = 'Pending';
                    break;
                case 'confirmed':
                    statusClass = 'status-confirmed';
                    statusLabel = 'Confirmed';
                    break;
                case 'completed':
                    statusClass = 'status-completed';
                    statusLabel = 'Completed';
                    break;
                case 'cancelled':
                    statusClass = 'status-cancelled';
                    statusLabel = 'Cancelled';
                    break;
            }
            
            const reservationItem = document.createElement('div');
            reservationItem.className = 'day-reservation-item';
            reservationItem.innerHTML = `
                <div class="reservation-item-header">
                    <div class="reservation-time">${formattedTime}</div>
                    <div class="reservation-status ${statusClass}">${statusLabel}</div>
                </div>
                <div class="reservation-item-details" style="display: flex; flex-direction: column; gap: 5px;">
                    <div><strong>Table:</strong> ${tableInfo}</div>
                    <div><strong>Customer:</strong> ${reservation.customerName || 'N/A'}</div>
                    <div><strong>Party Size:</strong> ${reservation.partySize || 'N/A'} people</div>
                    <div><strong>Duration:</strong> ${reservation.duration || 'N/A'} hour${reservation.duration !== 1 ? 's' : ''}</div>
                </div>
                <div class="reservation-item-actions">
                    <button class="view-btn" onclick="ReservationsManager.viewReservation('${reservation.id}')">View</button>
                </div>
            `;
            
            dayReservationsContainer.appendChild(reservationItem);
        
    
        });
    },
    
    // Load reservations data for the entire month
    loadMonthData: function(date, callback) {
        if (!this.shopId) {
            console.error('Shop ID not available');
            return;
        }
        
        // Reset the reservations by date
        this.reservationsByDate = {};
        
        // Calculate start and end of month
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
        // Query Firestore for reservations in this month range
        window.shopAuth.db.collection('Reservations')
            .where('shopId', '==', this.shopId)
            .where('reservationTime', '>=', startOfMonth)
            .where('reservationTime', '<=', endOfMonth)
            .get()
            .then((querySnapshot) => {
                // Process each reservation
                querySnapshot.forEach((doc) => {
                    const reservation = doc.data();
                    reservation.id = doc.id;
                    
                    // Get the date key (YYYY-MM-DD)
                    const reservationDate = reservation.reservationTime 
                        ? new Date(reservation.reservationTime.seconds * 1000) 
                        : new Date();
                    
                    const dateKey = this.getDateKey(reservationDate);
                    
                    // Add to the reservations by date
                    if (!this.reservationsByDate[dateKey]) {
                        this.reservationsByDate[dateKey] = [];
                    }
                    
                    this.reservationsByDate[dateKey].push(reservation);
                });
                
                // Execute callback if provided
                if (callback) callback();
            })
            .catch((error) => {
                console.error('Error loading month reservations:', error);
            });
    },
    
    // Helper to get a date key in the format YYYY-MM-DD
    getDateKey: function(date) {
        return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
    }
};