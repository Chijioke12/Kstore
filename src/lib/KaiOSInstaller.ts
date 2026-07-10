import { FirefoxRDP } from './rdp';

export class KaiOSInstaller {
  private rdp: FirefoxRDP = new FirefoxRDP();
  
  // We bundle debug-forwarder.bin in the public folder
  private async downloadDebugForwarder(onProgress: (p: number) => void): Promise<string> {
      // Fetch it from the bundled asset instead of raw github so it's always available offline
      const url = "/debug-forwarder.bin";
      return this.downloadToStorage(url, "downloads/debug-forwarder.bin", onProgress);
  }

  public async downloadToStorage(url: string, filename: string, onProgress: (p: number) => void): Promise<string> {
    return new Promise((resolve, reject) => {
      const xhr = new (XMLHttpRequest as any)({ mozSystem: true });
      xhr.open('GET', url, true);
      xhr.responseType = 'blob';

      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentComplete = (event.loaded / event.total) * 100;
          onProgress(percentComplete);
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 0) {
          const blob = xhr.response;
          const sdcard = (navigator as any).getDeviceStorage('sdcard');
          if (!sdcard) {
             return reject(new Error('Device storage "sdcard" is not accessible.'));
          }
          
          const request = sdcard.addNamed(blob, filename);
          
          request.onsuccess = function() {
             // In KaiOS, sdcard is usually mounted at /sdcard or /storage/sdcard
             resolve('/sdcard/' + this.result);
          };
          
          request.onerror = function() {
             // If file already exists, we might need to delete it first, but for now just resolve with standard path
             if (this.error && this.error.name === 'NoModificationAllowedError') {
                 // Try deleting and re-adding?
                 console.log("File exists, assuming /sdcard/" + filename);
                 resolve('/sdcard/' + filename);
             } else {
                 reject(new Error(this.error ? this.error.name : 'Unknown Storage Error'));
             }
          };
        } else {
          reject(new Error('Download failed: ' + xhr.statusText));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error'));
      };

      xhr.send();
    });
  }

  public async installAppViaRDP(appZipUrl: string, onProgress: (p: number) => void): Promise<void> {
    const filename = `downloads/app_to_install_${Date.now()}.zip`;
    onProgress(10); // starting download
    
    try {
      const localPath = await this.downloadToStorage(appZipUrl, filename, (p) => {
         onProgress(10 + (p * 0.4)); // 10% to 50% for download
      });
      
      console.log('App downloaded to:', localPath);
      onProgress(55);
      
      // Try to download and start the debug forwarder first
      try {
          const fwdPath = await this.downloadDebugForwarder(() => {});
          console.log('Debug forwarder downloaded to:', fwdPath);
          const ext = (navigator as any).engmodeExtension || (navigator as any).jrdExtension;
          if (ext && typeof ext.execCmd === 'function') {
             console.log('Starting debug forwarder via engmode/jrd extension...');
             const cmd = `chmod +x ${fwdPath} && ${fwdPath} 6000 /data/local/debugger-socket 127.0.0.1`;
             ext.execCmd(cmd);
          } else {
             console.log('No extension found to exec debug forwarder, hoping it is already running...');
          }
      } catch (e) {
          console.log('Error with debug forwarder setup:', e);
      }

      onProgress(60); // Download complete, connecting RDP

      await this.rdp.connect('127.0.0.1', 6000);
      onProgress(70);

      const rootReply = await this.rdp.send('root', 'getWebappsActor');
      const webappsActor = rootReply.actor;
      if (!webappsActor) throw new Error('Could not get webapps actor');

      onProgress(80);

      // We send install request
      // Some versions expect path, some expect appId, typically "path" or "appId" with local file path
      const installReply = await this.rdp.send(webappsActor, 'installPackage', {
         appId: localPath,
         path: localPath
      });

      console.log('Install reply:', installReply);

      if (installReply.error) {
         throw new Error(installReply.error + ': ' + (installReply.message || ''));
      }

      onProgress(100);
    } finally {
      this.rdp.disconnect();
    }
  }
}
