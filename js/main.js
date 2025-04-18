/**
 * Main initialization script for the Shop Events page
 */
document.addEventListener('DOMContentLoaded', function() {
    // Verify shop owner access
    window.shopAuth.verifyShopOwner(function(user, shopData) {
        // Store shop ID and initialize the Event Manager
        EventManager.init(shopData.id);

        // Initialize Recurrence options
        RecurrenceManager.toggleRecurrenceTypeOptions();
        RecurrenceManager.toggleEndRecurrenceOptions();

        console.log('Shop Events page initialized successfully');
    });
});

