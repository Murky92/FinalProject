// Enhanced store signup validation and feedback
document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('store-signup-form');
    const errorMessageElement = document.getElementById('error-message');
    const successMessageElement = document.getElementById('success-message');

    // Add validation classes and error messages to form
    const formFields = [
        { id: 'storeName', label: 'Shop Name' },
        { id: 'ownerName', label: 'Owner Name' },
        { id: 'email', label: 'Email Address' },
        { id: 'password', label: 'Password' },
        { id: 'address', label: 'Shop Address' },
        { id: 'city', label: 'Town/City' },
        { id: 'county', label: 'County' },
        { id: 'postCode', label: 'Postcode' },
        { id: 'phoneNumber', label: 'Phone Number' }
    ];

    // Create error message elements for each field
    formFields.forEach(field => {
        const input = document.getElementById(field.id);
        const errorDiv = document.createElement('div');
        errorDiv.id = `${field.id}-error`;
        errorDiv.className = 'field-error';

        // Insert error message after the input
        input.parentNode.insertBefore(errorDiv, input.nextSibling);

        // Add input event for real-time validation
        input.addEventListener('input', function () {
            validateField(field.id);
            errorMessageElement.style.display = 'none'; // Hide main error on input
        });
    });

    // Add password requirements display
    const passwordField = document.getElementById('password');
    const requirementsDiv = document.createElement('div');
    requirementsDiv.className = 'password-requirements';
    requirementsDiv.innerHTML = `
        <p style="margin: 5px 0; font-weight: 500; color: #555;">Password must:</p>
        <ul style="margin: 0; padding-left: 20px;">
            <li id="req-length">Be at least 6 characters</li>
            <li id="req-uppercase">Include an uppercase letter</li>
            <li id="req-number">Include a number</li>
        </ul>
    `;
    passwordField.parentNode.insertBefore(requirementsDiv, passwordField.nextSibling);

    // Password strength checker
    passwordField.addEventListener('input', function () {
        const password = this.value;

        // Check each requirement
        const reqLength = document.getElementById('req-length');
        const reqUppercase = document.getElementById('req-uppercase');
        const reqNumber = document.getElementById('req-number');

        // Length requirement
        if (password.length >= 6) {
            reqLength.style.color = '#28a745';
            reqLength.innerHTML = '✓ Be at least 6 characters';
        } else {
            reqLength.style.color = '#666';
            reqLength.innerHTML = 'Be at least 6 characters';
        }

        // Uppercase requirement
        if (/[A-Z]/.test(password)) {
            reqUppercase.style.color = '#28a745';
            reqUppercase.innerHTML = '✓ Include an uppercase letter';
        } else {
            reqUppercase.style.color = '#666';
            reqUppercase.innerHTML = 'Include an uppercase letter';
        }

        // Number requirement
        if (/[0-9]/.test(password)) {
            reqNumber.style.color = '#28a745';
            reqNumber.innerHTML = '✓ Include a number';
        } else {
            reqNumber.style.color = '#666';
            reqNumber.innerHTML = 'Include a number';
        }
    });

    // Field validation function
    // Field validation function with enhanced validations
    function validateField(fieldId) {
        const input = document.getElementById(fieldId);
        const errorElement = document.getElementById(`${fieldId}-error`);
        let isValid = true;
        let errorMessage = '';

        switch (fieldId) {
            case 'storeName':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'Shop name is required';
                } else if (input.value.length < 2) {
                    isValid = false;
                    errorMessage = 'Shop name must be at least 2 characters';
                }
                break;

            case 'ownerName':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'Owner name is required';
                } else if (input.value.length < 2) {
                    isValid = false;
                    errorMessage = 'Owner name must be at least 2 characters';
                }
                break;

            case 'email':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'Email is required';
                } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
                    isValid = false;
                    errorMessage = 'Please enter a valid email address';
                }
                break;

            case 'password':
                if (!input.value) {
                    isValid = false;
                    errorMessage = 'Password is required';
                } else if (input.value.length < 6) {
                    isValid = false;
                    errorMessage = 'Password must be at least 6 characters';
                } else if (!/[A-Z]/.test(input.value)) {
                    isValid = false;
                    errorMessage = 'Password must contain at least one uppercase letter';
                } else if (!/[0-9]/.test(input.value)) {
                    isValid = false;
                    errorMessage = 'Password must contain at least one number';
                }
                break;

            case 'address':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'Shop address is required';
                } else if (input.value.length < 5) {
                    isValid = false;
                    errorMessage = 'Please enter a complete shop address (at least 5 characters)';
                }
                break;

            case 'city':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'Town/City is required';
                } else if (input.value.length < 2) {
                    isValid = false;
                    errorMessage = 'Town/City must be at least 2 characters';
                }
                break;

            case 'county':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'County is required';
                } else if (input.value.length < 2) {
                    isValid = false;
                    errorMessage = 'County must be at least 2 characters';
                }
                break;

            case 'postCode':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'Postcode is required';
                } else if (!/^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i.test(input.value.trim())) {
                    isValid = false;
                    errorMessage = 'Please enter a valid UK postcode';
                }
                break;

            case 'phoneNumber':
                if (!input.value.trim()) {
                    isValid = false;
                    errorMessage = 'Phone number is required';
                } else if (!/^(\+44|0)[0-9]{10,11}$/.test(input.value.replace(/\s+/g, ''))) {
                    isValid = false;
                    errorMessage = 'Please enter a valid UK phone number (e.g., 07123456789)';
                }
                break;
        }

        // Update UI based on validation
        if (isValid) {
            input.classList.remove('error');
            errorElement.style.display = 'none';
            return true;
        } else {
            input.classList.add('error');
            errorElement.textContent = errorMessage;
            errorElement.style.display = 'block';
            return false;
        }
    }

    // Validate all fields
    function validateForm() {
        let isValid = true;

        // Validate each field
        formFields.forEach(field => {
            if (!validateField(field.id)) {
                isValid = false;
            }
        });

        return isValid;
    }

    // Form submission handler
    form.addEventListener('submit', function (e) {
        e.preventDefault();

        // Validate the form
        if (!validateForm()) {
            errorMessageElement.textContent = 'Please correct the errors in the form';
            errorMessageElement.style.display = 'block';
            return;
        }

        // Get form data
        const storeName = document.getElementById('storeName').value;
        const ownerName = document.getElementById('ownerName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const address = document.getElementById('address').value;
        const city = document.getElementById('city').value;
        const county = document.getElementById('county').value;
        const postCode = document.getElementById('postCode').value;
        const phoneNumber = document.getElementById('phoneNumber').value;

        // Update submit button state
        const submitButton = form.querySelector('button[type="submit"]');
        submitButton.disabled = true;
        submitButton.textContent = 'Registering...';

        // Create user with Firebase Authentication
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // User created successfully
                var user = userCredential.user;

                // Store additional store information in Firestore
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
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    isApproved: false  // Shops will need admin approval
                });
            })
            .then(() => {
                // Show success message before redirect
                if (successMessageElement) {
                    successMessageElement.textContent = 'Registration successful! Redirecting to approval page...';
                    successMessageElement.style.display = 'block';
                } else {
                    errorMessageElement.textContent = 'Registration successful! Redirecting to approval page...';
                    errorMessageElement.style.display = 'block';
                    errorMessageElement.style.backgroundColor = '#d4f8d4';
                    errorMessageElement.style.color = '#28a745';
                }

                // Redirect to a store pending approval page after a short delay
                setTimeout(() => {
                    window.location.href = "shop-pending-approval.html";
                }, 1500);
            })
            .catch((error) => {
                // Reset button state
                submitButton.disabled = false;
                submitButton.textContent = 'Register Shop';

                // Handle Firebase errors with more user-friendly messages
                let errorMessage;
                switch (error.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'This email address is already in use. Please try another email or contact support.';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'The email address is not valid. Please check and try again.';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'The password is too weak. Please choose a stronger password.';
                        break;
                    case 'auth/network-request-failed':
                        errorMessage = 'Network error. Please check your internet connection and try again.';
                        break;
                    default:
                        errorMessage = error.message;
                }

                // Display the error
                errorMessageElement.textContent = errorMessage;
                errorMessageElement.style.display = 'block';
            });
    });
});