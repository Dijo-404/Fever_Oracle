import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Play, RefreshCw, TrendingUp, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface PredictionResult {
  risk_level: 'high' | 'medium' | 'low';
  risk_score: number;
  confidence: number;
  factors: {
    wastewater_trend: string;
    pharmacy_trend: string;
  };
  timestamp: string;
}

export const ModelPredictions = () => {
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runPrediction = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First fetch latest Kafka data
      const dataResponse = await fetch('/api/kafka/latest-data?topics=wastewater,pharmacy');
      if (!dataResponse.ok) {
        const errorText = await dataResponse.text();
        if (errorText.trim().startsWith('<!')) {
          throw new Error('Backend server error - received HTML instead of JSON');
        }
        throw new Error(`Failed to fetch Kafka data: ${errorText}`);
      }
      const contentType = dataResponse.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid response format - expected JSON');
      }
      const kafkaData = await dataResponse.json();

      // Then run prediction
      const predictionResponse = await fetch('/api/model/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(kafkaData.data || {}),
      });

      if (!predictionResponse.ok) {
        const errorText = await predictionResponse.text();
        if (errorText.trim().startsWith('<!')) {
          throw new Error('Backend server error - received HTML instead of JSON');
        }
        throw new Error(`Failed to run prediction: ${errorText}`);
      }
      const predContentType = predictionResponse.headers.get('content-type');
      if (!predContentType || !predContentType.includes('application/json')) {
        throw new Error('Invalid response format - expected JSON');
      }

      const result = await predictionResponse.json();
      setPrediction(result);
      toast.success('Prediction completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run prediction';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Prediction error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAutoRunning) {
      runPrediction();
      const interval = setInterval(runPrediction, 30000); // Run every 30 seconds
      return () => clearInterval(interval);
    }
  }, [isAutoRunning, runPrediction]);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      default:
        return 'bg-success text-success-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Model Predictions
        </CardTitle>
        <CardDescription>
          ML model predictions based on real-time Kafka data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            onClick={runPrediction}
            disabled={isLoading}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Prediction
              </>
            )}
          </Button>
          <Button
            variant={isAutoRunning ? "destructive" : "outline"}
            onClick={() => setIsAutoRunning(!isAutoRunning)}
          >
            {isAutoRunning ? "Stop Auto" : "Auto Run"}
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {prediction && (
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Level</span>
                <Badge className={getRiskColor(prediction.risk_level)}>
                  {prediction.risk_level.toUpperCase()}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Risk Score</span>
                <span className="text-2xl font-bold">{prediction.risk_score.toFixed(1)}</span>
              </div>

              <div className="relative h-2 bg-muted-foreground/20 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    prediction.risk_score > 70
                      ? 'bg-destructive'
                      : prediction.risk_score > 40
                      ? 'bg-warning'
                      : 'bg-success'
                  }`}
                  style={{ width: `${prediction.risk_score}%` }}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Confidence</span>
                <Badge variant="outline">{prediction.confidence}%</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Contributing Factors
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Wastewater Trend</div>
                  <div className="text-sm font-medium capitalize">
                    {prediction.factors.wastewater_trend}
                  </div>
                </div>
                <div className="p-2 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Pharmacy Trend</div>
                  <div className="text-sm font-medium capitalize">
                    {prediction.factors.pharmacy_trend}
                  </div>
                </div>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              Last updated: {new Date(prediction.timestamp).toLocaleString()}
            </div>
          </div>
        )}

        {!prediction && !error && !isLoading && (
          <div className="text-center py-8 text-muted-foreground">
            <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Click "Run Prediction" to analyze Kafka data</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

