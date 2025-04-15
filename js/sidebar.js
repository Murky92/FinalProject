// Sidebar JavaScript with Dynamic Page Title
document.addEventListener('DOMContentLoaded', function() {
  // Wait for the DOM to be fully loaded
  console.log("Sidebar script with dynamic title loaded");
  
  // 1. Find the existing navigation
  const existingNav = document.querySelector('.shop-nav') || document.querySelector('.admin-nav');
  
  if (!existingNav) {
    console.error('Navigation not found');
    return;
  }
  
  // 2. Get the navigation items
  const navItems = existingNav.querySelectorAll('a');
  
  // 3. Create icons mapping
  const icons = {
    'dashboard': '📊',
    'profile': '👤',
    'reservations': '📅',
    'tables': '🪑',
    'schedule': '🕒',
    'events': '🎉',
    'notifications': '🔔',
    'home': '🏠',
    'event bookings': '🎟️',
    'feedback': '📝'

  };
  
  // 4. Determine current page for dynamic title
  let currentPageTitle = "Shop Dashboard"; // Default title
  const currentPath = window.location.pathname;
  const h1Element = document.querySelector('.dashboard-header h1');
  
  // Try to get the current page title from different sources
  if (h1Element && h1Element.textContent) {
    // Get from the H1 title on the page
    currentPageTitle = h1Element.textContent.split('-')[0].trim();
  } else {
    // Get from active navigation item
    navItems.forEach(item => {
      if (item.classList.contains('active')) {
        currentPageTitle = item.textContent.trim();
      } else {
        // Check if pathname includes href
        const itemPath = item.getAttribute('href');
        if (itemPath && currentPath.includes(itemPath) && itemPath !== "#") {
          currentPageTitle = item.textContent.trim();
        }
      }
    });
  }
  
  console.log("Current page title:", currentPageTitle);
  
  // 5. Create the sidebar structure
  const sidebar = document.createElement('div');
  sidebar.className = 'sidebar';
  
  // 6. Create logo section at top
  const logoContainer = document.createElement('div');
  logoContainer.className = 'sidebar-logo';
  
  // Use the TableTop Reserve logo
  logoContainer.innerHTML = `
    <img src="images/logo-transparent-png.png" alt="TableTop Reserve Logo">
  `;
  
  // 7. Create sidebar header with dynamic title
  const sidebarHeader = document.createElement('div');
  sidebarHeader.className = 'sidebar-header';
  sidebarHeader.innerHTML = `
    <div class="sidebar-title">${currentPageTitle}</div>
    <button class="toggle-btn">◀</button>
  `;
  
  // 8. Create menu container to allow for flex layout (menu at top, logout at bottom)
  const menuContainer = document.createElement('div');
  menuContainer.className = 'sidebar-menu-container';
  
  // 9. Create the main menu
  const sidebarMenu = document.createElement('ul');
  sidebarMenu.className = 'sidebar-menu';
  
  // 10. Add menu items
  navItems.forEach(item => {
    const menuItem = document.createElement('li');
    const menuLink = document.createElement('a');
    menuLink.href = item.href;
    
    // Add active class if the original link was active
    if (item.classList.contains('active')) {
      menuLink.classList.add('active');
    }
    
    // Find appropriate icon
    let icon = '📄'; // Default icon
    const itemText = item.textContent.toLowerCase();
    
    // Check which icon matches
    Object.keys(icons).forEach(key => {
      if (itemText.includes(key)) {
        icon = icons[key];
      }
    });
    
    // Set the menu item content
    menuLink.innerHTML = `
      <span class="menu-icon">${icon}</span>
      <span class="menu-text">${item.textContent}</span>
    `;
    
    menuItem.appendChild(menuLink);
    sidebarMenu.appendChild(menuItem);
  });
  
  // 11. Create logout section at the bottom
  const logoutMenu = document.createElement('ul');
  logoutMenu.className = 'logout-menu';
  
  // Find the existing logout button to get its onclick handler
  const existingLogoutBtn = document.querySelector('.logout-btn');
  let logoutOnclick = '';
  
  if (existingLogoutBtn) {
    logoutOnclick = existingLogoutBtn.getAttribute('onclick') || '';
    console.log("Found logout button with onclick:", logoutOnclick);
  } else {
    console.warn("Logout button not found");
  }
  
  // Create the logout menu item
  const logoutItem = document.createElement('li');
  const logoutLink = document.createElement('a');
  logoutLink.href = '#';
  logoutLink.innerHTML = `
    <span class="menu-icon">🚪</span>
    <span class="menu-text">Logout</span>
  `;
  
  // Set the onclick handler
  if (logoutOnclick) {
    logoutLink.setAttribute('onclick', logoutOnclick);
  } else {
    // Fallback logout function
    logoutLink.setAttribute('onclick', 'if(window.shopAuth && window.shopAuth.logout) window.shopAuth.logout(); else alert("Logout function not found");');
  }
  
  logoutItem.appendChild(logoutLink);
  logoutMenu.appendChild(logoutItem);
  
  // 12. Assemble the menu container
  menuContainer.appendChild(sidebarMenu);
  menuContainer.appendChild(logoutMenu);
  
  // 13. Assemble the sidebar
  sidebar.appendChild(logoContainer);  // Add logo first
  sidebar.appendChild(sidebarHeader);
  sidebar.appendChild(menuContainer);
  
  // 14. Create the mobile toggle button
  const mobileToggle = document.createElement('button');
  mobileToggle.className = 'mobile-toggle';
  mobileToggle.innerHTML = '☰';
  
  // 15. Create overlay for mobile
  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  
  // 16. Find the main content container
  const mainContent = document.querySelector('#shop-content') || document.querySelector('#admin-content');
  
  if (!mainContent) {
    console.error('Main content container not found');
    return;
  }
  
  // 17. Add the sidebar, toggle and overlay to the page
  document.body.insertBefore(sidebar, document.body.firstChild);
  document.body.insertBefore(mobileToggle, document.body.firstChild);
  document.body.insertBefore(overlay, document.body.firstChild);
  
  // 18. Add class to main content
  mainContent.classList.add('main-content');
  
  // 19. Hide the original navigation
  existingNav.style.display = 'none';
  
  
  if (existingLogoutBtn) {
    existingLogoutBtn.style.display = 'none';
  }
  
  // 20. Setup toggle functionality
  const toggleBtn = sidebar.querySelector('.toggle-btn');
  
  toggleBtn.addEventListener('click', function() {
    sidebar.classList.toggle('collapsed');
    mainContent.classList.toggle('sidebar-collapsed');
    
    // Store state in localStorage
    localStorage.setItem('sidebar-collapsed', sidebar.classList.contains('collapsed'));
    
    // Update toggle button text
    this.textContent = sidebar.classList.contains('collapsed') ? '▶' : '◀';
  });
  
  // 21. Setup mobile toggle
  mobileToggle.addEventListener('click', function() {
    sidebar.classList.toggle('mobile-open');
    overlay.classList.toggle('active');
  });
  
  // 22. Close sidebar when clicking overlay
  overlay.addEventListener('click', function() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('active');
  });
  
  // 23. Check if sidebar was previously collapsed
  if (localStorage.getItem('sidebar-collapsed') === 'true') {
    sidebar.classList.add('collapsed');
    mainContent.classList.add('sidebar-collapsed');
    toggleBtn.textContent = '▶';
  }
  
  console.log("Sidebar initialization with dynamic title complete");
});