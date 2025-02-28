// DOM Elements
const tabs = document.querySelectorAll('.tab');
const uploadBtn = document.querySelector('.btn-primary');
const createBtn = document.querySelector('.btn-secondary');
const loginBtn = document.querySelector('.btn-light');
const templatesContainer = document.querySelector('#templateGallery'); // Updated selector to match HTML

// Import the fetchAllTemplates function
import { fetchAllTemplates } from './supabase.js';

// Keep track of all templates
let allTemplates = [];

// Function to create placeholder SVG for templates without thumbnails
function createPlaceholderSVG(title) {
    return `data:image/svg+xml,${encodeURIComponent(`
        <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#333"/>
            <text x="50%" y="50%" font-family="Arial" font-size="20" fill="#888" text-anchor="middle" dy=".3em">
                ${title || 'Template Preview'}
            </text>
        </svg>
    `)}`;
}

// Function to filter templates based on face count
function filterTemplates(templates, tabText) {
    switch (tabText) {
        case 'All':
            return templates;
        case '1 😁':
            return templates.filter(t => t.face_count === 1);
        case '2 🤪':
            return templates.filter(t => t.face_count === 2);
        case '3+ 😎':
            return templates.filter(t => t.face_count >= 3);
        default:
            return templates;
    }
}

// Function to get the appropriate emoji for face count
function getFaceEmoji(faceCount) {
    if (faceCount === 1) return '😁';
    if (faceCount === 2) return '🤪';
    if (faceCount >= 3) return '😎';
    return '😁'; // default case
}

// Function to display templates in the gallery
async function displayTemplates(templates) {
    if (templates.length === 0) {
        templatesContainer.innerHTML = '<p style="color: white; text-align: center; width: 100%;">No templates found for this category</p>';
        return;
    }

    // Create four columns for the masonry layout
    const columns = Array.from({ length: 4 }, () => {
        const col = document.createElement('div');
        col.className = 'gallery-column';
        return col;
    });

    // Distribute templates across columns
    templates.forEach((template, index) => {
        const column = columns[index % 4];
        const templateEl = document.createElement('div');
        templateEl.className = 'gallery-item';
        
        // Create template content
        const thumbnailUrl = template.thumbnail_url || createPlaceholderSVG(template.title);

        templateEl.innerHTML = `
            <img 
                src="${thumbnailUrl}" 
                alt="${template.title || 'Template'}"
                onerror="this.onerror=null; this.src='${createPlaceholderSVG(template.title)}'"
            />
            <div class="template-info" style="padding: 10px;">
                <h3 style="color: white; margin: 0;">${template.title || 'Untitled'}</h3>
                <p style="color: #888; margin: 5px 0;">${getFaceEmoji(template.face_count)} <span style="font-size: 1.2em;">${template.face_count || 0}</span></p>
            </div>
        `;

        // Add click handler if needed
        templateEl.addEventListener('click', () => {
            console.log('Template clicked, full details:', template);
            // Add navigation or preview functionality here
        });

        column.appendChild(templateEl);
    });

    // Clear and append all columns
    templatesContainer.innerHTML = '';
    columns.forEach(col => templatesContainer.appendChild(col));
}

// Function to load all templates
async function loadTemplates() {
    try {
        allTemplates = await fetchAllTemplates();
        await displayTemplates(allTemplates);
    } catch (error) {
        console.error('Error loading templates:', error);
        templatesContainer.innerHTML = '<p style="color: red; text-align: center; width: 100%;">Error loading templates</p>';
    }
}

// Tab switching functionality
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Remove active class from all tabs
        tabs.forEach(t => t.classList.remove('active'));
        // Add active class to clicked tab
        tab.classList.add('active');
        
        // Filter and display templates based on tab
        const tabText = tab.textContent.trim();
        const filteredTemplates = filterTemplates(allTemplates, tabText);
        displayTemplates(filteredTemplates);
    });
});

// Button click handlers
uploadBtn.addEventListener('click', () => {
    console.log('Upload button clicked');
    // Implement upload functionality
});

createBtn.addEventListener('click', () => {
    console.log('Create button clicked');
    // Implement create functionality
});

loginBtn.addEventListener('click', () => {
    console.log('Login button clicked');
    // Implement login functionality
});

// Initialize any necessary features
document.addEventListener('DOMContentLoaded', async () => {
    console.log('App initialized');
    await loadTemplates(); // Load templates when the page loads
}); 