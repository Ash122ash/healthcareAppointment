import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserRole } from '@medisync/shared';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Silent refresh on mount
  useEffect(() => {
    refreshAccessToken()
      .catch(() => {
        // Silently catch error, user is just not logged in
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function refreshAccessToken(): Promise<string> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Important: Include credentials so cookie is sent
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Refresh token expired or invalid');
      }

      const data = await response.json();
      setAccessToken(data.accessToken);

      // Fetch user profile
      const profileResponse = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${data.accessToken}`,
        },
      });

      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        setUser(profileData.user);
      }

      return data.accessToken;
    } catch (err) {
      setUser(null);
      setAccessToken(null);
      throw err;
    }
  }

  // Wrapper for all authenticated API requests
  async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    const mergedOptions: RequestInit = {
      ...options,
      headers,
      credentials: 'include', // ensures cookies are sent/received
    };

    let response = await fetch(`${API_BASE}${path}`, mergedOptions);

    // If access token expired, try to refresh and retry once
    if (response.status === 401 && accessToken) {
      try {
        const newToken = await refreshAccessToken();
        headers.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(`${API_BASE}${path}`, {
          ...mergedOptions,
          headers,
        });
      } catch (err) {
        // Refresh failed, clear state (logs user out)
        setUser(null);
        setAccessToken(null);
      }
    }

    return response;
  }

  async function login(email: string, password: string): Promise<User> {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    setAccessToken(data.accessToken);
    setUser(data.user);
    return data.user;
  }

  async function register(email: string, password: string, name: string, phone?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, phone }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }
  }

  async function logout(): Promise<void> {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error on backend:', err);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
