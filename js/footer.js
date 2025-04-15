// Create a new file named 'footer.js' with this content

document.addEventListener('DOMContentLoaded', function() {
    // Create the footer element
    const footer = document.createElement('footer');
    footer.className = 'footer';
    
    // Set the footer HTML content
    footer.innerHTML = `
    <div class="footer-content">
        <div class="footer-section">
            <div class="footer-logo-container">
                <!-- Text-based alternative to transparent image -->
                <h2 class="footer-brand-name">Tabletop Reserve</h2>
            </div>
            <p>Connecting tabletop gaming <br> enthusiasts with local shops <br> and events.</p>
            <div class="footer-social">
                <a href="#" aria-label="Facebook"><i class="fab fa-facebook"></i></a>
                <a href="#" aria-label="Twitter"><i class="fab fa-twitter"></i></a>
                <a href="#" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                <a href="#" aria-label="Discord"><i class="fab fa-discord"></i></a>
            </div>
        </div>
        
        <div class="footer-section">
            <h3>Quick Links</h3>
            <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="signup.html">Register Your Shop</a></li>
                <li><a href="faq.html">FAQ</a></li>
                <li><a href="about.html">About Us</a></li>
            </ul>
        </div>
        
        <div class="footer-section">
            <h3>Resources</h3>
            <ul>
                <li><a href="shop-guide.html">Shop Owner Guide</a></li>
                <li><a href="terms.html">Terms of Service</a></li>
                <li><a href="privacy.html">Privacy Policy</a></li>
                <li><a href="accessibility.html">Accessibility</a></li>
            </ul>
        </div>
        
        <div class="footer-section">
            <h3>Support</h3>
            <ul>
                <li><a href="contact.html">Contact Us</a></li>
                <li><a href="help-center.html">Help Center</a></li>
                <li><a href="report-issue.html">Report an Issue</a></li>
                <li><a href="mailto:support@tabletopreserve.com">support@tabletopreserve.com</a></li>
            </ul>
        </div>
    </div>
    
    <div class="footer-bottom">
        <p>&copy; ${new Date().getFullYear()} Tabletop Reserve. All rights reserved.</p>
    </div>`;
    
    // Add footer styles directly to the document
    const footerStyle = document.createElement('style');
    footerStyle.textContent = `
        .footer {
            background-color: #1c2635;
            color: #ffffff;
            padding: 30px 20px 10px;
            width: 100%;
            clear: both;
            margin-top: 40px;
            box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
        }
        
        .footer-content {
            display: flex;
            flex-wrap: wrap;
            justify-content: space-between;
            max-width: 1200px;
            margin: 0 auto;
        }
        
        .footer-section {
            flex: 1;
            min-width: 200px;
            margin-bottom: 20px;
            padding: 0 15px;
        }
        
        .footer-brand-name {
            color: #4a6ee0;
            margin-bottom: 10px;
        }
        
        .footer-section h3 {
            margin-bottom: 15px;
            color: #4a6ee0;
        }
        
        .footer-section ul {
            list-style: none;
            padding: 0;
        }
        
        .footer-section ul li {
            margin-bottom: 8px;
        }
        
        .footer-section a {
            color: #ffffff;
            text-decoration: none;
            transition: color 0.3s ease;
        }
        
        .footer-section a:hover {
            color: #4a6ee0;
        }
        
        .footer-social {
            display: flex;
            gap: 15px;
            margin-top: 15px;
        }
        
        .footer-social a {
            color: #ffffff;
            font-size: 18px;
        }
        
        .footer-bottom {
            text-align: center;
            padding-top: 20px;
            margin-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        
        @media (max-width: 768px) {
            .footer-content {
                flex-direction: column;
            }
            
            .footer-section {
                margin-bottom: 30px;
            }
        }
        
        /* Special styling for login and signup pages */
        .login-footer, .signup-footer {
            position: fixed;
            bottom: 0;
        }
    `;
    document.head.appendChild(footerStyle);
    
    // Check if Font Awesome is loaded, if not, load it
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fontAwesomeLink);
    }
    
    // Add the footer to the page
    document.body.appendChild(footer);
    
    // Special handling for login page (index.html)
    if (window.location.pathname.endsWith('index.html') || 
        window.location.pathname === '/' || 
        window.location.pathname.endsWith('/')) {
        footer.classList.add('login-footer');
        document.body.style.paddingBottom = footer.offsetHeight + 'px';
    }
    
    // Special handling for signup page
    if (window.location.pathname.includes('signup.html')) {
        footer.classList.add('signup-footer');
        
        // Add more padding to the signup container
        const signupContainer = document.querySelector('.signup-main-container');
        if (signupContainer) {
            signupContainer.style.paddingBottom = footer.offsetHeight + 'px';
        }
    }
});