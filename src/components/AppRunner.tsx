import { useEffect, useState, useRef } from 'react';
import * as Icons from 'lucide-react';
import { AppItem, KeyCode } from '../types';

interface AppRunnerProps {
  app: AppItem;
  activeKey: KeyCode | null;
  onClearKey: () => void;
  onBack: () => void;
}

export default function AppRunner({ app, activeKey, onClearKey, onBack }: AppRunnerProps) {
  const [booting, setBooting] = useState(true);
  const [bootProgress, setBootProgress] = useState(0);
  const [bootLog, setBootLog] = useState('Initializing system...');

  // --- GAME MODE STATE (Brick Breaker) ---
  const [gameScore, setGameScore] = useState(0);
  const [gameLives, setGameLives] = useState(3);
  const [gameActive, setGameActive] = useState(false);
  const [gameWon, setGameWon] = useState(false);
  const [paddleX, setPaddleX] = useState(40); // percentage 0-100
  const [ball, setBall] = useState({ x: 50, y: 80, dx: 1.5, dy: -2 });
  const [bricks, setBricks] = useState<{ id: number; x: number; y: number; active: boolean }[]>(() => {
    const list = [];
    let id = 0;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 5; c++) {
        list.push({ id: id++, x: c * 20 + 2, y: r * 8 + 15, active: true });
      }
    }
    return list;
  });

  // --- READER MODE STATE (Books / Education) ---
  const [readerIndex, setReaderIndex] = useState(0);
  const [readerView, setReaderView] = useState<'LIST' | 'CONTENT'>('LIST');
  const [readerSearchQuery, setReaderSearchQuery] = useState('');

  // --- UTILITY MODE STATE (Media Player / Downloader) ---
  const [mediaActive, setMediaActive] = useState(false);
  const [mediaTime, setMediaTime] = useState(0);
  const [mediaVolume, setMediaVolume] = useState(80);
  const [downloadList, setDownloadList] = useState<{ name: string; size: string; status: 'IDLE' | 'DOWNLOADING' | 'DONE'; progress: number }[]>([
    { name: 'Phaser_Core_v2.zip', size: '256 KB', status: 'IDLE', progress: 0 },
    { name: 'Retro_Synth_Mix.mp3', size: '1.4 MB', status: 'IDLE', progress: 0 },
    { name: 'Wikipedia_Offline.db', size: '4.2 MB', status: 'IDLE', progress: 0 }
  ]);
  const [downloadIndex, setDownloadIndex] = useState(0);

  // Booting simulation
  useEffect(() => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setBootProgress(progress);
      if (progress === 30) setBootLog('Decompressing packages...');
      else if (progress === 60) setBootLog('Loading UI shaders...');
      else if (progress === 80) setBootLog('Allocating memory...');
      else if (progress >= 100) {
        clearInterval(interval);
        setBooting(false);
      }
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Game loop for Game Mode
  useEffect(() => {
    if (booting || app.category !== 'Games' || !gameActive || gameWon || gameLives <= 0) return;

    const gameInterval = setInterval(() => {
      setBall((prev) => {
        let { x, y, dx, dy } = prev;
        x += dx;
        y += dy;

        // Wall collision left/right
        if (x <= 2 || x >= 98) {
          dx = -dx;
          x = x <= 2 ? 2 : 98;
        }

        // Roof collision
        if (y <= 5) {
          dy = -dy;
          y = 5;
        }

        // Paddle collision (paddle is around y=90, height=4, width=24)
        if (y >= 88 && y <= 91) {
          const paddleWidth = 25;
          const paddleStart = paddleX;
          const paddleEnd = paddleX + paddleWidth;
          if (x >= paddleStart && x <= paddleEnd) {
            dy = -Math.abs(dy); // rebound up
            // add subtle angle variation based on hit spot
            const hitPoint = (x - (paddleX + paddleWidth / 2)) / (paddleWidth / 2);
            dx = hitPoint * 2.5;
            y = 87;
          }
        }

        // Bottom collision (Lose life)
        if (y >= 98) {
          setGameLives((l) => {
            const nextL = l - 1;
            if (nextL <= 0) {
              setGameActive(false);
            } else {
              // Reset ball position
              setBall({ x: 50, y: 75, dx: 1.5, dy: -2 });
              setGameActive(false);
            }
            return nextL;
          });
          return prev;
        }

        // Brick collisions
        let hitBrick = false;
        const nextBricks = bricks.map((b) => {
          if (!b.active || hitBrick) return b;
          // check distance
          const brickWidth = 16;
          const brickHeight = 6;
          if (x >= b.x && x <= b.x + brickWidth && y >= b.y && y <= b.y + brickHeight) {
            b.active = false;
            hitBrick = true;
            dy = -dy;
            setGameScore((s) => s + 10);
          }
          return b;
        });

        if (hitBrick) {
          setBricks(nextBricks);
          // Check win condition
          if (nextBricks.every((b) => !b.active)) {
            setGameWon(true);
            setGameActive(false);
          }
        }

        return { x, y, dx, dy };
      });
    }, 45);

    return () => clearInterval(gameInterval);
  }, [booting, app.category, gameActive, gameWon, gameLives, paddleX, bricks]);

  // Handle media timeline ticks
  useEffect(() => {
    if (!mediaActive) return;
    const timer = setInterval(() => {
      setMediaTime((t) => (t + 1) % 180); // 3 minutes loop
    }, 1000);
    return () => clearInterval(timer);
  }, [mediaActive]);

  // Handle D-pad navigation inputs
  useEffect(() => {
    if (booting || !activeKey) return;

    if (app.category === 'Games') {
      switch (activeKey) {
        case 'ArrowLeft':
          setPaddleX((p) => Math.max(0, p - 12));
          break;
        case 'ArrowRight':
          setPaddleX((p) => Math.min(75, p + 12));
          break;
        case 'ArrowUp':
        case 'Enter':
        case 'Key5':
          if (gameWon || gameLives <= 0) {
            // Restart game
            setGameLives(3);
            setGameScore(0);
            setGameWon(false);
            setBricks((list) => list.map((b) => ({ ...b, active: true })));
            setBall({ x: 50, y: 80, dx: 1.5, dy: -2 });
            setGameActive(true);
          } else if (!gameActive) {
            setGameActive(true);
          }
          break;
        case 'SoftRight':
        case 'Back':
          onBack();
          break;
      }
    } else if (app.category === 'Books' || app.category === 'Education') {
      const isWiki = app.id.includes('wikipedia') || app.name.toLowerCase().includes('wiki');
      const isBible = app.id.includes('bible') || app.name.toLowerCase().includes('bible');
      const isPrayer = app.id.includes('prayer') || app.name.toLowerCase().includes('prayer');

      const itemsCount = isWiki ? 4 : isBible ? 3 : 5;

      switch (activeKey) {
        case 'ArrowUp':
          if (readerView === 'LIST') {
            setReaderIndex((i) => (i > 0 ? i - 1 : itemsCount - 1));
          } else {
            // Scroll down reading list container inside view if needed
          }
          break;
        case 'ArrowDown':
          if (readerView === 'LIST') {
            setReaderIndex((i) => (i < itemsCount - 1 ? i + 1 : 0));
          }
          break;
        case 'Enter':
        case 'Key5':
          if (readerView === 'LIST') {
            setReaderView('CONTENT');
          } else {
            setReaderView('LIST');
          }
          break;
        case 'SoftRight':
        case 'Back':
          if (readerView === 'CONTENT') {
            setReaderView('LIST');
          } else {
            onBack();
          }
          break;
      }
    } else {
      // Utilities or Lifestyle
      const isMedia = app.id.includes('tube') || app.id.includes('video') || app.id.includes('player') || app.name.toLowerCase().includes('video');
      if (isMedia) {
        switch (activeKey) {
          case 'ArrowLeft':
            setMediaTime((t) => Math.max(0, t - 10));
            break;
          case 'ArrowRight':
            setMediaTime((t) => Math.min(180, t + 10));
            break;
          case 'ArrowUp':
            setMediaVolume((v) => Math.min(100, v + 10));
            break;
          case 'ArrowDown':
            setMediaVolume((v) => Math.max(0, v - 10));
            break;
          case 'Enter':
          case 'Key5':
            setMediaActive((a) => !a);
            break;
          case 'SoftRight':
          case 'Back':
            onBack();
            break;
        }
      } else {
        // Downloader style (Archive Pro / Archive Search)
        switch (activeKey) {
          case 'ArrowUp':
            setDownloadIndex((i) => (i > 0 ? i - 1 : downloadList.length - 1));
            break;
          case 'ArrowDown':
            setDownloadIndex((i) => (i < downloadList.length - 1 ? i + 1 : 0));
            break;
          case 'Enter':
          case 'Key5':
            triggerDownload(downloadIndex);
            break;
          case 'SoftRight':
          case 'Back':
            onBack();
            break;
        }
      }
    }

    onClearKey();
  }, [booting, activeKey, app.category, gameActive, gameWon, gameLives, paddleX, readerView, readerIndex, downloadIndex, downloadList.length]);

  const triggerDownload = (idx: number) => {
    const item = downloadList[idx];
    if (item.status !== 'IDLE') return;

    setDownloadList((list) =>
      list.map((it, i) => (i === idx ? { ...it, status: 'DOWNLOADING', progress: 0 } : it))
    );

    let prg = 0;
    const interval = setInterval(() => {
      prg += 20;
      setDownloadList((list) =>
        list.map((it, i) => (i === idx ? { ...it, progress: prg } : it))
      );

      if (prg >= 100) {
        clearInterval(interval);
        setDownloadList((list) =>
          list.map((it, i) => (i === idx ? { ...it, status: 'DONE' } : it))
        );
      }
    }, 400);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Category Specific UI Content
  const renderAppContent = () => {
    if (app.category === 'Games') {
      return (
        <div className="flex-1 flex flex-col justify-between bg-black text-white font-mono p-2 select-none relative">
          {/* Header Stats */}
          <div className="flex justify-between items-center border-b border-neutral-800 pb-1 text-[9px]">
            <span className="text-yellow-400">Score: {gameScore}</span>
            <span className="text-red-500 font-bold flex items-center">
              {Array.from({ length: gameLives }).map((_, i) => (
                <Icons.Heart key={i} className="w-2.5 h-2.5 fill-current inline ml-0.5" />
              ))}
            </span>
          </div>

          {/* Gameplay viewport area */}
          <div className="flex-1 relative bg-neutral-950 rounded border border-neutral-900 my-1 overflow-hidden">
            {bricks.map((b) => (
              b.active && (
                <div
                  key={b.id}
                  style={{
                    position: 'absolute',
                    left: `${b.x}%`,
                    top: `${b.y}%`,
                    width: '16%',
                    height: '6%',
                    backgroundColor: app.id.includes('whot') ? '#4f46e5' : '#16a34a',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '2px'
                  }}
                />
              )
            ))}

            {/* Paddle */}
            <div
              style={{
                position: 'absolute',
                left: `${paddleX}%`,
                top: '90%',
                width: '25%',
                height: '4%',
                backgroundColor: '#eab308',
                borderRadius: '3px',
                border: '1px solid #ca8a04'
              }}
            />

            {/* Ball */}
            <div
              style={{
                position: 'absolute',
                left: `${ball.x}%`,
                top: `${ball.y}%`,
                width: '6px',
                height: '6px',
                backgroundColor: '#ffffff',
                borderRadius: '50%',
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 4px #fff'
              }}
            />

            {/* State overlays */}
            {!gameActive && !gameWon && gameLives > 0 && (
              <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-2">
                <Icons.PlayCircle className="w-8 h-8 text-yellow-400 animate-bounce mb-1" />
                <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">{app.name}</div>
                <p className="text-[8px] text-neutral-400 max-w-[160px] leading-tight my-1">
                  Press SELECT or Arrow Keys to start breaking bricks!
                </p>
                <div className="bg-yellow-400 text-black text-[8px] px-2 py-0.5 rounded font-bold">
                  PRESS CENTER
                </div>
              </div>
            )}

            {gameLives <= 0 && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-2">
                <Icons.Frown className="w-8 h-8 text-red-500 mb-1" />
                <div className="text-[11px] font-bold text-red-500 uppercase tracking-wider">GAME OVER</div>
                <div className="text-[9px] text-neutral-400 my-1">Final Score: {gameScore}</div>
                <div className="bg-red-600 text-white text-[8px] px-2.5 py-1 rounded font-bold animate-pulse">
                  PRESS CENTER TO RESTART
                </div>
              </div>
            )}

            {gameWon && (
              <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-center p-2">
                <Icons.Trophy className="w-8 h-8 text-yellow-400 animate-pulse mb-1" />
                <div className="text-[11px] font-bold text-yellow-400 uppercase tracking-wider">VICTORY!</div>
                <div className="text-[9px] text-neutral-400 my-1">Clean Sweep Score: {gameScore}</div>
                <div className="bg-yellow-400 text-black text-[8px] px-2.5 py-1 rounded font-bold">
                  PRESS CENTER TO REPLAY
                </div>
              </div>
            )}
          </div>

          {/* Footer Guide bar */}
          <div className="h-5 bg-neutral-900 border-t border-neutral-800 flex justify-between items-center px-1 text-[8px] text-neutral-400">
            <span>◀ / ▶ MOVE</span>
            <span>LSK: RESTART</span>
            <span style={{color: '#f87171'}} onClick={onBack}>BACK</span>
          </div>
        </div>
      );
    }

    if (app.category === 'Books' || app.category === 'Education') {
      const isWiki = app.id.includes('wikipedia') || app.name.toLowerCase().includes('wiki');
      const isBible = app.id.includes('bible') || app.name.toLowerCase().includes('bible');

      // Content definitions
      const wikiArticles = [
        { title: 'Retro Computing', text: 'Retro computing is the use of older computer hardware and software in modern times. Enthusiasts preserve classic platforms like QVGA microchips, 8-bit architecture, and classic 12-key numeric interface models.' },
        { title: 'KaiOS ecosystem', text: 'KaiOS is a light operating system for smart feature phones. Based on Boot to Gecko, it supports HTML5 apps, running performantly on 512MB RAM devices with D-pad navigation.' },
        { title: 'D-Pad Design Patterns', text: 'D-pads (Directional Pads) use discrete, focus-based navigation loops. UI elements must be arranged vertically or horizontally in a grid, and softkeys provide contextual triggers.' },
        { title: 'Internet Archive', text: 'The Internet Archive is a non-profit digital library offering free public access to collections of digitized materials, including millions of classic books, software, audio and video archives.' }
      ];

      const bibleVerses = [
        { title: 'Genesis 1:1-3', text: 'In the beginning God created the heaven and the earth. And the earth was without form, and void; and darkness was upon the face of the deep. And God said, Let there be light: and there was light.' },
        { title: 'Psalm 23:1-2', text: 'The Lord is my shepherd; I shall not want. He maketh me to lie down in green pastures: he leadeth me beside the still waters.' },
        { title: 'Matthew 5:3-5', text: 'Blessed are the poor in spirit: for theirs is the kingdom of heaven. Blessed are they that mourn: for they shall be comforted. Blessed are the meek: for they shall inherit the earth.' }
      ];

      const customChapters = [
        { title: '1. Morning Grace', text: 'Lord, guide my steps today with serenity and focus. Grant me clarity of thought to appreciate simplicity.' },
        { title: '2. Afternoon Devotional', text: 'Take a quiet moment to breathe. Look around, notice the natural geometry, and express silent gratitude.' },
        { title: '3. Evening Vespers', text: 'Let the noise of the day fade away. Rest peacefully knowing you worked with dedication and care.' },
        { title: '4. Silent Devotions', text: 'In silence, find the depth of focus. Quiet your mind and let calm wisdom guide your actions.' },
        { title: '5. Weekly Affirmations', text: 'Simplicity is strength. Continuous, steady progress accumulates into meaningful growth.' }
      ];

      const activeArticles = isWiki ? wikiArticles : isBible ? bibleVerses : customChapters;
      const selectedArticle = activeArticles[readerIndex];

      return (
        <div className="flex-1 flex flex-col justify-between bg-[#fbf9f3] text-neutral-800 font-sans p-2 select-none relative">
          {/* Header */}
          <div className="bg-[#5c2d91] text-white text-[10px] px-2 py-1 flex items-center justify-between rounded shadow-sm">
            <span className="font-bold flex items-center gap-1 uppercase tracking-wider">
              <Icons.BookOpen className="w-3 h-3" /> {app.name}
            </span>
            <span className="text-[8px] opacity-90 font-mono">
              {readerView === 'LIST' ? `${readerIndex + 1}/${activeArticles.length}` : 'Reading'}
            </span>
          </div>

          {/* Reader Core view */}
          <div className="flex-1 overflow-y-auto my-1.5 p-1 bg-white border border-neutral-200 rounded shadow-inner min-h-0">
            {readerView === 'LIST' ? (
              <div className="space-y-1">
                <p className="text-[9px] text-neutral-500 uppercase tracking-widest font-semibold border-b border-neutral-100 pb-0.5 mb-1.5 text-center">
                  Select Chapter/Article:
                </p>
                {activeArticles.map((art, idx) => {
                  const isActive = idx === readerIndex;
                  return (
                    <div
                      key={idx}
                      className={`p-1.5 rounded text-[10px] flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#5c2d91] text-white font-bold shadow-sm'
                          : 'bg-neutral-50 border border-neutral-100 hover:bg-neutral-100'
                      }`}
                    >
                      <Icons.ChevronRight className={`w-3 h-3 ${isActive ? 'text-yellow-300 animate-pulse' : 'text-neutral-400'}`} />
                      <span className="truncate">{art.title}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-1">
                <h3 className="font-extrabold text-[11px] text-[#5c2d91] border-b border-neutral-200 pb-1 mb-1 leading-tight">
                  {selectedArticle.title}
                </h3>
                <p className="text-[10px] text-neutral-700 leading-relaxed font-serif whitespace-pre-wrap">
                  {selectedArticle.text}
                </p>
              </div>
            )}
          </div>

          {/* Softkey guide bar */}
          <div className="h-5 bg-neutral-100 border-t border-neutral-200 flex justify-between items-center px-1.5 text-[8px] font-semibold text-neutral-600">
            <span>{readerView === 'LIST' ? '▲/▼ SELECT' : 'RSK: BACK'}</span>
            <span className="text-[#5c2d91] font-bold">
              {readerView === 'LIST' ? 'ENTER' : 'LIST VIEW'}
            </span>
            <span style={{color: '#f87171'}} onClick={onBack}>EXIT</span>
          </div>
        </div>
      );
    }

    // Utilities / Lifestyle Media Player or Downloader Mode
    const isMedia = app.id.includes('tube') || app.id.includes('video') || app.id.includes('player') || app.name.toLowerCase().includes('video');

    if (isMedia) {
      return (
        <div className="flex-1 flex flex-col justify-between bg-zinc-950 text-white font-mono p-2 select-none relative">
          {/* Header */}
          <div className="bg-[#b91c1c] text-white text-[10px] px-2 py-1 flex items-center justify-between rounded shadow-sm">
            <span className="font-bold flex items-center gap-1 uppercase tracking-wider">
              <Icons.Video className="w-3 h-3" /> {app.name}
            </span>
            <span className="text-[8px] bg-black/30 px-1 rounded font-mono">LIVE</span>
          </div>

          {/* Media Viewport */}
          <div className="flex-1 bg-black border border-neutral-900 rounded my-1.5 flex flex-col justify-between p-2 min-h-0 relative">
            <div className="text-center">
              <span className="text-[8px] text-neutral-400 uppercase tracking-widest block font-bold">Streaming Video</span>
              <p className="text-[10px] font-bold text-red-400 truncate mt-0.5">8-Bit Lo-Fi Chillwave Mix.mp4</p>
            </div>

            {/* Bouncing Visualizer Bars if playing */}
            <div className="h-12 flex justify-center items-end gap-1 px-4 my-2">
              {Array.from({ length: 8 }).map((_, i) => {
                const randomHeight = mediaActive ? [25, 45, 12, 35, 18, 50, 30, 42, 10][(i + Math.floor(mediaTime)) % 9] : 4;
                return (
                  <div
                    key={i}
                    style={{
                      width: '6px',
                      height: `${randomHeight}%`,
                      backgroundColor: mediaActive ? '#b91c1c' : '#404040',
                      transition: 'height 0.15s ease-in-out',
                      borderRadius: '1px'
                    }}
                  />
                );
              })}
            </div>

            {/* Timelines and controls */}
            <div className="space-y-1 mt-auto">
              <div className="flex justify-between text-[8px] text-neutral-400 px-1">
                <span>{formatTime(mediaTime)}</span>
                <span className="flex items-center gap-0.5">
                  <Icons.Volume2 className="w-2.5 h-2.5" /> {mediaVolume}%
                </span>
                <span>3:00</span>
              </div>

              {/* Progress Slider track */}
              <div className="h-1.5 bg-neutral-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-red-600 rounded-full transition-all duration-300"
                  style={{ width: `${(mediaTime / 180) * 100}%` }}
                />
              </div>
            </div>

            {/* Big overlay Play indicator if paused */}
            {!mediaActive && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Icons.PlayCircle className="w-10 h-10 text-white opacity-80 hover:opacity-100" />
              </div>
            )}
          </div>

          {/* Guide bar */}
          <div className="h-5 bg-neutral-900 border-t border-neutral-800 flex justify-between items-center px-1.5 text-[8px] text-neutral-400">
            <span>◀/▶ SEEK</span>
            <span className="text-red-500 font-bold">
              {mediaActive ? 'PAUSE (ENTER)' : 'PLAY (ENTER)'}
            </span>
            <span style={{color: '#f87171'}} onClick={onBack}>BACK</span>
          </div>
        </div>
      );
    }

    // Downloader style (Archive Pro / Archive Search)
    return (
      <div className="flex-1 flex flex-col justify-between bg-slate-900 text-slate-100 font-mono p-2 select-none relative">
        {/* Header */}
        <div className="bg-[#0284c7] text-white text-[10px] px-2 py-1 flex items-center justify-between rounded shadow-sm">
          <span className="font-bold flex items-center gap-1 uppercase tracking-wider">
            <Icons.DownloadCloud className="w-3 h-3" /> {app.name}
          </span>
          <span className="text-[8px] bg-sky-950/40 px-1 rounded">PRO</span>
        </div>

        {/* Downloader List View */}
        <div className="flex-1 overflow-y-auto my-1.5 p-1 bg-slate-950 border border-slate-800 rounded shadow-inner min-h-0 space-y-1.5">
          <p className="text-[8px] text-slate-400 uppercase tracking-widest font-semibold pb-1 border-b border-slate-800 text-center">
            Select item to download:
          </p>
          {downloadList.map((item, idx) => {
            const isActive = idx === downloadIndex;
            return (
              <div
                key={idx}
                className={`p-1.5 rounded border transition-all ${
                  isActive
                    ? 'border-[#0284c7] bg-slate-800/60 shadow-sm'
                    : 'border-slate-800 bg-slate-900/30'
                }`}
              >
                <div className="flex justify-between items-center text-[9px]">
                  <span className={`font-semibold truncate max-w-[120px] ${isActive ? 'text-sky-300' : 'text-slate-200'}`}>
                    {item.name}
                  </span>
                  <span className="text-[8px] text-slate-400">{item.size}</span>
                </div>

                {/* Download bar or state indicator */}
                <div className="flex items-center justify-between gap-1.5 mt-1">
                  <div className="flex-1 h-1 bg-slate-850 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-sky-500 rounded-full transition-all duration-300"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <span className="text-[7px] font-bold uppercase min-w-[35px] text-right">
                    {item.status === 'IDLE' && 'IDLE'}
                    {item.status === 'DOWNLOADING' && `${item.progress}%`}
                    {item.status === 'DONE' && <span className="text-emerald-400">DONE</span>}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Guide bar */}
        <div className="h-5 bg-slate-850 border-t border-slate-800 flex justify-between items-center px-1.5 text-[8px] text-slate-400">
          <span>▲/▼ SELECT</span>
          <span className="text-sky-400 font-bold">START (ENTER)</span>
          <span style={{color: '#f87171'}} onClick={onBack}>BACK</span>
        </div>
      </div>
    );
  };

  if (booting) {
    return (
      <div className="w-full h-full bg-neutral-950 text-white flex flex-col justify-center items-center font-mono p-4 select-none relative">
        <Icons.Smartphone className="w-10 h-10 text-neutral-400 mb-2 animate-pulse" />
        <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-300">{app.name}</p>
        <span className="text-[8px] text-neutral-500 mb-4">{app.developer}</span>

        {/* Loading Bar */}
        <div className="w-36 h-2 bg-neutral-800 rounded-full overflow-hidden mb-2 border border-neutral-700 relative">
          <div
            className="h-full bg-indigo-500 transition-all duration-150"
            style={{ width: `${bootProgress}%` }}
          />
        </div>

        {/* Boot message log ticker */}
        <div className="text-[7px] text-neutral-500 truncate w-40 text-center animate-pulse">
          {bootLog}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-neutral-900 text-white flex flex-col font-sans select-none relative">
      {renderAppContent()}
    </div>
  );
}
