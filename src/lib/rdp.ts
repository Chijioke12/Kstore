export class FirefoxRDP {
  private socket: any = null;
  private pendingRequests: Map<string, (result: any) => void> = new Map();
  private onMessage: (msg: any) => void = () => {};
  private nextMessageId = 1;

  public async connect(host = '127.0.0.1', port = 6000): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const mozTCPSocket = (navigator as any).mozTCPSocket;
        if (!mozTCPSocket) {
          throw new Error('mozTCPSocket API is not available.');
        }

        this.socket = mozTCPSocket.open(host, port, { binaryType: 'string' });

        this.socket.onopen = () => {
          console.log('RDP: Connected to', host, port);
        };

        this.socket.ondatachannel = (e: any) => {
           console.log("RDP Data Channel");
        };
        
        let buffer = '';

        this.socket.ondata = (e: any) => {
          buffer += e.data;
          
          while (buffer.length > 0) {
             const splitIndex = buffer.indexOf(':');
             if (splitIndex === -1) break;
             
             const lengthStr = buffer.substring(0, splitIndex);
             const length = parseInt(lengthStr, 10);
             
             if (buffer.length < splitIndex + 1 + length) break;
             
             const payload = buffer.substring(splitIndex + 1, splitIndex + 1 + length);
             buffer = buffer.substring(splitIndex + 1 + length);
             
             try {
               const msg = JSON.parse(payload);
               this.handleMessage(msg);
             } catch (err) {
               console.error('RDP JSON parse error', err);
             }
          }
        };

        this.socket.onerror = (e: any) => {
          console.error('RDP Socket error', e);
          reject(e);
        };

        this.socket.onclose = () => {
          console.log('RDP: Connection closed');
        };

        // We resolve when we get the first initial message (greeting)
        const initialHandler = (msg: any) => {
          if (msg.applicationType || msg.from === 'root') {
             this.onMessage = () => {}; // clear
             resolve();
          }
        };
        this.onMessage = initialHandler;

      } catch (err) {
        reject(err);
      }
    });
  }

  private handleMessage(msg: any) {
    console.log('RDP Recv:', msg);
    
    if (this.onMessage) {
       this.onMessage(msg);
    }

    // Match responses to pending requests
    // Unfortunately, Firefox RDP might not always have obvious request IDs if not sent, 
    // but usually responses are directed to the 'to' actor that was requested
    // Wait, Firefox RDP replies usually contain 'from' matching the actor we sent 'to'.
    // We will just resolve promises based on the 'from' actor or a specific event type.
  }

  public send(actor: string, type: string, extra: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      const msg = {
        to: actor,
        type: type,
        ...extra
      };
      
      const payload = JSON.stringify(msg);
      const data = `${payload.length}:${payload}`;
      
      console.log('RDP Send:', msg);
      
      if (!this.socket) {
        return reject(new Error('Not connected'));
      }
      
      // Setup a one-time listener for the response from this actor
      // This is a naive implementation, real RDP uses sequence numbers or 'from' matching carefully.
      const originalOnMessage = this.onMessage;
      this.onMessage = (recvMsg: any) => {
        if (originalOnMessage) originalOnMessage(recvMsg);
        
        // Typical RDP replies come from the actor we sent to
        if (recvMsg.from === actor) {
          // If it has an error property
          if (recvMsg.error) {
            reject(recvMsg.error);
          } else {
             // Let's resolve on the first message from this actor. 
             // In complex interactions we might need more specific event matching.
             resolve(recvMsg);
          }
        }
      };

      this.socket.send(data);
    });
  }

  public disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  public async installApp(appPath: string): Promise<void> {
    // 1. Get root actor
    // Root actor is always 'root'
    
    // 2. Request webapps actor
    const rootReply = await this.send('root', 'getWebappsActor');
    const webappsActor = rootReply.actor; // e.g. webappsActor

    // 3. Send install command to webapps actor
    // The install message requires the appPath
    // { "to": webappsActor, "type": "install", "appId": "<appPath>" } (or something similar depending on B2G version)
    const installReply = await this.send(webappsActor, 'install', {
      appId: appPath // In KaiOS/Firefox OS it's typically 'path' or 'appId', maybe we need to check b-hackers client
    });
    
    console.log('Install reply:', installReply);
  }
}
