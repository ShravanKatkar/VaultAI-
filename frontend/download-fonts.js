import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Parse arguments
// e.g. node download-fonts.js --fonts="Inter:300,400,500,600" --fonts="JetBrains+Mono:400,500"
const args = process.argv.slice(2);
const fonts = [];
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--fonts=')) {
    fonts.push(args[i].split('=')[1]);
  }
}

if (fonts.length === 0) {
  // Use defaults if no arguments parsed
  fonts.push("Inter:300,400,500,600");
  fonts.push("JetBrains+Mono:400,500");
}

console.log("Fonts to download:", fonts);

// Build Google Fonts CSS URL
// e.g. https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap
const families = fonts.map(f => {
  const [name, weights] = f.split(':');
  if (weights) {
    const wList = weights.split(',');
    return `family=${name.replace(/ /g, '+')}:wght@${wList.join(';')}`;
  }
  return `family=${name.replace(/ /g, '+')}`;
});

const cssUrl = `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
console.log("Fetching CSS from:", cssUrl);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fontsDir = path.join(__dirname, 'public', 'fonts');
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

async function run() {
  try {
    // We need a modern browser User Agent to get WOFF2 files
    const response = await fetch(cssUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Fonts CSS: ${response.statusText}`);
    }
    
    let cssContent = await response.text();
    console.log("Successfully fetched CSS. Downloading font files...");
    
    // Find all font URLs
    const urlRegex = /url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g;
    let match;
    const urls = [];
    while ((match = urlRegex.exec(cssContent)) !== null) {
      urls.push(match[1]);
    }
    
    // Deduplicate
    const uniqueUrls = [...new Set(urls)];
    console.log(`Found ${uniqueUrls.length} unique font files to download.`);
    
    for (let i = 0; i < uniqueUrls.length; i++) {
      const url = uniqueUrls[i];
      const filename = path.basename(url);
      const destPath = path.join(fontsDir, filename);
      
      console.log(`[${i+1}/${uniqueUrls.length}] Downloading ${filename}...`);
      const fontRes = await fetch(url);
      if (!fontRes.ok) {
        throw new Error(`Failed to download font file ${url}: ${fontRes.statusText}`);
      }
      const buffer = await fontRes.arrayBuffer();
      fs.writeFileSync(destPath, Buffer.from(buffer));
      
      // Replace remote URL with local path in CSS
      cssContent = cssContent.replaceAll(url, `/fonts/${filename}`);
    }
    
    // Write CSS file
    const stylesDir = path.join(__dirname, 'src', 'styles');
    if (!fs.existsSync(stylesDir)) {
      fs.mkdirSync(stylesDir, { recursive: true });
    }
    const cssPath = path.join(stylesDir, 'fonts.css');
    fs.writeFileSync(cssPath, cssContent);
    console.log(`Saved CSS file to ${cssPath}`);
    
    // Update tokens.css to use local fonts
    const tokensPath = path.join(stylesDir, 'tokens.css');
    if (fs.existsSync(tokensPath)) {
      let tokensContent = fs.readFileSync(tokensPath, 'utf8');
      // Replace @import url('https://fonts.googleapis.com...') with @import './fonts.css';
      const importRegex = /@import\s+url\(['"]https:\/\/fonts\.googleapis\.com\/css2[^'"]+['"]\);/g;
      const importRegex2 = /@import\s+url\(['"]https:\/\/fonts\.googleapis\.com\/css2[^'"]+['"]\)\s*;/g;
      
      if (importRegex.test(tokensContent)) {
        tokensContent = tokensContent.replace(importRegex, `@import './fonts.css';`);
        fs.writeFileSync(tokensPath, tokensContent);
        console.log("Updated tokens.css to use local fonts!");
      } else if (importRegex2.test(tokensContent)) {
        tokensContent = tokensContent.replace(importRegex2, `@import './fonts.css';`);
        fs.writeFileSync(tokensPath, tokensContent);
        console.log("Updated tokens.css to use local fonts (variant 2)!");
      } else {
        // If not found, prepend import to tokens.css
        if (!tokensContent.includes(`@import './fonts.css';`)) {
          tokensContent = `@import './fonts.css';\n` + tokensContent;
          fs.writeFileSync(tokensPath, tokensContent);
          console.log("Prepended local fonts import to tokens.css!");
        }
      }
    }
    
    console.log("Local font self-hosting setup complete!");
  } catch (err) {
    console.error("Error setting up fonts:", err);
  }
}

run();
