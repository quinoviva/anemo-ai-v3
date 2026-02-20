'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, ChevronUp, X, Minimize2 } from 'lucide-react';
import { Chatbot } from '@/components/anemo/Chatbot';
import { AnimatePresence, motion } from 'framer-motion';

export function ChatbotPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  const toggleOpen = () => {
    if (isMinimized) {
        setIsMinimized(false);
        setIsOpen(true);
    } else {
        setIsOpen(!isOpen);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };

  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 z-[100] flex flex-row-reverse items-end gap-5 pointer-events-none">
        <div className="pointer-events-auto relative group flex-shrink-0">
            {/* Minimized Indicator */}
            <AnimatePresence>
                {isMinimized && (
                    <motion.div 
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="absolute -top-2 -right-1 z-20"
                    >
                        <span className="relative flex h-4 w-4">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-4 w-4 bg-cyan-500 border-2 border-background"></span>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Main Toggle Button - Touch Optimized (min 44px) */}
            <motion.button
                onClick={toggleOpen}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`relative h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl flex items-center justify-center transition-all duration-500 overflow-hidden ${isOpen ? 'bg-background border-2 border-white/10 hover:border-cyan-500/50' : 'bg-gradient-to-br from-cyan-500 to-blue-600 hover:shadow-cyan-500/50'}`}
            >
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div
                            key="close"
                            initial={{ rotate: -90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: 90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <X className="h-6 w-6 sm:h-8 sm:w-8 text-foreground" />
                        </motion.div>
                    ) : (
                        <motion.div
                            key="bot"
                            initial={{ rotate: 90, opacity: 0 }}
                            animate={{ rotate: 0, opacity: 1 }}
                            exit={{ rotate: -90, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative"
                        >
                            <div className="absolute inset-0 bg-white blur-md opacity-20 animate-pulse" />
                            <Bot className="h-6 w-6 sm:h-8 sm:w-8 text-white relative z-10" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </div>

        {/* Chat Window - Full Screen on Mobile, Bubble on Desktop */}
        <AnimatePresence mode="wait">
            {isOpen && !isMinimized && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 20, y: 20, filter: 'blur(15px)' }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 0.9, x: 20, y: 20, filter: 'blur(15px)' }}
                    transition={{ type: "spring", stiffness: 350, damping: 28, mass: 0.6 }}
                    className="fixed inset-0 sm:inset-auto sm:relative sm:mb-1 z-[110] sm:z-auto pointer-events-auto origin-bottom-right"
                >
                    <div className="w-full h-full sm:w-[380px] sm:h-[650px] sm:max-h-[calc(100vh-10rem)] flex flex-col sm:rounded-[2.5rem] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.5)] bg-background sm:bg-transparent overflow-hidden relative group">
                        {/* Desktop Only Border Glow */}
                        <div className="hidden sm:block absolute -inset-[1px] bg-gradient-to-br from-cyan-500/40 via-blue-500/30 to-indigo-500/40 rounded-[2.5rem] blur-[3px] opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                        
                        <div className="relative h-full w-full bg-background/95 sm:bg-background/80 backdrop-blur-[40px] sm:rounded-[2.5rem] overflow-hidden sm:border border-white/10 flex flex-col shadow-inner">
                            <Chatbot 
                                isPopup={true} 
                                onClose={handleClose} 
                                onMinimize={handleMinimize} 
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
}
