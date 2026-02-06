import React, { useState, useRef, useEffect } from 'react';
import { runAnswerAnemiaQuestion } from '@/app/actions';
import { CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase'; // Added hooks
import { addDoc, collection, serverTimestamp, query, orderBy } from 'firebase/firestore'; // Added firestore methods
import { Bot, User, Send, Loader2, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Minus, X } from 'lucide-react';

type Message = { role: 'user' | 'assistant'; content: string; id?: string };
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
  const { user } = useUser();
  const firestore = useFirestore();
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // New state to track initial load
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Firestore Query
  const messagesQuery = useMemoFirebase(() => {
    if (!user || !firestore) return null;
    return query(
      collection(firestore, `users/${user.uid}/chatHistory`),
      orderBy('createdAt', 'asc')
    );
  }, [user, firestore]);

  const { data: historyData } = useCollection<any>(messagesQuery);
  
  // Transform Firestore data to local Message type
  const history: Message[] = historyData ? historyData.map(doc => ({
      role: doc.role,
      content: doc.content,
      id: doc.id
  })) : [];

  // Initialization Effect
  useEffect(() => {
    const initChat = async () => {
        // Wait for data to load (handle null/undefined)
        if (!user || !firestore || !historyData) return;

        if (historyData.length === 0) {
            setIsLoading(true);
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const userName = user?.displayName?.split(' ')[0] || 'Friend';
            const greeting = `Hello ${userName}! I'm **ANEMO BOT**. I can answer your questions about anemia symptoms, prevention, and diet. How can I help you today?`;
            
            await addDoc(collection(firestore, `users/${user.uid}/chatHistory`), {
                role: 'assistant',
                content: greeting,
                createdAt: serverTimestamp()
            });
            setIsLoading(false);
        }
        setIsInitializing(false);
    };

    initChat();
  }, [user, firestore, historyData?.length]); // simplified dependency to length to avoid loops

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history.length, isLoading]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !user || !firestore) return;

    setUserInput('');
    setIsLoading(true);

    try {
      // 1. Save User Message
      await addDoc(collection(firestore, `users/${user.uid}/chatHistory`), {
          role: 'user',
          content: message,
          createdAt: serverTimestamp()
      });

      // 2. Get AI Response
      const result = await runAnswerAnemiaQuestion({
        question: message,
      });

      // 3. Save AI Message
      await addDoc(collection(firestore, `users/${user.uid}/chatHistory`), {
          role: 'assistant',
          content: result.answer,
          createdAt: serverTimestamp()
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
       let displayMessage = `I'm sorry, but I encountered an error. Please try again.`;
       
       // Handle known API errors gracefully
       if (errorMessage.includes('API key')) {
         displayMessage = "Configuration Error: Please check the API key."
       }

      // Save error message as assistant response so user sees it
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
      // Note: A true "clear" might involve deleting the collection or setting a 'hidden' flag.
      // For simplicity here, we'll just re-greet or maybe the user wants to *delete* history?
      // The prompt said "always save the chats do not remove".
      // So 'Clear' might just mean "Reset View" locally, but if we persist, it should probably reload.
      // If the requirement is "do not remove", we should probably hide/disable the Clear button or 
      // make it archive the session. 
      // For now, I'll keep the button but make it send a "System cleared" message or similar, 
      // OR actually delete if that's what "Clear" implies in UI, but the prompt says "do not remove".
      // I will DISABLE the clear button functionality for now to respect "always save".
      toast({ title: "History Preserved", description: "Chat history is saved securely." });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
  };
  
  const handleSampleQuestionClick = (question: string) => {
    sendMessage(question);
  };

  // Simple parser for bold text (**text**)
  const formatMessage = (content: string) => {
    const parts = content.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  const ChatHeader = () => (
    <CardHeader className="border-b p-3 flex flex-row items-center justify-between space-y-0 sticky top-0 bg-background/80 backdrop-blur-md z-10 shadow-sm">
      <div className='flex items-center gap-3'>
        <div className="relative">
            <div className="p-1.5 bg-primary rounded-full">
                <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-background rounded-full"></span>
        </div>
        <div className="flex flex-col">
            <span className="font-bold text-sm leading-none">Anemo Bot</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">AI Health Assistant</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        {isPopup && (
            <>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-muted" onClick={onMinimize}>
                    <Minus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-destructive/10 hover:text-destructive" onClick={onClose}>
                    <X className="h-4 w-4" />
                </Button>
            </>
        )}
        {!isPopup && (
             <Button variant="ghost" size="icon" onClick={handleClearChat} title="Clear Chat">
                <Trash2 className="h-4 w-4 text-muted-foreground" />
             </Button>
        )}
      </div>
    </CardHeader>
  )

  return (
    <GlassSurface intensity="high" className={cn("h-full", isPopup ? "border-0 shadow-none bg-background/90 backdrop-blur-xl" : "")}>
      <div className="flex flex-col h-full overflow-hidden">
        {!isPopup ? (
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-primary/10 rounded-full">
                  <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                  <CardTitle>ANEMO BOT</CardTitle>
                  <CardDescription>Ask me anything about anemia.</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleClearChat}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Clear
            </Button>
          </CardHeader>
        ) : <ChatHeader />}
        
        <CardContent className="p-0 flex-1 flex flex-col min-h-0 overflow-hidden bg-transparent">
          <ScrollArea className="flex-1 px-4 py-4 min-h-0">
            <div className="space-y-6">
            {history.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border border-primary/20 bg-background/50">
                        <AvatarFallback><Bot size={16} className="text-primary"/></AvatarFallback>
                    </Avatar>
                )}
                {msg.role === 'user' && (
                    <Avatar className="h-8 w-8 border border-border bg-background/50">
                        <AvatarFallback><User size={16} className="text-muted-foreground"/></AvatarFallback>
                    </Avatar>
                )}
                
                <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    msg.role === 'assistant' 
                        ? "bg-background/60 border border-border/50 text-foreground rounded-tl-none backdrop-blur-sm" 
                        : "bg-primary text-primary-foreground rounded-tr-none"
                )}>
                  <div className="whitespace-pre-wrap leading-relaxed">
                    {formatMessage(msg.content)}
                  </div>
                </div>
              </div>
            ))}
            
             {history.length === 1 && !isLoading && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <p className="text-xs font-medium text-muted-foreground">Suggested questions</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {sampleQuestions.map((q, i) => (
                    <Button 
                      key={i} 
                      variant="outline" 
                      className="text-left h-auto justify-start py-3 px-4 whitespace-normal font-normal bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-colors backdrop-blur-sm"
                      onClick={() => handleSampleQuestionClick(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {isLoading && (
              <div className="flex items-end gap-3">
                 <Avatar className="h-8 w-8 border border-primary/20 bg-background/50">
                    <AvatarFallback><Bot size={16} className="text-primary"/></AvatarFallback>
                </Avatar>
                <div className="rounded-2xl rounded-tl-none bg-background/60 border border-border/50 px-4 py-3 shadow-sm backdrop-blur-sm">
                  <div className="flex space-x-1.5 items-center h-5">
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                    <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce"></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <div className="p-4 bg-background/40 border-t backdrop-blur-md">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input 
                placeholder="Type your question..." 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                disabled={isLoading}
                className="flex-1 bg-background/50 focus-visible:bg-background transition-colors"
                aria-label="Your question about anemia"
            />
            <Button type="submit" size="icon" disabled={!userInput.trim() || isLoading} className="shrink-0 rounded-full w-10 h-10 shadow-sm" aria-label="Send message">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            </form>
        </div>
      </CardContent>
      </div>
    </GlassSurface>
  );
}
