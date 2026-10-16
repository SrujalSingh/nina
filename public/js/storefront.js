// Nina Weaves — Storefront Global UI Utilities

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Navigation Toggle
  const mobileBtn = document.querySelector('.mobile-menu-btn');
  const navLinks = document.querySelector('.nav-links');

  if (mobileBtn && navLinks) {
    mobileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isVisible = navLinks.style.display === 'flex';
      if (isVisible) {
        navLinks.style.display = 'none';
      } else {
        navLinks.style.display = 'flex';
        navLinks.style.flexDirection = 'column';
        navLinks.style.position = 'absolute';
        navLinks.style.top = '68px';
        navLinks.style.left = '0';
        navLinks.style.right = '0';
        navLinks.style.backgroundColor = '#FAF8F5';
        navLinks.style.padding = '1.5rem 2rem';
        navLinks.style.borderBottom = '1px solid #E8E2D8';
        navLinks.style.boxShadow = '0 12px 24px rgba(0,0,0,0.08)';
        navLinks.style.gap = '1.25rem';
        navLinks.style.zIndex = '100';
      }
    });

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!navLinks.contains(e.target) && !mobileBtn.contains(e.target)) {
        if (window.innerWidth <= 768) {
          navLinks.style.display = 'none';
        }
      }
    });

    // Reset when resizing window to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768) {
        navLinks.style.display = '';
        navLinks.style.flexDirection = '';
        navLinks.style.position = '';
      }
    });
  }
});
