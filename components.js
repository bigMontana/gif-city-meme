// Wait until the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Function to load an HTML component with optional JS execution
  async function loadComponent(url, elementId) {
    try {
      // Fetch the HTML content from the file
      const response = await fetch(url);
      
      // Check if the fetch was successful
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // Get the HTML content as text
      const html = await response.text();
      
      // Insert the HTML into the placeholder element
      document.getElementById(elementId).innerHTML = html;
      
      // Extract and execute any JavaScript from script tags
      const tempElement = document.createElement('div');
      tempElement.innerHTML = html;
      
      // Find all script tags in the component
      const scriptTags = tempElement.querySelectorAll('script');
      
      // Execute each script
      scriptTags.forEach(scriptTag => {
        // Create a new script element
        const newScript = document.createElement('script');
        
        // Copy all attributes from the original script
        Array.from(scriptTag.attributes).forEach(attr => {
          newScript.setAttribute(attr.name, attr.value);
        });
        
        // Set the script content
        newScript.textContent = scriptTag.textContent;
        
        // Append to the component container
        document.getElementById(elementId).appendChild(newScript);
      });
    } catch (error) {
      console.error('Error loading component:', error);
    }
  }

  // Load the header and footer
  loadComponent('./header.html', 'header-container');
  loadComponent('./footer.html', 'footer-container');
});