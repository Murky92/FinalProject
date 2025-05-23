// nav.js - Creates a consistent top navigation bar for non-dashboard pages

document.addEventListener('DOMContentLoaded', function() {
    // Create the navigation bar element
    const navbar = document.createElement('nav');
    navbar.className = 'main-nav';
    
    // Set the navigation HTML content
    navbar.innerHTML = `
        <div class="nav-container">
            <div class="nav-logo">
                <a href="index.html">
                    <img src="images/tabletoplogo.png" alt="Tabletop Reserve">
                </a>
            </div>
            
            <div class="nav-links">
                <a href="features.html">Features</a>
                <a href="shop-guide.html">Shop Owner Guide</a>
                <a href="support-center.html">Support</a>
                <a href="faq.html">FAQ</a>
                <a href="contact.html">Contact</a>
                <a href="about.html">About</a>
                <a href="feedback.html">Feedback</a>
            </div>
            
            
            
            <button class="mobile-menu-btn">
                <span class="menu-icon"></span>
            </button>
        </div>
        
        <div class="mobile-menu">
        <a href="features.html">Features</a>
                <a href="features.html">Features</a>
                <a href="shop-guide.html">Shop Owner Guide</a>
                <a href="support-center.html">Support</a>
                <a href="faq.html">FAQ</a>
                <a href="contact.html">Contact</a>
                <a href="about.html">About</a>
            <div class="mobile-menu-buttons">
                <a href="index.html" class="nav-login-btn">Login</a>
                <a href="signup.html" class="nav-signup-btn">Register Shop</a>
            </div>
        </div>
    `;
    
    // Add this navigation bar to the beginning of the body
    document.body.insertBefore(navbar, document.body.firstChild);
    
    
    if (!document.querySelector('link[href*="nav-styles.css"]')) {
        const navStylesheet = document.createElement('link');
        navStylesheet.rel = 'stylesheet';
        navStylesheet.href = 'css/nav-styles.css';
        document.head.appendChild(navStylesheet);
    }
    
    // Handle mobile menu toggle
    const mobileMenuBtn = navbar.querySelector('.mobile-menu-btn');
    const mobileMenu = navbar.querySelector('.mobile-menu');
    
    mobileMenuBtn.addEventListener('click', function() {
        mobileMenuBtn.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!mobileMenuBtn.contains(event.target) && !mobileMenu.contains(event.target)) {
            mobileMenuBtn.classList.remove('active');
            mobileMenu.classList.remove('active');
        }
    });
    
    // Highlight current page in navigation
    const currentPage = window.location.pathname.split('/').pop();
    const navLinks = navbar.querySelectorAll('.nav-links a, .mobile-menu a');
    
    navLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPage) {
            link.classList.add('active');
        }
    });
});