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
  
  // 3. Create the update.webapp (metadata for OmniSD/Store)
  // Check if manifest.webapp exists in dist, if not generate it for application.zip
  let manifestData = null;
  const manifestPath = path.join(distDir, 'manifest.webapp');
  if (fs.existsSync(manifestPath)) {
    try {
      manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      console.warn('Could not parse manifest.webapp');
    }
  }

  if (!manifestData) {
    console.log('Generating manifest.webapp for application.zip...');
    manifestData = {
      name: appName.charAt(0).toUpperCase() + appName.slice(1).replace(/-/g, ' '),
      description: "KaiOS Store Application",
      version: "1.0.0",
      launch_path: "/index.html",
      icons: {
        "56": "/assets/kaistore_icon_56.png",
        "112": "/assets/kaistore_icon_112.png",
        "128": "/assets/kaistore_icon_128.png"
      },
      developer: {
        name: "KaiOS",
        url: "http://kaiostech.com"
      },
      type: "privileged",
      permissions: {},
      default_locale: "en-US"
    };
    appZip.addFile('manifest.webapp', Buffer.from(JSON.stringify(manifestData, null, 2)));
  }

  const version = manifestData.version || '1.0.0';
  const appZipBuffer = appZip.toBuffer();
  console.log('Built application.zip');

  const updateWebapp = {
    name: manifestData.name,
    version: version,
    size: appZipBuffer.length,
    package_path: 'application.zip',
    icons: manifestData.icons || {
      "128": "/assets/kaistore_icon_128.png"
    }
  };

  // 4. Create the final OmniSD wrapper zip
  const finalZip = new AdmZip();
  finalZip.addFile('application.zip', appZipBuffer);
  finalZip.addFile('update.webapp', Buffer.from(JSON.stringify(updateWebapp, null, 2)));
  
  // Add icon to the root or assets folder if it exists
  const iconPath = path.join(rootDir, 'src/assets/images/kaistore_icon_1783509088775.jpg');
  if (fs.existsSync(iconPath)) {
    finalZip.addLocalFile(iconPath, '', 'kaistore_icon_128.png');
    // Also add to assets for internal manifest reference if needed
    finalZip.addLocalFile(iconPath, 'assets', 'kaistore_icon_128.png');
    finalZip.addLocalFile(iconPath, 'assets', 'kaistore_icon_112.png');
    finalZip.addLocalFile(iconPath, 'assets', 'kaistore_icon_56.png');
  }

  const outputName = `kaistore-omnisd.zip`;
  const outputPath = path.join(rootDir, outputName);
  
  finalZip.writeZip(outputPath);
  
  console.log(`Successfully created OmniSD package: ${outputPath}`);
  console.log('You can now use this zip for local installation on KaiOS devices via OmniSD/WebIDE.');
}

packageOmniSD().catch(err => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
