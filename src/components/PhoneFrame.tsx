import { useEffect, useState, ReactNode } from 'react';
import { KeyCode } from '../types';

interface PhoneFrameProps {
  children: ReactNode;
  onKeyPress: (key: KeyCode) => void;
}

export default function PhoneFrame({ children, onKeyPress }: PhoneFrameProps) {
  const [pressedKey, setPressedKey] = useState<KeyCode | null>(null);

  // Map physical browser keyboard events to KaiOS KeyCodes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let mapped: KeyCode | null = null;

      switch (e.key) {
        case 'ArrowUp':
          mapped = 'ArrowUp';
          break;
        case 'ArrowDown':
          mapped = 'ArrowDown';
          break;
        case 'ArrowLeft':
          mapped = 'ArrowLeft';
          break;
        case 'ArrowRight':
          mapped = 'ArrowRight';
          break;
        case 'Enter':
          mapped = 'Enter';
          break;
        case 'Backspace':
          mapped = 'Back';
          break;
        case 'Escape':
        case 'SoftRight':
        case 'F2':
          mapped = 'SoftRight'; // Map escape/F2 to RSK
          break;
        case 'Shift':
        case 'SoftLeft':
        case 'F1':
          mapped = 'SoftLeft'; // Shift/F1 works as Left Soft Key
          break;
        case '1':
          mapped = 'Key1';
          break;
        case '2':
          mapped = 'Key2';
          break;
        case '3':
          mapped = 'Key3';
          break;
        case '4':
          mapped = 'Key4';
          break;
        case '5':
          mapped = 'Key5';
          break;
        case '6':
          mapped = 'Key6';
          break;
        case '7':
          mapped = 'Key7';
          break;
        case '8':
          mapped = 'Key8';
          break;
        case '9':
          mapped = 'Key9';
          break;
        case '0':
          mapped = 'Key0';
          break;
        case '*':
          mapped = 'KeyStar';
          break;
        case '#':
          mapped = 'KeyHash';
          break;
        case 'Call':
          mapped = 'Call';
          break;
        case 'End':
          mapped = 'End';
          break;
      }

      if (mapped) {
        // Prevent browser scrolling or back actions
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Backspace', 'Enter', 'F1', 'F2', 'SoftLeft', 'SoftRight'].includes(e.key)) {
          e.preventDefault();
        }
        triggerKey(mapped);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const triggerKey = (key: KeyCode) => {
    setPressedKey(key);
    onKeyPress(key);

    // Auto release pressed key visual highlight after 100ms
    setTimeout(() => {
      setPressedKey((curr) => (curr === key ? null : curr));
    }, 120);
  };

  if (process.env.NODE_ENV === 'production') {
    return (
      <div className="prod-mode" style={{ width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#000000', position: 'relative' }}>
        {children}
      </div>
    );
  }

  return (
    <div className="phone-layout-container">
      {/* Background glow designs */}
      <div className="phone-glow-1" />
      <div className="phone-glow-2" />

      {/* CENTER: PHYSICAL PHONE FRAME */}
      <div className="phone-frame-outer">
        {/* Phone Body Container */}
        <div className="phone-body">
          {/* Top Speaker slit */}
          <div className="phone-speaker" />

          {/* SCREEN CONTAINER (QVGA exactly 240x320 width inside padding) */}
          <div className="phone-screen-container">
            <div className="phone-screen-inner">
              {children}
            </div>
          </div>

          {/* PHYSICAL CONTROL BOARD (D-PAD & SOFTKEYS) */}
          <div className="phone-keypad-section">
            
            {/* Soft Keys Row */}
            <div className="phone-softkeys-row">
              {/* LSK */}
              <button
                id="virtual-btn-lsk"
                onClick={() => triggerKey('SoftLeft')}
                className={`softkey-button ${pressedKey === 'SoftLeft' ? 'active' : ''}`}
              >
                <div className="softkey-button-bar" />
              </button>

              {/* RSK */}
              <button
                id="virtual-btn-rsk"
                onClick={() => triggerKey('SoftRight')}
                className={`softkey-button ${pressedKey === 'SoftRight' ? 'active' : ''}`}
              >
                <div className="softkey-button-bar" />
              </button>
            </div>

            {/* D-Pad Container (Center Circle) */}
            <div className="dpad-container">
              {/* D-PAD Ring */}
              <div className="dpad-ring" />

              {/* UP */}
              <button
                id="virtual-btn-up"
                onClick={() => triggerKey('ArrowUp')}
                className={`dpad-direction dpad-up ${pressedKey === 'ArrowUp' ? 'active' : ''}`}
              >
                ▲
              </button>

              {/* DOWN */}
              <button
                id="virtual-btn-down"
                onClick={() => triggerKey('ArrowDown')}
                className={`dpad-direction dpad-down ${pressedKey === 'ArrowDown' ? 'active' : ''}`}
              >
                ▼
              </button>

              {/* LEFT */}
              <button
                id="virtual-btn-left"
                onClick={() => triggerKey('ArrowLeft')}
                className={`dpad-direction dpad-left ${pressedKey === 'ArrowLeft' ? 'active' : ''}`}
              >
                ◀
              </button>

              {/* RIGHT */}
              <button
                id="virtual-btn-right"
                onClick={() => triggerKey('ArrowRight')}
                className={`dpad-direction dpad-right ${pressedKey === 'ArrowRight' ? 'active' : ''}`}
              >
                ▶
              </button>

              {/* D-PAD CENTER (SELECT) */}
              <button
                id="virtual-btn-select"
                onClick={() => triggerKey('Enter')}
                className={`dpad-center ${pressedKey === 'Enter' ? 'active' : ''}`}
              />
            </div>

            {/* Back & Clear Keys Row */}
            <div className="aux-keys-row">
              {/* Call (green) Button */}
              <button
                id="virtual-btn-call"
                onClick={() => triggerKey('Call')}
                className={`aux-key-btn aux-call ${pressedKey === 'Call' ? 'active' : ''}`}
              >
                CALL
              </button>

              {/* Clear / Back Button */}
              <button
                id="virtual-btn-back"
                onClick={() => triggerKey('Back')}
                className={`aux-key-btn aux-clr ${pressedKey === 'Back' ? 'active' : ''}`}
              >
                CLR
              </button>

              {/* End (red) Button */}
              <button
                id="virtual-btn-end"
                onClick={() => triggerKey('End')}
                className={`aux-key-btn aux-end ${pressedKey === 'End' ? 'active' : ''}`}
              >
                END
              </button>
            </div>

            {/* ALPHANUMERIC 12-KEYPAD GRID */}
            <div className="numeric-keypad-grid">
              {[
                { k: 'Key1', label: '1', sub: '.,/!' },
                { k: 'Key2', label: '2', sub: 'abc' },
                { k: 'Key3', label: '3', sub: 'def' },
                { k: 'Key4', label: '4', sub: 'ghi' },
                { k: 'Key5', label: '5', sub: 'jkl' },
                { k: 'Key6', label: '6', sub: 'mno' },
                { k: 'Key7', label: '7', sub: 'pqrs' },
                { k: 'Key8', label: '8', sub: 'tuv' },
                { k: 'Key9', label: '9', sub: 'wxyz' },
                { k: 'KeyStar', label: '*', sub: 'a/A' },
                { k: 'Key0', label: '0', sub: '␣' },
                { k: 'KeyHash', label: '#', sub: 'del' },
              ].map(({ k, label, sub }) => {
                const isPressed = pressedKey === k;
                return (
                  <button
                    key={k}
                    id={`virtual-btn-${label}`}
                    onClick={() => triggerKey(k as KeyCode)}
                    className={`keypad-btn ${isPressed ? 'active' : ''}`}
                  >
                    <span className="keypad-label">{label}</span>
                    <span className="keypad-sub">{sub}</span>
                  </button>
                );
              })}
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
