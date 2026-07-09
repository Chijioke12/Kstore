import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function packageOmniSD() {
  const rootDir = path.resolve(__dirname, '..');
  const distDir = path.join(rootDir, 'dist');
  const metadataPath = path.join(rootDir, 'metadata.json');
  
  if (!fs.existsSync(distDir)) {
    console.error('Build dist directory not found. Run npm run build first.');
    process.exit(1);
  }

  // 1. Read metadata for app name
  let appName = 'kaistore';
  try {
    const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
    if (metadata.name) {
      appName = metadata.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    }
  } catch (e) {
    console.warn('Could not read metadata.json, using default name');
  }

  console.log(`Creating OmniSD package for: ${appName}`);

  // 2. Create the application.zip (standard KaiOS app)
  const appZip = new AdmZip();
  
  // Add all files from dist/ to the root of application.zip
  function addDirectoryToZip(zip, sourcePath, zipPath = '') {
    const files = fs.readdirSync(sourcePath);
    for (const file of files) {
      const curPath = path.join(sourcePath, file);
      const relativePath = path.join(zipPath, file);
      
      if (fs.lstatSync(curPath).isDirectory()) {
        addDirectoryToZip(zip, curPath, relativePath);
      } else {
        zip.addLocalFile(curPath, zipPath);
      }
    }
  }

  addDirectoryToZip(appZip, distDir);
  
  // Save application.zip to memory or temp
  const appZipBuffer = appZip.toBuffer();
  console.log('Built application.zip');

  // 3. Create the update.webapp (metadata for OmniSD/Store)
  // We need to extract the manifest from dist/manifest.webapp to get the version
  let version = '1.0.0';
  try {
    const manifestPath = path.join(distDir, 'manifest.webapp');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    version = manifest.version || '1.0.0';
  } catch (e) {
    console.warn('Could not read manifest.webapp, using version 1.0.0');
  }

  const updateWebapp = {
    name: appName,
    version: version,
    size: appZipBuffer.length,
    package_path: 'application.zip',
    icons: {
      "128": "/assets/kaistore_icon_128.png"
    }
  };

  // 4. Create the final OmniSD wrapper zip
  const finalZip = new AdmZip();
  finalZip.addFile('application.zip', appZipBuffer);
  finalZip.addFile('update.webapp', Buffer.from(JSON.stringify(updateWebapp, null, 2)));
  
  // Add a placeholder icon if it exists in assets
  const iconPath = path.join(rootDir, 'src/assets/images/kaistore_icon_1783509088775.jpg');
  if (fs.existsSync(iconPath)) {
    // OmniSD usually expects icons in a specific path within the zip if defined in update.webapp
    finalZip.addLocalFile(iconPath, 'assets', 'kaistore_icon_128.png');
  }

  const outputName = `${appName}-omnisd.zip`;
  const outputPath = path.join(rootDir, outputName);
  
  finalZip.writeZip(outputPath);
  
  console.log(`Successfully created OmniSD package: ${outputPath}`);
  console.log('You can now use this zip for local installation on KaiOS devices via OmniSD/WebIDE.');
}

packageOmniSD().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
