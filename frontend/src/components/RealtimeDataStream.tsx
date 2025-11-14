import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertCircle } from "lucide-react";

interface StreamMessage {
  topic: string;
  data: any;
  timestamp: Date;
}

export const RealtimeDataStream = () => {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/kafka/latest-data?topics=wastewater,pharmacy,alerts,vitals,patients,outbreak');
        if (!response.ok) {
          const errorText = await response.text();
          // Check if response is HTML (error page)
          if (errorText.trim().startsWith('<!')) {
            throw new Error('Backend server error - received HTML instead of JSON');
          }
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Invalid response format - expected JSON');
        }
        const data = await response.json();
        
        // Add new messages to the stream
        const newMessages: StreamMessage[] = [];
        Object.entries(data.data || {}).forEach(([topic, values]: [string, any]) => {
          if (Array.isArray(values)) {
            values.forEach((v: any) => {
              newMessages.push({
                topic: topic.replace('fever-oracle-', ''),
                data: v,
                timestamp: new Date()
              });
            });
          }
        });
        
        if (newMessages.length > 0) {
          setIsActive(true);
          setMessages(prev => [...newMessages, ...prev].slice(0, 50)); // Keep last 50
        }
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load real-time data');
        setIsActive(false);
        console.error('Failed to fetch real-time data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 3000); // Update every 3 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  const formatMessage = (msg: StreamMessage) => {
    const dataStr = JSON.stringify(msg.data);
    if (dataStr.length > 100) {
      return dataStr.substring(0, 100) + '...';
    }
    return dataStr;
  };

  const getTopicColor = (topic: string) => {
    const colors: Record<string, string> = {
      'wastewater': 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      'pharmacy': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
      'alerts': 'bg-red-500/10 text-red-600 border-red-500/20',
      'vitals': 'bg-green-500/10 text-green-600 border-green-500/20',
      'patients': 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      'outbreak': 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    };
    return colors[topic] || 'bg-muted text-foreground border-border';
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className={`h-5 w-5 ${isActive ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
          Real-time Data Stream
        </CardTitle>
        <CardDescription>
          Live messages from Kafka topics (updates every 3 seconds)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading stream data...</div>
        ) : error ? (
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">
            No messages received yet. Make sure Kafka producer is running.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col gap-2 p-3 rounded-lg border ${getTopicColor(msg.topic)} transition-all animate-in slide-in-from-right`}
              >
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-mono">
                    {msg.topic}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {msg.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                  {formatMessage(msg)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

