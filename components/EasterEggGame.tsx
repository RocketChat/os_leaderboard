import React, { useEffect, useRef, useState } from 'react';
import { X, Trophy } from 'lucide-react';

const EasterEggGame: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameover'>('start');

  // We use refs for mutable game state accessed inside the requestAnimationFrame loop
  const requestRef = useRef<number>(null);
  const scoreRef = useRef(0);
  const gameStateRef = useRef<'start' | 'playing' | 'gameover'>('start');
  
  // Game entities refs
  const playerRef = useRef({ x: 0, y: 0, width: 40, height: 40, speed: 8, color: '#60a5fa' });
  const bulletsRef = useRef<{ x: number; y: number }[]>([]);
  const enemiesRef = useRef<{ x: number; y: number; size: number; speed: number; color: string }[]>([]);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number }[]>([]);
  
  // Input refs
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const lastShotTimeRef = useRef(0);

  // Sync ref with state for use in event listeners/loop
  useEffect(() => {
    gameStateRef.current = gameState;
    if (gameState === 'start') {
        scoreRef.current = 0;
        setScore(0);
        bulletsRef.current = [];
        enemiesRef.current = [];
        particlesRef.current = [];
    }
  }, [gameState]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initial Resize
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Center player initially
      if (gameStateRef.current === 'start') {
          playerRef.current.x = canvas.width / 2;
          playerRef.current.y = canvas.height - 60;
      } else {
           playerRef.current.y = canvas.height - 60;
      }
    };
    window.addEventListener('resize', resize);
    resize();

    let frameCount = 0;

    const gameLoop = (timestamp: number) => {
      // Clear screen
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (gameStateRef.current === 'playing') {
        frameCount++;
        const width = canvas.width;
        const height = canvas.height;
        const player = playerRef.current;

        // --- Input Handling ---
        if (keysRef.current['ArrowLeft'] || keysRef.current['a']) {
            player.x -= player.speed;
        }
        if (keysRef.current['ArrowRight'] || keysRef.current['d']) {
            player.x += player.speed;
        }
        // Clamp player
        player.x = Math.max(player.width/2, Math.min(width - player.width/2, player.x));

        // Shooting
        if (keysRef.current[' '] || keysRef.current['Spacebar']) {
            if (timestamp - lastShotTimeRef.current > 150) { // 150ms cooldown
                bulletsRef.current.push({ x: player.x, y: player.y - 20 });
                lastShotTimeRef.current = timestamp;
            }
        }

        // --- Draw Player ---
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 20);
        ctx.lineTo(player.x - 20, player.y + 20);
        ctx.lineTo(player.x, player.y + 10); // indent
        ctx.lineTo(player.x + 20, player.y + 20);
        ctx.closePath();
        ctx.fill();
        
        // Thrust effect
        if (frameCount % 4 === 0) {
             particlesRef.current.push({
                x: player.x + (Math.random() - 0.5) * 10,
                y: player.y + 20,
                vx: (Math.random() - 0.5) * 2,
                vy: 2 + Math.random() * 2,
                color: '#3b82f6',
                life: 10
             });
        }


        // --- Spawning Enemies ---
        // Difficulty curve: spawn faster as score increases
        const spawnRate = Math.max(20, 60 - Math.floor(scoreRef.current / 500));
        if (frameCount % spawnRate === 0) {
            enemiesRef.current.push({
                x: Math.random() * (width - 40) + 20,
                y: -40,
                size: 25 + Math.random() * 20,
                speed: 2 + Math.random() * 3 + (scoreRef.current / 2000), // Speed up slightly
                color: Math.random() > 0.8 ? '#a855f7' : '#ef4444' // Purple or Red
            });
        }

        // --- Update & Draw Bullets ---
        ctx.fillStyle = '#fbbf24';
        for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
            const b = bulletsRef.current[i];
            b.y -= 12;
            ctx.beginPath();
            ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
            ctx.fill();
            if (b.y < -10) bulletsRef.current.splice(i, 1);
        }

        // --- Update & Draw Enemies ---
        for (let i = enemiesRef.current.length - 1; i >= 0; i--) {
            const e = enemiesRef.current[i];
            e.y += e.speed;

            // Draw Enemy
            ctx.fillStyle = e.color;
            ctx.beginPath();
            ctx.arc(e.x, e.y, e.size/2, 0, Math.PI * 2);
            ctx.fill();
            // Eyes
            ctx.fillStyle = '#fff';
            ctx.fillRect(e.x - 5, e.y - 5, 3, 3);
            ctx.fillRect(e.x + 2, e.y - 5, 3, 3);

            // Collision: Bullet vs Enemy
            let hit = false;
            for (let j = bulletsRef.current.length - 1; j >= 0; j--) {
                const b = bulletsRef.current[j];
                const dx = b.x - e.x;
                const dy = b.y - e.y;
                if (Math.hypot(dx, dy) < e.size/2 + 4) {
                    hit = true;
                    bulletsRef.current.splice(j, 1);
                    break;
                }
            }

            if (hit) {
                // Score
                scoreRef.current += 100;
                setScore(scoreRef.current);
                
                // Explosion
                for (let k = 0; k < 8; k++) {
                    particlesRef.current.push({
                        x: e.x,
                        y: e.y,
                        vx: (Math.random() - 0.5) * 12,
                        vy: (Math.random() - 0.5) * 12,
                        color: e.color,
                        life: 30
                    });
                }
                
                enemiesRef.current.splice(i, 1);
                continue;
            }

            // Collision: Player vs Enemy
            const distP = Math.hypot(player.x - e.x, player.y - e.y);
            if (distP < 20 + e.size/2) {
                setGameState('gameover');
            }

            if (e.y > height + 50) enemiesRef.current.splice(i, 1);
        }

        // --- Update & Draw Particles ---
        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life--;
            
            ctx.globalAlpha = p.life / 30;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;

            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

      } else {
          // Background animation for menus
          // Just draw some floating particles or grid
          ctx.strokeStyle = 'rgba(255,255,255,0.05)';
          ctx.beginPath();
          for(let i=0; i<canvas.width; i+=40) {
              ctx.moveTo(i, 0);
              ctx.lineTo(i, canvas.height);
          }
          for(let i=0; i<canvas.height; i+=40) {
              ctx.moveTo(0, i);
              ctx.lineTo(canvas.width, i);
          }
          ctx.stroke();
      }

      requestRef.current = requestAnimationFrame(gameLoop);
    };

    requestRef.current = requestAnimationFrame(gameLoop);

    // Event Listeners
    const handleKeyDown = (e: KeyboardEvent) => {
        keysRef.current[e.key] = true;
        
        // Start game on Enter/Space if not playing
        if (gameStateRef.current !== 'playing') {
             if (e.key === 'Enter') {
                 setGameState('playing');
             }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []); // Empty dep array, using refs for state

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950 font-mono">
       <canvas ref={canvasRef} className="block w-full h-full" />
       
       <button 
        onClick={onClose} 
        className="absolute top-6 right-6 p-2 rounded-full text-slate-500 hover:text-white hover:bg-white/10 transition-colors z-50"
      >
        <X className="w-8 h-8" />
      </button>

      {gameState === 'start' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
             <Trophy className="w-24 h-24 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
             <h1 className="text-6xl font-black mb-2 tracking-tight">BUG BLASTER</h1>
             <p className="text-xl text-slate-400 mb-12">Defend the codebase from incoming bugs!</p>
             
             <div className="flex gap-12 mb-12">
                <div className="flex flex-col items-center gap-3">
                   <div className="flex gap-2">
                      <div className="w-12 h-12 border-2 border-slate-600 rounded flex items-center justify-center text-xl font-bold bg-slate-900">←</div>
                      <div className="w-12 h-12 border-2 border-slate-600 rounded flex items-center justify-center text-xl font-bold bg-slate-900">→</div>
                   </div>
                   <span className="text-sm text-slate-500 uppercase tracking-wider">Move</span>
                </div>
                <div className="flex flex-col items-center gap-3">
                   <div className="w-32 h-12 border-2 border-slate-600 rounded flex items-center justify-center text-xl font-bold bg-slate-900">SPACE</div>
                   <span className="text-sm text-slate-500 uppercase tracking-wider">Shoot</span>
                </div>
             </div>

             <div className="animate-pulse text-2xl font-bold text-yellow-400">
                PRESS ENTER TO START
             </div>
          </div>
      )}

      {gameState === 'playing' && (
          <div className="absolute top-6 left-6 z-50">
             <div className="text-slate-400 text-sm uppercase tracking-wider mb-1">Score</div>
             <div className="text-4xl font-bold text-white tabular-nums">{score.toString().padStart(6, '0')}</div>
          </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-red-900/20 backdrop-blur-md animate-in zoom-in-95 duration-300">
          <div className="text-red-500 font-bold text-9xl mb-4 opacity-20 absolute select-none">GAME OVER</div>
          <div className="relative z-10 flex flex-col items-center">
              <h1 className="text-5xl font-black mb-8 text-white drop-shadow-lg">SYSTEM CRASHED</h1>
              
              <div className="bg-slate-900/80 p-8 rounded-2xl border border-slate-700 text-center shadow-2xl mb-8 min-w-[300px]">
                  <div className="text-slate-400 text-sm uppercase tracking-wider mb-2">Final Score</div>
                  <div className="text-6xl font-bold text-yellow-400 tabular-nums mb-4">{score}</div>
                  <div className="text-xs text-slate-500">Bugs squashed: {Math.floor(score/100)}</div>
              </div>

              <button 
                onClick={() => setGameState('start')}
                className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg hover:scale-105 hover:bg-blue-50 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
              >
                PLAY AGAIN
              </button>
              
              <div className="mt-6 text-slate-400 text-sm">Press ENTER to restart</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EasterEggGame;