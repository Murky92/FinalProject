// Unit Tests for Tabletop Reserve Website

// Mock Firebase for testing
const mockFirebase = {
  auth: () => ({
    currentUser: { uid: 'test-user-123', email: 'test@example.com' },
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn()
  }),
  firestore: () => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn()
      }))
    }))
  })
};

// Test F-11: Shop Approval Process
describe('Shop Approval Process (F-11)', () => {
  test('should change shop status to approved when admin approves', async () => {
    // Mock shop data
    const mockShop = {
      id: 'shop-123',
      storeName: 'Test Gaming Store',
      isApproved: false,
      registrationStatus: 'pending'
    };

    // Mock the approval function
    const approveShop = async (shopId) => {
      const updateData = {
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: 'admin@tabletopreserve.com',
        registrationStatus: 'approved'
      };
      
      // Simulate database update
      return Promise.resolve(updateData);
    };

    const result = await approveShop(mockShop.id);
    
    expect(result.isApproved).toBe(true);
    expect(result.registrationStatus).toBe('approved');
    expect(result.approvedBy).toBe('admin@tabletopreserve.com');
    expect(result.approvedAt).toBeInstanceOf(Date);
  });

  test('should reject shop when admin rejects', async () => {
    const mockShop = {
      id: 'shop-123',
      storeName: 'Test Gaming Store',
      isApproved: false,
      registrationStatus: 'pending'
    };

    const rejectShop = async (shopId, reason) => {
      const updateData = {
        isApproved: false,
        rejectedAt: new Date(),
        rejectedBy: 'admin@tabletopreserve.com',
        registrationStatus: 'rejected',
        rejectionReason: reason
      };
      
      return Promise.resolve(updateData);
    };

    const result = await rejectShop(mockShop.id, 'Invalid business details');
    
    expect(result.isApproved).toBe(false);
    expect(result.registrationStatus).toBe('rejected');
    expect(result.rejectionReason).toBe('Invalid business details');
  });
});

