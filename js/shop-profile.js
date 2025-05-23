/**
 * Tabletop Reserve - Shop Profile Management
 * Handles shop profile data management, form interaction, and logo uploads
 */

// Global variables for logo upload
let logoFile = null;
let logoChanged = false;

// Constants for logo validation
const VALID_FILE_TYPES = ['image/png', 'image/jpeg', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MIN_DIMENSION = 500; // Minimum acceptable width/height
const IDEAL_DIMENSION = 1200; // Ideal width/height

/**
 * Initialize the page when the DOM is loaded
 */
document.addEventListener('DOMContentLoaded', function() {
    // Set up file input for logo upload
    const logoUpload = document.getElementById('logo-upload');
    if (logoUpload) {
        logoUpload.addEventListener('change', handleLogoSelect);
    }
    
    // Set up form submission handlers
    const basicForm = document.getElementById('basic-form');
    if (basicForm) {
        basicForm.addEventListener('submit', handleBasicFormSubmit);
    }
    
    const detailsForm = document.getElementById('details-form');
    if (detailsForm) {
        detailsForm.addEventListener('submit', handleDetailsFormSubmit);
    }
    
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }
    
    // Close notification when clicking the X
    const notificationClose = document.querySelector('.notification-close');
    if (notificationClose) {
        notificationClose.addEventListener('click', closeNotification);
    }
});

/**
 * Switch between tabs
 * @param {string} tabId - The ID of the tab to switch to
 */
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show the selected tab
    document.getElementById(tabId + '-info').classList.add('active');
    
    // Add active class to the clicked button
    document.getElementById('tab-' + tabId).classList.add('active');
}

/**
 * Populate forms with existing shop data
 * @param {Object} shopData - The shop data object
 */
function populateForms(shopData) {
    // Basic Information
    document.getElementById('shop-name').value = shopData.storeName || '';
    document.getElementById('owner-name').value = shopData.ownerName || '';
    document.getElementById('shop-description').value = shopData.description || '';
    document.getElementById('shop-type').value = shopData.shopType || 'game-store';
    
    // Load logo image if available
    if (shopData.logoUrl) {
        document.getElementById('logo-preview-image').src = shopData.logoUrl;
        document.getElementById('upload-status').textContent = 'Current logo loaded';
    }
    
    // Contact Information
    document.getElementById('shop-email').value = shopData.email || '';
    document.getElementById('shop-phone').value = shopData.phoneNumber || '';
    document.getElementById('shop-address').value = shopData.address || '';
    document.getElementById('shop-city').value = shopData.city || '';
    document.getElementById('shop-county').value = shopData.county || '';
    document.getElementById('shop-postcode').value = shopData.postCode || '';
    document.getElementById('shop-website').value = shopData.website || '';
    document.getElementById('shop-social').value = shopData.socialMedia || '';
    
    // Shop Details - Amenities
    if (shopData.amenities) {
        document.getElementById('wifi').checked = shopData.amenities.wifi || false;
        document.getElementById('food').checked = shopData.amenities.food || false;
        document.getElementById('drinks').checked = shopData.amenities.drinks || false;
        document.getElementById('parking').checked = shopData.amenities.parking || false;
        document.getElementById('accessible').checked = shopData.amenities.accessible || false;
        document.getElementById('library').checked = shopData.amenities.gameLibrary || false;
    }
    
    // Shop Details - Payment Methods
    if (shopData.paymentMethods) {
        document.getElementById('cash').checked = shopData.paymentMethods.cash || false;
        document.getElementById('credit').checked = shopData.paymentMethods.credit || false;
        document.getElementById('debit').checked = shopData.paymentMethods.debit || false;
        document.getElementById('mobile').checked = shopData.paymentMethods.mobile || false;
    }
    
    document.getElementById('shop-specialty').value = shopData.specialty || '';
}

/**
 * Handle logo file selection
 * @param {Event} e - The change event
 */
function handleLogoSelect(e) {
    const file = e.target.files[0];
    const statusElement = document.getElementById('upload-status');
    
    if (!file) return;
    
    updateStatus('Checking file...', 'normal');
    
    // Type validation
    if (!VALID_FILE_TYPES.includes(file.type)) {
        showNotification('Invalid file type. Please use PNG, JPEG, or GIF.', 'error');
        updateStatus('Error: Invalid file type', 'error');
        return;
    }
    
    // Size validation
    if (file.size > MAX_FILE_SIZE) {
        showNotification(`File size too large. Maximum size is ${MAX_FILE_SIZE/1024/1024}MB.`, 'error');
        updateStatus('Error: File too large', 'error');
        return;
    }
    
    // Check image dimensions
    validateImageDimensions(file);
}

