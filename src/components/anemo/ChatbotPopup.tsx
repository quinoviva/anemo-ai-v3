'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bot, MessageSquare } from 'lucide-react';
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
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-50 flex flex-col items-end gap-4 pointer-events-none max-w-[100vw] max-h-[100vh]">
        <AnimatePresence>
            {isOpen && !isMinimized && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="pointer-events-auto origin-bottom-right w-full flex justify-end"
                >
                    <div className="w-[300px] md:w-[320px] h-[400px] md:h-[450px] flex flex-col rounded-2xl shadow-2xl bg-background border border-border/40 overflow-hidden mb-16 md:mb-0 md:mr-16">
                        <Chatbot 
                            isPopup={true} 
                            onClose={handleClose} 
                            onMinimize={handleMinimize} 
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>

        <div className="pointer-events-auto relative">
            {/* Notification Badge if minimized (optional logic can be added here) */}
            {isMinimized && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                </span>
            )}
            
            <Button
                onClick={toggleOpen}
                size="icon"
                className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 hover:scale-105 ${isOpen ? 'bg-secondary text-secondary-foreground rotate-90 scale-0 opacity-0 absolute' : 'bg-primary text-primary-foreground'}`}
            >
                <Bot className="h-7 w-7" />
                <span className="sr-only">Open AI Chat</span>
            </Button>

            {/* Close Button when open (floating action button style) */}
            <Button
                 onClick={toggleOpen}
                 size="icon"
                 className={`h-14 w-14 rounded-full shadow-lg transition-all duration-300 absolute top-0 left-0 ${isOpen ? 'rotate-0 scale-100 opacity-100' : 'rotate-90 scale-0 opacity-0'} bg-secondary text-secondary-foreground hover:bg-secondary/80`}
            >
                <MessageSquare className="h-6 w-6" />
            </Button>
        </div>
    </div>
  );
}
