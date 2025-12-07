// Provides auth context across app , helps prevent making layout.js a client component
// src/lib/providers.js


'use client';
// Import AuthProvider
import { AuthProvider } from '../context/authContext';

// Create a component that wraps all necessary providers
export default function Providers({ children }) {
  // Wrap all client-side contexts here
  return (
    <AuthProvider>
      {children}
    </AuthProvider>
  );
}