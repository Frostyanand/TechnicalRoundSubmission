// src/context/authContext.js
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { authClient, app } from '../lib/firebase/firebaseClient';

// Only use auth if app is initialized (client-side only)
const auth = authClient;
const googleProvider = new GoogleAuthProvider();

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Only set up auth listener if auth is available (client-side)
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Make sure you are on the client side.');
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error signing in with Google:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Make sure you are on the client side.');
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    loginWithGoogle,
    logout,
    email: user?.email || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

