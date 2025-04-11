/**
 * UI Manager Module
 * Handles UI interactions and display functions
 */
const UIManager = {
    /**
     * Show a message in the UI
     * @param {string} message - The message to display
     * @param {string} type - Message type ('success' or 'error')
     * @param {boolean} inModal - Whether to show the message in the modal
     */
    showMessage: function(message, type, inModal = false) {
        // Determine which message element to use
        const messageElementId = inModal ? 'modal-message' : 'events-message';
        const messageElement = document.getElementById(messageElementId);
        
        if (!messageElement) {
            console.error(`Message element with ID ${messageElementId} not found`);
            return;
        }
        
        messageElement.textContent = message;
        messageElement.className = 'message ' + (type === 'error' ? 'error-message' : 'success-message');
        messageElement.classList.remove('hidden');

        // Hide message after 5 seconds
        setTimeout(() => {
            messageElement.classList.add('hidden');
        }, 5000);
    },

    /**
     * Close the main modal
     */
    closeModal: function() {
        document.getElementById('event-modal').style.display = 'none';
        document.getElementById('delete-modal').style.display = 'none';
        
        // Clear any modal messages when closing
        const modalMessage = document.getElementById('modal-message');
        if (modalMessage) {
            modalMessage.classList.add('hidden');
        }
    },

    /**
     * Set default form values for a new event
     */
    setDefaultFormValues: function() {
        // Set default date to today
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('event-date').value = today;

        // Set default times
        document.getElementById('event-start-time').value = '18:00';
        document.getElementById('event-end-time').value = '22:00';
        document.getElementById('attendance-limit').value = '20';
    },

    /**
     * Validate a form field
     * @param {HTMLElement} field - The field to validate
     * @param {string} errorMessage - The error message to display if validation fails
     * @returns {boolean} - Whether the field is valid
     */
    validateField: function(field, errorMessage) {
        if (!field.checkValidity()) {
            // Create or update error message
            let errorElement = field.nextElementSibling;
            if (!errorElement || !errorElement.classList.contains('error-message')) {
                errorElement = document.createElement('div');
                errorElement.className = 'error-message';
                field.parentNode.insertBefore(errorElement, field.nextSibling);
            }
            
            errorElement.textContent = errorMessage || 'This field is required';
            field.focus();
            return false;
        }
        
        // Remove any existing error message
        const errorElement = field.nextElementSibling;
        if (errorElement && errorElement.classList.contains('error-message')) {
            errorElement.remove();
        }
        
        return true;
    },

    /**
     * Validate the attendance limit field specifically
     * @returns {boolean} - Whether the field is valid
     */
    validateAttendanceLimit: function() {
        const attendanceField = document.getElementById('attendance-limit');
        const value = attendanceField.value;
        
        // Check if it's a valid integer
        if (!/^\d+$/.test(value)) {
            this.validateField(attendanceField, 'Please enter a valid number without decimals or letters');
            return false;
        }
        
        // Check if it's within the allowed range
        const numValue = parseInt(value);
        if (numValue < 1) {
            this.validateField(attendanceField, 'Attendance limit must be at least 1');
            return false;
        }
        
        return true;
    },

    /**
     * Format date for display
     * @param {Date} date - The date to format
     * @returns {string} - Formatted date string
     */
    formatDate: function(date) {
        return date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    },

    /**
     * Generate HTML for an event card
     * @param {object} event - The event data
     * @returns {string} - HTML for the event card
     */
    generateEventCardHTML: function(event) {
        // Format date
        const eventDate = event.date.toDate();
        const formattedDate = this.formatDate(eventDate);

        // Attendance limit display
        const attendanceInfo = event.attendanceLimit ?
            `Attendance Limit: ${event.attendanceLimit} people` :
            'No attendance limit set';

        // Recurrence info
        let recurrenceInfo = '';
        if (event.isRecurringParent) {
            const pattern = event.recurrencePattern;
            let frequencyText = '';

            if (pattern.type === 'daily') {
                frequencyText = 'Daily';
            } else if (pattern.type === 'weekly') {
                frequencyText = 'Weekly';

                // Add weekday info for weekly pattern
                if (pattern.weekdays && pattern.weekdays.length > 0) {
                    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                    const days = pattern.weekdays.map(d => dayNames[d]).join(', ');
                    frequencyText += ` on ${days}`;
                }
            } else if (pattern.type === 'monthly') {
                frequencyText = 'Monthly';

                if (pattern.monthlyType === 'day-of-week') {
                    const weekNumbers = ['first', 'second', 'third', 'fourth', 'last'];
                    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                    frequencyText += ` on the ${weekNumbers[pattern.weekNumber - 1]} ${dayNames[pattern.weekday]}`;
                }
            }

            recurrenceInfo = `
                <div class="event-recurrence">
                    <span class="recurrence-icon">🔁</span> 
                    <span>${frequencyText}</span>
                </div>
            `;
        } else if (event.isRecurringChild) {
            recurrenceInfo = `
                <div class="event-recurrence">
                    <span class="recurrence-icon">🔁</span> 
                    <span>Part of recurring series</span>
                </div>
            `;
        }

        return `
            <div class="event-card">
                <div class="event-header">
                    <h3 class="event-title">${event.name}</h3>
                </div>
                <div class="event-meta">
                    <div class="event-date">${formattedDate}</div>
                    <div class="event-time">${event.startTime} - ${event.endTime}</div>
                </div>
                ${recurrenceInfo}
                <div class="event-attendance">${attendanceInfo}</div>
                ${event.description ? `<div class="event-description">${event.description}</div>` : ''}
                <div class="event-buttons">
                    <button class="edit-btn" onclick="EventManager.editEvent('${event.id}')">Edit</button>
                    <button class="delete-btn" onclick="EventManager.deleteEvent('${event.id}')">Delete</button>
                </div>
            </div>
        `;
    }
};