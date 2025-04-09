// admin-auth.js - Common authentication for all admin pages

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

// Admin authentication function
function verifyAdmin(onSuccess, onFailure) {
    // Show loading state
    const loadingElement = document.getElementById('loading-message') || 
                          document.createElement('div');
    
    if (!document.getElementById('loading-message')) {
        loadingElement.id = 'loading-message';
        loadingElement.textContent = 'Verifying admin access...';
        loadingElement.style.textAlign = 'center';
        loadingElement.style.padding = '50px';
        loadingElement.style.fontSize = '18px';
        document.body.prepend(loadingElement);
    }
    
    // Hide content until verified
    const contentElement = document.getElementById('admin-content');
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
        
        console.log("Checking admin status for:", user.uid);
        
        // Check admin status in Users collection
        db.collection("Users").doc(user.uid).get()
            .then((doc) => {
                if (doc.exists && doc.data().role === "admin") {
                    console.log("Admin verified in Users collection");
                    handleSuccess();
                    return;
                }
                
                // If not found in Users, check Stores collection
                db.collection("Stores").doc(user.uid).get()
                    .then((storeDoc) => {
                        if (storeDoc.exists && storeDoc.data().role === "admin") {
                            console.log("Admin verified in Stores collection");
                            handleSuccess();
                        } else {
                            console.log("User is not an admin in either collection");
                            handleFailure("You don't have admin access.");
                        }
                    })
                    .catch((error) => {
                        console.error("Error checking Stores collection:", error);
                        handleFailure("Error verifying admin status: " + error.message);
                    });
            })
            .catch((error) => {
                console.error("Error checking Users collection:", error);
                handleFailure("Error verifying admin status: " + error.message);
            });
    });
    
    // Helper function for successful admin verification
    function handleSuccess() {
        // Hide loading message
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Show admin content
        if (contentElement) {
            contentElement.style.display = 'block';
        }
        
        // Call success callback if provided
        if (typeof onSuccess === 'function') {
            onSuccess(auth.currentUser);
        }
    }
    
    // Helper function for failed admin verification
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

// Common logout function
function adminLogout() {
    auth.signOut().then(() => {
        console.log("Logged out successfully");
        window.location.href = "/index.html";
    }).catch((error) => {
        console.error("Error signing out:", error);
        alert("Error signing out: " + error.message);
    });
}

// Export the functions and objects
window.adminAuth = {
    verifyAdmin: verifyAdmin,
    logout: adminLogout,
    auth: auth,
    db: db
};