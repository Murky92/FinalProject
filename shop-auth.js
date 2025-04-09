// shop-auth.js - Common authentication for all shop owner pages

// Firebase initialization with check to prevent duplicate initialization
function initializeFirebase() {
    // Firebase Configuration
    var firebaseConfig = {
        apiKey: "AIzaSyCu5nNm7f-0fU8tQKNAfMIYnlJrtJBJRMY",
        authDomain: "tabletop-reserve.firebaseapp.com",
        projectId: "tabletop-reserve",
        storageBucket: "tabletop-reserve.firebasestorage.app",
        messagingSenderId: "178270446013",
        appId: "1:178270446013:web:b71f5339747750eb3a32d4"
    };

    // Check if Firebase is already initialized
    if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app(); // Use existing app if already initialized
    }

    return {
        auth: firebase.auth(),
        db: firebase.firestore()
    };
}

// Initialize Firebase services
const { auth, db } = initializeFirebase();

// Global variable to store current shop data
let currentShopData = null;

// Shop authentication function
function verifyShopOwner(onSuccess, onFailure) {
    // Show loading state
    const loadingElement = document.getElementById('loading-message') || 
                          document.createElement('div');
    
    if (!document.getElementById('loading-message')) {
        loadingElement.id = 'loading-message';
        loadingElement.textContent = 'Verifying shop access...';
        loadingElement.style.textAlign = 'center';
        loadingElement.style.padding = '50px';
        loadingElement.style.fontSize = '18px';
        document.body.prepend(loadingElement);
    }
    
    // Hide content until verified
    const contentElement = document.getElementById('shop-content');
    if (contentElement) {
        contentElement.style.display = 'none';
    }
    
    // Listen for authentication state
    auth.onAuthStateChanged(function(user) {
        console.log("Auth state changed. User:", user ? user.email : "No user logged in");
        
        if (!user) {
            console.log("No user logged in, redirecting to homepage");
            window.location.href = "/index.html";
            return;
        }
        
        console.log("Checking shop owner status for:", user.uid);
        
        // Check shop owner status in Stores collection
        db.collection("Stores").doc(user.uid).get()
            .then((doc) => {
                if (doc.exists) {
                    // User is a shop owner
                    console.log("Shop owner verified");
                    
                    // Store shop data globally
                    currentShopData = doc.data();
                    currentShopData.id = user.uid;
                    
                    // Check approval status
                    if (currentShopData.registrationStatus === "rejected") {
                        console.log("Shop registration was rejected");
                        handleFailure("Your shop registration has been rejected. Please contact support for more information.");
                        return;
                    }
                    
                    // Handle successful verification
                    handleSuccess();
                } else {
                    // Not a shop owner
                    console.log("User is not a shop owner");
                    handleFailure("You don't have a shop account.");
                }
            })
            .catch((error) => {
                console.error("Error checking shop owner status:", error);
                handleFailure("Error verifying shop status: " + error.message);
            });
    });
    
    // Helper function for successful shop owner verification
    function handleSuccess() {
        // Hide loading message
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Show shop content
        if (contentElement) {
            contentElement.style.display = 'block';
        }
        
        // Update shop UI with approval banner if needed
        updateApprovalUI();
        
        // Call success callback if provided
        if (typeof onSuccess === 'function') {
            onSuccess(auth.currentUser, currentShopData);
        }
    }
    
    // Helper function for failed shop owner verification
    function handleFailure(message) {
        // Log and alert the error
        console.error(message);
        alert(message);
        
        // Call failure callback if provided
        if (typeof onFailure === 'function') {
            onFailure(message);
        } else {
            // Default behavior: redirect to homepage
            window.location.href = "/index.html";
        }
    }
}

// Update UI based on shop approval status
function updateApprovalUI() {
    // Check if approval banner exists
    const approvalBanner = document.getElementById('approval-banner');
    if (approvalBanner && currentShopData) {
        if (!currentShopData.isApproved) {
            approvalBanner.classList.remove('hidden');
        } else {
            approvalBanner.classList.add('hidden');
        }
    }
    
    // Update shop name in header if element exists
    const shopNameHeader = document.getElementById('shop-name-header');
    if (shopNameHeader && currentShopData) {
        shopNameHeader.textContent = currentShopData.storeName ? 
            ` - ${currentShopData.storeName}` : '';
    }
}

// Get current shop data
function getShopData() {
    return currentShopData;
}

// Refresh shop data
function refreshShopData(callback) {
    if (!auth.currentUser) {
        console.error("No user is logged in");
        return;
    }
    
    db.collection("Stores").doc(auth.currentUser.uid).get()
        .then((doc) => {
            if (doc.exists) {
                currentShopData = doc.data();
                currentShopData.id = auth.currentUser.uid;
                
                // Update UI
                updateApprovalUI();
                
                // Call callback if provided
                if (typeof callback === 'function') {
                    callback(currentShopData);
                }
            }
        })
        .catch((error) => {
            console.error("Error refreshing shop data:", error);
        });
}

// Common logout function
function shopLogout() {
    auth.signOut().then(() => {
        console.log("Logged out successfully");
        window.location.href = "/index.html";
    }).catch((error) => {
        console.error("Error signing out:", error);
        alert("Error signing out: " + error.message);
    });
}

// Export the functions and objects
window.shopAuth = {
    verifyShopOwner: verifyShopOwner,
    getShopData: getShopData,
    refreshShopData: refreshShopData,
    logout: shopLogout,
    auth: auth,
    db: db
};