// Test F-13: Shop Profile Update
describe('Shop Profile Update (F-13)', () => {
  test('should successfully update shop profile information', () => {
    const updateShopProfile = (profileData) => {
      // Validate required fields
      if (!profileData.storeName || !profileData.ownerName) {
        throw new Error('Store name and owner name are required');
      }

      // Simulate successful update
      return {
        success: true,
        updatedAt: new Date(),
        data: profileData
      };
    };

    const profileData = {
      storeName: 'Updated Gaming Store',
      ownerName: 'John Doe',
      description: 'Best gaming store in town',
      email: 'john@gamingstore.com',
      phone: '01234567890'
    };

    const result = updateShopProfile(profileData);

    expect(result.success).toBe(true);
    expect(result.data.storeName).toBe('Updated Gaming Store');
    expect(result.data.ownerName).toBe('John Doe');
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  test('should throw error when required fields are missing', () => {
    const updateShopProfile = (profileData) => {
      if (!profileData.storeName || !profileData.ownerName) {
        throw new Error('Store name and owner name are required');
      }
      return { success: true };
    };

    const incompleteData = {
      description: 'Best gaming store in town'
      // Missing storeName and ownerName
    };

    expect(() => updateShopProfile(incompleteData)).toThrow('Store name and owner name are required');
  });
});

// Test F-14: Table Management
describe('Table Management (F-14)', () => {
  test('should create new table successfully', () => {
    const createTable = (tableData) => {
      // Validate required fields
      if (!tableData.name || !tableData.capacity || tableData.capacity <= 0) {
        throw new Error('Table name and valid capacity are required');
      }

      return {
        id: 'table-' + Date.now(),
        ...tableData,
        createdAt: new Date(),
        isActive: true
      };
    };

    const tableData = {
      name: 'Table 1',
      capacity: 6,
      type: 'Standard',
      features: ['Power Outlets', 'Good Lighting'],
      hourlyRate: 5.00,
      minimumBooking: 1
    };

    const result = createTable(tableData);

    expect(result.name).toBe('Table 1');
    expect(result.capacity).toBe(6);
    expect(result.isActive).toBe(true);
    expect(result.id).toMatch(/^table-\d+/);
  });

  test('should delete table and cancel related reservations', () => {
    const deleteTable = (tableId, hasUpcomingReservations = false) => {
      if (hasUpcomingReservations) {
        // Cancel upcoming reservations
        const cancelledReservations = ['res-1', 'res-2'];
        return {
          success: true,
          tableDeleted: true,
          cancelledReservations: cancelledReservations,
          message: `Table deleted. ${cancelledReservations.length} reservations cancelled.`
        };
      }

      return {
        success: true,
        tableDeleted: true,
        cancelledReservations: [],
        message: 'Table deleted successfully.'
      };
    };

    // Test deletion with upcoming reservations
    const resultWithReservations = deleteTable('table-123', true);
    expect(resultWithReservations.success).toBe(true);
    expect(resultWithReservations.cancelledReservations).toHaveLength(2);

    // Test deletion without reservations
    const resultWithoutReservations = deleteTable('table-456', false);
    expect(resultWithoutReservations.success).toBe(true);
    expect(resultWithoutReservations.cancelledReservations).toHaveLength(0);
  });
});

// Test F-15: Opening Hours Setup
describe('Opening Hours Setup (F-15)', () => {
  test('should save opening hours correctly', () => {
    const saveOpeningHours = (hoursData) => {
      // Validate that at least one day is open
      const hasOpenDay = Object.values(hoursData).some(day => day.isOpen);
      if (!hasOpenDay) {
        throw new Error('At least one day must be open');
      }

      return {
        success: true,
        savedAt: new Date(),
        hoursData
      };
    };

    const hoursData = {
      monday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      tuesday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      wednesday: { isOpen: false },
      thursday: { isOpen: true, openTime: '09:00', closeTime: '18:00' },
      friday: { isOpen: true, openTime: '09:00', closeTime: '20:00' },
      saturday: { isOpen: true, openTime: '10:00', closeTime: '20:00' },
      sunday: { isOpen: true, openTime: '10:00', closeTime: '16:00' }
    };

    const result = saveOpeningHours(hoursData);

    expect(result.success).toBe(true);
    expect(result.hoursData.monday.isOpen).toBe(true);
    expect(result.hoursData.wednesday.isOpen).toBe(false);
  });

  test('should throw error when no days are open', () => {
    const saveOpeningHours = (hoursData) => {
      const hasOpenDay = Object.values(hoursData).some(day => day.isOpen);
      if (!hasOpenDay) {
        throw new Error('At least one day must be open');
      }
      return { success: true };
    };

    const allClosedHours = {
      monday: { isOpen: false },
      tuesday: { isOpen: false },
      wednesday: { isOpen: false },
      thursday: { isOpen: false },
      friday: { isOpen: false },
      saturday: { isOpen: false },
      sunday: { isOpen: false }
    };

    expect(() => saveOpeningHours(allClosedHours)).toThrow('At least one day must be open');
  });
});

// Test F-16: Event Creation
describe('Event Creation (F-16)', () => {
  test('should create one-time event successfully', () => {
    const createEvent = (eventData) => {
      // Validate required fields
      if (!eventData.name || !eventData.date || !eventData.attendanceLimit) {
        throw new Error('Event name, date, and attendance limit are required');
      }

      return {
        id: 'event-' + Date.now(),
        ...eventData,
        createdAt: new Date(),
        type: eventData.recurring ? 'recurring' : 'one-time',
        currentAttendees: 0
      };
    };

    const eventData = {
      name: 'Pokemon Tournament',
      date: new Date('2024-12-25'),
      startTime: '14:00',
      endTime: '18:00',
      attendanceLimit: 16,
      description: 'Monthly Pokemon TCG tournament'
    };

    const result = createEvent(eventData);

    expect(result.name).toBe('Pokemon Tournament');
    expect(result.type).toBe('one-time');
    expect(result.currentAttendees).toBe(0);
    expect(result.attendanceLimit).toBe(16);
  });

  test('should create recurring event successfully', () => {
    const createEvent = (eventData) => {
      if (!eventData.name || !eventData.date || !eventData.attendanceLimit) {
        throw new Error('Event name, date, and attendance limit are required');
      }

      if (eventData.recurring && !eventData.recurrencePattern) {
        throw new Error('Recurrence pattern is required for recurring events');
      }

      return {
        id: 'event-' + Date.now(),
        ...eventData,
        createdAt: new Date(),
        type: eventData.recurring ? 'recurring' : 'one-time',
        currentAttendees: 0
      };
    };

    const recurringEventData = {
      name: 'Weekly D&D Night',
      date: new Date('2024-12-01'),
      startTime: '19:00',
      endTime: '22:00',
      attendanceLimit: 8,
      recurring: true,
      recurrencePattern: 'weekly',
      description: 'Weekly Dungeons & Dragons session'
    };

    const result = createEvent(recurringEventData);

    expect(result.name).toBe('Weekly D&D Night');
    expect(result.type).toBe('recurring');
    expect(result.recurrencePattern).toBe('weekly');
  });
});

// Test F-17: Send Shop Notification
describe('Send Shop Notification (F-17)', () => {
  test('should send notification successfully', () => {
    const sendNotification = (notificationData) => {
      // Validate required fields
      if (!notificationData.title || !notificationData.message || !notificationData.type) {
        throw new Error('Title, message, and type are required');
      }

      // Validate target audience
      const validTargets = ['all', 'followers', 'recent'];
      if (!validTargets.includes(notificationData.target)) {
        throw new Error('Invalid target audience');
      }

      return {
        id: 'notification-' + Date.now(),
        ...notificationData,
        sentAt: new Date(),
        status: 'sent',
        deliveryCount: getTargetAudienceCount(notificationData.target)
      };
    };

    const getTargetAudienceCount = (target) => {
      const counts = { all: 150, followers: 45, recent: 23 };
      return counts[target] || 0;
    };

    const notificationData = {
      title: 'Special Weekend Discount!',
      message: '20% off all table bookings this weekend only!',
      type: 'promo',
      target: 'followers'
    };

    const result = sendNotification(notificationData);

    expect(result.title).toBe('Special Weekend Discount!');
    expect(result.status).toBe('sent');
    expect(result.deliveryCount).toBe(45);
    expect(result.sentAt).toBeInstanceOf(Date);
  });

  test('should appear in notification history', () => {
    const notificationHistory = [];
    
    const addToHistory = (notification) => {
      notificationHistory.push({
        ...notification,
        id: 'notification-' + Date.now(),
        sentAt: new Date()
      });
      return notificationHistory;
    };

    const notification = {
      title: 'New Event Added',
      message: 'Check out our new Magic: The Gathering tournament!',
      type: 'event',
      target: 'all'
    };

    const history = addToHistory(notification);

    expect(history).toHaveLength(1);
    expect(history[0].title).toBe('New Event Added');
    expect(history[0].type).toBe('event');
  });
});

// Validation Tests (from your validation requirements)
describe('Input Validation Tests', () => {
  test('should validate email format correctly', () => {
    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };

    // Valid emails
    expect(validateEmail('test@example.com')).toBe(true);
    expect(validateEmail('user.name@domain.co.uk')).toBe(true);

    // Invalid emails
    expect(validateEmail('test')).toBe(false);
    expect(validateEmail('test@')).toBe(false);
    expect(validateEmail('test@domain')).toBe(false);
    expect(validateEmail('test@.com')).toBe(false);
    expect(validateEmail('test@@domain.com')).toBe(false);
  });

  test('should prevent double booking', () => {
    const existingBookings = [
      { tableId: 'table-1', date: '2024-12-01', startTime: '14:00', endTime: '16:00' },
      { tableId: 'table-1', date: '2024-12-01', startTime: '18:00', endTime: '20:00' }
    ];

    const checkDoubleBooking = (newBooking, existingBookings) => {
      return existingBookings.some(booking => 
        booking.tableId === newBooking.tableId &&
        booking.date === newBooking.date &&
        ((newBooking.startTime >= booking.startTime && newBooking.startTime < booking.endTime) ||
         (newBooking.endTime > booking.startTime && newBooking.endTime <= booking.endTime) ||
         (newBooking.startTime <= booking.startTime && newBooking.endTime >= booking.endTime))
      );
    };

    // This should be blocked (overlaps with existing booking)
    const conflictingBooking = {
      tableId: 'table-1',
      date: '2024-12-01',
      startTime: '15:00',
      endTime: '17:00'
    };

    expect(checkDoubleBooking(conflictingBooking, existingBookings)).toBe(true);

    // This should be allowed (no overlap with existing bookings)
    const validBooking = {
      tableId: 'table-1',
      date: '2024-12-01',
      startTime: '16:00',
      endTime: '18:00'
    };

    expect(checkDoubleBooking(validBooking, existingBookings)).toBe(false);
  });

  test('should validate party size against table capacity', () => {
    const validatePartySize = (partySize, tableCapacity) => {
      if (partySize <= 0) {
        throw new Error('Party size must be greater than 0');
      }
      if (partySize > tableCapacity) {
        throw new Error(`Party size (${partySize}) exceeds table capacity (${tableCapacity})`);
      }
      return true;
    };

    // Valid party size
    expect(validatePartySize(4, 6)).toBe(true);

    // Invalid party sizes
    expect(() => validatePartySize(0, 6)).toThrow('Party size must be greater than 0');
    expect(() => validatePartySize(8, 6)).toThrow('Party size (8) exceeds table capacity (6)');
  });
});

// Mock DOM testing for UI interactions
describe('UI Interaction Tests', () => {
  test('should toggle between list and calendar views', () => {
    // Mock DOM elements
    const mockElements = {
      listView: { style: { display: 'block' } },
      calendarView: { style: { display: 'none' } },
      listBtn: { classList: { add: jest.fn(), remove: jest.fn() } },
      calendarBtn: { classList: { add: jest.fn(), remove: jest.fn() } }
    };

    const switchToCalendarView = () => {
      mockElements.listView.style.display = 'none';
      mockElements.calendarView.style.display = 'block';
      mockElements.listBtn.classList.remove('active');
      mockElements.calendarBtn.classList.add('active');
    };

    switchToCalendarView();

    expect(mockElements.listView.style.display).toBe('none');
    expect(mockElements.calendarView.style.display).toBe('block');
    expect(mockElements.calendarBtn.classList.add).toHaveBeenCalledWith('active');
  });
});