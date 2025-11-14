import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Activity, Shield, TrendingUp, Users, Database, Network, Clock, AlertTriangle } from "lucide-react";

const Index = () => {
  const stats = [
    { value: "87%", label: "Outbreak Prediction Accuracy", sublabel: "10-14 day forecast window" },
    { value: "3.2x", label: "Faster Detection", sublabel: "vs. traditional surveillance" },
    { value: "142", label: "Active Patient Monitors", sublabel: "Across 8 institutions" },
    { value: "99.7%", label: "Model Uptime", sublabel: "Last 90 days" }
  ];

  const features = [
    {
      icon: TrendingUp,
      title: "Multi-Modal Signal Fusion",
      description: "Wastewater viral load assays, pharmacy OTC sales data, and climate patterns analyzed through LightGBM ensemble models",
      tech: "Python • LightGBM • Time-series forecasting"
    },
    {
      icon: Users,
      title: "GRU-Based Risk Trajectories",
      description: "Recurrent neural networks simulate patient-specific fever progression under different intervention scenarios",
      tech: "PyTorch • Sequential modeling • SHAP"
    },
    {
      icon: Network,
      title: "Federated Learning Protocol",
      description: "Privacy-preserving model training across institutions without centralizing sensitive patient data",
      tech: "Differential privacy • Encrypted gradients"
    },
    {
      icon: Shield,
      title: "HIPAA-Compliant Architecture",
      description: "End-to-end encryption, audit logging, and granular access controls for protected health information",
      tech: "AES-256 • Role-based access • SOC 2"
    },
    {
      icon: Database,
      title: "Real-Time Data Pipeline",
      description: "Automated ingestion from heterogeneous sources with data validation and quality checks",
      tech: "Apache Kafka • PostgreSQL • Redis cache"
    },
    {
      icon: Clock,
      title: "Low-Latency Inference",
      description: "Sub-second prediction updates optimized for clinical decision-making workflows",
      tech: "Docker • Kubernetes • Load balancing"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="border-b bg-card">
        <div className="container mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
              <Activity className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <h1 className="text-3xl sm:text-4xl font-bold text-foreground">FEVER ORACLE</h1>
            </div>
            
            <p className="text-lg sm:text-xl text-foreground mb-4">
              Predictive clinical intelligence platform for early outbreak detection and patient risk assessment
            </p>
            
            <p className="text-sm sm:text-base text-muted-foreground mb-6 sm:mb-8 leading-relaxed">
              FEVER ORACLE fuses wastewater surveillance data, pharmacy sales patterns, and environmental signals 
              through lightweight ML models (LightGBM, GRU networks) to forecast fever outbreaks 10-14 days in advance. 
              Sequential modeling provides individualized patient risk trajectories with transparent feature attribution.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <Link to="/login">
                <Button size="lg" className="w-full sm:w-auto">
                  Login to Dashboard
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Access Alert System
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>HIPAA/GDPR Compliant</span>
              </div>
              <div className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                <span>Federated Learning</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Real-Time Alerts</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-8 sm:py-12 border-b">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {stats.map((stat, idx) => (
              <div key={idx}>
                <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                <div className="text-sm font-medium text-foreground mb-1">{stat.label}</div>
                <div className="text-xs text-muted-foreground">{stat.sublabel}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technical Capabilities */}
      <section className="py-12 sm:py-16">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="mb-8 sm:mb-12">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Technical Architecture</h2>
            <p className="text-sm sm:text-base text-muted-foreground">
              Modular components with documented APIs and integrated testing
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, idx) => {
              const Icon = feature.icon;
              return (
                <Card key={idx} className="border hover:border-primary/50 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                        <Icon className="h-5 w-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground mb-2">
                          {feature.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                          {feature.description}
                        </p>
                        <div className="text-xs font-mono text-muted-foreground bg-muted px-2 py-1 rounded inline-block">
                          {feature.tech}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Deployment Info */}
      <section className="py-12 sm:py-16 border-t bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="max-w-3xl">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-4">Deployment & Integration</h2>
            <div className="space-y-4 text-sm sm:text-base text-muted-foreground">
              <p>
                <strong className="text-foreground">Containerized Architecture:</strong> Docker containers orchestrated 
                via Docker Compose for rapid local development. Cloud-scalable design supports multi-city rollouts.
              </p>
              <p>
                <strong className="text-foreground">Data Pipeline:</strong> Automated ingestion for heterogeneous feeds. 
                Synthetic data generators available for development phases under limited real data conditions.
              </p>
              <p>
                <strong className="text-foreground">API Documentation:</strong> OpenAPI-compliant REST endpoints with 
                autogenerated docs. Integrated unit testing ensures maintainability and extensibility.
              </p>
              <div className="flex gap-4 pt-4">
                <Link to="/login">
                  <Button>Login to Platform</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline">Access Alert System</Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span className="font-semibold">FEVER ORACLE</span>
              <span className="hidden md:inline">•</span>
              <span className="hidden md:inline">Predictive Clinical Intelligence v1.0</span>
            </div>
            <div className="flex gap-4">
              <span>Privacy-preserving architecture</span>
              <span>•</span>
              <span>HIPAA/GDPR compliant</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
