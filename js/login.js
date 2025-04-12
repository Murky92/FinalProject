// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCu5nNm7f-0fU8tQKNAfMIYnlJrtJBJRMY",
    authDomain: "tabletop-reserve.firebaseapp.com",
    projectId: "tabletop-reserve",
    storageBucket: "tabletop-reserve.firebasestorage.app",
    messagingSenderId: "178270446013",
    appId: "1:178270446013:web:b71f5339747750eb3a32d4"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// DOM Elements for Login
const loginForm = document.getElementById('login-form');
const emailField = document.getElementById('email');
const passwordField = document.getElementById('password');
const errorMessageElement = document.getElementById('error-message');

// DOM Elements for Password Reset
const forgotPasswordLink = document.getElementById('forgot-password-link');
const passwordResetModal = document.getElementById('password-reset-modal');
const closeResetModalBtn = document.getElementById('close-reset-modal');
const cancelResetBtn = document.getElementById('cancel-reset');
const passwordResetForm = document.getElementById('password-reset-form');
const resetEmailField = document.getElementById('reset-email');
const resetMessageDiv = document.getElementById('reset-message');

// Login Handler
loginForm.addEventListener('submit', function(e) {
    e.preventDefault();
    errorMessageElement.textContent = '';
    
    const email = emailField.value.trim();
    const password = passwordField.value;
    
    auth.signInWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Signed in successfully
            const user = userCredential.user;
            
            // Check if email is verified
            if (!user.emailVerified) {
                // Email not verified, show error
                errorMessageElement.innerHTML = "Please verify your email before logging in.<br>Check your inbox and spam folder.";
                
                // Add a container for the resend link (to style and position it separately)
                const resendContainer = document.createElement('div');
                resendContainer.className = 'resend-container';
                resendContainer.style.marginTop = '10px';
                resendContainer.style.textAlign = 'center';
                
                // Create resend link
                const resendLink = document.createElement('a');
                resendLink.textContent = "Resend verification email";
                resendLink.href = "#";
                resendLink.style.color = "#4a6ee0";
                resendLink.style.textDecoration = "underline";
                resendLink.style.cursor = "pointer";
                resendLink.addEventListener('click', function(e) {
                    e.preventDefault();
                    user.sendEmailVerification()
                        .then(() => {
                            errorMessageElement.innerHTML = "Please verify your email before logging in.<br>Check your inbox and spam folder.";
                            resendContainer.innerHTML = "<span style='color: #34c759;'>Verification email sent again</span>";
                        })
                        .catch(error => {
                            resendContainer.innerHTML = "<span style='color: #ff3b30;'>Error sending verification email: " + error.message + "</span>";
                        });
                });
                
                // Add the link to the container
                resendContainer.appendChild(resendLink);
                
                // Add the container after the error message
                if (errorMessageElement.nextSibling) {
                    errorMessageElement.parentNode.insertBefore(resendContainer, errorMessageElement.nextSibling);
                } else {
                    errorMessageElement.parentNode.appendChild(resendContainer);
                }
                
                auth.signOut();
                return Promise.reject(new Error("Email not verified"));
            }
            
            // Check if user is a shop owner or admin
            return db.collection("Stores").doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists) {
                        // Shop owner login
                        window.location.href = "shophome.html";
                    } else {
                        // Check if user is an admin
                        return db.collection("Users").doc(user.uid).get()
                            .then((adminDoc) => {
                                if (adminDoc.exists && adminDoc.data().role === "admin") {
                                    window.location.href = "adminhome.html";
                                } else {
                                    // Neither shop owner nor admin
                                    errorMessageElement.textContent = "No shop or admin account found for this user.";
                                    auth.signOut();
                                }
                            });
                    }
                });
        })
        .catch((error) => {
            // Only show error message if not already handled (email verification)
            if (error.message !== "Email not verified") {
                errorMessageElement.textContent = error.message;
            }
        });
});

// Password Reset Modal Functions
function showPasswordResetModal() {
    // Pre-fill the reset email with the login email if it exists
    if (emailField.value.trim() !== '') {
        resetEmailField.value = emailField.value;
    } else {
        resetEmailField.value = '';
    }
    
    // Reset any previous messages
    resetMessageDiv.style.display = 'none';
    resetMessageDiv.textContent = '';
    resetMessageDiv.className = 'modal-message';
    
    // Show the modal
    passwordResetModal.style.display = 'flex';
}

function closePasswordResetModal() {
    passwordResetModal.style.display = 'none';
}

// Password Reset Form Handler
passwordResetForm.addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = resetEmailField.value.trim();
    
    // Check if email is empty
    if (email === '') {
        resetMessageDiv.textContent = 'Please enter your email address.';
        resetMessageDiv.className = 'modal-message error-message';
        resetMessageDiv.style.display = 'block';
        return;
    }
    
    // Disable the submit button to prevent multiple clicks
    const submitButton = this.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.textContent = 'Sending...';
    
    // Send the password reset email
    auth.sendPasswordResetEmail(email)
        .then(() => {
            // Show success message
            resetMessageDiv.textContent = 'Password reset email sent. Please check your inbox.';
            resetMessageDiv.className = 'modal-message success-message';
            resetMessageDiv.style.display = 'block';
            
            // Reset form after 3 seconds
            setTimeout(() => {
                closePasswordResetModal();
            }, 3000);
        })
        .catch((error) => {
            // Show error message
            resetMessageDiv.textContent = error.message;
            resetMessageDiv.className = 'modal-message error-message';
            resetMessageDiv.style.display = 'block';
        })
        .finally(() => {
            // Re-enable the submit button
            submitButton.disabled = false;
            submitButton.textContent = 'Send Reset Link';
        });
});

// Event Listeners for Modal
forgotPasswordLink.addEventListener('click', function(e) {
    e.preventDefault();
    showPasswordResetModal();
});

closeResetModalBtn.addEventListener('click', closePasswordResetModal);
cancelResetBtn.addEventListener('click', closePasswordResetModal);

// Close modal if clicked outside
window.addEventListener('click', function(event) {
    if (event.target === passwordResetModal) {
        closePasswordResetModal();
    }
});