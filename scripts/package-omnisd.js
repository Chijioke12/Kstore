import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

async function buildAndPackage() {
  console.log('Processing Vite production build and packaging for OmniSD/KaiOS...');
  
  const htmlPath = 'dist/index.html';
  if (!fs.existsSync(htmlPath)) {
    throw new Error('Vite build output (dist/index.html) not found. Please run vite build first.');
  }
  
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  const assetsDir = 'dist/assets';
  if (!fs.existsSync(assetsDir)) {
    throw new Error('Assets directory not found inside dist/. Ensure build completed.');
  }
  const assetFiles = fs.readdirSync(assetsDir);
  
  // Find all legacy building blocks dynamically
  const polyfillsFile = assetFiles.find(f => f.startsWith('polyfills-legacy-') && f.endsWith('.js'));
  const vendorFile = assetFiles.find(f => f.startsWith('vendor-legacy-') && f.endsWith('.js'));
  const legacyEntryFile = assetFiles.find(f => f.startsWith('index-legacy-') && f.endsWith('.js'));

  if (!polyfillsFile || !legacyEntryFile) {
    throw new Error('Vite legacy assets not found in dist/assets. Check vite.config.ts configuration.');
  }

  // Create clean external loader script
  const loaderContent = `System.import('./assets/${legacyEntryFile}');\n`;
  fs.writeFileSync(path.join(assetsDir, 'load-legacy.js'), loaderContent);
  console.log(`Created load-legacy.js targeting ${legacyEntryFile}`);

  // Strip ALL inline and modern module script tags safely
  let cleanHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');

  // Robustly catch both single and double-quoted absolute paths for CSS / assets
  cleanHtml = cleanHtml.replace(/(href|src)=["']\/assets\//gi, '$1="./assets/');

  // Inject the legacy scripts in strict dependency order (Polyfills -> Vendor -> Loader)
  let scriptInjections = `\n    <script src="./assets/${polyfillsFile}"></script>`;
  if (vendorFile) {
    scriptInjections += `\n    <script src="./assets/${vendorFile}"></script>`;
  }
  scriptInjections += `\n    <script src="./assets/load-legacy.js"></script>\n  </body>`;
  
  cleanHtml = cleanHtml.replace('</body>', scriptInjections);
  
  fs.writeFileSync(htmlPath, cleanHtml);
  console.log('Rewrote index.html to load legacy files cleanly with zero inline scripts.');
  
  // Write Manifest with explicit CSP to guarantee execution under privileged/certified rules
  const manifest = {
    "name": "KaiStore",
    "description": "An alternative open-source App Store client for KaiOS.",
    "version": "1.0.0",
    "launch_path": "/index.html",
    "type": "certified", // Kept certified as requested by user
    "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src *; img-src 'self' data:;",
    "icons": {
      "56": "/assets/icon-56.png",
      "112": "/assets/icon-112.png"
    },
    "developer": {
      "name": "KaiStore Team",
      "url": "https://github.com/Chijioke12/Open-KaiStore-Registry"
    },
    "default_locale": "en-US",
    "permissions": {
      "systemXHR": {
        "description": "Required to fetch registry catalog and download apps."
      },
      "webapps-manage": {
        "description": "Required to handle app installations via import API."
      },
      "deviceStorage:apps": {
        "access": "readwrite",
        "description": "Required to handle app installations and updates if supported."
      }
    },
    "origin": "app://kaistore.omnisd"
  };
  
  fs.writeFileSync('dist/manifest.webapp', JSON.stringify(manifest, null, 2));
  console.log('Created manifest.webapp');
  
  // Handle icons
  const imgDir = 'src/assets/images';
  let generatedImgPath = null;
  try {
    if (fs.existsSync(imgDir)) {
      const files = fs.readdirSync(imgDir);
      const imgFile = files.find(f => f.startsWith('kaistore_icon') && (f.endsWith('.jpg') || f.endsWith('.png')));
      if (imgFile) {
        generatedImgPath = path.join(imgDir, imgFile);
      }
    }
  } catch (e) {}
  
  if (generatedImgPath) {
    try {
      fs.copyFileSync(generatedImgPath, 'dist/assets/icon-56.png');
      fs.copyFileSync(generatedImgPath, 'dist/assets/icon-112.png');
    } catch (e) {
      console.error('Failed to copy icons:', e);
    }
  }
  
  // Build packages
  const appZip = new AdmZip();
  appZip.addLocalFile('dist/index.html');
  appZip.addLocalFile('dist/manifest.webapp');
  appZip.addLocalFolder('dist/assets', 'assets');
  appZip.writeZip('application.zip');
  
  // For OmniSD/KaiOS packaged apps, update.webapp must be a valid mini-manifest
  const updateWebapp = {
    "name": "KaiStore",
    "description": "An alternative open-source App Store client for KaiOS.",
    "version": "1.0.0",
    "developer": {
      "name": "KaiStore Team",
      "url": "https://github.com/Chijioke12/Open-KaiStore-Registry"
    },
    "package_path": "application.zip",
    "icons": {
      "56": "/assets/icon-56.png",
      "112": "/assets/icon-112.png"
    }
  };
  fs.writeFileSync('update.webapp', JSON.stringify(updateWebapp, null, 2));
  
  const metadata = {
    "version": 1,
    "manifestURL": "app://kaistore.omnisd/manifest.webapp"
  };
  fs.writeFileSync('metadata.json.omnisd', JSON.stringify(metadata, null, 2));
  
  const outerZip = new AdmZip();
  outerZip.addLocalFile('application.zip');
  outerZip.addLocalFile('update.webapp');
  outerZip.addFile('metadata.json', fs.readFileSync('metadata.json.omnisd'));
  outerZip.writeZip('kaistore-omnisd.zip');
  
  fs.unlinkSync('application.zip');
  fs.unlinkSync('update.webapp');
  fs.unlinkSync('metadata.json.omnisd');
  console.log('🏁 Successfully generated OmniSD Package: kaistore-omnisd.zip');
}

buildAndPackage().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
