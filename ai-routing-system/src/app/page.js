'use client';

import { useAuth } from '../context/authContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the chat window to avoid SSR issues
const AIChatWindow = dynamic(() => import('./ui'), { ssr: false });

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to auth page if not logged in
    if (!loading && !user) {
      router.push('/auth');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect
  }

  return <AIChatWindow />;
}
