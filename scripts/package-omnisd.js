import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

async function buildAndPackage() {
  console.log('Starting classic JS build using esbuild...');
  
  // 1. Compile src/main.tsx with esbuild to target Gecko 48 (ES2015/ES6)
  await esbuild.build({
    entryPoints: ['src/main.tsx'],
    bundle: true,
    minify: true,
    target: 'es2015',
    outfile: 'dist/assets/index-classic.js',
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.PROD': 'true',
    },
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.css': 'css',
    },
    alias: {
      'react': 'preact/compat',
      'react-dom': 'preact/compat',
      'react/jsx-runtime': 'preact/compat/jsx-runtime',
    },
  });
  
  console.log('Classic JS build completed.');
  
  // 2. Read Vite\'s output index.html and rewrite it to load index-classic.js and use relative paths!
  const htmlPath = 'dist/index.html';
  let html = fs.readFileSync(htmlPath, 'utf8');
  
  // Use the esbuild generated index-classic.css directly!
  const cssHref = './assets/index-classic.css';
  
  html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#ee3024" />
    <title>KaiStore</title>
    <link rel="stylesheet" href="\${cssHref}">
    <script>
      (function() {
        // 1. Object.getOwnPropertyDescriptors
        if (!Object.getOwnPropertyDescriptors) {
          Object.getOwnPropertyDescriptors = function(obj) {
            if (obj === null || obj === undefined) {
              throw new TypeError('Cannot convert undefined or null to object');
            }
            var proto = Object(obj);
            var descriptors = {};
            var keys = Object.getOwnPropertyNames(proto);
            if (Object.getOwnPropertySymbols) {
              keys = keys.concat(Object.getOwnPropertySymbols(proto));
            }
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              var desc = Object.getOwnPropertyDescriptor(proto, key);
              if (desc !== undefined) {
                descriptors[key] = desc;
              }
            }
            return descriptors;
          };
        }

        // 2. Object.values
        if (!Object.values) {
          Object.values = function(obj) {
            if (obj === null || obj === undefined) {
              throw new TypeError('Cannot convert undefined or null to object');
            }
            var res = [];
            for (var key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                res.push(obj[key]);
              }
            }
            return res;
          };
        }

        // 3. Object.entries
        if (!Object.entries) {
          Object.entries = function(obj) {
            if (obj === null || obj === undefined) {
              throw new TypeError('Cannot convert undefined or null to object');
            }
            var res = [];
            for (var key in obj) {
              if (Object.prototype.hasOwnProperty.call(obj, key)) {
                res.push([key, obj[key]]);
              }
            }
            return res;
          };
        }

        // 4. Object.fromEntries
        if (!Object.fromEntries) {
          Object.fromEntries = function(entries) {
            if (!entries) {
              throw new TypeError('Object.fromEntries() requires an iterable');
            }
            var obj = {};
            if (Array.isArray(entries)) {
              for (var i = 0; i < entries.length; i++) {
                var pair = entries[i];
                if (pair && pair.length >= 2) {
                  obj[pair[0]] = pair[1];
                }
              }
            } else if (typeof Symbol !== 'undefined' && entries[Symbol.iterator]) {
              var iterator = entries[Symbol.iterator]();
              var next = iterator.next();
              while (!next.done) {
                var pair = next.value;
                if (pair && pair.length >= 2) {
                  obj[pair[0]] = pair[1];
                }
                next = iterator.next();
              }
            }
            return obj;
          };
        }

        // 5. Promise.prototype.finally
        if (typeof Promise !== 'undefined' && !Promise.prototype.finally) {
          Promise.prototype.finally = function(callback) {
            var constructor = this.constructor;
            return this.then(
              function(value) {
                return constructor.resolve(callback()).then(function() { return value; });
              },
              function(reason) {
                return constructor.resolve(callback()).then(function() { throw reason; });
              }
            );
          };
        }

        // 6. Array.prototype.flat
        if (!Array.prototype.flat) {
          Array.prototype.flat = function(depth) {
            var d = depth === undefined ? 1 : Number(depth);
            var flatten = function(arr, currentDepth) {
              if (currentDepth <= 0) {
                return arr.slice();
              }
              var res = [];
              for (var i = 0; i < arr.length; i++) {
                var val = arr[i];
                if (Array.isArray(val)) {
                  res = res.concat(flatten(val, currentDepth - 1));
                } else {
                  res.push(val);
                }
              }
              return res;
            };
            return flatten(this, d);
          };
        }

        // 7. Array.prototype.flatMap
        if (!Array.prototype.flatMap) {
          Array.prototype.flatMap = function(callback, thisArg) {
            var mapped = [];
            for (var i = 0; i < this.length; i++) {
              mapped.push(callback.call(thisArg, this[i], i, this));
            }
            return mapped.flat();
          };
        }

        // 8. String.prototype.padStart
        if (!String.prototype.padStart) {
          String.prototype.padStart = function(targetLength, padString) {
            targetLength = targetLength >> 0;
            padString = String(padString !== undefined ? padString : ' ');
            if (this.length > targetLength) {
              return String(this);
            } else {
              targetLength = targetLength - this.length;
              if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
              }
              return padString.slice(0, targetLength) + String(this);
            }
          };
        }

        // 9. String.prototype.padEnd
        if (!String.prototype.padEnd) {
          String.prototype.padEnd = function(targetLength, padString) {
            targetLength = targetLength >> 0;
            padString = String(padString !== undefined ? padString : ' ');
            if (this.length > targetLength) {
              return String(this);
            } else {
              targetLength = targetLength - this.length;
              if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length);
              }
              return String(this) + padString.slice(0, targetLength);
            }
          };
        }
      })();
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script src="./assets/index-classic.js"></script>
  </body>
</html>`;

  fs.writeFileSync(htmlPath, html);
  console.log('Rewrote index.html for classic loading and relative paths.');
  
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
  // We can copy the generated image or if it doesn\'t exist, we can use a generic fallback.
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
  appZip.addLocalFile('dist/assets/index-classic.js', 'assets');
  if (fs.existsSync('dist/assets/index-classic.css')) {
    appZip.addLocalFile('dist/assets/index-classic.css', 'assets');
  }
  if (fs.existsSync('dist/assets/icon-56.png')) {
    appZip.addLocalFile('dist/assets/icon-56.png', 'assets');
  }
  if (fs.existsSync('dist/assets/icon-112.png')) {
    appZip.addLocalFile('dist/assets/icon-112.png', 'assets');
  }
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
