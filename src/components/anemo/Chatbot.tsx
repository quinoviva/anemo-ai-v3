'use client';

import React, { useState, useRef, useEffect } from 'react';
import { runAnswerAnemiaQuestion } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Bot, User, Send, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

type Message = { role: 'user' | 'assistant'; content: string };
type ChatbotProps = {
  isPopup?: boolean;
}

const sampleQuestions = [
  "What is anemia?",
  "Ano ang mga sintomas ng anemia?",
  "What are the common treatments?",
  "Is anemia dangerous?",
];

export function Chatbot({ isPopup = false }: ChatbotProps) {
  const [history, setHistory] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I am ChatbotAI. How can I help you with your questions about anemia?" },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
        scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [history]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(userInput);
  };
  
  const handleSampleQuestionClick = (question: string) => {
    sendMessage(question);
  };


  const ChatHeader = () => (
    <CardHeader className="border-b">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Bot className="h-6 w-6 text-primary" />
        ChatbotAI
      </CardTitle>
      {isPopup && (
        <CardDescription className="text-xs">
          Your friendly anemia info assistant.
        </CardDescription>
      )}
    </CardHeader>
  )

  return (
    <Card className={cn("h-full flex flex-col", isPopup ? "border-0 shadow-none" : "")}>
      {!isPopup ? (
         <CardHeader>
          <CardTitle className="flex items-center gap-2">
            ChatbotAI
          </CardTitle>
            <CardDescription>
              Ask me anything about anemia.
            </CardDescription>
        </CardHeader>
      ) : <ChatHeader />}
      <CardContent className="p-4 flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-grow mb-4" ref={scrollAreaRef}>
          <div className="space-y-4 pr-4">
            {history.map((msg, i) => (
              <div key={i} className={cn("flex items-start gap-3", msg.role === 'user' ? "justify-end" : "justify-start")}>
                {msg.role === 'assistant' && <Avatar className="h-8 w-8 bg-primary text-primary-foreground"><AvatarFallback><Bot size={18}/></AvatarFallback></Avatar>}
                <div className={cn("max-w-[80%] rounded-lg p-3 text-sm", msg.role === 'assistant' ? "bg-muted" : "bg-primary text-primary-foreground")}>
                  {msg.content}
                </div>
                {msg.role === 'user' && <Avatar className="h-8 w-8"><AvatarFallback><User size={18}/></AvatarFallback></Avatar>}
              </div>
            ))}
             {history.length === 1 && !isLoading && (
              <div className="pt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Or try one of these sample questions:</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {sampleQuestions.map((q, i) => (
                    <Button 
                      key={i} 
                      variant="outline" 
                      size="sm" 
                      className="text-left h-auto justify-start whitespace-normal"
                      onClick={() => handleSampleQuestionClick(q)}
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}
            {isLoading && history.length > 1 && (
              <div className="flex items-start gap-3 justify-start">
                 <Avatar className="h-8 w-8 bg-primary text-primary-foreground"><AvatarFallback><Bot size={18}/></AvatarFallback></Avatar>
                <div className="rounded-lg p-3 bg-muted flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s] mx-1"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t pt-4">
          <Input 
            placeholder="Type your question..." 
            value={userInput} 
            onChange={(e) => setUserInput(e.target.value)} 
            disabled={isLoading}
            aria-label="Your question about anemia"
          />
          <Button type="submit" size="icon" disabled={!userInput.trim() || isLoading} aria-label="Send message">
            <Send size={16} />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
