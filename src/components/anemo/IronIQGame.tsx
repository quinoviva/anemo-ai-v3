'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Button } from '@/components/ui/button';
import { Trophy, Apple, Beef, Pizza, X, CheckCircle2, Info } from 'lucide-react';
import { useUser, useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const foods = [
  { id: 1, name: 'Spinach', iron: 'high', icon: <Apple className="text-green-500" /> },
  { id: 2, name: 'Red Meat', iron: 'high', icon: <Beef className="text-red-600" /> },
  { id: 3, name: 'Lentils', iron: 'high', icon: <Apple className="text-orange-500" /> },
  { id: 4, name: 'White Bread', iron: 'low', icon: <Pizza className="text-yellow-600" /> },
  { id: 5, name: 'Sugar', iron: 'low', icon: <X className="text-pink-400" /> },
  { id: 6, name: 'Shellfish', iron: 'high', icon: <Beef className="text-blue-400" /> },
];

export function IronIQGame() {
  const { user } = useUser();
  const firestore = useFirestore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'start' | 'playing' | 'end'>('start');
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const saveScore = async (finalScore: number) => {
    if (user && !user.isAnonymous && firestore) {
        try {
            await addDoc(collection(firestore, `users/${user.uid}/gameScores`), {
                game: 'Iron IQ',
                score: finalScore,
                total: foods.length,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Failed to save score", e);
        }
    }
  };

  const handleGuess = (guess: 'high' | 'low') => {
    const isCorrect = foods[currentIndex].iron === guess;
    let newScore = score;
    if (isCorrect) {
      newScore = score + 1;
      setScore(newScore);
      setFeedback('correct');
    } else {
      setFeedback('wrong');
    }

    setTimeout(() => {
      setFeedback(null);
      if (currentIndex < foods.length - 1) {
        setCurrentIndex(c => c + 1);
      } else {
        setGameState('end');
        saveScore(newScore);
      }
    }, 1000);
  };

  const resetGame = () => {
    setCurrentIndex(0);
    setScore(0);
    setGameState('playing');
  };

  return (
    <GlassSurface intensity="medium" className="w-full max-w-md mx-auto overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <Trophy className="text-yellow-500 h-5 w-5" />
            Iron IQ Mini-Game
          </h3>
          {gameState === 'playing' && (
            <span className="text-sm font-medium bg-primary/10 px-2 py-1 rounded">
              {currentIndex + 1} / {foods.length}
            </span>
          )}
        </div>

        <AnimatePresence mode="wait">
          {gameState === 'start' && (
            <motion.div 
              key="start"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center space-y-4 py-8"
            >
              <p className="text-muted-foreground">Test your knowledge! Is the food high or low in Iron?</p>
              <Button onClick={() => setGameState('playing')} className="rounded-full px-8">Play Now</Button>
            </motion.div>
          )}

          {gameState === 'playing' && (
            <motion.div 
              key="playing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="space-y-6 py-4"
            >
              <div className="flex flex-col items-center justify-center p-8 bg-muted/50 rounded-2xl relative">
                <div className="text-6xl mb-4">{foods[currentIndex].icon}</div>
                <h4 className="text-2xl font-bold uppercase tracking-wider">{foods[currentIndex].name}</h4>
                
                {feedback && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`absolute inset-0 flex items-center justify-center rounded-2xl ${
                      feedback === 'correct' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}
                  >
                    {feedback === 'correct' ? (
                      <CheckCircle2 className="h-16 w-16 text-green-500" />
                    ) : (
                      <X className="h-16 w-16 text-red-500" />
                    )}
                  </motion.div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => handleGuess('high')} 
                  variant="outline" 
                  className="h-16 text-lg hover:bg-primary/10 hover:border-primary transition-all"
                  disabled={!!feedback}
                >
                  High Iron
                </Button>
                <Button 
                  onClick={() => handleGuess('low')} 
                  variant="outline" 
                  className="h-16 text-lg hover:bg-destructive/10 hover:border-destructive transition-all"
                  disabled={!!feedback}
                >
                  Low Iron
                </Button>
              </div>
            </motion.div>
          )}

          {gameState === 'end' && (
            <motion.div 
              key="end"
              initial={{ opacity: 0, zoom: 0.5 }}
              animate={{ opacity: 1, zoom: 1 }}
              className="text-center space-y-4 py-8"
            >
              <div className="text-5xl font-bold text-primary">{score} / {foods.length}</div>
              <p className="text-muted-foreground">
                {score === foods.length ? 'Master Chief of Iron!' : 'Keep learning about Iron-rich foods!'}
              </p>
              <Button onClick={resetGame} variant="secondary" className="rounded-full">Play Again</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GlassSurface>
  );
}
