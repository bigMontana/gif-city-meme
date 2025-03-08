console.log("infoPages.js loaded");

// Function to get URL parameters
function getUrlParameter(name) {
    // Use URLSearchParams API for more reliable parameter extraction
    const urlParams = new URLSearchParams(window.location.search);
    const param = urlParams.get(name);
    
    console.log(`Getting URL parameter '${name}':`, param); // Debug output
    return param || '';
}

// Function to set active content section
function setActiveSection() {
    // Get section parameter from URL
    const section = getUrlParameter('section');
    
    console.log("URL section parameter:", section); // Debug output
    
    // Hide all content sections first
    const allSections = document.querySelectorAll('.content-section');
    allSections.forEach(section => {
        section.classList.remove('active');
    });
    
    // Set the appropriate section to active based on URL parameter
    if (section === 'faq') {
        document.getElementById('faq-content').classList.add('active');
        console.log("Activating FAQ section");
    } else if (section === 'charges') {
        document.getElementById('charges-content').classList.add('active');
        console.log("Activating charges section");
    } else {
        // Default to pricing if no parameter is provided or if it's explicitly 'pricing'
        document.getElementById('pricing-content').classList.add('active');
        console.log("Activating pricing section (default)");
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if the loadComponent function exists
    if (typeof loadComponent === 'function') {
        // Load the header and footer components
        if (document.getElementById('header-container')) {
            document.getElementById('header-container').innerHTML = loadComponent('header');
        }
        
        if (document.getElementById('footer-container')) {
            document.getElementById('footer-container').innerHTML = loadComponent('footer');
        }
    } else {
        console.log("loadComponent function not found. Header and footer will not be loaded dynamically.");
    }
    
    // Set the active section based on URL parameter - this will work regardless of components
    setActiveSection();
    
    // Add event listeners for any in-page navigation if needed
    // For example, if you have buttons within the page to switch sections
    const inPageLinks = document.querySelectorAll('[data-section]');
    inPageLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            
            // Update URL without reloading the page
            window.history.pushState({}, '', `?section=${targetSection}`);
            
            // Update active section
            setActiveSection();
        });
    });
});