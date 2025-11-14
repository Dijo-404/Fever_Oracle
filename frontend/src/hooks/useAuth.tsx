import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedAuth = localStorage.getItem("fever_oracle_auth");
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        if (authData.isAuthenticated && authData.username) {
          setIsAuthenticated(true);
          setUsername(authData.username);
        }
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem("fever_oracle_auth");
      }
    }
  }, []);

  const login = (username: string) => {
    setIsAuthenticated(true);
    setUsername(username);
    localStorage.setItem(
      "fever_oracle_auth",
      JSON.stringify({ isAuthenticated: true, username })
    );
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUsername(null);
    localStorage.removeItem("fever_oracle_auth");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

