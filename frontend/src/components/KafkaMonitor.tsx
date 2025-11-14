import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, TrendingUp, Database, AlertCircle } from "lucide-react";

interface TopicStats {
  name: string;
  messages_per_minute: number;
  total_messages: number;
  status: "active" | "idle";
}

interface KafkaStats {
  topics: TopicStats[];
  total_throughput: number;
  consumer_lag: number;
}

export const KafkaMonitor = () => {
  const [stats, setStats] = useState<KafkaStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/kafka/stats');
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
        setStats(data);
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Kafka stats';
        setError(errorMessage);
        console.error('Failed to fetch Kafka stats:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000); // Update every 5 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Kafka Data Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading Kafka statistics...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Kafka Data Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Kafka Data Pipeline
        </CardTitle>
        <CardDescription>Real-time message throughput and topic statistics</CardDescription>
      </CardHeader>
      <CardContent>
        {stats && (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Total Throughput</span>
              </div>
              <Badge variant="outline" className="text-lg font-semibold">
                {stats.total_throughput} msg/min
              </Badge>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground mb-3">Topic Statistics</h4>
              {stats.topics.map(topic => (
                <div key={topic.name} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Activity 
                      className={`h-4 w-4 flex-shrink-0 ${
                        topic.status === 'active' 
                          ? 'text-green-500 animate-pulse' 
                          : 'text-muted-foreground'
                      }`} 
                    />
                    <span className="text-sm font-medium truncate">
                      {topic.name.replace('fever-oracle-', '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Rate</div>
                      <span className="text-sm font-semibold">{topic.messages_per_minute}/min</span>
                    </div>
                    <Badge variant={topic.status === 'active' ? 'default' : 'outline'} className="text-xs">
                      {topic.total_messages.toLocaleString()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

