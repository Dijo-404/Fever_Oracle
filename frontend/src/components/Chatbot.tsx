import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
// import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Message {
  id: string;
  text: string;
  sender: "bot" | "user";
  timestamp: Date;
  question?: any;
  analysis?: any;
}

interface ChatbotProps {
  onComplete?: (analysis: any) => void;
}

export const Chatbot = ({ onComplete }: ChatbotProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<string>("start");
  const [sessionData, setSessionData] = useState<Record<string, any>>({});
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    startSession();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const startSession = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatbot/start-session`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('fever_oracle_auth') ? JSON.parse(localStorage.getItem('fever_oracle_auth')!).token : ''}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to start session');
      }
      
      const data = await response.json();
      
      setSessionId(data.session_id);
      if (data.next_question) {
        addMessage(data.next_question.question, "bot", data.next_question);
        setCurrentStep(data.next_question.key || "start");
      }
    } catch (err) {
      console.error("Error starting session:", err);
      setError("Failed to start chatbot session");
    } finally {
      setLoading(false);
    }
  };

  const addMessage = (text: string, sender: "bot" | "user", question?: any, analysis?: any) => {
    const message: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
      question,
      analysis,
    };
    setMessages((prev) => [...prev, message]);
  };

  const handleSend = async () => {
    if (!input.trim() || loading || completed || !sessionId) return;

    const userMessage = input.trim();
    setInput("");
    addMessage(userMessage, "user");

    try {
      setLoading(true);
      setError(null);

      const auth = localStorage.getItem('fever_oracle_auth');
      const token = auth ? JSON.parse(auth).token : '';

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatbot/message`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: userMessage,
          current_step: currentStep,
          session_data: sessionData,
        }),
      });
      
      if (!res.ok) {
        throw new Error('Failed to send message');
      }
      
      const response = await res.json();

      // Update session data
      if (response.session_data) {
        setSessionData(response.session_data);
      }

      // Update current step
      if (response.next_question) {
        setCurrentStep(response.next_question.key || "");
        addMessage(response.message, "bot", response.next_question);
      } else if (response.completed && response.analysis) {
        setCompleted(true);
        addMessage(response.message, "bot", undefined, response.analysis);
        
        // Submit report
        try {
          const auth = localStorage.getItem('fever_oracle_auth');
          const token = auth ? JSON.parse(auth).token : '';
          
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chatbot/submit-report`, {
            method: "POST",
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              session_id: sessionId,
              session_data: sessionData,
              analysis: response.analysis,
            }),
          });
        } catch (err) {
          console.error("Error submitting report:", err);
        }

        if (onComplete) {
          onComplete(response.analysis);
        }
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
    } finally {
      setLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleChoice = (choice: string) => {
    setInput(choice);
    setTimeout(() => handleSend(), 100);
  };

  const handleMultiChoice = (option: string) => {
    const current = sessionData[currentStep] || [];
    const updated = current.includes(option)
      ? current.filter((o: string) => o !== option)
      : [...current, option];
    setSessionData({ ...sessionData, [currentStep]: updated });
  };

  const renderQuestionOptions = (question: any) => {
    if (!question) return null;

    if (question.type === "yes_no") {
      return (
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" onClick={() => handleChoice("Yes")}>
            Yes
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleChoice("No")}>
            No
          </Button>
        </div>
      );
    }

    if (question.type === "choice" && question.options) {
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {question.options.map((option: string) => (
            <Button
              key={option}
              size="sm"
              variant="outline"
              onClick={() => handleChoice(option)}
            >
              {option}
            </Button>
          ))}
        </div>
      );
    }

    if (question.type === "multi_choice" && question.options) {
      const selected = sessionData[currentStep] || [];
      return (
        <div className="flex flex-wrap gap-2 mt-2">
          {question.options.map((option: string) => (
            <Button
              key={option}
              size="sm"
              variant={selected.includes(option) ? "default" : "outline"}
              onClick={() => handleMultiChoice(option)}
            >
              {option}
              {selected.includes(option) && " ✓"}
            </Button>
          ))}
          {selected.length > 0 && (
            <Button
              size="sm"
              className="ml-auto"
              onClick={() => {
                setSessionData({ ...sessionData, [currentStep]: selected });
                handleSend();
              }}
            >
              Continue
            </Button>
          )}
        </div>
      );
    }

    return null;
  };

  const renderAnalysis = (analysis: any) => {
    if (!analysis) return null;

    return (
      <div className="mt-4 p-4 bg-muted rounded-lg space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Suspected Fever Type:</span>
          <Badge variant="outline">{analysis.suspected_fever_type}</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="font-semibold">Risk Score:</span>
          <Badge
            variant={
              analysis.risk_score > 70
                ? "destructive"
                : analysis.risk_score > 50
                ? "default"
                : "secondary"
            }
          >
            {analysis.risk_score}/100
          </Badge>
        </div>
        {analysis.confidence && (
          <div className="flex items-center justify-between">
            <span className="font-semibold">Confidence:</span>
            <span>{analysis.confidence}%</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          Symptom Checker Chatbot
        </CardTitle>
        <CardDescription>
          Answer a few questions to get a preliminary assessment
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex-1 pr-4 overflow-y-auto" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.sender === "bot" && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  {message.question && renderQuestionOptions(message.question)}
                  {message.analysis && renderAnalysis(message.analysis)}
                </div>
                {message.sender === "user" && (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg p-3">
                  <Loader2 className="h-4 w-4 animate-spin" />
                </div>
              </div>
            )}
          </div>
        </div>

        {!completed && (
          <div className="mt-4 flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your answer..."
              disabled={loading}
            />
            <Button onClick={handleSend} disabled={loading || !input.trim()}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}

        {completed && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
            <p className="text-sm text-muted-foreground">
              Assessment complete. Report has been saved.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Chatbot;

