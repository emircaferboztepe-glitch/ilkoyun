/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Play, RotateCcw, ArrowUp, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Constants ---
const GRAVITY = 0.6;
const JUMP_FORCE = -12;
const GROUND_HEIGHT = 100;
const PEPE_SIZE = 50;
const INITIAL_SPEED = 5;
const SPEED_INCREMENT = 0.001;

// --- Types ---
interface Entity {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Platform extends Entity {
  color: string;
}

interface Obstacle extends Entity {
  type: 'spike' | 'block';
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'START' | 'PLAYING' | 'GAMEOVER'>('START');
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  
  // Game Loop Refs
  const requestRef = useRef<number>(null);
  const pepeRef = useRef({
    x: 100,
    y: 0,
    vy: 0,
    width: PEPE_SIZE,
    height: PEPE_SIZE,
    isJumping: false,
  });
  const platformsRef = useRef<Platform[]>([]);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(INITIAL_SPEED);
  const distanceRef = useRef(0);

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('pepe-parkour-highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Handle Input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const jump = () => {
    if (gameState !== 'PLAYING') return;
    if (!pepeRef.current.isJumping) {
      pepeRef.current.vy = JUMP_FORCE;
      pepeRef.current.isJumping = true;
    }
  };

  const initGame = () => {
    pepeRef.current = {
      x: 100,
      y: 300,
      vy: 0,
      width: PEPE_SIZE,
      height: PEPE_SIZE,
      isJumping: false,
    };
    
    // Initial platforms
    platformsRef.current = [
      { x: 0, y: 400, width: 800, height: 200, color: '#4ade80' },
      { x: 900, y: 350, width: 200, height: 250, color: '#22c55e' },
      { x: 1200, y: 300, width: 200, height: 300, color: '#16a34a' },
    ];
    
    obstaclesRef.current = [];
    speedRef.current = INITIAL_SPEED;
    distanceRef.current = 0;
    setScore(0);
    setGameState('PLAYING');
  };

