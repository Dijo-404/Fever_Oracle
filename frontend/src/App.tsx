import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientRisk from "./pages/PatientRisk";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";
import Navigation from "./components/Navigation";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => {
  const DashboardLayout = ({ children }: { children: React.ReactNode }) => (
    <>
      <Navigation />
      {children}
    </>
  );

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ErrorBoundary>
                          <Dashboard />
                        </ErrorBoundary>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/patient-risk"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ErrorBoundary>
                          <PatientRisk />
                        </ErrorBoundary>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/alerts"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout>
                        <ErrorBoundary>
                          <Alerts />
                        </ErrorBoundary>
                      </DashboardLayout>
                    </ProtectedRoute>
                  }
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
