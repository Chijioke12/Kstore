import { useState, useEffect } from 'react';
import PhoneFrame from './components/PhoneFrame';
import KaiStore from './components/KaiStore';
import AppRunner from './components/AppRunner';
import { KeyCode, AppItem } from './types';

export default function App() {
  const [screen, setScreen] = useState<'store' | 'app_running'>('store');
  const [activeKey, setActiveKey] = useState<KeyCode | null>(null);
  const [installedAppIds, setInstalledAppIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('kai_installed_apps');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.warn('localStorage read error', e);
      return [];
    }
  });
  const [installedAppVersions, setInstalledAppVersions] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('kai_installed_app_versions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.warn('localStorage read error', e);
      return {};
    }
  });
  const [soundEnabled] = useState(() => {
    try {
      return localStorage.getItem('kai_sound_enabled') !== 'false';
    } catch (e) {
      return true;
    }
  });

  const [apps, setApps] = useState<AppItem[]>([]);
  const [runningApp, setRunningApp] = useState<AppItem | null>(null);

  // Load database from external registry URL
  useEffect(() => {
    fetch('https://raw.githubusercontent.com/Chijioke12/Open-KaiStore-Registry/refs/heads/main/apps.json')
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.apps)) {
          const mappedRegistryApps = data.apps.map((regApp: any): AppItem => {
            let category = regApp.category || 'Utilities';
            const nameLower = regApp.name.toLowerCase();
            const descLower = regApp.description ? regApp.description.toLowerCase() : '';
            if (!regApp.category) {
              if (nameLower.includes('game') || nameLower.includes('match') || nameLower.includes('whot') || nameLower.includes('snake') || nameLower.includes('2048') || nameLower.includes('bee') || nameLower.includes('flappy') || descLower.includes('game') || descLower.includes('puzzle')) {
                category = 'Games';
              } else if (nameLower.includes('bible') || nameLower.includes('prayer') || nameLower.includes('dictionary') || nameLower.includes('wikipedia') || nameLower.includes('search') || descLower.includes('read') || descLower.includes('book') || descLower.includes('article') || descLower.includes('dictionary')) {
                category = 'Books';
              } else if (nameLower.includes('tube') || nameLower.includes('video') || nameLower.includes('player')) {
                category = 'Lifestyle';
              }
            }
            
            const size = regApp.size || `${((regApp.name.length * 7) % 5 + 1).toFixed(1)} MB`;
            const rating = 4.0 + (regApp.name.length % 10) / 10;
            const reviewsCount = (regApp.name.length * 143) % 2000 + 50;
            const version = regApp.version || '1.0.0';

            return {
              id: regApp.id,
              name: regApp.name,
              developer: regApp.author || 'Unknown',
              category: category,
              icon: regApp.icon || 'HelpCircle',
              description: regApp.description || 'No description available.',
              rating: Number(rating.toFixed(1)),
              reviewsCount: reviewsCount,
              size: size,
              version: version,
              download_url: regApp.download_url,
              manifest_url: regApp.manifest_url,
              type: regApp.type,
            };
          });

          setApps(mappedRegistryApps);
        }
      })
      .catch((err) => {
        console.error('Failed to load apps from registry', err);
      });
  }, []);

  // Triggered on any physical or virtual key press
  const handleKeyPress = (key: KeyCode) => {
    setActiveKey(key);

    // Play tactile 8-bit retro keybeep if sound is on
    if (soundEnabled && key !== 'End') {
      playKeyBeep();
    }

    // Global interceptors: End key always kills active app and returns to Store Home
    if (key === 'End') {
      setScreen('store');
    }
  };

  const clearKey = () => {
    setActiveKey(null);
  };

  // Synced state persistence
  const handleInstallApp = (appId: string, version?: string) => {
    setInstalledAppIds((prev) => {
      const updated = prev.includes(appId) ? prev : [...prev, appId];
      try {
        localStorage.setItem('kai_installed_apps', JSON.stringify(updated));
      } catch (e) {
        console.warn('localStorage write error', e);
      }
      return updated;
    });
    if (version) {
      setInstalledAppVersions((prev) => {
        const updated = { ...prev, [appId]: version };
        try {
          localStorage.setItem('kai_installed_app_versions', JSON.stringify(updated));
        } catch (e) {
          console.warn('localStorage write error', e);
        }
        return updated;
      });
    }
  };

  const playKeyBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // High pitch beep

      gainNode.gain.setValueAtTime(0.015, audioCtx.currentTime); // Soft and clicky
      gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.04); // Instant decay

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.045);
    } catch (e) {
      // Audio blocked or not supported
    }
  };

  const handleLaunchApp = (appId: string) => {
    const targetApp = apps.find((a) => a.id === appId);
    if (targetApp) {
      setRunningApp(targetApp);
      setScreen('app_running');
    }
  };

  const backToStore = () => {
    setScreen('store');
  };

  return (
    <PhoneFrame onKeyPress={handleKeyPress}>
      {/* Dynamic Screen inside Virtual QVGA Canvas (240x320) */}
      <div className="phone-screen-inner">
        
        {/* Master Active App Routing */}
        <div style={{flex: 1, position: 'relative', overflow: 'hidden', backgroundColor: '#000000'}}>

          {screen === 'store' && (
            <KaiStore
              installedAppIds={installedAppIds}
              installedAppVersions={installedAppVersions}
              onInstallApp={handleInstallApp}
              onLaunchApp={handleLaunchApp}
              activeKey={activeKey}
              onClearKey={clearKey}
              onBackToLauncher={backToStore}
              apps={apps}
            />
          )}

          {screen === 'app_running' && runningApp && (
            <AppRunner
              app={runningApp}
              activeKey={activeKey}
              onClearKey={clearKey}
              onBack={backToStore}
            />
          )}

        </div>
      </div>
    </PhoneFrame>
  );
}
