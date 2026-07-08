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
  
  // Find legacy files in dist/assets
  const assetsDir = 'dist/assets';
  if (!fs.existsSync(assetsDir)) {
    throw new Error('Assets directory not found inside dist/. Ensure build completed.');
  }
  const assetFiles = fs.readdirSync(assetsDir);
  const polyfillsFile = assetFiles.find(f => f.startsWith('polyfills-legacy-') && f.endsWith('.js'));
  const legacyEntryFile = assetFiles.find(f => f.startsWith('index-legacy-') && f.endsWith('.js'));

  if (!polyfillsFile || !legacyEntryFile) {
    throw new Error('Vite legacy assets not found in dist/assets. Check vite.config.ts configuration.');
  }

  // Create clean external loader script
  const loaderContent = `System.import('./assets/${legacyEntryFile}');\n`;
  fs.writeFileSync(path.join(assetsDir, 'load-legacy.js'), loaderContent);
  console.log(`Created load-legacy.js targeting ${legacyEntryFile}`);

  // Strip all existing script tags to comply with strict KaiOS certified app CSP (which forbids inline scripts)
  let cleanHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, '');

  // Make other asset paths relative (e.g. stylesheets)
  cleanHtml = cleanHtml.replace(/href="\/assets\//g, 'href="./assets/');

  // Inject the clean legacy script tags (zero inline scripts) just before body close
  const scriptInjections = `
    <script src="./assets/${polyfillsFile}"></script>
    <script src="./assets/load-legacy.js"></script>
  </body>`;
  
  cleanHtml = cleanHtml.replace('</body>', scriptInjections);
  
  fs.writeFileSync(htmlPath, cleanHtml);
  console.log('Rewrote index.html to load legacy files cleanly with zero inline scripts.');
  
  // 3. Create manifest.webapp inside dist/
  const manifest = {
    "name": "KaiStore",
    "description": "An alternative open-source App Store client for KaiOS, allowing you to browse, search, and sideload apps from the custom catalog.",
    "version": "1.0.0",
    "launch_path": "/index.html",
    "type": "certified",
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
      "deviceStorage:apps": {
        "access": "readwrite",
        "description": "Required to handle app installations and updates if supported."
      }
    },
    "origin": "app://kaistore.omnisd"
  };
  
  fs.writeFileSync('dist/manifest.webapp', JSON.stringify(manifest, null, 2));
  console.log('Created manifest.webapp');
  
  // 4. Create/copy icons to dist/assets
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
  } catch (e) {
    // Ignored
  }
  
  if (generatedImgPath) {
    try {
      fs.copyFileSync(generatedImgPath, 'dist/assets/icon-56.png');
      fs.copyFileSync(generatedImgPath, 'dist/assets/icon-112.png');
      console.log(`Copied icon from ${generatedImgPath}`);
    } catch (e) {
      console.error('Failed to copy icons:', e);
    }
  } else {
    console.log('Warning: Generated icon not found, using placeholder');
  }
  
  // 5. Create application.zip containing only the required files for KaiOS
  const appZip = new AdmZip();
  appZip.addLocalFile('dist/index.html');
  appZip.addLocalFile('dist/manifest.webapp');
  appZip.addLocalFolder('dist/assets', 'assets');
  appZip.writeZip('application.zip');
  console.log('Created application.zip');
  
  // 6. Create update.webapp (empty file)
  fs.writeFileSync('update.webapp', '');
  console.log('Created empty update.webapp');
  
  // 7. Create metadata.json for OmniSD
  const metadata = {
    "version": 1,
    "manifestURL": "app://kaistore.omnisd/manifest.webapp"
  };
  fs.writeFileSync('metadata.json.omnisd', JSON.stringify(metadata, null, 2));
  console.log('Created metadata.json.omnisd');
  
  // 8. Create the outer omnisd zip package: kaistore-omnisd.zip
  const outerZip = new AdmZip();
  outerZip.addLocalFile('application.zip');
  outerZip.addLocalFile('update.webapp');
  outerZip.addFile('metadata.json', fs.readFileSync('metadata.json.omnisd'));
  outerZip.writeZip('kaistore-omnisd.zip');
  console.log('Created OmniSD Package: kaistore-omnisd.zip');
  
  // Clean up intermediate local files to keep workspace tidy
  fs.unlinkSync('application.zip');
  fs.unlinkSync('update.webapp');
  fs.unlinkSync('metadata.json.omnisd');
  console.log('Cleaned up intermediate zip files.');
}

buildAndPackage().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