/**
 * Validate image dimensions
 * @param {File} file - The file to validate
 */
function validateImageDimensions(file) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = function() {
        // Image dimension validation
        if (img.width < MIN_DIMENSION || img.height < MIN_DIMENSION) {
            URL.revokeObjectURL(objectUrl); // Clean up 
            showNotification(`Image too small. Minimum dimensions: ${MIN_DIMENSION}x${MIN_DIMENSION}px`, 'error');
            updateStatus('Error: Image too small', 'error');
            return;
        }
        
        // Warn if not square
        if (Math.abs(img.width - img.height) > 10) { // Allow small difference
            showNotification('Warning: Logo should be square for best appearance', 'error');
            updateStatus(`Selected: ${file.name} (Warning: Not square)`, 'warning');
        } else if (img.width < IDEAL_DIMENSION) {
            updateStatus(`Selected: ${file.name} (Acceptable, but ${IDEAL_DIMENSION}x${IDEAL_DIMENSION}px recommended)`, 'warning');
        } else {
            updateStatus(`Selected: ${file.name} (Good size)`, 'success');
        }
        
        // Store the file for upload later
        logoFile = file;
        logoChanged = true;
        
        // Create a preview
        document.getElementById('logo-preview-image').src = objectUrl;
    };
    
    img.onerror = function() {
        URL.revokeObjectURL(objectUrl); // Clean up
        showNotification('Invalid image file or unable to load the image', 'error');
        updateStatus('Error: Unable to process image', 'error');
    };
    
    // Load the image to check dimensions
    img.src = objectUrl;
}

/**
 * Update status message with appropriate styling
 * @param {string} message - The status message
 * @param {string} type - Message type (normal, warning, error, success)
 */
function updateStatus(message, type = 'normal') {
    const statusElement = document.getElementById('upload-status');
    if (!statusElement) return;
    
    // Clear existing classes
    statusElement.className = 'upload-status';
    
    // Add type-specific class if not normal
    if (type !== 'normal') {
        statusElement.classList.add(type);
    }
    
    statusElement.textContent = message;
}

/**
 * Handle Basic Information Form Submit
 * @param {Event} e - The submit event
 */
function handleBasicFormSubmit(e) {
    e.preventDefault();
    
    // Disable submit button to prevent multiple submissions
    const submitButton = e.target.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Saving...';
    
    const shopData = window.shopAuth.getShopData();
    
    if (!shopData || !shopData.id) {
        showNotification('Error: Shop data not available', 'error');
        submitButton.disabled = false;
        submitButton.textContent = 'Save Changes';
        return;
    }
    
    // Get form values
    const updates = {
        storeName: document.getElementById('shop-name').value,
        ownerName: document.getElementById('owner-name').value,
        description: document.getElementById('shop-description').value,
        shopType: document.getElementById('shop-type').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Create a promise chain for our operations
    let savePromise = Promise.resolve();
    
    // If logo changed, upload it first
    if (logoChanged && logoFile) {
        savePromise = uploadLogo(logoFile, shopData.id)
            .then(logoUrl => {
                // Add the logo URL to our updates
                updates.logoUrl = logoUrl;
            })
            .catch(error => {
                console.error('Error uploading logo:', error);
                showNotification('Error uploading logo: ' + error.message, 'error');
                throw error; // Re-throw to break the chain
            });
    }
    
    // Continue with the Firestore update
    savePromise
        .then(() => {
            return window.shopAuth.db.collection('Stores').doc(shopData.id).update(updates);
        })
        .then(() => {
            showNotification('Basic information updated successfully!', 'success');
            
            // Reset logoChanged flag
            logoChanged = false;
            
            // Refresh shop data
            window.shopAuth.refreshShopData();
        })
        .catch((error) => {
            console.error('Error updating shop:', error);
            showNotification('Error: ' + error.message, 'error');
        })
        .finally(() => {
            // Re-enable the submit button
            submitButton.disabled = false;
            submitButton.textContent = 'Save Changes';
        });
}

/**
 * Upload logo to Firebase Storage
 * @param {File} file - The file to upload
 * @param {string} shopId - The shop ID
 * @returns {Promise<string>} - Promise resolving to the download URL
 */
function uploadLogo(file, shopId) {
    return new Promise((resolve, reject) => {
        // Create a storage reference
        const storageRef = firebase.storage().ref();
        
        // Get the file extension from the file name
        const fileExtension = file.name.split('.').pop();
        const shopLogoFolder = `shop_logos/${shopId}`;
        const newLogoFileName = `logo.${fileExtension}`;
        const logoRef = storageRef.child(`${shopLogoFolder}/${newLogoFileName}`);
        
        
        storageRef.child(shopLogoFolder).listAll()
            .then((listResults) => {
                // Create an array of promises for deleting existing files
                const deletePromises = listResults.items.map(item => {
                    
                    if (item.name !== newLogoFileName) {
                        console.log(`Deleting old logo file: ${item.name}`);
                        return item.delete();
                    }
                    return Promise.resolve(); 
                });
                
                // Wait for all deletions to complete
                return Promise.all(deletePromises);
            })
            .then(() => {
                // Show upload progress UI
                const progressBar = document.getElementById('upload-progress');
                const progressBarInner = document.getElementById('upload-progress-bar');
                progressBar.style.display = 'block';
                progressBarInner.style.width = '0%';
                
                // Upload the new file with progress tracking
                const uploadTask = logoRef.put(file);
                
                uploadTask.on('state_changed', 
                    // Progress function
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBarInner.style.width = progress + '%';
                        updateStatus(`Uploading: ${Math.round(progress)}%`, 'normal');
                    }, 
                    // Error function
                    (error) => {
                        progressBar.style.display = 'none';
                        updateStatus('Upload failed', 'error');
                        reject(error);
                    }, 
                    // Complete function
                    () => {
                        // Get the download URL
                        uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                            progressBar.style.display = 'none';
                            updateStatus('Upload completed', 'success');
                            resolve(downloadURL);
                        }).catch(reject);
                    }
                );
            })
            .catch(error => {
                console.error("Error managing logo files:", error);
                reject(error);
            });
    });
}

