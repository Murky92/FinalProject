// This script handles all validation and submission for the shop registration form

document.addEventListener('DOMContentLoaded', function() {
    // Form elements
    const storeSignupForm = document.getElementById('store-signup-form');
    const storeNameInput = document.getElementById('storeName');
    const ownerNameInput = document.getElementById('ownerName');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const addressInput = document.getElementById('address');
    const cityInput = document.getElementById('city');
    const countyInput = document.getElementById('county');
    const postCodeInput = document.getElementById('postCode');
    const phoneNumberInput = document.getElementById('phoneNumber');
    const errorMessageElement = document.getElementById('error-message');
    const successMessageElement = document.getElementById('success-message');

    // Error container elements
    const storeNameError = document.getElementById('storeName-error');
    const ownerNameError = document.getElementById('ownerName-error');
    const emailError = document.getElementById('email-error');
    const passwordError = document.getElementById('password-error');
    const addressError = document.getElementById('address-error');
    const cityError = document.getElementById('city-error');
    const countyError = document.getElementById('county-error');
    const postCodeError = document.getElementById('postCode-error');
    const phoneNumberError = document.getElementById('phoneNumber-error');

    // Create success modal if it doesn't exist
    createSuccessModal();

    // Clear all error messages
    function clearErrors() {
        const errorContainers = [
            storeNameError, ownerNameError, emailError, passwordError, 
            addressError, cityError, countyError, postCodeError, phoneNumberError
        ];
        
        errorContainers.forEach(container => {
            if (container) container.textContent = '';
        });
        
        errorMessageElement.textContent = '';
        successMessageElement.textContent = '';
    }

    // Validation functions
    function validateStoreName(name) {
        if (!name || name.length < 2) {
            storeNameError.textContent = 'Shop name must be at least 2 characters long';
            return false;
        }
        return true;
    }

    function validateOwnerName(name) {
        if (!name || name.length < 2) {
            ownerNameError.textContent = 'Owner name must be at least 2 characters long';
            return false;
        }
        return true;
    }

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
            emailError.textContent = 'Please enter a valid email address';
            return false;
        }
        return true;
    }

    function validatePassword(password) {
        // Clear previous feedback
        passwordError.textContent = '';
        
        // Remove any existing validation indicators
        const existingIndicators = document.querySelectorAll('.password-validation-indicator');
        existingIndicators.forEach(el => el.remove());
        
        // Create password criteria container if it doesn't exist
        let criteriaContainer = document.getElementById('password-criteria');
        if (!criteriaContainer) {
            criteriaContainer = document.createElement('div');
            criteriaContainer.id = 'password-criteria';
            criteriaContainer.className = 'password-criteria';
            
            // Add styles for the criteria container
            criteriaContainer.style.marginTop = '5px';
            criteriaContainer.style.fontSize = '0.85rem';
            criteriaContainer.style.color = '#666';
            
            // Insert after password field
            passwordInput.parentNode.insertBefore(criteriaContainer, passwordInput.nextSibling);
        }
        
        // Clear previous criteria
        criteriaContainer.innerHTML = '';
        
        // Define validation criteria
        const criteria = [
            { id: 'length', test: () => password.length >= 8, text: 'At least 8 characters' },
            { id: 'uppercase', test: () => /[A-Z]/.test(password), text: 'Contains uppercase letter' },
            { id: 'lowercase', test: () => /[a-z]/.test(password), text: 'Contains lowercase letter' },
            { id: 'number', test: () => /[0-9]/.test(password), text: 'Contains a number' },
            { id: 'special', test: () => /[^A-Za-z0-9]/.test(password), text: 'Contains a special character' }
        ];
        
        // Create indicators for each criterion
        criteria.forEach(criterion => {
            const passes = criterion.test();
            
            const indicator = document.createElement('div');
            indicator.className = 'validation-item';
            indicator.style.display = 'flex';
            indicator.style.alignItems = 'center';
            indicator.style.marginBottom = '3px';
            
            const icon = document.createElement('span');
            icon.className = 'validation-icon';
            icon.style.marginRight = '5px';
            icon.style.color = passes ? '#34c759' : '#999';
            icon.innerHTML = passes ? '✓' : '○';
            
            const text = document.createElement('span');
            text.textContent = criterion.text;
            text.style.color = passes ? '#34c759' : '#999';
            
            indicator.appendChild(icon);
            indicator.appendChild(text);
            criteriaContainer.appendChild(indicator);
        });
        
        // Check if all criteria pass
        const allCriteriaMet = criteria.every(criterion => criterion.test());
        
        if (!allCriteriaMet) {
            passwordError.textContent = 'Password does not meet all requirements';
            return false;
        }
        
        return true;
    }

    function validateAddress(address) {
        if (!address || address.length < 5) {
            addressError.textContent = 'Please enter a valid address';
            return false;
        }
        return true;
    }

    function validateCity(city) {
        if (!city || city.length < 2) {
            cityError.textContent = 'Please enter a valid city';
            return false;
        }
        return true;
    }

    function validateCounty(county) {
        if (!county || county.length < 2) {
            countyError.textContent = 'Please enter a valid county';
            return false;
        }
        return true;
    }

    function validatePostCode(postCode) {
        // UK postcode regex (basic validation)
        const postCodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
        if (!postCode || !postCodeRegex.test(postCode)) {
            postCodeError.textContent = 'Please enter a valid UK postcode';
            return false;
        }
        return true;
    }

    function validatePhoneNumber(phone) {
        // Simple phone validation (accepts various formats)
        const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
        if (!phone || !phoneRegex.test(phone)) {
            phoneNumberError.textContent = 'Please enter a valid phone number';
            return false;
        }
        return true;
    }

    // Function to check auto-approval setting and auto-approve if enabled
    function checkAutoApproval(shopId) {
        return db.collection("appSettings").doc("appSettings").get()
            .then((doc) => {
                if (doc.exists && doc.data().autoApproveShops === true) {
                    console.log("Auto-approval enabled, automatically approving shop");
                    // Auto-approve the shop
                    return db.collection("Stores").doc(shopId).update({
                        isApproved: true,
                        approvedAt: firebase.firestore.FieldValue.serverTimestamp(),
                        approvedBy: "system (auto-approval)",
                        registrationStatus: "approved"
                    });
                } else {
                    console.log("Auto-approval disabled, shop pending manual approval");
                    return Promise.resolve(); // Continue without auto-approval
                }
            })
            .catch((error) => {
                console.error("Error checking auto-approval setting:", error);
                return Promise.resolve(); // Continue without auto-approval on error
            });
    }

    // Create success modal
    function createSuccessModal() {
        // Check if modal already exists
        if (document.getElementById('success-modal')) {
            return;
        }
        
        // Create modal elements
        const modal = document.createElement('div');
        modal.id = 'success-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        
        const modalHeader = document.createElement('div');
        modalHeader.className = 'modal-header';
        
        const modalTitle = document.createElement('h3');
        modalTitle.className = 'modal-title';
        modalTitle.textContent = 'Registration Successful!';
        
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = function() {
            modal.style.display = 'none';
            window.location.href = '/index.html'; // Redirect to login page
        };
        
        modalHeader.appendChild(modalTitle);
        modalHeader.appendChild(closeBtn);
        
        const modalBody = document.createElement('div');
        modalBody.className = 'modal-body';
        
        const successIcon = document.createElement('div');
        successIcon.className = 'success-icon';
        successIcon.innerHTML = '✓';
        
        const messageEl = document.createElement('p');
        messageEl.id = 'modal-message';
        messageEl.innerHTML = 'Your shop has been successfully registered! <br><br>We\'ve sent a verification email to <strong id="registered-email"></strong>. <br><br>Please check your inbox and click the verification link before logging in.';
        
        const noteEl = document.createElement('p');
        noteEl.className = 'note';
        noteEl.textContent = 'Note: If you don\'t see the email, please check your spam folder.';
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'button-container';
        
        const loginBtn = document.createElement('button');
        loginBtn.className = 'login-redirect-btn';
        loginBtn.textContent = 'Go to Login';
        loginBtn.onclick = function() {
            modal.style.display = 'none';
            window.location.href = '/index.html'; // Redirect to login page
        };
        
        modalBody.appendChild(successIcon);
        modalBody.appendChild(messageEl);
        modalBody.appendChild(noteEl);
        buttonContainer.appendChild(loginBtn);
        modalBody.appendChild(buttonContainer);
        
        modalContent.appendChild(modalHeader);
        modalContent.appendChild(modalBody);
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        // Add styles for the modal
        const style = document.createElement('style');
        style.textContent = `
            .modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                align-items: center;
                justify-content: center;
            }
            
            .modal-content {
                background-color: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                max-width: 500px;
                width: 90%;
                text-align: center;
            }
            
            .modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 15px;
            }
            
            .modal-title {
                font-size: 1.5rem;
                font-weight: bold;
                margin: 0;
                color: #4a6ee0;
            }
            
            .close-btn {
                background: none;
                border: none;
                font-size: 1.8rem;
                cursor: pointer;
                padding: 0 5px;
                color: #666;
            }
            
            .modal-body {
                text-align: center;
            }
            
            .success-icon {
                font-size: 60px;
                color: #34c759;
                margin: 20px 0;
                height: 80px;
                width: 80px;
                background-color: #ebf9ee;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin: 0 auto 20px auto;
            }
            
            #modal-message {
                font-size: 1.1rem;
                line-height: 1.5;
                margin-bottom: 20px;
            }
            
            .note {
                font-size: 0.9rem;
                color: #666;
                font-style: italic;
                margin-bottom: 20px;
            }
            
            .button-container {
                margin-top: 30px;
            }
            
            .login-redirect-btn {
                background-color: #4a6ee0;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 4px;
                font-size: 1rem;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            
            .login-redirect-btn:hover {
                background-color: #3a5bc0;
            }
        `;
        document.head.appendChild(style);
    }

    // Function to show success modal
    function showSuccessModal(email) {
        const modal = document.getElementById('success-modal');
        const emailElement = document.getElementById('registered-email');
        
        if (emailElement) {
            emailElement.textContent = email;
        }
        
        if (modal) {
            modal.style.display = 'flex';
        }
        
        // Close modal if clicked outside
        window.onclick = function(event) {
            if (event.target === modal) {
                modal.style.display = 'none';
                window.location.href = '/index.html'; // Redirect to login page
            }
        };
    }

    // Real-time validation for individual fields
    storeNameInput.addEventListener('blur', () => {
        validateStoreName(storeNameInput.value.trim());
    });

    ownerNameInput.addEventListener('blur', () => {
        validateOwnerName(ownerNameInput.value.trim());
    });

    emailInput.addEventListener('blur', () => {
        validateEmail(emailInput.value.trim());
    });

    // Real-time validation for password as user types
    passwordInput.addEventListener('input', () => {
        validatePassword(passwordInput.value);
    });

    // Blur event for password to show error message if needed
    passwordInput.addEventListener('blur', () => {
        validatePassword(passwordInput.value);
    });

    addressInput.addEventListener('blur', () => {
        validateAddress(addressInput.value.trim());
    });

    cityInput.addEventListener('blur', () => {
        validateCity(cityInput.value.trim());
    });

    countyInput.addEventListener('blur', () => {
        validateCounty(countyInput.value.trim());
    });

    postCodeInput.addEventListener('blur', () => {
        validatePostCode(postCodeInput.value.trim());
    });

    phoneNumberInput.addEventListener('blur', () => {
        validatePhoneNumber(phoneNumberInput.value.trim());
    });

    // Clear errors when user starts typing again
    const allInputs = [
        storeNameInput, ownerNameInput, emailInput, passwordInput,
        addressInput, cityInput, countyInput, postCodeInput, phoneNumberInput
    ];

    allInputs.forEach((input, index) => {
        input.addEventListener('focus', () => {
            const errorContainers = [
                storeNameError, ownerNameError, emailError, passwordError,
                addressError, cityError, countyError, postCodeError, phoneNumberError
            ];
            if (errorContainers[index]) {
                errorContainers[index].textContent = '';
            }
        });
    });

    // Handle form submission
    storeSignupForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Clear previous messages
        clearErrors();
        
        // Get form values
        const storeName = storeNameInput.value.trim();
        const ownerName = ownerNameInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const address = addressInput.value.trim();
        const city = cityInput.value.trim();
        const county = countyInput.value.trim();
        const postCode = postCodeInput.value.trim();
        const phoneNumber = phoneNumberInput.value.trim();
        
        // Validate all fields
        const isStoreNameValid = validateStoreName(storeName);
        const isOwnerNameValid = validateOwnerName(ownerName);
        const isEmailValid = validateEmail(email);
        const isPasswordValid = validatePassword(password);
        const isAddressValid = validateAddress(address);
        const isCityValid = validateCity(city);
        const isCountyValid = validateCounty(county);
        const isPostCodeValid = validatePostCode(postCode);
        const isPhoneNumberValid = validatePhoneNumber(phoneNumber);
        
        // If any validation failed, stop submission
        if (!isStoreNameValid || !isOwnerNameValid || !isEmailValid || !isPasswordValid ||
            !isAddressValid || !isCityValid || !isCountyValid || !isPostCodeValid || !isPhoneNumberValid) {
            errorMessageElement.textContent = 'Please correct the errors in the form.';
            return;
        }
        
        // Disable submit button to prevent double submission
        const submitButton = storeSignupForm.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';
        
        // Create user with Firebase Auth
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                console.log("User created successfully, sending verification email...");
                
                // Get the newly created user
                const user = userCredential.user;
                
                // Send email verification
                return user.sendEmailVerification()
                    .then(() => {
                        console.log("Verification email sent, creating Firestore document...");
                        
                        // Create store data in Firestore
                        return db.collection("Stores").doc(user.uid).set({
                            storeName: storeName,
                            ownerName: ownerName,
                            email: email,
                            address: address,
                            city: city,
                            county: county,
                            postCode: postCode,
                            phoneNumber: phoneNumber,
                            role: "shop",
                            isApproved: false,
                            registrationStatus: "pending",
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    })
                    .then(() => {
                        // Check if auto-approval is enabled
                        return checkAutoApproval(user.uid);
                    })
                    .then(() => {
                        console.log("Firestore document created, signing out user...");
                        
                        // Reset form
                        storeSignupForm.reset();
                        
                        // Sign out the user since they need to verify email first
                        return auth.signOut();
                    })
                    .then(() => {
                        console.log("User signed out, registration complete!");
                        
                        // Reset button state in case the form isn't reset
                        submitButton.disabled = false;
                        submitButton.textContent = 'Register Shop';
                        
                        // Show success modal with the email address
                        showSuccessModal(email);
                    })
                    .catch((error) => {
                        console.error("Error during registration process:", error);
                        
                        // If an error occurs after user creation, attempt to delete the user
                        user.delete().catch((deleteError) => {
                            console.error("Failed to delete user after error:", deleteError);
                        });
                        
                        // Handle specific errors
                        handleSignupError(error);
                    });
            })
            .catch((error) => {
                console.error("Error creating user account:", error);
                
                // Handle Firebase Auth errors
                handleSignupError(error);
            });
            
        
        // Error handling function to reduce duplication
        function handleSignupError(error) {
            // Reset button state
            submitButton.disabled = false;
            submitButton.textContent = 'Register Shop';
            
            // Check for specific Firebase Auth errors
            switch(error.code) {
                case 'auth/email-already-in-use':
                    emailError.textContent = 'This email address is already in use.';
                    break;
                case 'auth/invalid-email':
                    emailError.textContent = 'Please enter a valid email address.';
                    break;
                case 'auth/weak-password':
                    passwordError.textContent = 'The password is too weak.';
                    break;
                case 'permission-denied':
                    errorMessageElement.textContent = `Firestore permission denied. Please check security rules.`;
                    break;
                default:
                    errorMessageElement.textContent = `Error: ${error.message}`;
            }
        }
    });
});