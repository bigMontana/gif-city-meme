const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// Define the HTML files that need to be processed
const htmlFiles = ['index.html', 'view.html', 'view_single.html', 'editor.html'];

// Create a build directory if it doesn't exist
const buildDir = path.join(__dirname, 'dist');
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir);
}

// Process each HTML file
htmlFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  // Skip if file doesn't exist
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`);
    return;
  }

  // Read the HTML file
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Create a template version with placeholders (for source control)
  let templateContent = content;
  
  // Replace hardcoded environment variables with placeholders in template
  Object.keys(process.env).forEach(key => {
    // Skip non-relevant environment variables
    if (!key.startsWith('SUPABASE_')) return;
    
    // Replace hardcoded values with placeholders in template
    const regex = new RegExp(`content=["']${process.env[key]}["']`, 'g');
    templateContent = templateContent.replace(regex, `content="<%${key}%>"`);
  });
  
  // Save the template version for source control
  const templatePath = path.join(__dirname, 'templates', file);
  ensureDirectoryExists(path.dirname(templatePath));
  fs.writeFileSync(templatePath, templateContent);
  
  // Replace the placeholders with actual values for the build version
  Object.keys(process.env).forEach(key => {
    // Skip non-relevant environment variables
    if (!key.startsWith('SUPABASE_')) return;
    
    // Replace meta tag content with environment variable
    const metaTagRegex = new RegExp(`<meta name="${key.toLowerCase().replace(/_/g, '-')}" content="[^"]*">`, 'g');
    const metaTagReplacement = `<meta name="${key.toLowerCase().replace(/_/g, '-')}" content="${process.env[key]}">`;
    
    // If the meta tag exists, replace it
    if (metaTagRegex.test(content)) {
      content = content.replace(metaTagRegex, metaTagReplacement);
    } 
    // Otherwise, insert it in the head section
    else if (key === 'SUPABASE_URL' || key === 'SUPABASE_ANON_KEY') {
      const headCloseTagIndex = content.indexOf('</head>');
      if (headCloseTagIndex !== -1) {
        content = content.slice(0, headCloseTagIndex) + 
                `    ${metaTagReplacement}\n` + 
                content.slice(headCloseTagIndex);
      }
    }
  });
  
  // Write the processed file to the build directory
  const outputPath = path.join(buildDir, file);
  fs.writeFileSync(outputPath, content);
  console.log(`Processed ${file} -> dist/${file}`);
});

// Copy other necessary files to the build directory
const filesToCopy = [
  'styles.css', 
  'script.js', 
  'app.js', 
  'supabase.js',
  'logo_noText.png',
  'gifcity.png',
  'xlogo2.png'
];

filesToCopy.forEach(file => {
  const filePath = path.join(__dirname, file);
  
  // Skip if file doesn't exist
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${file} - file not found`);
    return;
  }
  
  // Copy the file to the build directory
  const outputPath = path.join(buildDir, file);
  fs.copyFileSync(filePath, outputPath);
  console.log(`Copied ${file} -> dist/${file}`);
});

// Utility function to ensure a directory exists
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
} 