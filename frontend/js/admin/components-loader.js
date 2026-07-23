export async function loadAdminComponents() {
  async function fetchAndInsert(containerId, filePath) {
    const container = document.getElementById(containerId);
    if (!container) return;
    try {
      const response = await fetch(filePath);
      if (response.ok) {
        container.innerHTML = await response.text();
        
        // Auto-highlight the active sidebar link based on current file name
        if (containerId === 'sidebar-container') {
          const currentFileName = window.location.pathname.split('/').pop() || 'index.html';
          const activeLink = container.querySelector(`a[href="${currentFileName}"]`);
          if (activeLink) {
            container.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            activeLink.classList.add('active');
          }
        }
      } else {
        console.error(`Error loading component: ${filePath}`);
      }
    } catch (error) {
      console.error(`Failed to load component: ${filePath}`, error);
    }
  }

  // Load navbar and sidebar relative to the page location (using correct 'nav.html' file name)
  await fetchAndInsert('navbar-container', 'components/nav.html');
  await fetchAndInsert('sidebar-container', 'components/sidebar.html');
}

window.logout = function() {
  localStorage.removeItem('cs_token');
  window.location.href = 'login.html';
};

// Mobile Sidebar Toggle Logic
window.toggleSidebar = function() {
  const sidebar = document.getElementById('sidebar-container');
  const backdrop = document.getElementById('sidebarBackdrop');
  if (sidebar) sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('show');
};