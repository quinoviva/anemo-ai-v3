import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { runAnswerAnemiaQuestion } from '@/app/actions';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { addDoc, collection, serverTimestamp, query, orderBy, doc } from 'firebase/firestore';
import { Bot, User, Send, Sparkles, Trash2, RefreshCw, Minus, X, Zap, Mic } from 'lucide-react';
import HeartLoader from '@/components/ui/HeartLoader';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

type Message = { role: 'user' | 'assistant'; content: string; id?: string; createdAt?: Date | null };
type ChatbotProps = {
  isPopup?: boolean;
  onClose?: () => void;
  onMinimize?: () => void;
}

const sampleQuestions = [
  "What are the signs of anemia?",
  "Anong pagkain ang mayaman sa iron?",
  "Is dizziness a symptom?",
  "How can I prevent anemia?",
];

export function Chatbot({ isPopup = false, onClose, onMinimize }: ChatbotProps) {
  const isMounted = useIsMounted();
  const { user } = useUser();
  const firestore = useFirestore();
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: 'Not supported', description: 'Voice input is not available on this browser.', variant: 'destructive' });
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.onresult = (e: any) => {
      const transcript = e.results[0]?.[0]?.transcript ?? '';
      setUserInput(prev => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };
  const [isInitializing, setIsInitializing] = useState(true);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const lastSentAtRef = useRef<number>(0);
  const COOLDOWN_MS = 4000; // 4s cooldown between messages
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keyboard-aware: detect when virtual keyboard is shown on mobile
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleResize = () => {
      // Keyboard is visible when viewport height is significantly less than window height
      const isKB = vv.height < window.innerHeight * 0.75;
      setIsKeyboardVisible(isKB);
    };
    vv.addEventListener('resize', handleResize);
    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  // Firestore Query
  const messagesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/chatHistory`),
      orderBy('createdAt', 'asc')
    );
  }, [user, firestore]);

  const { data: historyData } = useCollection<any>(messagesQuery);
  
  const userDocRef = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return doc(firestore, 'users', user.uid);
  }, [user, firestore]);
  const { data: userData } = useDoc(userDocRef);

  const history: Message[] = historyData ? historyData.map(doc => ({
      role: (doc.role ?? 'assistant') as 'user' | 'assistant',
      content: doc.content ?? '',
      id: doc.id,
      createdAt: doc.createdAt?.toDate?.() ?? null,
  })) : [];

  // Initialization Effect
  useEffect(() => {
    const initChat = async () => {
        if (!user || !firestore || !historyData || (user && !user.isAnonymous && !userData)) return;

        if (historyData.length === 0) {
            try {
                setIsLoading(true);
                await new Promise(resolve => setTimeout(resolve, 1500));
                
                if (!isMounted()) return;

                const userName = userData?.firstName || user?.displayName?.split(' ')[0] || 'Friend';
                const greeting = `Hello ${userName}! I'm **ANEMO BOT**. I can answer your questions about anemia symptoms, prevention, and diet. How can I help you today?`;
                
                await addDoc(collection(firestore, `users/${user.uid}/chatHistory`), {
                    role: 'assistant',
                    content: greeting,
                    createdAt: serverTimestamp()
                });
            } catch (err) {
                console.error("Chatbot init failed:", err);
            } finally {
                if (isMounted()) setIsLoading(false);
            }
        }
        if (isMounted()) setIsInitializing(false);
    };

    initChat();
  }, [user, firestore, historyData?.length, userData, isMounted]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.length, isLoading]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !user || !firestore) return;
    
    const now = Date.now();
    if (now - lastSentAtRef.current < COOLDOWN_MS) {
      toast({ title: 'Please wait', description: 'Sending too fast — give the AI a moment.', variant: 'destructive' });
      return;
    }
    lastSentAtRef.current = now;

    setUserInput('');
    setIsLoading(true);

    try {
      await addDoc(collection(firestore, `users/${user.uid}/chatHistory`), {
          role: 'user',
          content: message,
          createdAt: serverTimestamp()
      });

      const result = await runAnswerAnemiaQuestion({
        question: message,
      });

      await addDoc(collection(firestore, `users/${user.uid}/chatHistory`), {
          role: 'assistant',
          content: result.answer,
          createdAt: serverTimestamp()
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
       let displayMessage = `I'm sorry, but I encountered an error. Please try again.`;
       
       if (errorMessage.includes('API key')) {
         displayMessage = "Configuration Error: Please check the API key."
       }

      await addDoc(collection(firestore, `users/${user.uid}/chatHistory`), {
          role: 'assistant',
          content: displayMessage,
          createdAt: serverTimestamp()
      });
      
      toast({ title: "Chat Error", description: "Failed to get response.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
      toast({ title: "History Preserved", description: "Chat history is saved securely." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
  };
  
  const handleSampleQuestionClick = (question: string) => {
    sendMessage(question);
  };

  const formatMessage = (content: string) => {
    // Basic Markdown parser for **bold** and *italics*
    return content.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={i} className="italic text-foreground/80">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  const formatRelTime = (date: Date | null | undefined) => {
    if (!date) return '';
    const diff = Date.now() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const messageList = useMemo(() => history.map((msg, i) => (
    <motion.div 
      key={i} 
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      // added w-full to ensure the row takes up the whole chat width
      className={cn("flex gap-3 md:gap-4 group w-full mb-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatars */}
      <div className="shrink-0 pt-1">
          {msg.role === 'assistant' ? (
              <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center backdrop-blur-md shadow-lg">
                  <Bot size={14} className="md:size-[16px] text-cyan-400"/>
              </div>
          ) : (
              <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 border border-indigo-400/30 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <User size={14} className="md:size-[16px] text-white"/>
              </div>
          )}
      </div>
      
      {/* Message Bubbles Container */}
      <div className={cn(
        "flex flex-col gap-1.5", 
        // flex-1 is the secret sauce here—it forces the container to occupy available space
        msg.role === 'user' ? 'items-end flex-1' : 'items-start flex-1'
      )}>
        <div className={cn(
          // width: fit-content ensures it wraps tightly around text
          // whitespace-normal stops the vertical stacking
          "h-auto w-fit min-w-[60px] max-w-[85%] md:max-w-[70%] rounded-[20px] px-5 py-3 md:px-6 md:py-3.5 text-sm leading-relaxed shadow-md",
          msg.role === 'assistant' 
              ? "bg-foreground/5 border border-foreground/10 text-foreground rounded-tl-[4px]" 
              : "bg-gradient-to-br from-indigo-600 to-blue-600 text-white rounded-tr-[4px] border border-white/10"
        )}>
          {/* We use break-words only if the word itself is longer than the bubble */}
          <div className="whitespace-normal break-words tracking-normal font-normal text-left">
            {formatMessage(msg.content)}
          </div>
        </div>
        {msg.createdAt && (
          <span className="text-[10px] text-muted-foreground/40 font-medium tracking-wide px-2">
            {formatRelTime(msg.createdAt)}
          </span>
        )}
      </div>
    </motion.div>
  )), [history]);

  const ChatHeader = () => (
    <div className="relative border-b border-border/50 px-6 py-4 flex flex-row items-center justify-between z-20 bg-background/50 backdrop-blur-2xl shrink-0">
      <div className='flex items-center gap-4 relative'>
        {/* Tricolor Identity Element - Blue Theme */}
        <div className="relative w-10 h-10 flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-600 via-cyan-400 to-indigo-600 rounded-full blur-[8px] opacity-60 animate-pulse" />
            <div className="relative z-10 w-full h-full bg-background/80 rounded-full border border-border flex items-center justify-center backdrop-blur-md shadow-xl">
                <Bot className="h-5 w-5 text-cyan-400" />
            </div>
            {/* Status Dot */}
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-cyan-400 rounded-full border-2 border-background shadow-[0_0_8px_rgba(34,211,238,0.6)]"></div>
        </div>

        <div className="flex flex-col justify-center h-10">
            <h3 className="text-lg tracking-tight flex items-center gap-2 text-foreground/90">
              Anemo Bot
            </h3>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isPopup && (
            <>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:b3g-foreground/5" onClick={onMinimize}>
                    <Minus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-red-500/20 hover:text-red-500 transition-colors" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </>
        )}
        {!isPopup && (
             <Button variant="ghost" size="sm" onClick={handleClearChat} className="text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-foreground/5 rounded-full px-4 border border-transparent hover:border-border transition-all">
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Clear
             </Button>
        )}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "flex flex-col overflow-hidden relative font-sans",
      // When keyboard is visible on mobile (non-popup), go full-screen
      isKeyboardVisible && !isPopup
        ? "fixed inset-0 z-50 bg-background h-[100dvh]"
        : "h-full",
      isPopup 
        ? "bg-background/95 sm:bg-background/90 backdrop-blur-2xl" 
        : "bg-transparent"
    )}>
      
      {/* Dynamic Glows behind content - Blue Theme */}
      {!isPopup && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
             <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-[100px]" />
             <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-600/5 rounded-full blur-[100px]" />
        </div>
      )}

      <ChatHeader />
      
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden p-0 relative z-10">
        <ScrollArea className="flex-1 w-full h-full">
          <div className="space-y-6 max-w-4xl mx-auto px-4 py-6 md:px-8 md:py-8">
            <AnimatePresence initial={false}>
            {messageList}
            </AnimatePresence>
            
             {history.length === 1 && !isLoading && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6"
              >
                  {sampleQuestions.map((q, i) => (
                    <motion.button
                      whileHover={{ scale: 1.02, backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                      whileTap={{ scale: 0.98 }}
                      key={i} 
                      className="text-left px-5 py-4 bg-foreground/5 border border-foreground/5 hover:border-cyan-500/30 transition-all rounded-2xl group flex flex-col gap-2 min-h-[44px]"
                      onClick={() => handleSampleQuestionClick(q)}
                    >
                      <Zap className="h-4 w-4 text-cyan-400 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.5)] transition-all" />
                      <span className="text-sm text-foreground/80 group-hover:text-foreground font-medium">{q}</span>
                    </motion.button>
                  ))}
              </motion.div>
            )}

            {isLoading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-end gap-4"
              >
                 <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center backdrop-blur-md">
                    <Bot size={14} className="md:size-[16px] text-cyan-400"/>
                </div>
                <div className="rounded-[1.25rem] rounded-tl-sm bg-foreground/5 border border-foreground/5 px-5 py-3 md:px-6 md:py-4 shadow-lg backdrop-blur-md">
                  <div className="flex items-center gap-1.5">
                     <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="w-2 h-2 bg-cyan-400 rounded-full" />
                     <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} className="w-2 h-2 bg-blue-500 rounded-full" />
                     <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} className="w-2 h-2 bg-indigo-500 rounded-full" />
                  </div>
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        </ScrollArea>
        
        {/* Input Area */}
        <div className="p-4 md:p-6 bg-gradient-to-t from-background/95 to-transparent backdrop-blur-md relative z-20">
            <form onSubmit={handleSubmit} className="relative max-w-4xl mx-auto flex items-center gap-3">
                <div className="relative flex-1 group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full blur opacity-10 group-focus-within:opacity-40 transition duration-1000 group-hover:opacity-30" />
                    <Input 
                        placeholder="Aa" 
                        value={userInput} 
                        onChange={(e) => setUserInput(e.target.value)} 
                        disabled={isLoading}
                        className="relative bg-background/50 border-border hover:border-border focus-visible:border-border focus-visible:ring-0 rounded-full h-12 md:h-14 pl-5 md:pl-6 pr-12 transition-all shadow-inner text-base backdrop-blur-xl"
                    />
                     <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        {userInput && (
                            <Button 
                                type="button" 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full hover:bg-foreground/10 text-muted-foreground"
                                onClick={() => setUserInput('')}
                            >
                                <X className="h-4 w-4" />
                            </Button> 
                        )}
                    </div>
                </div>
                
                <button
                    type="button"
                    onClick={toggleVoice}
                    className={cn(
                        "flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-full flex items-center justify-center transition-all border",
                        isListening
                            ? "bg-primary text-white border-primary animate-pulse"
                            : "glass-button border-primary/20 text-muted-foreground hover:text-primary"
                    )}
                    aria-label="Voice input"
                >
                    <Mic className="w-4 h-4 md:w-5 md:h-5" />
                </button>
                <Button 
                    type="submit" 
                    size="icon" 
                    disabled={!userInput.trim() || isLoading} 
                    className={cn(
                        "shrink-0 rounded-full w-12 h-12 md:w-14 md:h-14 shadow-xl transition-all duration-300 bg-gradient-to-br from-cyan-500 to-blue-600 hover:scale-105 hover:shadow-cyan-500/25 border border-foreground/10",
                        !userInput.trim() && "opacity-50 grayscale cursor-not-allowed"
                    )}
                >
                    {isLoading ? <HeartLoader size={20} strokeWidth={3} className="text-white" /> : <Send className="h-5 w-5 md:h-6 md:w-6 text-white ml-0.5" />}
                </Button>
            </form>
        </div>
      </CardContent>
    </div>
  );
}
