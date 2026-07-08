import { useEffect, useState, useRef } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Search,
  ShoppingBag,
  Star,
  RefreshCw,
  Play,
  Download,
  AlertTriangle,
  Loader2,
  HelpCircle
} from 'lucide-react';
import { AppItem, KaiScreen } from '../types';

const Icons = {
  CheckCircle2,
  AlertCircle,
  Search,
  ShoppingBag,
  Star,
  RefreshCw,
  Play,
  Download,
  AlertTriangle,
  Loader2,
  HelpCircle
};
interface KaiStoreProps {
  installedAppIds: string[];
  installedAppVersions: Record<string, string>;
  onInstallApp: (appId: string, version?: string) => void;
  onLaunchApp: (appId: string) => void;
  activeKey: string | null;
  onClearKey: () => void;
  onBackToLauncher: () => void;
  apps: AppItem[];
}

type StoreView = 'TABS' | 'APP_LIST' | 'DETAIL' | 'SEARCH';

const CATEGORIES = ['Featured', 'Games', 'Utilities', 'Books', 'Lifestyle'] as const;

export default function KaiStore({
  installedAppIds,
  installedAppVersions,
  onInstallApp,
  onLaunchApp,
  activeKey,
  onClearKey,
  onBackToLauncher,
  apps,
}: KaiStoreProps) {
  // Store Navigation state
  const [storeView, setStoreView] = useState<StoreView>('TABS');
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [tabFocusIndices, setTabFocusIndices] = useState<Record<number, number>>({});
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  // Download simulation state
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const [downloadStep, setDownloadStep] = useState<'IDLE' | 'DOWNLOADING' | 'INSTALLING' | 'INSTALLED' | 'ERROR'>('IDLE');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [lastKeyPressed, setLastKeyPressed] = useState<string | null>(null);
  const [tapIndex, setTapIndex] = useState(0);
  const [searchListFocusIdx, setSearchListFocusIdx] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const appListRef = useRef<HTMLDivElement | null>(null);
  const searchListRef = useRef<HTMLDivElement | null>(null);

  const activeCategory = CATEGORIES[activeTabIdx];

  // Get apps matching current tab
  const getCategoryApps = (): AppItem[] => {
    if (activeCategory === 'Featured') {
      // Pick some popular ones to showcase as featured (including local and registry ones!)
      return apps.filter((a) => ['snake', 'calculator', 'chat', 'naija-whot', 'kaios-2048', 'flappy-kaios'].includes(a.id));
    }
    return apps.filter((a) => a.category === activeCategory);
  };

  const currentApps = getCategoryApps();

  const appListFocusIdx = Math.min(tabFocusIndices[activeTabIdx] ?? 0, Math.max(0, currentApps.length - 1));

  const setAppListFocusIdx = (newVal: number | ((prev: number) => number)) => {
    setTabFocusIndices((prev) => {
      const currentVal = prev[activeTabIdx] ?? 0;
      const computedVal = typeof newVal === 'function' ? newVal(currentVal) : newVal;
      return {
        ...prev,
        [activeTabIdx]: computedVal,
      };
    });
  };

  // Search filter
  const getFilteredApps = () => {
    return apps.filter((app) =>
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const searchedApps = getFilteredApps();

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  // Reset scroll on detail view enter
  useEffect(() => {
    if (storeView === 'DETAIL' && detailScrollRef.current) {
      detailScrollRef.current.scrollTop = 0;
    }
  }, [storeView]);

  // Reset search list index on search query or search view change
  useEffect(() => {
    setSearchListFocusIdx(0);
  }, [searchQuery, storeView]);

  // Scroll category app list to center
  useEffect(() => {
    if (storeView === 'APP_LIST' && appListRef.current) {
      const container = appListRef.current;
      const activeElement = container.querySelector('.store-app-row.active') as HTMLElement;
      if (activeElement) {
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.offsetHeight;
        const containerHeight = container.clientHeight;
        const targetScrollPos = elementTop - (containerHeight / 2) + (elementHeight / 2);
        container.scrollTop = targetScrollPos;
      }
    }
  }, [appListFocusIdx, storeView]);

  // Scroll search results list to center
  useEffect(() => {
    if (storeView === 'SEARCH' && searchListRef.current) {
      const container = searchListRef.current;
      const activeElement = container.querySelector('.store-search-row.active') as HTMLElement;
      if (activeElement) {
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.offsetHeight;
        const containerHeight = container.clientHeight;
        const targetScrollPos = elementTop - (containerHeight / 2) + (elementHeight / 2);
        container.scrollTop = targetScrollPos;
      }
    }
  }, [searchListFocusIdx, storeView]);

  // Keyboard navigation driver
  useEffect(() => {
    if (!activeKey) return;

    if (storeView === 'TABS') {
      switch (activeKey) {
        case 'ArrowLeft':
          setActiveTabIdx((prev) => (prev > 0 ? prev - 1 : CATEGORIES.length - 1));
          break;
        case 'ArrowRight':
          setActiveTabIdx((prev) => (prev < CATEGORIES.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowDown':
          if (currentApps.length > 0) {
            setStoreView('APP_LIST');
          }
          break;
        case 'SoftLeft': // Search
          setStoreView('SEARCH');
          setSearchQuery('');
          break;
        case 'SoftRight':
        case 'Back':
          break;
      }
    } else if (storeView === 'APP_LIST') {
      switch (activeKey) {
        case 'ArrowUp':
          if (appListFocusIdx === 0) {
            setStoreView('TABS');
          } else {
            setAppListFocusIdx((i) => i - 1);
          }
          break;
        case 'ArrowDown':
          if (appListFocusIdx < currentApps.length - 1) {
            setAppListFocusIdx((i) => i + 1);
          }
          break;
        case 'ArrowLeft':
          setActiveTabIdx((prev) => (prev > 0 ? prev - 1 : CATEGORIES.length - 1));
          break;
        case 'ArrowRight':
          setActiveTabIdx((prev) => (prev < CATEGORIES.length - 1 ? prev + 1 : 0));
          break;
        case 'Enter':
        case 'Key5':
          const app = currentApps[appListFocusIdx];
          if (app) {
            setSelectedApp(app);
            setStoreView('DETAIL');
            setDownloadProgress(null);
            setDownloadStep('IDLE');
          }
          break;
        case 'SoftLeft': // Search
          setStoreView('SEARCH');
          setSearchQuery('');
          break;
        case 'SoftRight':
        case 'Back':
          onBackToLauncher();
          break;
      }
    } else if (storeView === 'DETAIL') {
      const isInstalled = selectedApp ? installedAppIds.includes(selectedApp.id) : false;
      const installedVer = selectedApp ? (installedAppVersions[selectedApp.id] || '1.0.0') : '1.0.0';
      const hasUpdate = isInstalled && selectedApp && selectedApp.version && (selectedApp.version !== installedVer);

      switch (activeKey) {
        case 'ArrowUp':
          if (detailScrollRef.current) {
            detailScrollRef.current.scrollBy({ top: -35, behavior: 'smooth' });
          }
          break;
        case 'ArrowDown':
          if (detailScrollRef.current) {
            detailScrollRef.current.scrollBy({ top: 35, behavior: 'smooth' });
          }
          break;
        case 'Enter':
        case 'Key5':
          if (selectedApp) {
            if (hasUpdate) {
              startDownload(selectedApp.id);
            } else if (isInstalled) {
              onLaunchApp(selectedApp.id);
            } else if (downloadStep === 'IDLE') {
              startDownload(selectedApp.id);
            }
          }
          break;
        case 'SoftLeft':
          if (selectedApp && isInstalled) {
            onLaunchApp(selectedApp.id);
          }
          break;
        case 'Key0':
          if (isInstalled && selectedApp) {
            onInstallApp(selectedApp.id, '0.9.0');
            setDownloadStep('IDLE');
          }
          break;
        case 'SoftRight':
        case 'Back':
          setStoreView('APP_LIST');
          break;
      }
    } else if (storeView === 'SEARCH') {
      // Search controls
      if (activeKey.startsWith('Key') && activeKey.length === 4) {
        // Multi-tap writing
        handleSearchKeyTap(activeKey);
      } else {
        switch (activeKey) {
          case 'KeyHash': // Del
            if (lastKeyPressed) {
              setLastKeyPressed(null);
              setTapIndex(0);
              if (timerRef.current) clearTimeout(timerRef.current);
            } else {
              setSearchQuery((prev) => prev.slice(0, -1));
            }
            break;
          case 'Enter':
          case 'Key5':
            if (searchedApps.length > 0) {
              commitSearchTap();
              const app = searchedApps[searchListFocusIdx];
              if (app) {
                setSelectedApp(app);
                setStoreView('DETAIL');
                setDownloadProgress(null);
                setDownloadStep('IDLE');
              }
            } else {
              commitSearchTap();
              setSearchQuery((prev) => prev + ' ');
            }
            break;
          case 'ArrowUp':
            if (searchedApps.length > 0) {
              commitSearchTap();
              setSearchListFocusIdx((i) => (i > 0 ? i - 1 : searchedApps.length - 1));
            }
            break;
          case 'ArrowDown':
            if (searchedApps.length > 0) {
              commitSearchTap();
              setSearchListFocusIdx((i) => (i < searchedApps.length - 1 ? i + 1 : 0));
            }
            break;
          case 'SoftLeft': // Shortcut selection: install/open selected search result
            if (searchedApps.length > 0) {
              commitSearchTap();
              const app = searchedApps[searchListFocusIdx];
              if (app) {
                setSelectedApp(app);
                setStoreView('DETAIL');
                setDownloadProgress(null);
                setDownloadStep('IDLE');
              }
            }
            break;
          case 'SoftRight':
          case 'Back':
            commitSearchTap();
            setStoreView('TABS');
            break;
        }
      }
    }

    onClearKey();
  }, [
    activeKey,
    storeView,
    activeTabIdx,
    appListFocusIdx,
    selectedApp,
    downloadStep,
    installedAppIds,
    installedAppVersions,
    searchQuery,
    lastKeyPressed,
    tapIndex,
    currentApps,
    searchListFocusIdx,
    searchedApps,
  ]);

  // T9 map for search
  const SEARCH_TAP_MAP: Record<string, string[]> = {
    'Key1': ['.', '1'],
    'Key2': ['a', 'b', 'c', '2'],
    'Key3': ['d', 'e', 'f', '3'],
    'Key4': ['g', 'h', 'i', '4'],
    'Key5': ['j', 'k', 'l', '5'],
    'Key6': ['m', 'n', 'o', '6'],
    'Key7': ['p', 'q', 'r', 's', '7'],
    'Key8': ['t', 'u', 'v', '8'],
    'Key9': ['w', 'x', 'y', 'z', '9'],
    'Key0': [' ', '0'],
  };

  const handleSearchKeyTap = (key: string) => {
    const chars = SEARCH_TAP_MAP[key];
    if (!chars) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (lastKeyPressed === key) {
      const nextIdx = (tapIndex + 1) % chars.length;
      setTapIndex(nextIdx);
      timerRef.current = setTimeout(() => {
        setSearchQuery((prev) => prev + chars[nextIdx]);
        setLastKeyPressed(null);
        setTapIndex(0);
      }, 700);
    } else {
      if (lastKeyPressed) {
        const prevChars = SEARCH_TAP_MAP[lastKeyPressed];
        setSearchQuery((prev) => prev + prevChars[tapIndex]);
      }
      setLastKeyPressed(key);
      setTapIndex(0);
      timerRef.current = setTimeout(() => {
        setSearchQuery((prev) => prev + chars[0]);
        setLastKeyPressed(null);
        setTapIndex(0);
      }, 700);
    }
  };

  const commitSearchTap = () => {
    if (lastKeyPressed) {
      const chars = SEARCH_TAP_MAP[lastKeyPressed];
      if (chars) setSearchQuery((prev) => prev + chars[tapIndex]);
      setLastKeyPressed(null);
      setTapIndex(0);
      if (timerRef.current) clearTimeout(timerRef.current);
    }
  };

  // Real or simulated download & install process (OmniSD importPublish API)
  const startDownload = async (appId: string) => {
    setDownloadStep('DOWNLOADING');
    setDownloadProgress(0);
    setErrorMessage(null);

    const app = apps.find((a) => a.id === appId);
    if (!app) {
      setDownloadStep('ERROR');
      setErrorMessage('App metadata not found');
      return;
    }

    const nav = navigator as any;
    const hasRealInstaller = typeof nav !== 'undefined' && nav.mozApps && nav.mozApps.mgmt && typeof nav.mozApps.mgmt.importPublish === 'function';

    if (hasRealInstaller) {
      try {
        const urlToFetch = app.download_url || app.manifest_url || `/apps/${app.id}.zip`;
        const response = await fetch(urlToFetch);
        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: Failed to fetch package zip`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;
        let loaded = 0;

        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
              chunks.push(value);
              loaded += value.length;
              if (total > 0) {
                setDownloadProgress(Math.round((loaded / total) * 100));
              } else {
                setDownloadProgress((prev) => Math.min((prev ?? 0) + 10, 95));
              }
            }
          }
        }

        setDownloadProgress(100);
        setDownloadStep('INSTALLING');

        const blob = new Blob(chunks, { type: 'application/zip' });
        const request = nav.mozApps.mgmt.importPublish(blob);

        request.onsuccess = () => {
          setDownloadStep('INSTALLED');
          onInstallApp(appId, app.version);
          setDownloadProgress(null);
        };

        request.onerror = function(this: any) {
          const errName = this.error ? this.error.name : 'Unknown installation error';
          setDownloadStep('ERROR');
          setErrorMessage(errName);
        };
      } catch (err: any) {
        setDownloadStep('ERROR');
        setErrorMessage(err.message || 'Fetch failed');
      }
    } else {
      // Simulation mode
      let progress = 0;
      const interval = setInterval(() => {
        progress += 20;
        setDownloadProgress(progress);

        if (progress >= 100) {
          clearInterval(interval);
          setDownloadStep('INSTALLING');
          
          // Simulating 1.2 second write/install
          setTimeout(() => {
            setDownloadStep('INSTALLED');
            onInstallApp(appId, app.version);
            setDownloadProgress(null);
          }, 1200);
        }
      }, 250);
    }
  };

  const renderLucide = (iconName: string, className = 'w-6 h-6') => {
    if (iconName && (iconName.startsWith('http://') || iconName.startsWith('https://') || iconName.startsWith('/') || iconName.includes('.'))) {
      return (
        <img 
          src={iconName} 
          alt="icon" 
          className={`${className} object-contain`} 
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-help-circle"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>';
          }}
        />
      );
    }
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return <IconComponent className={className} />;
  };

  // Star Rating view
  const renderStars = (rating: number) => {
    const stars = [];
    const floor = Math.floor(rating);
    for (let i = 1; i <= 5; i++) {
      if (i <= floor) {
        stars.push(<Icons.Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
      } else {
        stars.push(<Icons.Star key={i} className="w-3 h-3 text-neutral-300" />);
      }
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  if (storeView === 'TABS' || storeView === 'APP_LIST') {
    return (
      <div className="store-layout">
        {/* Store Brand Header */}
        <div className="store-header">
          <div className="store-header-title">
            <Icons.ShoppingBag className="store-star-icon" style={{fill: 'currentColor'}} />
            <span>KaiStore</span>
          </div>
          <span className="store-header-badge">
            QVGA
          </span>
        </div>

        {/* Categories Tab Bar */}
        <div className="store-tabs-wrapper">
          <div 
            className="store-tabs-container"
            style={{ transform: `translateX(-${activeTabIdx * 65}px)` }}
          >
            {CATEGORIES.map((cat, index) => {
              const isSelected = index === activeTabIdx;
              const isTabsFocused = storeView === 'TABS';
              return (
                <div
                  key={cat}
                  className={`store-tab-item ${isSelected ? 'active' : ''} ${isSelected && isTabsFocused ? 'focused' : ''}`}
                >
                  {cat}
                </div>
              );
            })}
          </div>
        </div>

        {/* Featured Banner (only displayed if Active Tab is Featured) */}
        {activeCategory === 'Featured' && storeView === 'TABS' && (
          <div className="store-featured-banner">
            <h4 className="store-featured-tag">Featured App</h4>
            <p className="store-featured-title">KaiSnake - Classic Remastered</p>
            <span className="store-featured-desc">Download now & play offline!</span>
          </div>
        )}

        {/* App List Container */}
        <div ref={appListRef} className="store-app-list">
          {currentApps.length === 0 ? (
            <div className="store-search-empty">No apps in this category</div>
          ) : (
            currentApps.map((app, index) => {
              const isActive = storeView === 'APP_LIST' && index === appListFocusIdx;
              const isInstalled = installedAppIds.includes(app.id);
              const installedVer = installedAppVersions[app.id] || '1.0.0';
              const hasUpdate = isInstalled && app.version && (app.version !== installedVer);

              return (
                <div
                  key={app.id}
                  className={`store-app-row ${isActive ? 'active' : ''}`}
                >
                  {/* Icon */}
                  <div className="store-app-row-icon-box">
                    {renderLucide(app.icon, 'store-app-icon')}
                  </div>

                  {/* App Text Metadata */}
                  <div className="store-app-meta">
                    <div className="store-app-row-header">
                      <h4 className="store-app-row-title">{app.name}</h4>
                      {isInstalled && (
                        hasUpdate ? (
                          <span className="store-app-row-badge" style={{ backgroundColor: '#ea580c', color: '#ffffff', borderColor: '#c2410c' }}>
                            Update
                          </span>
                        ) : (
                          <span className="store-app-row-badge">
                            Installed
                          </span>
                        )
                      )}
                    </div>
                    <p className="store-app-row-dev">{app.developer}</p>
                    <div className="store-stars-group">
                      {renderStars(app.rating)}
                      <span className="store-rating-count">({app.reviewsCount})</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Softkeys */}
        <div className="launcher-grid-footer" style={{backgroundColor: '#fafafa'}}>
          <div style={{color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '2px'}}>
            <Icons.Search style={{width: '10px', height: '10px'}} /> SEARCH
          </div>
          <div style={{color: '#171717'}}>
            {storeView === 'TABS' ? 'OPEN TABS' : 'SELECT APP'}
          </div>
          <div style={{color: '#737373'}}>
            {storeView === 'APP_LIST' ? 'BACK' : ''}
          </div>
        </div>
      </div>
    );
  }

  if (storeView === 'DETAIL' && selectedApp) {
    const isInstalled = installedAppIds.includes(selectedApp.id);
    const installedVer = installedAppVersions[selectedApp.id] || '1.0.0';
    const hasUpdate = isInstalled && selectedApp.version && (selectedApp.version !== installedVer);
    return (
      <div className="store-layout">
        {/* Detail Header */}
        <div className="store-detail-header">
          <span style={{fontWeight: 700, fontSize: '11px'}}>App Details</span>
          <span className="store-detail-header-size">{selectedApp.size}</span>
        </div>

        {/* Scrollable details */}
        <div ref={detailScrollRef} className="store-detail-scroll">
          {/* Main Info */}
          <div className="store-detail-main-row">
            <div className="store-detail-icon-box">
              {renderLucide(selectedApp.icon, 'store-detail-app-icon')}
            </div>
            <div className="store-detail-title-group">
              <h3 className="store-detail-app-name">{selectedApp.name}</h3>
              <p className="store-detail-dev">{selectedApp.developer}</p>
              <div className="store-detail-rating-line">
                {renderStars(selectedApp.rating)}
                <span className="store-detail-rating-number">{selectedApp.rating}</span>
              </div>
            </div>
          </div>

          {/* Action Install Button */}
          <div>
            {downloadStep === 'IDLE' && (
              <button className={`store-action-button ${hasUpdate ? 'store-btn-update' : isInstalled ? 'store-btn-installed' : 'store-btn-install'}`}>
                {hasUpdate ? (
                  <>
                    <Icons.RefreshCw className="store-star-icon" style={{ animation: 'spinSlow 4s linear infinite' }} />
                    UPDATE TO v{selectedApp.version} (SELECT)
                  </>
                ) : isInstalled ? (
                  <>
                    <Icons.Play className="store-star-icon" style={{fill: 'currentColor'}} />
                    LAUNCH APP (SELECT)
                  </>
                ) : (
                  <>
                    <Icons.Download className="store-star-icon" />
                    GET / INSTALL (SELECT)
                  </>
                )}
              </button>
            )}

            {downloadStep === 'IDLE' && hasUpdate && (
              <div style={{ marginTop: '6px', fontSize: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#fff7ed', border: '1px solid #ffedd5', color: '#9a3412', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Icons.AlertTriangle style={{ width: '10px', height: '10px', flexShrink: 0 }} />
                <span>Installed: v{installedVer} &rarr; Latest: v{selectedApp.version}</span>
              </div>
            )}

            {downloadStep === 'IDLE' && isInstalled && !hasUpdate && (
              <div style={{ marginTop: '6px', fontSize: '8px', padding: '4px 8px', borderRadius: '4px', backgroundColor: '#f0fdf4', border: '1px solid #dcfce7', color: '#166534', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Running latest version (v{installedVer})</span>
                <span style={{ color: '#047857', fontSize: '7px', border: '1px dashed #a7f3d0', padding: '1px 3px', borderRadius: '2px', backgroundColor: '#e6fcf0' }}>
                  Press "0" to debug update
                </span>
              </div>
            )}

            {downloadStep === 'DOWNLOADING' && (
              <div className="store-progress-card">
                <div className="store-progress-header">
                  <span>{hasUpdate ? 'UPDATING FILE...' : 'DOWNLOADING FILE...'}</span>
                  <span style={{fontFamily: 'monospace'}}>{downloadProgress}%</span>
                </div>
                <div className="store-progress-track">
                  <div 
                     className="store-progress-fill"
                     style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {downloadStep === 'INSTALLING' && (
              <div className="store-installing-status">
                <Icons.Loader2 className="store-star-icon" style={{animation: 'spinSlow 1.5s linear infinite'}} />
                <span>{hasUpdate ? 'APPLYING UPDATE PACKAGE...' : 'WRITING PACKAGE TO FLASH...'}</span>
              </div>
            )}

            {downloadStep === 'INSTALLED' && (
              <div className="store-installed-status">
                <Icons.CheckCircle2 className="store-star-icon" />
                <span>{hasUpdate ? 'APP UPDATED SUCCESSFULLY!' : 'PACKAGE INSTALLED SUCCESSFULLY!'}</span>
              </div>
            )}

            {downloadStep === 'ERROR' && (
              <div className="store-installed-status" style={{color: '#ef4444', borderColor: '#fee2e2', backgroundColor: '#fef2f2'}}>
                <Icons.AlertCircle className="store-star-icon" />
                <span style={{fontSize: '9px', fontWeight: 600}}>ACTION FAIL: {errorMessage || 'Unknown API Error'}</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
            <h4 className="store-detail-desc-title">Description</h4>
            <p className="store-detail-desc-text">
              {selectedApp.description}
            </p>
          </div>

          {/* Metadata Tech details */}
          <div className="store-detail-tech-table">
            <div className="store-tech-row">
              <span>Size:</span>
              <span className="store-tech-val">{selectedApp.size}</span>
            </div>
            <div className="store-tech-row">
              <span>Version:</span>
              <span className="store-tech-val">{selectedApp.version}</span>
            </div>
            <div className="store-tech-row">
              <span>Category:</span>
              <span className="store-tech-val">{selectedApp.category}</span>
            </div>
            {isInstalled && (
              <div className="store-tech-row">
                <span>Installed Version:</span>
                <span className="store-tech-val" style={{ fontWeight: 600, color: hasUpdate ? '#ea580c' : '#16a34a' }}>v{installedVer}</span>
              </div>
            )}
            <div className="store-tech-row" style={{borderTop: '1px dashed #e5e5e5', paddingTop: '4px'}}>
              <span>OmniSD Engine:</span>
              <span className="store-tech-val" style={{
                color: typeof (navigator as any) !== 'undefined' && (navigator as any).mozApps?.mgmt?.importPublish ? '#16a34a' : '#4f46e5',
                fontWeight: 600
              }}>
                {typeof (navigator as any) !== 'undefined' && (navigator as any).mozApps?.mgmt?.importPublish ? 'Active (API)' : 'Emulated (Sandbox)'}
              </span>
            </div>
          </div>
        </div>

        {/* Softkeys */}
        <div className="launcher-grid-footer" style={{backgroundColor: '#fafafa'}}>
          <div style={{color: '#4f46e5', fontWeight: 700}}>
            {isInstalled ? 'LAUNCH (LSK)' : ''}
          </div>
          <div style={{color: '#171717', fontWeight: 700}}>
            {hasUpdate ? 'UPDATE' : isInstalled ? 'LAUNCH' : 'INSTALL'}
          </div>
          <div style={{color: '#ef4444'}}>BACK</div>
        </div>
      </div>
    );
  }

  if (storeView === 'SEARCH') {
    return (
      <div className="store-layout">
        {/* Search Header */}
        <div className="store-header">
          <span style={{fontWeight: 700, fontSize: '11px'}}>Search Store</span>
          <Icons.Search className="store-star-icon" />
        </div>

        {/* Input box */}
        <div className="store-search-bar">
          <div className="store-search-input-box">
            <div className="store-search-query-text">
              {searchQuery}
              <span className="store-search-cursor">
                {lastKeyPressed ? SEARCH_TAP_MAP[lastKeyPressed][tapIndex] : '|'}
              </span>
            </div>
            {searchQuery && (
              <span className="store-search-badge">
                {searchQuery.length} ch
              </span>
            )}
          </div>

          {/* T9 letter cycle preview */}
          {lastKeyPressed && (
            <div className="store-search-cycle-preview">
              {SEARCH_TAP_MAP[lastKeyPressed].map((c, i) => (
                <span key={i} className={i === tapIndex ? 'active' : ''}>
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Filtered Apps */}
        <div ref={searchListRef} className="store-app-list">
          {searchedApps.length === 0 ? (
            <div className="store-search-empty">
              No matching apps found.<br/>Type with physical keys or keypad numbers!
            </div>
          ) : (
            searchedApps.map((app, idx) => {
              const isActive = idx === searchListFocusIdx;
              return (
                <div
                  key={app.id}
                  className={`store-search-row ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedApp(app);
                    setStoreView('DETAIL');
                  }}
                >
                  <div className="store-search-row-icon">
                    {renderLucide(app.icon, 'store-search-app-icon')}
                  </div>
                  <div className="store-search-row-title-box">
                    <h4 className="store-search-row-title">{app.name}</h4>
                    <p className="store-search-row-cat">{app.category}</p>
                  </div>
                  {isActive && (
                    <span className="store-search-highlight-badge">
                      View LSK
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Softkeys */}
        <div className="launcher-grid-footer" style={{backgroundColor: '#fafafa'}}>
          <div style={{color: '#4f46e5', fontWeight: 700}}>
            {searchedApps.length > 0 ? 'VIEW (LSK)' : ''}
          </div>
          <div style={{color: '#737373', fontFamily: 'monospace'}}># Delete</div>
          <div style={{color: '#ef4444'}}>BACK</div>
        </div>
      </div>
    );
  }

  return null;
}
