import { useEffect, useState, useRef } from 'react';
import { HelpCircle } from 'lucide-react';
import { PREINSTALLED_APPS } from '../data/apps';
import { AppItem } from '../types';

const Icons = {
  HelpCircle,
};

interface LauncherProps {
  installedAppIds: string[];
  activeKey: string | null;
  onClearKey: () => void;
  onLaunchApp: (appId: string) => void;
  apps: AppItem[];
}

export default function Launcher({ installedAppIds, activeKey, onClearKey, onLaunchApp, apps }: LauncherProps) {
  const [view, setView] = useState<'WALLPAPER' | 'GRID'>('WALLPAPER');
  const [gridIndex, setGridIndex] = useState(0);
  const gridContentRef = useRef<HTMLDivElement | null>(null);

  // Combine system apps + installed custom apps
  const installedStoreApps = apps.filter((app) => installedAppIds.includes(app.id));
  const allApps = [
    ...PREINSTALLED_APPS,
    ...installedStoreApps.map((a) => ({ id: a.id, name: a.name, icon: a.icon, isSystem: false })),
  ];

  const cols = 3;
  const totalApps = allApps.length;

  useEffect(() => {
    if (!activeKey) return;

    if (view === 'WALLPAPER') {
      if (activeKey === 'Enter' || activeKey === 'Key5') {
        setView('GRID');
        setGridIndex(0);
      }
    } else {
      // Grid navigation
      switch (activeKey) {
        case 'ArrowUp':
          if (gridIndex >= cols) setGridIndex((i) => i - cols);
          break;
        case 'ArrowDown':
          if (gridIndex + cols < totalApps) setGridIndex((i) => i + cols);
          break;
        case 'ArrowLeft':
          if (gridIndex > 0) setGridIndex((i) => i - 1);
          break;
        case 'ArrowRight':
          if (gridIndex < totalApps - 1) setGridIndex((i) => i + 1);
          break;
        case 'Enter':
        case 'Key5':
          const targetApp = allApps[gridIndex];
          if (targetApp) {
            onLaunchApp(targetApp.id);
          }
          break;
        case 'SoftRight':
        case 'Back':
          setView('WALLPAPER');
          break;
      }
    }

    onClearKey();
  }, [activeKey, view, gridIndex, allApps.length]);

  // Scroll launcher grid to center
  useEffect(() => {
    if (view === 'GRID' && gridContentRef.current) {
      const container = gridContentRef.current;
      const activeElement = container.querySelector('.launcher-app-item.active') as HTMLElement;
      if (activeElement) {
        const elementTop = activeElement.offsetTop;
        const elementHeight = activeElement.offsetHeight;
        const containerHeight = container.clientHeight;
        const targetScrollPos = elementTop - (containerHeight / 2) + (elementHeight / 2);
        container.scrollTop = targetScrollPos;
      }
    }
  }, [gridIndex, view]);

  // Dynamic Lucide Icon Mapper
  const renderIcon = (iconName: string, active: boolean) => {
    if (iconName && (iconName.startsWith('http://') || iconName.startsWith('https://') || iconName.startsWith('/') || iconName.includes('.'))) {
      return (
        <img 
          src={iconName} 
          alt="icon" 
          className="launcher-app-icon object-contain" 
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-help-circle"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>';
          }}
        />
      );
    }
    const IconComponent = (Icons as any)[iconName] || Icons.HelpCircle;
    return (
      <IconComponent 
        className="launcher-app-icon"
      />
    );
  };

  const getDayAndDate = () => {
    const now = new Date();
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: days[now.getDay()],
      date: `${months[now.getMonth()]} ${now.getDate()}`
    };
  };

  const { day, date } = getDayAndDate();

  if (view === 'WALLPAPER') {
    return (
      <div className="launcher-container">
        <div className="launcher-wallpaper-view">
          {/* Sleek abstract wallpaper background */}
          <div className="launcher-wallpaper-bg" />
          {/* Ambient background glows */}
          <div className="launcher-glow-1" />
          <div className="launcher-glow-2" />

          {/* Calendar Widget */}
          <div className="launcher-calendar-widget">
            <div className="launcher-calendar-day">{day}</div>
            <div className="launcher-calendar-date">{date}</div>
          </div>

          {/* Shortcut Quick Guide */}
          <div className="launcher-shortcut-guide">
            <p className="launcher-shortcut-title">
              Welcome to KaiOS.
            </p>
            <div className="launcher-shortcut-badge">
              Press Center D-pad
            </div>
          </div>

          {/* Softkey footer */}
          <div className="screen-footer-bar">
            <div className="footer-btn-left">Notif</div>
            <div className="footer-btn-center">MENU</div>
            <div className="footer-btn-right">Call</div>
          </div>
        </div>
      </div>
    );
  }

  // App Launcher Grid View
  return (
    <div className="launcher-grid-view">
      {/* OS Header */}
      <div className="launcher-grid-header">
        <span>MENU</span>
        <span className="launcher-grid-header-count">
          {gridIndex + 1}/{totalApps}
        </span>
      </div>

      {/* Grid container */}
      <div ref={gridContentRef} className="launcher-grid-content">
        {allApps.map((app, index) => {
          const isActive = index === gridIndex;
          return (
            <div
              key={app.id}
              className={`launcher-app-item ${isActive ? 'active' : ''}`}
              onClick={() => onLaunchApp(app.id)}
            >
              <div className="launcher-app-icon-wrapper">
                {renderIcon(app.icon, isActive)}
              </div>
              <span className="launcher-app-name">
                {app.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Navigation instruction ticker */}
      <div className="launcher-ticker-guide">
        Navigate with D-pad Arrow Keys
      </div>

      {/* Softkeys */}
      <div className="launcher-grid-footer">
        <div></div>
        <div style={{color: '#4f46e5'}}>LAUNCH</div>
        <div style={{color: '#ef4444'}}>BACK</div>
      </div>
    </div>
  );
}