  const update = () => {
    if (gameState !== 'PLAYING') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Update Speed
    speedRef.current += SPEED_INCREMENT;
    distanceRef.current += speedRef.current;
    setScore(Math.floor(distanceRef.current / 100));

    // Update Pepe
    pepeRef.current.vy += GRAVITY;
    pepeRef.current.y += pepeRef.current.vy;

    // Collision with Platforms
    let onPlatform = false;
    platformsRef.current.forEach(p => {
      // Move platform
      p.x -= speedRef.current;

      // Check collision
      if (
        pepeRef.current.x < p.x + p.width &&
        pepeRef.current.x + pepeRef.current.width > p.x &&
        pepeRef.current.y + pepeRef.current.height > p.y &&
        pepeRef.current.y + pepeRef.current.height < p.y + 20 &&
        pepeRef.current.vy >= 0
      ) {
        pepeRef.current.y = p.y - pepeRef.current.height;
        pepeRef.current.vy = 0;
        pepeRef.current.isJumping = false;
        onPlatform = true;
      }
    });

    // Generate New Platforms
    if (platformsRef.current[platformsRef.current.length - 1].x < canvas.width) {
      const lastP = platformsRef.current[platformsRef.current.length - 1];
      const gap = 150 + Math.random() * 150;
      const width = 200 + Math.random() * 300;
      const y = 250 + Math.random() * 150;
      platformsRef.current.push({
        x: lastP.x + lastP.width + gap,
        y: y,
        width: width,
        height: 600 - y,
        color: `hsl(${120 + Math.random() * 40}, 70%, ${40 + Math.random() * 20}%)`
      });

      // Maybe add an obstacle
      if (Math.random() > 0.6) {
        obstaclesRef.current.push({
          x: lastP.x + lastP.width + gap + width / 2,
          y: y - 30,
          width: 30,
          height: 30,
          type: 'block'
        });
      }
    }

    // Move and Clean Obstacles
    obstaclesRef.current.forEach(o => {
      o.x -= speedRef.current;
      
      // Collision with Obstacle
      if (
        pepeRef.current.x < o.x + o.width &&
        pepeRef.current.x + pepeRef.current.width > o.x &&
        pepeRef.current.y < o.y + o.height &&
        pepeRef.current.y + pepeRef.current.height > o.y
      ) {
        gameOver();
      }
    });

    // Clean up off-screen
    platformsRef.current = platformsRef.current.filter(p => p.x + p.width > -100);
    obstaclesRef.current = obstaclesRef.current.filter(o => o.x + o.width > -100);

    // Check Fall
    if (pepeRef.current.y > canvas.height) {
      gameOver();
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const gameOver = () => {
    setGameState('GAMEOVER');
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    
    setHighScore(prev => {
      const currentScore = Math.floor(distanceRef.current / 100);
      if (currentScore > prev) {
        localStorage.setItem('pepe-parkour-highscore', currentScore.toString());
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 }
        });
        return currentScore;
      }
      return prev;
    });
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background Gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, '#0f172a');
    grad.addColorStop(1, '#1e293b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Platforms
    platformsRef.current.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.width, p.height);
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(p.x, p.y, p.width, 5);
    });

    // Draw Obstacles
    obstaclesRef.current.forEach(o => {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + o.height);
      ctx.lineTo(o.x + o.width / 2, o.y);
      ctx.lineTo(o.x + o.width, o.y + o.height);
      ctx.fill();
    });

    // Draw Pepe (Stylized Frog)
    const p = pepeRef.current;
    ctx.save();
    ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
    
    // Body
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.ellipse(0, 0, p.width / 2, p.height / 2.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(-10, -15, 8, 0, Math.PI * 2);
    ctx.arc(10, -15, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(-10, -15, 4, 0, Math.PI * 2);
    ctx.arc(10, -15, 4, 0, Math.PI * 2);
    ctx.fill();

    // Smile
    ctx.strokeStyle = '#14532d';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 5, 10, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();

    ctx.restore();
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      requestRef.current = requestAnimationFrame(update);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
        if (gameState === 'START') {
            // Draw initial frame
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#0f172a';
                ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
        }
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-950 font-sans">
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        onClick={jump}
        onTouchStart={jump}
      />

      {/* UI Overlays */}
      <div className="absolute top-6 left-6 flex items-center gap-6 pointer-events-none">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Score</span>
          <span className="text-3xl font-black text-white tabular-nums">{score}</span>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col items-center">
          <span className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Best</span>
          <span className="text-3xl font-black text-white tabular-nums">{highScore}</span>
        </div>
      </div>

      <AnimatePresence>
        {gameState === 'START' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm"
          >
            <div className="relative mb-8">
                <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.4)]"
                >
                    <div className="relative w-24 h-24">
                        {/* Simple Pepe Face in UI */}
                        <div className="absolute top-4 left-4 w-6 h-6 bg-white rounded-full">
                            <div className="absolute top-1 left-1 w-3 h-3 bg-black rounded-full" />
                        </div>
                        <div className="absolute top-4 right-4 w-6 h-6 bg-white rounded-full">
                            <div className="absolute top-1 left-1 w-3 h-3 bg-black rounded-full" />
                        </div>
                        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-12 h-4 border-b-4 border-emerald-900 rounded-full" />
                    </div>
                </motion.div>
                <div className="absolute -bottom-4 -right-4 bg-amber-500 p-2 rounded-lg rotate-12 shadow-lg">
                    <Zap className="text-white w-6 h-6" fill="currentColor" />
                </div>
            </div>

            <h1 className="text-6xl font-black text-white mb-2 tracking-tighter uppercase italic">
              Pepe <span className="text-emerald-500">Parkour</span>
            </h1>
            <p className="text-slate-400 mb-12 text-lg font-medium">Jump between platforms and avoid spikes!</p>

            <button
              onClick={initGame}
              className="group relative px-12 py-5 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-2xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_10px_0_rgb(5,150,105)] hover:shadow-[0_8px_0_rgb(5,150,105)] active:shadow-none active:translate-y-[10px]"
            >
              <span className="flex items-center gap-3">
                <Play className="w-8 h-8" fill="currentColor" />
                START GAME
              </span>
            </button>

            <div className="mt-12 flex gap-8 text-slate-500 text-sm font-bold uppercase tracking-widest">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-white">SPACE</div>
                    <span>to Jump</span>
                </div>
            </div>
          </motion.div>
        )}

        {gameState === 'GAMEOVER' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-red-950/40 backdrop-blur-md"
          >
            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="bg-slate-900 p-12 rounded-[40px] border-4 border-white/10 shadow-2xl flex flex-col items-center max-w-md w-full mx-4"
            >
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
                    <Trophy className="w-10 h-10 text-red-500" />
                </div>
                
                <h2 className="text-5xl font-black text-white mb-2 tracking-tight uppercase italic">Game Over</h2>
                <p className="text-slate-400 mb-8 font-bold">You fell into the abyss!</p>

                <div className="grid grid-cols-2 gap-4 w-full mb-10">
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Score</span>
                        <span className="text-4xl font-black text-white">{score}</span>
                    </div>
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">Best</span>
                        <span className="text-4xl font-black text-amber-500">{highScore}</span>
                    </div>
                </div>

                <button
                  onClick={initGame}
                  className="w-full group relative px-8 py-5 bg-white text-slate-950 font-black text-xl rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-[0_10px_0_rgb(203,213,225)] active:shadow-none active:translate-y-[10px]"
                >
                  <span className="flex items-center justify-center gap-3">
                    <RotateCcw className="w-6 h-6" />
                    TRY AGAIN
                  </span>
                </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Jump Button (Visible only on touch devices) */}
      <div className="absolute bottom-12 right-12 md:hidden">
        <button
          className="w-24 h-24 bg-white/10 backdrop-blur-xl border-4 border-white/20 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          onPointerDown={jump}
        >
          <ArrowUp className="w-12 h-12 text-white" />
        </button>
      </div>
    </div>
  );
}
