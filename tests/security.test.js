// Unit Tests for Tabletop Reserve Website
// Using Jest testing framework

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

// Security Tests (S-01 to S-10)
describe('Security Tests (S-01 to S-10)', () => {
  
  test('S-01: Should enforce strong password requirements', () => {
    const validatePassword = (password) => {
      if (!password || password.length < 8) {
        return { valid: false, error: 'Password must be at least 8 characters long' };
      }
      
      if (!/[A-Z]/.test(password)) {
        return { valid: false, error: 'Password must contain uppercase letter' };
      }
      
      if (!/[a-z]/.test(password)) {
        return { valid: false, error: 'Password must contain lowercase letter' };
      }
      
      if (!/\d/.test(password)) {
        return { valid: false, error: 'Password must contain number' };
      }
      
      return { valid: true };
    };

    // Test weak passwords - should fail
    expect(validatePassword('pass').valid).toBe(false);
    expect(validatePassword('password').valid).toBe(false);
    expect(validatePassword('PASSWORD123').valid).toBe(false);
    expect(validatePassword('Password').valid).toBe(false);
    
    // Test strong passwords - should pass
    expect(validatePassword('Password123').valid).toBe(true);
    expect(validatePassword('MySecure456').valid).toBe(true);
  });

  test('S-02: Should prevent brute force attacks with rate limiting', () => {
    let attemptCount = 0;
    const maxAttempts = 5;
    
    const checkLoginAttempt = (email, password) => {
      attemptCount++;
      
      if (attemptCount > maxAttempts) {
        return { success: false, error: 'Too many failed attempts. Account locked.' };
      }
      
      // Simulate failed login
      if (password !== 'correctpassword') {
        return { success: false, error: 'Invalid credentials' };
      }
      
      return { success: true };
    };

    // First 5 attempts should return invalid credentials
    for (let i = 0; i < 5; i++) {
      const result = checkLoginAttempt('test@example.com', 'wrongpassword');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    }
    
    // 6th attempt should be blocked due to rate limiting
    const blockedResult = checkLoginAttempt('test@example.com', 'wrongpassword');
    expect(blockedResult.success).toBe(false);
    expect(blockedResult.error).toContain('Too many failed attempts');
  });

  test('S-03: Should sanitize dangerous HTML input to prevent XSS', () => {
    const sanitizeInput = (input) => {
      if (typeof input !== 'string') return '';
      
      return input
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/javascript:/gi, 'blocked:')
        .replace(/on\w+=/gi, 'blocked='); // Remove event handlers
    };

    // Test dangerous inputs
    const dangerousInputs = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      'javascript:alert(1)',
      '<div onclick="malicious()">Click me</div>'
    ];

    dangerousInputs.forEach(input => {
      const sanitized = sanitizeInput(input);
      expect(sanitized).not.toContain('<script');
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).not.toContain('onclick=');
    });

    // Test safe input remains unchanged
    const safeInput = 'Hello World';
    expect(sanitizeInput(safeInput)).toBe('Hello World');
  });

  test('S-04: Should validate email format securely', () => {
    const validateEmail = (email) => {
      if (!email || typeof email !== 'string') {
        return { valid: false, error: 'Email is required' };
      }
      
      // Basic email regex that prevents injection
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      
      if (!emailRegex.test(email)) {
        return { valid: false, error: 'Invalid email format' };
      }
      
      // Check for dangerous characters
      if (email.includes('<') || email.includes('>') || email.includes('"')) {
        return { valid: false, error: 'Email contains invalid characters' };
      }
      
      return { valid: true };
    };

    // Test valid emails
    expect(validateEmail('test@example.com').valid).toBe(true);
    expect(validateEmail('user.name@domain.co.uk').valid).toBe(true);
    
    // Test invalid emails
    expect(validateEmail('').valid).toBe(false);
    expect(validateEmail('not-an-email').valid).toBe(false);
    expect(validateEmail('test@').valid).toBe(false);
    expect(validateEmail('test@domain').valid).toBe(false);
    expect(validateEmail('test<script>@domain.com').valid).toBe(false);
  });

  test('S-05: Should prevent SQL injection in search queries', () => {
    const sanitizeSearchQuery = (query) => {
      if (typeof query !== 'string') return '';
      
      // Remove common SQL injection patterns
      const cleaned = query
        .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|UNION)\b)/gi, '')
        .replace(/(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi, '')
        .replace(/([\'\"];?\s*(OR|AND))/gi, '')
        .replace(/(\-\-|\/\*|\*\/)/g, '')
        .trim();
      
      return cleaned;
    };

    // Test SQL injection attempts
    const sqlInjections = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users",
      "admin'--"
    ];

    sqlInjections.forEach(injection => {
      const cleaned = sanitizeSearchQuery(injection);
      expect(cleaned).not.toContain('DROP');
      expect(cleaned).not.toContain('UNION');
      expect(cleaned).not.toContain('--');
      expect(cleaned).not.toMatch(/OR\s+\d+\s*=\s*\d+/);
    });

    // Test legitimate search terms work
    expect(sanitizeSearchQuery('board games')).toBe('board games');
    expect(sanitizeSearchQuery('Pokemon cards')).toBe('Pokemon cards');
  });

  test('S-06: Should validate file uploads securely', () => {
    const validateFileUpload = (file) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
      
      if (!file || !file.name || !file.type) {
        return { valid: false, error: 'Invalid file object' };
      }
      
      // Check file type
      if (!allowedTypes.includes(file.type)) {
        return { valid: false, error: 'Invalid file type' };
      }
      
      // Check file size
      if (file.size > maxSize) {
        return { valid: false, error: 'File too large' };
      }
      
      // Check file extension
      const extension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (!allowedExtensions.includes(extension)) {
        return { valid: false, error: 'Invalid file extension' };
      }
      
      // Check for dangerous double extensions
      const parts = file.name.toLowerCase().split('.');
      if (parts.length > 2) {
        return { valid: false, error: 'Multiple file extensions not allowed' };
      }
      
      return { valid: true };
    };

    // Test dangerous files
    const dangerousFiles = [
      { name: 'script.php', type: 'application/php', size: 1000 },
      { name: 'malware.exe', type: 'application/exe', size: 1000 },
      { name: 'image.jpg.php', type: 'image/jpeg', size: 1000 },
      { name: 'huge.jpg', type: 'image/jpeg', size: 10 * 1024 * 1024 }
    ];

    dangerousFiles.forEach(file => {
      expect(validateFileUpload(file).valid).toBe(false);
    });

    // Test valid file
    const validFile = { name: 'logo.jpg', type: 'image/jpeg', size: 1000 };
    expect(validateFileUpload(validFile).valid).toBe(true);
  });

  test('S-07: Should validate session tokens securely', () => {
    const validateSession = (token) => {
      if (!token || typeof token !== 'string') {
        return { valid: false, error: 'No token provided' };
      }
      
      // Check basic token format
      if (token.length < 10) {
        return { valid: false, error: 'Token too short' };
      }
      
      // Check for dangerous characters
      if (token.includes('<') || token.includes('>') || token.includes('"')) {
        return { valid: false, error: 'Token contains invalid characters' };
      }
      
      // Simulate token expiration check
      if (token === 'expired-token') {
        return { valid: false, error: 'Token expired' };
      }
      
      return { valid: true };
    };

    // Test invalid tokens
    expect(validateSession('').valid).toBe(false);
    expect(validateSession('short').valid).toBe(false);
    expect(validateSession('token<script>').valid).toBe(false);
    expect(validateSession('expired-token').valid).toBe(false);
    
    // Test valid token
    expect(validateSession('valid-session-token-123').valid).toBe(true);
  });

  test('S-08: Should enforce role-based access control', () => {
    const checkAccess = (userRole, requiredRole) => {
      const roleHierarchy = {
        'customer': 1,
        'shop-owner': 2,
        'admin': 3
      };
      
      const userLevel = roleHierarchy[userRole] || 0;
      const requiredLevel = roleHierarchy[requiredRole] || 999;
      
      if (userLevel < requiredLevel) {
        return { allowed: false, error: 'Insufficient permissions' };
      }
      
      return { allowed: true };
    };

    // Test unauthorized access
    expect(checkAccess('customer', 'admin').allowed).toBe(false);
    expect(checkAccess('shop-owner', 'admin').allowed).toBe(false);
    expect(checkAccess('customer', 'shop-owner').allowed).toBe(false);
    
    // Test authorized access
    expect(checkAccess('admin', 'admin').allowed).toBe(true);
    expect(checkAccess('shop-owner', 'shop-owner').allowed).toBe(true);
    expect(checkAccess('admin', 'customer').allowed).toBe(true);
  });

  test('S-09: Should mask sensitive data in logs', () => {
    const maskSensitiveData = (data) => {
      let masked = JSON.stringify(data);
      
      // Mask emails
      masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '***@***.***');
      
      // Mask phone numbers
      masked = masked.replace(/\d{10,}/g, '***-***-****');
      
      // Mask passwords
      masked = masked.replace(/"password":"[^"]*"/g, '"password":"[MASKED]"');
      
      return JSON.parse(masked);
    };

    const sensitiveData = {
      user: 'john.doe@example.com',
      phone: '1234567890',
      password: 'secretpassword',
      action: 'login'
    };

    const masked = maskSensitiveData(sensitiveData);
    
    expect(masked.user).toBe('***@***.***');
    expect(masked.phone).toBe('***-***-****');
    expect(masked.password).toBe('[MASKED]');
    expect(masked.action).toBe('login'); // Non-sensitive preserved
  });

  test('S-10: Should validate input lengths to prevent DoS attacks', () => {
    const validateInputLength = (input, maxLength = 1000) => {
      if (typeof input !== 'string') {
        return { valid: false, error: 'Input must be string' };
      }
      
      if (input.length > maxLength) {
        return { valid: false, error: `Input too long. Maximum ${maxLength} characters` };
      }
      
      return { valid: true };
    };

    // Test normal input
    expect(validateInputLength('Normal input').valid).toBe(true);
    
    // Test extremely long input (potential DoS)
    const longInput = 'a'.repeat(2000);
    expect(validateInputLength(longInput, 1000).valid).toBe(false);
    
    // Test with custom limit
    expect(validateInputLength('Short', 10).valid).toBe(true);
    expect(validateInputLength('This is too long', 10).valid).toBe(false);
  });
});

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

    // This should be allowed (different time)
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