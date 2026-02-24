'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Heart, Trophy, Play, RotateCcw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// --- Types & Constants ---
type GameState = 'start' | 'playing' | 'gameover';

interface ItemType {
  emoji: string;
  type: 'good' | 'bad';
  points: number;
  damage: number;
  id: string; // Unique ID for keying
}

const ITEM_TYPES: Omit<ItemType, 'id'>[] = [
  { emoji: '🥩', type: 'good', points: 10, damage: 0 },
  { emoji: '🥬', type: 'good', points: 5, damage: 0 },
  { emoji: '🐟', type: 'good', points: 8, damage: 0 },
  { emoji: '💊', type: 'good', points: 15, damage: 0 }, // Bonus
  { emoji: '☕', type: 'bad', points: 0, damage: 1 },
  { emoji: '🍵', type: 'bad', points: 0, damage: 1 },
];

const GAME_SPEED_BASE = 3;
const SPAWN_RATE_BASE = 1000; // ms
const PLAYER_SIZE = 64; // px (width of RBC)
const ITEM_SIZE = 40; // px

export const IronCatcherGame = () => {
  // --- React State for UI ---
  const { user } = useUser();
  const firestore = useFirestore();
  const [gameState, setGameState] = useState<GameState>('start');
  const [score, setScore] = useState(0);
  const [health, setHealth] = useState(3);
  const [highScore, setHighScore] = useState(0);

  // --- Refs for Game Loop (Mutable State) ---
  const requestRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  
  const gameAreaRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  
  // Game Logic State (Refs to avoid re-renders)
  const itemsRef = useRef<{
    el: HTMLDivElement;
    x: number;
    y: number;
    speed: number;
    type: ItemType;
  }[]>([]);
  
  const playerXRef = useRef(0);
  const gameWidthRef = useRef(0);
  const gameHeightRef = useRef(0);

  // --- Game Loop ---
  const updateGame = useCallback((time: number) => {
    if (gameState !== 'playing') return;

    const deltaTime = time - lastTimeRef.current;
    lastTimeRef.current = time;

    // 1. Spawning Logic
    if (time - lastSpawnTimeRef.current > SPAWN_RATE_BASE) {
      spawnItem();
      lastSpawnTimeRef.current = time;
    }

    // 2. Update Items
    const remainingItems: typeof itemsRef.current = [];
    
    itemsRef.current.forEach((item) => {
      // Move Item
      item.y += item.speed;
      
      // Update DOM
      item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;

      // Collision Detection (Circle-based for "eating" feel)
      const playerCenterX = playerXRef.current + PLAYER_SIZE / 2;
      const playerCenterY = gameHeightRef.current - PLAYER_SIZE / 2 - 20;
      
      const itemCenterX = item.x + ITEM_SIZE / 2;
      const itemCenterY = item.y + ITEM_SIZE / 2;

      const distance = Math.sqrt(
        Math.pow(playerCenterX - itemCenterX, 2) + 
        Math.pow(playerCenterY - itemCenterY, 2)
      );

      // Collide when centers are close enough (feels like eating)
      const isColliding = distance < (PLAYER_SIZE / 2 + ITEM_SIZE / 2) * 0.8;

      if (isColliding) {
        if (item.type.type === 'good') {
            // Swallow animation: shrink towards player center
            item.el.style.transition = 'all 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            item.el.style.transform = `translate(${playerXRef.current + PLAYER_SIZE/4}px, ${gameHeightRef.current - PLAYER_SIZE}px) scale(0)`;
            setTimeout(() => item.el.remove(), 150);
            
            // Player pulse
            if (playerRef.current) {
                playerRef.current.style.transition = 'transform 0.1s';
                playerRef.current.style.transform = `translateX(${playerXRef.current}px) scale(1.2)`;
                setTimeout(() => {
                    if (playerRef.current) playerRef.current.style.transform = `translateX(${playerXRef.current}px) scale(1)`;
                }, 100);
            }
        } else {
            // Explosion effect
            createExplosion(itemCenterX, itemCenterY);
            item.el.remove();
        }
        
        handleCollision(item.type);
      } else if (item.y > gameHeightRef.current) {
        item.el.remove(); // Remove if off screen
      } else {
        remainingItems.push(item);
      }
    });

    itemsRef.current = remainingItems;

    requestRef.current = requestAnimationFrame(updateGame);
  }, [gameState]); 

  // --- Game Actions ---
  const createExplosion = (x: number, y: number) => {
    if (!gameAreaRef.current) return;
    
    const container = document.createElement('div');
    container.className = 'absolute pointer-events-none z-50';
    container.style.left = `${x}px`;
    container.style.top = `${y}px`;
    gameAreaRef.current.appendChild(container);

    // Create particles
    for (let i = 0; i < 8; i++) {
        const p = document.createElement('div');
        p.className = 'absolute w-3 h-3 bg-orange-500 rounded-full animate-ping';
        const angle = (i / 8) * Math.PI * 2;
        const velocity = 100;
        const tx = Math.cos(angle) * velocity;
        const ty = Math.sin(angle) * velocity;
        
        p.style.transition = 'all 0.4s ease-out';
        container.appendChild(p);
        
        setTimeout(() => {
            p.style.transform = `translate(${tx}px, ${ty}px) scale(0)`;
            p.style.opacity = '0';
        }, 10);
    }

    const flash = document.createElement('div');
    flash.className = 'absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-yellow-400 rounded-full opacity-80 blur-xl animate-pulse';
    container.appendChild(flash);

    setTimeout(() => container.remove(), 500);
  };

  const spawnItem = () => {
    if (!gameAreaRef.current) return;

    const randomType = ITEM_TYPES[Math.floor(Math.random() * ITEM_TYPES.length)];
    const id = Math.random().toString(36).substr(2, 9);
    
    // Create DOM Element
    const el = document.createElement('div');
    el.innerText = randomType.emoji;
    el.className = 'absolute text-4xl select-none transition-transform will-change-transform';
    el.style.width = `${ITEM_SIZE}px`;
    el.style.height = `${ITEM_SIZE}px`;
    el.style.textAlign = 'center';
    el.style.lineHeight = `${ITEM_SIZE}px`;
    
    const x = Math.random() * (gameWidthRef.current - ITEM_SIZE);
    
    gameAreaRef.current.appendChild(el);

    itemsRef.current.push({
      el,
      x,
      y: -50,
      speed: GAME_SPEED_BASE + (Math.random() * 2),
      type: { ...randomType, id }
    });
  };

  const handleCollision = (item: ItemType) => {
    if (item.type === 'good') {
      setScore(prev => prev + item.points);
      // Optional: Add floating text or effect here
    } else {
      setHealth(prev => {
        const newHealth = prev - item.damage;
        if (newHealth <= 0) {
          endGame();
        }
        return newHealth;
      });
      // Flash screen red effect?
      if (gameAreaRef.current) {
        const flash = document.createElement('div');
        flash.className = 'absolute inset-0 bg-red-500/30 z-20 pointer-events-none animate-ping';
        gameAreaRef.current.appendChild(flash);
        setTimeout(() => flash.remove(), 200);
      }
    }
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setHealth(3);
    itemsRef.current.forEach(i => i.el.remove()); // Clear old items
    itemsRef.current = [];
    lastTimeRef.current = performance.now();
    lastSpawnTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(updateGame);
  };

  const endGame = async () => {
    setGameState('gameover');
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    setHighScore(prev => Math.max(prev, score));

    if (user && !user.isAnonymous && firestore) {
        try {
            await addDoc(collection(firestore, `users/${user.uid}/gameScores`), {
                game: 'Iron Catcher',
                score: score,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to save score", e);
        }
    }
  };

  // --- Input Handling ---
  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (gameState !== 'playing' || !gameAreaRef.current) return;

    const rect = gameAreaRef.current.getBoundingClientRect();
    let clientX;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = (e as React.MouseEvent).clientX;
    }

    // Calculate relative X
    let x = clientX - rect.left - (PLAYER_SIZE / 2);
    
    // Clamp to bounds
    x = Math.max(0, Math.min(x, gameWidthRef.current - PLAYER_SIZE));
    
    playerXRef.current = x;
    
    if (playerRef.current) {
      playerRef.current.style.transform = `translateX(${x}px)`;
    }
  };

  // --- Effects ---
  useEffect(() => {
    if (gameState === 'playing') {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, updateGame]);

  useEffect(() => {
    // Init Dimensions
    if (gameAreaRef.current) {
      gameWidthRef.current = gameAreaRef.current.clientWidth;
      gameHeightRef.current = gameAreaRef.current.clientHeight;
    }
    
    const handleResize = () => {
        if (gameAreaRef.current) {
            gameWidthRef.current = gameAreaRef.current.clientWidth;
            gameHeightRef.current = gameAreaRef.current.clientHeight;
        }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);


  return (
    <Card className="relative w-full h-[600px] overflow-hidden bg-gradient-to-b from-blue-50 to-red-50 border-2 border-primary/20 shadow-2xl rounded-3xl select-none">
      
      {/* --- HUD --- */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-30 pointer-events-none">
        <div className="flex gap-2">
           {Array.from({ length: 3 }).map((_, i) => (
             <Heart 
                key={i} 
                className={`h-8 w-8 transition-colors ${i < health ? 'fill-red-500 text-red-500' : 'fill-gray-300 text-gray-300'}`} 
             />
           ))}
        </div>
        <div className="text-right">
           <div className="text-4xl font-black text-primary drop-shadow-md">{score}</div>
           <div className="text-xs text-muted-foreground font-bold uppercase tracking-widest">Score</div>
        </div>
      </div>

      {/* --- Game Area --- */}
      <div 
        ref={gameAreaRef}
        className="relative w-full h-full cursor-none touch-none"
        onMouseMove={handleMouseMove}
        onTouchMove={handleMouseMove}
      >
        {/* Player (RBC) */}
        <div 
            ref={playerRef}
            className="absolute bottom-5 left-0 will-change-transform z-20 flex items-center justify-center"
            style={{ width: PLAYER_SIZE, height: PLAYER_SIZE }}
        >
            <div className="w-full h-full bg-red-500 rounded-full shadow-[inset_0px_4px_8px_rgba(0,0,0,0.2)] border-4 border-red-600 flex items-center justify-center relative overflow-hidden">
                <div className="w-2/3 h-2/3 bg-red-400 rounded-full opacity-50 absolute top-1 left-1"></div>
            </div>
        </div>
        
        {/* Items are injected here via DOM manipulation */}

      </div>

      {/* --- Start Screen --- */}
      {gameState === 'start' && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-40 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-300">
           <div className="mb-6 p-6 bg-red-100 rounded-full">
             <Trophy className="h-16 w-16 text-red-600" />
           </div>
           <h1 className="text-5xl font-black text-primary mb-2 tracking-tighter">Iron Catcher</h1>
           <p className="text-xl text-muted-foreground mb-8 max-w-md">
             Help the Red Blood Cell collect iron-rich foods! Avoid caffeine to maintain maximum absorption.
           </p>
           
           <div className="grid grid-cols-2 gap-4 mb-8 text-left bg-white p-6 rounded-2xl shadow-sm border">
              <div>
                 <h3 className="font-bold text-green-600 mb-2 flex items-center gap-2">
                    <span className="text-xl">😋</span> Collect
                 </h3>
                 <div className="text-2xl space-x-2">🥩 🥬 🐟 💊</div>
              </div>
              <div>
                 <h3 className="font-bold text-red-600 mb-2 flex items-center gap-2">
                    <span className="text-xl">🚫</span> Avoid
                 </h3>
                 <div className="text-2xl space-x-2">☕ 🍵</div>
              </div>
           </div>

           <Button size="lg" onClick={startGame} className="text-xl px-12 py-6 rounded-full shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
              <Play className="mr-2 h-6 w-6 fill-current" /> Start Game
           </Button>
        </div>
      )}

      {/* --- Game Over Screen --- */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-8 text-center text-white animate-in zoom-in-95 duration-300">
           <AlertCircle className="h-20 w-20 text-red-500 mb-4 animate-bounce" />
           <h2 className="text-5xl font-black mb-2">Game Over!</h2>
           <p className="text-2xl text-gray-300 mb-8">You fueled your body with <span className="text-white font-bold">{score}</span> iron points.</p>
           
           <div className="flex gap-4">
              <Button size="lg" variant="secondary" onClick={startGame} className="text-lg px-8 py-6 rounded-full">
                 <RotateCcw className="mr-2 h-5 w-5" /> Try Again
              </Button>
           </div>
        </div>
      )}

    </Card>
  );
};
