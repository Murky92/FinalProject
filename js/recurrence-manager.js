/**
 * Recurrence Manager Module
 * Handles recurring event logic and UI
 */
const RecurrenceManager = {
    /**
     * Toggle display of recurrence options
     */
    toggleRecurrenceOptions: function() {
        const isRecurring = document.getElementById('event-recurring').checked;
        const recurrenceOptions = document.getElementById('recurrence-options');

        if (isRecurring) {
            recurrenceOptions.classList.remove('hidden');
            this.updateWeekdaySelection();
        } else {
            recurrenceOptions.classList.add('hidden');
        }
    },

    /**
     * Toggle recurrence type options
     */
    toggleRecurrenceTypeOptions: function() {
        const recurrenceType = document.getElementById('recurrence-type').value;

        // Hide all specific options first
        document.getElementById('weekly-options').classList.add('hidden');
        document.getElementById('monthly-options').classList.add('hidden');

        // Show the relevant options
        if (recurrenceType === 'weekly') {
            document.getElementById('weekly-options').classList.remove('hidden');
        } else if (recurrenceType === 'monthly') {
            document.getElementById('monthly-options').classList.remove('hidden');
        }
    },

    /**
     * Toggle end recurrence options
     */
    toggleEndRecurrenceOptions: function() {
        const endType = document.getElementById('recurrence-end-type').value;

        document.getElementById('end-after-option').classList.add('hidden');
        document.getElementById('end-on-date-option').classList.add('hidden');

        if (endType === 'after') {
            document.getElementById('end-after-option').classList.remove('hidden');
        } else if (endType === 'on-date') {
            document.getElementById('end-on-date-option').classList.remove('hidden');
        }
    },

    /**
     * Update weekday selection based on event date
     */
    updateWeekdaySelection: function() {
        const eventDate = document.getElementById('event-date').value;
        if (!eventDate) return;

        const date = new Date(eventDate);
        const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

        // Clear all weekday selections
        this.resetWeekdaySelection();

        // Check the day of week that matches the event date
        const dayCheckbox = document.querySelector(`.weekday-selector input[value="${dayOfWeek}"]`);
        if (dayCheckbox) {
            dayCheckbox.checked = true;
            dayCheckbox.parentElement.classList.add('selected');
        }

        // Update the day of month for monthly recurrence
        const dayOfMonth = date.getDate();
        document.getElementById('selected-day-of-month').textContent = dayOfMonth;

        // Update month-week-number and month-weekday for "day of week" monthly option
        const weekNumber = Math.ceil(dayOfMonth / 7);
        document.getElementById('month-week-number').value = weekNumber > 4 ? 5 : weekNumber;
        document.getElementById('month-weekday').value = dayOfWeek;

        // Set end date to be 3 months from start date by default
        const endDate = new Date(date);
        endDate.setMonth(endDate.getMonth() + 3);
        document.getElementById('recurrence-end-date').valueAsDate = endDate;
    },

    /**
     * Reset all weekday selections
     */
    resetWeekdaySelection: function() {
        document.querySelectorAll('.weekday-selector input').forEach(checkbox => {
            checkbox.checked = false;
            checkbox.parentElement.classList.remove('selected');
        });
    },

    /**
     * Toggle a specific weekday
     * @param {HTMLElement} label - The label element
     * @param {number} dayNumber - The day number (0-6)
     */
    toggleWeekday: function(label, dayNumber) {
        const checkbox = label.querySelector('input');
        checkbox.checked = !checkbox.checked;

        if (checkbox.checked) {
            label.classList.add('selected');
        } else {
            label.classList.remove('selected');
        }

        // Make sure at least one day is selected
        setTimeout(() => {
            const selectedDays = document.querySelectorAll('.weekday-label.selected');
            if (selectedDays.length === 0) {
                // If no days selected, select current day
                const today = new Date().getDay();
                const todayLabel = document.querySelector(`.weekday-label:nth-child(${today + 1})`);
                if (todayLabel) {
                    todayLabel.classList.add('selected');
                    todayLabel.querySelector('input').checked = true;
                }
            }
        }, 100);
    },

    /**
     * Get recurrence data from form
     * @returns {object|null} - The recurrence data or null if not recurring
     */
    getRecurrenceData: function() {
        const isRecurring = document.getElementById('event-recurring').checked;

        if (!isRecurring) {
            return null;
        }

        const recurrenceType = document.getElementById('recurrence-type').value;
        const recurrenceData = {
            type: recurrenceType,
            endType: document.getElementById('recurrence-end-type').value
        };

        // Add type-specific data
        if (recurrenceType === 'weekly') {
            const weekdays = [];
            document.querySelectorAll('.weekday-selector input:checked').forEach(checkbox => {
                weekdays.push(parseInt(checkbox.value));
            });
            recurrenceData.weekdays = weekdays.length > 0 ? weekdays : [new Date(document.getElementById('event-date').value).getDay()];
        } else if (recurrenceType === 'monthly') {
            const monthlyType = document.querySelector('input[name="monthly-type"]:checked').value;
            recurrenceData.monthlyType = monthlyType;

            if (monthlyType === 'day-of-month') {
                recurrenceData.dayOfMonth = new Date(document.getElementById('event-date').value).getDate();
            } else {
                recurrenceData.weekNumber = parseInt(document.getElementById('month-week-number').value);
                recurrenceData.weekday = parseInt(document.getElementById('month-weekday').value);
            }
        }

        // Add end recurrence data
        if (recurrenceData.endType === 'after') {
            recurrenceData.count = parseInt(document.getElementById('recurrence-count').value);
        } else if (recurrenceData.endType === 'on-date') {
            recurrenceData.endDate = document.getElementById('recurrence-end-date').value;
        }

        return recurrenceData;
    },

    /**
     * Calculate all occurrence dates based on recurrence pattern
     * @param {string} startDate - ISO date string for first occurrence
     * @param {object} recurrenceData - Recurrence pattern data
     * @returns {string[]} - Array of ISO date strings for all occurrences
     */
    calculateOccurrences: function(startDate, recurrenceData) {
        if (!recurrenceData) return [startDate];

        const occurrences = [];
        const start = new Date(startDate);
        let currentDate = new Date(start);
        occurrences.push(currentDate.toISOString().split('T')[0]);

        // Determine end condition
        let maxOccurrences = 999; // Default to a high number for "never" end type
        let endDate = null;

        if (recurrenceData.endType === 'after') {
            maxOccurrences = recurrenceData.count;
        } else if (recurrenceData.endType === 'on-date') {
            endDate = new Date(recurrenceData.endDate);
        }

        // Generate occurrences based on recurrence type
        let count = 1; // Already added the first occurrence

        while (count < maxOccurrences) {
            let nextDate = null;

            if (recurrenceData.type === 'daily') {
                nextDate = new Date(currentDate);
                nextDate.setDate(nextDate.getDate() + 1);
            }
            else if (recurrenceData.type === 'weekly') {
                
                const weekdays = recurrenceData.weekdays;
                let found = false;

                // Start from the day after the current date
                nextDate = new Date(currentDate);
                nextDate.setDate(nextDate.getDate() + 1);

                
                for (let i = 0; i < 7; i++) {
                    const dayOfWeek = nextDate.getDay();
                    if (weekdays.includes(dayOfWeek)) {
                        found = true;
                        break;
                    }
                    nextDate.setDate(nextDate.getDate() + 1);
                }

                if (!found) {
                    // If no weekday was selected, default to same day next week
                    nextDate = new Date(currentDate);
                    nextDate.setDate(nextDate.getDate() + 7);
                }
            }
            else if (recurrenceData.type === 'monthly') {
                if (recurrenceData.monthlyType === 'day-of-month') {
                    // Same day of the month
                    nextDate = new Date(currentDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                } else {
                    // Same nth weekday of the month
                    const weekNumber = recurrenceData.weekNumber;
                    const weekday = recurrenceData.weekday;

                    // Move to next month
                    nextDate = new Date(currentDate);
                    nextDate.setMonth(nextDate.getMonth() + 1);

                    // Reset to first day of the month
                    nextDate.setDate(1);

                    // Find the first occurrence of the specified weekday in the month
                    while (nextDate.getDay() !== weekday) {
                        nextDate.setDate(nextDate.getDate() + 1);
                    }

                    // Adjust to the nth occurrence of that weekday
                    if (weekNumber > 1 && weekNumber < 5) {
                        nextDate.setDate(nextDate.getDate() + (7 * (weekNumber - 1)));
                    } else if (weekNumber === 5) {
                        // "Last" occurrence logic
                        // First, find the first occurrence in the month
                        const firstOccurrence = new Date(nextDate);

                        // Go to first day of next month
                        nextDate.setMonth(nextDate.getMonth() + 1);
                        nextDate.setDate(1);

                        // Go back to the last occurrence of the weekday in previous month
                        nextDate.setDate(nextDate.getDate() - 1);
                        while (nextDate.getDay() !== weekday) {
                            nextDate.setDate(nextDate.getDate() - 1);
                        }

                        // If this gives the same result as the first occurrence,
                        // there's only one occurrence that month, so use that
                        if (nextDate.getMonth() === firstOccurrence.getMonth() &&
                            nextDate.getDate() === firstOccurrence.getDate()) {
                            nextDate = firstOccurrence;
                        }
                    }
                }
            }

            // Check if we've reached the end date
            if (endDate && nextDate > endDate) {
                break;
            }

            // Add this occurrence to the list
            currentDate = nextDate;
            occurrences.push(currentDate.toISOString().split('T')[0]);
            count++;
        }

        return occurrences;
    }
};