/**
 * Handle Shop Details Form Submit
 * @param {Event} e - The submit event
 */
function handleDetailsFormSubmit(e) {
    e.preventDefault();
    
    const updates = {
        amenities: {
            wifi: document.getElementById('wifi').checked,
            food: document.getElementById('food').checked,
            drinks: document.getElementById('drinks').checked,
            parking: document.getElementById('parking').checked,
            accessible: document.getElementById('accessible').checked,
            gameLibrary: document.getElementById('library').checked
        },
        paymentMethods: {
            cash: document.getElementById('cash').checked,
            credit: document.getElementById('credit').checked,
            debit: document.getElementById('debit').checked,
            mobile: document.getElementById('mobile').checked
        },
        specialty: document.getElementById('shop-specialty').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    saveShopUpdates(updates, 'Shop details updated successfully!');
}

/**
 * Handle Contact Information Form Submit
 * @param {Event} e - The submit event
 */
function handleContactFormSubmit(e) {
    e.preventDefault();
    
    const updates = {
        email: document.getElementById('shop-email').value,
        phoneNumber: document.getElementById('shop-phone').value,
        address: document.getElementById('shop-address').value,
        city: document.getElementById('shop-city').value,
        county: document.getElementById('shop-county').value,
        postCode: document.getElementById('shop-postcode').value,
        website: document.getElementById('shop-website').value,
        socialMedia: document.getElementById('shop-social').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    saveShopUpdates(updates, 'Contact information updated successfully!');
}

/**
 * Save Shop Updates to Firestore
 * @param {Object} updates - The data to update
 * @param {string} successMessage - Message to show on success
 */
function saveShopUpdates(updates, successMessage) {
    const shopData = window.shopAuth.getShopData();
    
    if (!shopData || !shopData.id) {
        showNotification('Error: Shop data not available', 'error');
        return;
    }
    
    window.shopAuth.db.collection('Stores').doc(shopData.id).update(updates)
        .then(() => {
            showNotification(successMessage, 'success');
            
            // Refresh shop data
            window.shopAuth.refreshShopData();
        })
        .catch((error) => {
            console.error('Error updating shop:', error);
            showNotification('Error: ' + error.message, 'error');
        });
}

/**
 * Show notification popup
 * @param {string} message - Message to display
 * @param {string} type - Notification type (success or error)
 */
function showNotification(message, type) {
    const notificationPopup = document.getElementById('notification-popup');
    const notificationMessage = document.getElementById('notification-message');
    
    // Set message and type
    notificationMessage.textContent = message;
    notificationPopup.className = 'notification-popup ' + type;
    
    // Show the notification
    setTimeout(() => {
        notificationPopup.classList.add('show');
    }, 10);
    
    // Hide after 3 seconds
    setTimeout(() => {
        closeNotification();
    }, 3000);
}

/**
 * Close notification popup
 */
function closeNotification() {
    const notificationPopup = document.getElementById('notification-popup');
    notificationPopup.classList.remove('show');
}

// Verify shop owner access when page loads
window.shopAuth.verifyShopOwner(function(user, shopData) {
    // Shop owner verified, populate forms with existing data
    populateForms(shopData);
});