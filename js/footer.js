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
    
    // Check if Font Awesome is loaded, if not, load it
    if (!document.querySelector('link[href*="font-awesome"]')) {
        const fontAwesomeLink = document.createElement('link');
        fontAwesomeLink.rel = 'stylesheet';
        fontAwesomeLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
        document.head.appendChild(fontAwesomeLink);
    }
    
    // Add the footer to the page
    document.body.appendChild(footer);
    
    // Function to adjust content for the footer
    function adjustForFooter() {
        const footer = document.querySelector('.footer');
        if (!footer) return;
        
        // Get the current page path
        const currentPath = window.location.pathname;
        const isIndexPage = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('/');
        
        // For index page, always use fixed positioning
        if (isIndexPage) {
            footer.style.position = 'fixed';
            footer.style.bottom = '0';
            footer.style.width = '100%';
            document.body.style.paddingBottom = footer.offsetHeight + 'px';
            return;
        }
        
        // For other pages, check if content is shorter than viewport
        const bodyHeight = document.body.scrollHeight;
        const windowHeight = window.innerHeight;
        const footerHeight = footer.offsetHeight;
        
        if (bodyHeight < windowHeight) {
            // Page is shorter than viewport, fix footer to bottom
            footer.style.position = 'fixed';
            footer.style.bottom = '0';
            footer.style.width = '100%';
            document.body.style.paddingBottom = footerHeight + 'px';
        } else {
            // Page is taller than viewport, let footer flow normally
            footer.style.position = 'relative';
            footer.style.bottom = 'auto';
            footer.style.width = 'auto';
            document.body.style.paddingBottom = '0';
        }
    }
    
    // Run footer adjustment on load and resize
    window.addEventListener('load', adjustForFooter);
    window.addEventListener('resize', adjustForFooter);
    
    // Special handling for signup page
    if (window.location.pathname.includes('signup.html')) {
        // Add more padding to the signup container
        const signupContainer = document.querySelector('.signup-main-container');
        if (signupContainer) {
            signupContainer.style.paddingBottom = '100px';
        }
        
        // Add specific class to the footer for signup page
        footer.classList.add('signup-footer');
    }
    
    // Special handling for login page (index.html)
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname.endsWith('/')) {
        footer.classList.add('login-footer');
        
        // Set login-specific styles
        footer.style.position = 'fixed';
        footer.style.bottom = '0';
        footer.style.width = '100%';
        
        // Add padding to body to prevent content from being hidden by footer
        document.body.style.paddingBottom = footer.offsetHeight + 'px';
    }
});