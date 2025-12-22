'use client';

/**
 * Admin Authentication Context
 * Manages authentication state, token storage, and session validation
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface AdminUser {
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: {
    canControlBot: boolean;
    canModifyConfig: boolean;
    canExecuteTrades: boolean;
    canViewLogs: boolean;
    canViewMetrics: boolean;
  };
}

interface AdminAuthContextType {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  verifySession: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

/**
 * Admin Authentication Provider
 */
export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Verify session on mount and periodically
   */
  useEffect(() => {
    verifySession();

    // Verify session every 5 minutes
    const interval = setInterval(() => {
      verifySession();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Verify current session
   */
  const verifySession = async (): Promise<boolean> => {
    try {
      const token = localStorage.getItem('admin_access_token');

      if (!token) {
        setUser(null);
        setIsLoading(false);
        return false;
      }

      const response = await fetch('/api/admin/auth/verify', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.authenticated && data.user) {
        setUser(data.user);
        setIsLoading(false);
        return true;
      } else {
        // Session invalid or expired
        localStorage.removeItem('admin_access_token');
        localStorage.removeItem('admin_refresh_token');
        localStorage.removeItem('admin_user');
        setUser(null);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Session verification error:', error);
      setUser(null);
      setIsLoading(false);
      return false;
    }
  };

  /**
   * Login
   */
  const login = async (username: string, password: string): Promise<void> => {
    try {
      const response = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success && data.accessToken) {
        // Store tokens
        localStorage.setItem('admin_access_token', data.accessToken);
        localStorage.setItem('admin_refresh_token', data.refreshToken || '');
        localStorage.setItem('admin_user', JSON.stringify(data.user));

        // Update state
        setUser(data.user);
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  /**
   * Logout
   */
  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem('admin_access_token');

      if (token) {
        // Call logout API
        await fetch('/api/admin/auth/logout', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }

      // Clear local storage
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');

      // Update state
      setUser(null);

      // Redirect to login
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local storage anyway
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
      localStorage.removeItem('admin_user');
      setUser(null);
      router.push('/admin/login');
    }
  };

  const value: AdminAuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    verifySession,
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

/**
 * Hook to use admin auth context
 */
export function useAdminAuth() {
  const context = useContext(AdminAuthContext);

  if (context === undefined) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }

  return context;
}

/**
 * Higher-order component to protect admin routes
 */
export function withAdminAuth<P extends object>(
  Component: React.ComponentType<P>
): React.FC<P> {
  return function ProtectedRoute(props: P) {
    const { isAuthenticated, isLoading } = useAdminAuth();
    const router = useRouter();

    useEffect(() => {
      if (!isLoading && !isAuthenticated) {
        router.push('/admin/login');
      }
    }, [isAuthenticated, isLoading, router]);

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
            <p className="text-gray-300">Loading...</p>
          </div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return null;
    }

    return <Component {...props} />;
  };
}
