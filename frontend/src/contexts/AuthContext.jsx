import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuth = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      const currentRefreshToken = localStorage.getItem('refresh_token');
      if (currentRefreshToken) {
        await authApi.logout(currentRefreshToken);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  }, [clearAuth]);

  useEffect(() => {
    const initAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      const storedRefreshToken = localStorage.getItem('refresh_token');

      if (accessToken && storedRefreshToken) {
        try {
          const data = await authApi.getStatus();
          if (data.success) {
            setUser(data.user);
          }
        } catch (error) {
          console.error('Failed to verify token:', error);
          clearAuth();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, [clearAuth]);

  const login = async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      if (data.success) {
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        setUser(data.user);
        return { success: true, user: data.user };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const register = async (email, password, name, phone, role = 'staff') => {
    try {
      const data = await authApi.register(email, password, name, phone, role);
      if (data.success) {
        return { success: true, message: data.message, user: data.user };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const refreshAccessToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refresh_token');
      if (!storedRefreshToken) {
        throw new Error('No refresh token available');
      }

      const data = await authApi.refreshToken(storedRefreshToken);
      if (data.success) {
        localStorage.setItem('access_token', data.accessToken);
        localStorage.setItem('refresh_token', data.refreshToken);
        return data.accessToken;
      }
      throw new Error('Failed to refresh token');
    } catch (error) {
      console.error('Token refresh error:', error);
      logout();
      throw error;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const data = await authApi.changePassword(currentPassword, newPassword);
      if (data.success) {
        setUser({ ...user, mustChangePassword: false });
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const data = await authApi.forgotPassword(email);
      if (data.success) {
        return { success: true, message: data.message, resetToken: data.resetToken };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      const data = await authApi.resetPassword(token, newPassword);
      if (data.success) {
        return { success: true, message: data.message };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshAccessToken,
    changePassword,
    forgotPassword,
    resetPassword,
    isAuthenticated: !!user,
    isAdmin: user?.isAdmin || false,
    isManager: user?.role === 'manager' || user?.role === 'admin',
    isStaff: user?.role === 'staff',
    mustChangePassword: user?.mustChangePassword || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
