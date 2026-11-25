import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import {
  api,
  extractApiError,
  setInMemoryAuthToken,
  setInMemoryGuestChatToken,
} from '../services/api';
import type { User } from '../types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<User>;
  registerWithEmail: (params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setInMemoryAuthToken(idToken);
          const res = await api.post<{ user: User }>(
            '/auth/firebase-sync',
            {},
            { headers: { Authorization: `Bearer ${idToken}` } }
          );
          setUser(res.data.user);
        } catch (err) {
          console.error('Firebase session sync error:', err);
          setInMemoryAuthToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, password: string): Promise<User> => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', {
      email,
      password,
    });
    setInMemoryAuthToken(res.data.token);
    setInMemoryGuestChatToken(null);
    setUser(res.data.user);
    return res.data.user;
  };

  const registerWithEmail = async (params: {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<User> => {
    const res = await api.post<{ token: string; user: User }>('/auth/register', params);
    setInMemoryAuthToken(res.data.token);
    setInMemoryGuestChatToken(null);
    setUser(res.data.user);
    return res.data.user;
  };

  const loginWithGoogle = async (): Promise<User> => {
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      setInMemoryAuthToken(idToken);
      setInMemoryGuestChatToken(null);
      const res = await api.post<{ user: User }>(
        '/auth/firebase-sync',
        {},
        { headers: { Authorization: `Bearer ${idToken}` } }
      );
      setUser(res.data.user);
      return res.data.user;
    } catch (err) {
      throw new Error(extractApiError(err, 'Google Sign-In failed. Please try again.'));
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout').catch(() => undefined);
      if (auth.currentUser) {
        await firebaseSignOut(auth);
      }
    } finally {
      setInMemoryAuthToken(null);
      setInMemoryGuestChatToken(null);
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      if (auth.currentUser) {
        const freshToken = await auth.currentUser.getIdToken(true);
        setInMemoryAuthToken(freshToken);
      }
      const res = await api.get<{ user: User }>('/auth/me');
      setUser(res.data.user);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
