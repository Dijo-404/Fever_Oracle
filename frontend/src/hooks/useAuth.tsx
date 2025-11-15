import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface User {
  id: string;
  email: string;
  role: 'patient' | 'doctor' | 'pharma' | 'admin';
  full_name?: string;
  location?: string;
  verified: boolean;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, role: string, fullName?: string, phone?: string, location?: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Check if user is already logged in (from localStorage)
  useEffect(() => {
    const storedAuth = localStorage.getItem("fever_oracle_auth");
    if (storedAuth) {
      try {
        const authData = JSON.parse(storedAuth);
        if (authData.token && authData.user) {
          setToken(authData.token);
          setUser(authData.user);
          setIsAuthenticated(true);
          
          // Verify token is still valid by fetching user info
          fetchCurrentUser(authData.token).catch(() => {
            // Token invalid, clear auth
            logout();
          });
        }
      } catch (error) {
        localStorage.removeItem("fever_oracle_auth");
      }
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch user');
    }
    
    const data = await response.json();
    return data.user;
  };

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    const { tokens, user: userData } = data;
    
    setToken(tokens.access_token);
    setUser(userData);
    setIsAuthenticated(true);
    
    localStorage.setItem(
      "fever_oracle_auth",
      JSON.stringify({
        token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        user: userData
      })
    );
  };

  const register = async (email: string, password: string, role: string, fullName?: string, phone?: string, location?: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email,
        password,
        role,
        full_name: fullName,
        phone,
        location
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    return data;
  };

  const refreshToken = async () => {
    const storedAuth = localStorage.getItem("fever_oracle_auth");
    if (!storedAuth) {
      throw new Error('No refresh token available');
    }

    const authData = JSON.parse(storedAuth);
    const refresh_token = authData.refresh_token;

    const response = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const { tokens } = data;
    
    setToken(tokens.access_token);
    
    localStorage.setItem(
      "fever_oracle_auth",
      JSON.stringify({
        ...authData,
        token: tokens.access_token,
        refresh_token: tokens.refresh_token
      })
    );
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    localStorage.removeItem("fever_oracle_auth");
  };

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      token,
      login, 
      register,
      logout,
      refreshToken
    }}>
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
