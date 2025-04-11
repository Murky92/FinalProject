/**
 * Event Manager Module
 * Main controller for event operations
 */
const EventManager = {
    // Data for recurring event deletion
    recurringDeleteData: null,

    /**
     * Initialize the module
     * @param {string} shopId - The shop ID
     */
    init: function(shopId) {
        // Initialize data manager with shop ID
        DataManager.init(shopId);
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Load initial events
        this.loadEvents();
    },

    /**
     * Set up event listeners
     */
    setupEventListeners: function() {
        // Event form submission
        document.getElementById('event-form').addEventListener('submit', this.handleEventFormSubmit.bind(this));
        
        // Date change updates weekday selection
        document.getElementById('event-date').addEventListener('change', RecurrenceManager.updateWeekdaySelection.bind(RecurrenceManager));
    },

    /**
     * Load events from database
     */
    loadEvents: function() {
        // Display loading message
        document.getElementById('events-list').innerHTML = '<div class="loading-message">Loading events...</div>';
        
        // Fetch events from data manager
        DataManager.loadEvents(events => {
            if (events.length === 0) {
                document.getElementById('events-list').innerHTML = `
                    <div class="no-events">
                        <h3>No upcoming events</h3>
                        <p>You haven't added any events yet. Click the "Add Event" button to get started.</p>
                    </div>
                `;
                return;
            }
            
            // Generate HTML for each event
            let eventsHtml = '';
            events.forEach(event => {
                eventsHtml += UIManager.generateEventCardHTML(event);
            });
            
            // Update the events list
            document.getElementById('events-list').innerHTML = eventsHtml;
        });
    },

    /**
     * Show add event modal
     */
    showAddEventModal: function() {
        // Reset form
        document.getElementById('event-form').reset();
        document.getElementById('edit-event-id').value = '';
        document.getElementById('is-recurring-child').value = 'false';
        document.getElementById('parent-event-id').value = '';
        document.getElementById('modal-title').textContent = 'Add New Event';

        // Clear any previous modal messages
        document.getElementById('modal-message').classList.add('hidden');

        // Show recurrence options
        document.getElementById('recurrence-toggle-container').style.display = 'block';

        // Set default values
        UIManager.setDefaultFormValues();

        // Reset recurrence options
        document.getElementById('event-recurring').checked = false;
        document.getElementById('recurrence-options').classList.add('hidden');
        RecurrenceManager.resetWeekdaySelection();

        // Initialize recurrence options
        RecurrenceManager.updateWeekdaySelection();
        RecurrenceManager.toggleRecurrenceTypeOptions();
        RecurrenceManager.toggleEndRecurrenceOptions();

        // Show modal
        document.getElementById('event-modal').style.display = 'block';
    },

    /**
     * Edit an existing event
     * @param {string} eventId - The event ID
     */
    editEvent: function(eventId) {
        // Clear any previous modal messages
        document.getElementById('modal-message').classList.add('hidden');
        
        // Get event data from Firestore
        DataManager.getEvent(eventId)
            .then(event => {
                // Set form values
                document.getElementById('edit-event-id').value = eventId;
                document.getElementById('modal-title').textContent = 'Edit Event';
                document.getElementById('event-name').value = event.name;

                // Format date for input
                const eventDate = event.date.toDate();
                const formattedDate = eventDate.toISOString().split('T')[0];
                document.getElementById('event-date').value = formattedDate;

                // Set time values
                document.getElementById('event-start-time').value = event.startTime;
                document.getElementById('event-end-time').value = event.endTime;
                document.getElementById('event-description').value = event.description || '';

                // Set attendance limit
                document.getElementById('attendance-limit').value = event.attendanceLimit || '20';

                // Handle recurring event editing
                if (event.isRecurringChild) {
                    // This is a child event - hide recurrence options and store parent ID
                    document.getElementById('is-recurring-child').value = 'true';
                    document.getElementById('parent-event-id').value = event.parentEventId;
                    document.getElementById('recurrence-toggle-container').style.display = 'none';
                    document.getElementById('recurrence-options').classList.add('hidden');
                } else {
                    // Regular or parent event
                    document.getElementById('is-recurring-child').value = 'false';
                    document.getElementById('parent-event-id').value = '';
                    document.getElementById('recurrence-toggle-container').style.display = 'block';

                    // Set recurrence options (only for parent events)
                    if (event.isRecurringParent && event.recurrencePattern) {
                        document.getElementById('event-recurring').checked = true;
                        document.getElementById('recurrence-options').classList.remove('hidden');

                        const pattern = event.recurrencePattern;
                        document.getElementById('recurrence-type').value = pattern.type;
                        RecurrenceManager.toggleRecurrenceTypeOptions();

                        if (pattern.type === 'weekly' && pattern.weekdays) {
                            RecurrenceManager.resetWeekdaySelection();
                            pattern.weekdays.forEach(day => {
                                const checkbox = document.querySelector(`.weekday-selector input[value="${day}"]`);
                                if (checkbox) {
                                    checkbox.checked = true;
                                    checkbox.parentElement.classList.add('selected');
                                }
                            });
                        } else if (pattern.type === 'monthly') {
                            if (pattern.monthlyType === 'day-of-month') {
                                document.getElementById('day-of-month').checked = true;
                                document.getElementById('selected-day-of-month').textContent = pattern.dayOfMonth;
                            } else {
                                document.getElementById('day-of-week').checked = true;
                                document.getElementById('month-week-number').value = pattern.weekNumber;
                                document.getElementById('month-weekday').value = pattern.weekday;
                            }
                        }

                        document.getElementById('recurrence-end-type').value = pattern.endType;
                        RecurrenceManager.toggleEndRecurrenceOptions();

                        if (pattern.endType === 'after') {
                            document.getElementById('recurrence-count').value = pattern.count;
                        } else if (pattern.endType === 'on-date') {
                            document.getElementById('recurrence-end-date').value = pattern.endDate;
                        }
                    } else {
                        // Not a recurring event
                        document.getElementById('event-recurring').checked = false;
                        document.getElementById('recurrence-options').classList.add('hidden');
                    }
                }

                // Show modal
                document.getElementById('event-modal').style.display = 'block';
            })
            .catch(error => {
                console.error('Error getting event:', error);
                UIManager.showMessage('Error getting event: ' + error.message, 'error');
            });
    },

    /**
     * Show delete confirmation for an event
     * @param {string} eventId - The event ID
     */
    deleteEvent: function(eventId) {
        // First check if this is a recurring event
        DataManager.getEvent(eventId)
            .then(event => {
                // Store data for later use
                this.recurringDeleteData = {
                    eventId: eventId,
                    event: event
                };

                // Show the correct delete dialog
                if (event.isRecurringParent || event.isRecurringChild) {
                    // Show recurring delete options
                    document.getElementById('delete-options-modal').style.display = 'block';
                } else {
                    // Regular event - show normal delete dialog
                    document.getElementById('delete-event-id').value = eventId;
                    document.getElementById('delete-modal').style.display = 'block';
                }
            })
            .catch(error => {
                console.error('Error checking event:', error);
                UIManager.showMessage('Error checking event: ' + error.message, 'error');
            });
    },

    /**
     * Delete a single occurrence of a recurring event
     */
    deleteThisOccurrence: function() {
        const eventId = this.recurringDeleteData.eventId;
        const event = this.recurringDeleteData.event;

        // Delete just this event
        DataManager.deleteEvent(eventId)
            .then(() => {
                // Send cancellation notification
                return DataManager.sendNotification({
                    type: 'event',
                    title: 'Event Occurrence Cancelled',
                    message: `The event "${event.name}" on ${event.date.toDate().toLocaleDateString()} has been cancelled.`,
                    target: 'all',
                    isEventCancellation: true,
                    cancelledEventId: eventId
                });
            })
            .then(() => {
                UIManager.showMessage('Event occurrence deleted', 'success');
                this.closeDeleteOptionsModal();
                this.loadEvents();
            })
            .catch(error => {
                console.error('Error deleting event:', error);
                UIManager.showMessage('Error deleting event: ' + error.message, 'error');
            });
    },

    /**
     * Delete all occurrences of a recurring event
     */
    deleteAllOccurrences: function() {
        const event = this.recurringDeleteData.event;

        // Determine if this is a parent or child
        let parentId = event.isRecurringParent ? this.recurringDeleteData.eventId : event.parentEventId;

        // Create a batch to delete all events
        const batch = DataManager.createBatch();

        // First get all child events
        DataManager.getChildEvents(parentId)
            .then(childEvents => {
                // Add all children to the batch delete
                childEvents.forEach(child => {
                    batch.delete(window.shopAuth.db.collection('Events').doc(child.id));
                });

                // Also delete the parent event
                return DataManager.getEvent(parentId);
            })
            .then(parentEvent => {
                batch.delete(window.shopAuth.db.collection('Events').doc(parentId));
                
                // Commit the batch
                return batch.commit();
            })
            .then(() => {
                // Send cancellation notification
                return DataManager.sendNotification({
                    type: 'event',
                    title: 'Recurring Event Cancelled',
                    message: `The recurring event "${event.name}" has been cancelled.`,
                    target: 'all',
                    isEventCancellation: true,
                    cancelledEventId: parentId
                });
            })
            .then(() => {
                UIManager.showMessage('All event occurrences deleted', 'success');
                this.closeDeleteOptionsModal();
                this.loadEvents();
            })
            .catch(error => {
                console.error('Error deleting events:', error);
                UIManager.showMessage('Error deleting events: ' + error.message, 'error');
            });
    },

    /**
     * Close the recurring delete options modal
     */
    closeDeleteOptionsModal: function() {
        document.getElementById('delete-options-modal').style.display = 'none';
        this.recurringDeleteData = null;
    },

    /**
     * Confirm deletion of a regular (non-recurring) event
     */
    confirmDelete: function() {
        const eventId = document.getElementById('delete-event-id').value;

        DataManager.getEvent(eventId)
            .then(eventData => {
                // Delete the event
                return DataManager.deleteEvent(eventId)
                    .then(() => {
                        // After deleting, create a cancellation notification
                        return DataManager.sendNotification({
                            type: 'event',
                            title: 'Event Cancelled',
                            message: `The event "${eventData.name}" has been cancelled.`,
                            target: 'all',
                            isEventCancellation: true,
                            cancelledEventId: eventId
                        });
                    });
            })
            .then(() => {
                UIManager.showMessage('Event deleted and cancellation notification sent', 'success');
                UIManager.closeModal();
                this.loadEvents();
            })
            .catch(error => {
                console.error('Error deleting event:', error);
                UIManager.showMessage('Error deleting event: ' + error.message, 'error');
            });
    },

    /**
     * Handle event form submission
     * @param {Event} e - The form submission event
     */
    handleEventFormSubmit: function(e) {
        e.preventDefault();

        // Validate all required fields
        const nameField = document.getElementById('event-name');
        const dateField = document.getElementById('event-date');
        const startTimeField = document.getElementById('event-start-time');
        const endTimeField = document.getElementById('event-end-time');
        
        // Basic field validation
        if (!UIManager.validateField(nameField, 'Event name is required') ||
            !UIManager.validateField(dateField, 'Date is required') ||
            !UIManager.validateField(startTimeField, 'Start time is required') ||
            !UIManager.validateField(endTimeField, 'End time is required')) {
            return;
        }
        
        // Validate attendance limit field
        if (!UIManager.validateAttendanceLimit()) {
            return;
        }

        // Get form values
        const eventId = document.getElementById('edit-event-id').value;
        const isRecurringChild = document.getElementById('is-recurring-child').value === 'true';
        const parentEventId = document.getElementById('parent-event-id').value;
        const eventName = nameField.value;
        const eventDate = dateField.value;
        const startTime = startTimeField.value;
        const endTime = endTimeField.value;
        const description = document.getElementById('event-description').value;
        const attendanceLimit = parseInt(document.getElementById('attendance-limit').value);

        // Handle different scenarios based on type of event
        this.processEventData(eventId, isRecurringChild, parentEventId, {
            name: eventName,
            date: eventDate,
            startTime: startTime,
            endTime: endTime,
            description: description,
            attendanceLimit: attendanceLimit
        });
    },
    
    /**
     * Process and save event data based on type (new, recurring, edit)
     * @param {string} eventId - Event ID for edits, empty for new events
     * @param {boolean} isRecurringChild - Whether this is a child in a recurring series
     * @param {string} parentEventId - Parent event ID for recurring child events
     * @param {object} eventData - The event data to save
     */
    processEventData: function(eventId, isRecurringChild, parentEventId, eventData) {
        // Handle different scenarios
        if (eventId && isRecurringChild) {
            // Editing a recurring child event - just update this occurrence
            const firestoreData = {
                ...eventData,
                date: firebase.firestore.Timestamp.fromDate(new Date(eventData.date))
            };

            // Update just this occurrence
            DataManager.updateEvent(eventId, firestoreData)
                .then(() => {
                    UIManager.showMessage('Event occurrence updated successfully', 'success');
                    UIManager.closeModal();
                    this.loadEvents();
                })
                .catch((error) => {
                    console.error('Error updating event:', error);
                    UIManager.showMessage('Error updating event: ' + error.message, 'error', true);
                });
        } else {
            // Get recurrence data for new or parent events
            const isRecurring = document.getElementById('event-recurring').checked;
            const recurrenceData = isRecurring ? RecurrenceManager.getRecurrenceData() : null;

            // Create a new recurring event series
            if (isRecurring && !eventId) {
                this.createRecurringEventSeries(eventData, recurrenceData);
            } else if (eventId && !isRecurringChild) {
                this.updateExistingEvent(eventId, eventData, isRecurring, recurrenceData);
            } else {
                this.createSingleEvent(eventData);
            }
        }
    },
    
    /**
     * Create a new recurring event series
     * @param {object} eventData - The event data
     * @param {object} recurrenceData - The recurrence pattern data
     */
    createRecurringEventSeries: function(eventData, recurrenceData) {
        // Calculate all occurrence dates
        const occurrences = RecurrenceManager.calculateOccurrences(eventData.date, recurrenceData);

        // Create a batch to save all the events
        const batch = DataManager.createBatch();

        // Create parent event ID
        const parentId = window.shopAuth.db.collection('Events').doc().id;

        // For each occurrence, create an event
        occurrences.forEach((occurrenceDate, index) => {
            // Reference for this occurrence (parent for first, new ID for rest)
            const occurrenceRef = index === 0
                ? window.shopAuth.db.collection('Events').doc(parentId)
                : window.shopAuth.db.collection('Events').doc();

            // Create event data
            const firestoreData = {
                shopId: DataManager.shopId,
                name: eventData.name,
                date: firebase.firestore.Timestamp.fromDate(new Date(occurrenceDate)),
                startTime: eventData.startTime,
                endTime: eventData.endTime,
                description: eventData.description,
                attendanceLimit: eventData.attendanceLimit,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Add recurrence information
            if (index === 0) {
                // This is the parent event
                firestoreData.isRecurringParent = true;
                firestoreData.recurrencePattern = recurrenceData;
            } else {
                // Child event
                firestoreData.isRecurringChild = true;
                firestoreData.parentEventId = parentId;
                firestoreData.occurrenceIndex = index;
            }

            // Add this event to the batch
            batch.set(occurrenceRef, firestoreData);
        });

        // Commit the batch
        batch.commit()
            .then(() => {
                UIManager.showMessage(
                    `Recurring event created with ${occurrences.length} occurrences`,
                    'success'
                );
                UIManager.closeModal();
                this.loadEvents();
            })
            .catch((error) => {
                console.error('Error saving recurring events:', error);
                UIManager.showMessage('Error saving recurring events: ' + error.message, 'error', true);
            });
    },
    
    /**
     * Update an existing event
     * @param {string} eventId - The event ID
     * @param {object} eventData - The event data
     * @param {boolean} isRecurring - Whether this is a recurring event
     * @param {object} recurrenceData - The recurrence pattern data
     */
    updateExistingEvent: function(eventId, eventData, isRecurring, recurrenceData) {
        const firestoreData = {
            ...eventData,
            date: firebase.firestore.Timestamp.fromDate(new Date(eventData.date))
        };

        // Add recurrence data if this is a recurring parent
        if (isRecurring) {
            firestoreData.isRecurringParent = true;
            firestoreData.recurrencePattern = recurrenceData;
        }

        // Update the event
        DataManager.updateEvent(eventId, firestoreData)
            .then(() => {
                UIManager.showMessage('Event updated successfully', 'success');
                UIManager.closeModal();
                this.loadEvents();
            })
            .catch((error) => {
                console.error('Error updating event:', error);
                UIManager.showMessage('Error updating event: ' + error.message, 'error', true);
            });
    },
    
    /**
     * Create a single (non-recurring) event
     * @param {object} eventData - The event data
     */
    createSingleEvent: function(eventData) {
        const firestoreData = {
            ...eventData,
            date: firebase.firestore.Timestamp.fromDate(new Date(eventData.date))
        };

        // Save to Firestore
        DataManager.saveEvent(firestoreData)
            .then(() => {
                UIManager.showMessage('Event added successfully', 'success');
                UIManager.closeModal();
                this.loadEvents();
            })
            .catch((error) => {
                console.error('Error saving event:', error);
                UIManager.showMessage('Error saving event: ' + error.message, 'error', true);
            });
    }
};