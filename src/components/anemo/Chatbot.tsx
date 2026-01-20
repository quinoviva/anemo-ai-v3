import React, { useState, useRef, useEffect } from 'react';
import { runAnswerAnemiaQuestion } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useUser } from '@/firebase';
import { Bot, User, Send, Loader2, Sparkles, Trash2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = { role: 'user' | 'assistant'; content: string };
type ChatbotProps = {
  isPopup?: boolean;
}

const sampleQuestions = [
  "What are the signs of anemia?",
  "Anong pagkain ang mayaman sa iron?",
  "Is dizziness a symptom?",
  "How can I prevent anemia?",
];

export function Chatbot({ isPopup = false }: ChatbotProps) {
  const { user } = useUser();
  const [history, setHistory] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const userName = user?.displayName?.split(' ')[0] || 'Friend';
    setHistory([
      { role: 'assistant', content: `Hello ${userName}! I'm **ANEMO BOT**. I can answer your questions about anemia symptoms, prevention, and diet. How can I help you today?` },
    ]);
  }, [user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history, isLoading]);

  const sendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const newHistory: Message[] = [...history, { role: 'user', content: message }];
    setHistory(newHistory);
    setUserInput('');
    setIsLoading(true);

    try {
      const result = await runAnswerAnemiaQuestion({
        question: message,
      });

      setHistory(prev => [...prev, { role: 'assistant', content: result.answer }]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
       let displayMessage = `I'm sorry, but I encountered an error. Please try again.`;
       if (errorMessage.includes('API key not valid')) {
         displayMessage = "It seems there's an issue with the configuration. Please ensure you have a valid API key in your .env file."
       } else if (errorMessage.includes("GEMINI_API_KEY") || errorMessage.includes("GoogleGenerativeAI")) {
        displayMessage = "The AI service is not configured correctly. Please check the API key."
       }

      setHistory(prev => [...prev, { role: 'assistant', content: displayMessage }]);
      toast({
        title: "Chat Error",
        description: displayMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    const userName = user?.displayName?.split(' ')[0] || 'Friend';
    setHistory([
        { role: 'assistant', content: `Hello ${userName}! Chat cleared. How can I help you now?` },
    ]);
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
    <CardHeader className="border-b p-4 flex flex-row items-center justify-between space-y-0 sticky top-0 bg-background z-10">
      <div className='flex items-center gap-2'>
        <div className="p-2 bg-primary/10 rounded-full">
            <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
            <CardTitle className="text-base">ANEMO BOT</CardTitle>
            {isPopup && <CardDescription className="text-xs">AI Health Assistant</CardDescription>}
        </div>
      </div>
      <Button variant="ghost" size="icon" onClick={handleClearChat} title="Clear Chat">
        <Trash2 className="h-4 w-4 text-muted-foreground" />
      </Button>
    </CardHeader>
  )

  if (history.length === 0) {
    return (
        <Card className={cn("h-full flex flex-col items-center justify-center", isPopup ? "border-0 shadow-none" : "")}>
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </Card>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col overflow-hidden", isPopup ? "border-0 shadow-none" : "")}>
      {!isPopup ? (
         <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
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
      
      <CardContent className="p-0 flex-1 flex flex-col overflow-hidden bg-muted/5">
        <ScrollArea className="flex-grow px-4 py-4">
          <div className="space-y-6">
            {history.map((msg, i) => (
              <div key={i} className={cn("flex gap-3", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                {msg.role === 'assistant' && (
                    <Avatar className="h-8 w-8 border border-primary/20 bg-background">
                        <AvatarFallback><Bot size={16} className="text-primary"/></AvatarFallback>
                    </Avatar>
                )}
                {msg.role === 'user' && (
                    <Avatar className="h-8 w-8 border border-border bg-background">
                        <AvatarFallback><User size={16} className="text-muted-foreground"/></AvatarFallback>
                    </Avatar>
                )}
                
                <div className={cn(
                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm",
                    msg.role === 'assistant' 
                        ? "bg-background border border-border/50 text-foreground rounded-tl-none" 
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
                      className="text-left h-auto justify-start py-3 px-4 whitespace-normal font-normal bg-background hover:bg-primary/5 hover:border-primary/30 transition-colors"
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
                 <Avatar className="h-8 w-8 border border-primary/20 bg-background">
                    <AvatarFallback><Bot size={16} className="text-primary"/></AvatarFallback>
                </Avatar>
                <div className="rounded-2xl rounded-tl-none bg-background border border-border/50 px-4 py-3 shadow-sm">
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
        
        <div className="p-4 bg-background border-t">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input 
                placeholder="Type your question..." 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                disabled={isLoading}
                className="flex-1 bg-muted/30 focus-visible:bg-background transition-colors"
                aria-label="Your question about anemia"
            />
            <Button type="submit" size="icon" disabled={!userInput.trim() || isLoading} className="shrink-0 rounded-full w-10 h-10 shadow-sm" aria-label="Send message">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
            </form>
        </div>
      </CardContent>
    </Card>
  );
}
