// app/layout.js
import './globals.css'; // Your global styles
import { Inter } from 'next/font/google';

// 1. Import the Client Component Wrapper
import Providers from '../lib/providers'; 

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'AI Routing System',
  description: 'LLM-powered API router with Firebase.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {/* 2. Use the Providers component to wrap {children}.
          The Providers component is marked 'use client' but its children ({children}) 
          (which are your pages) can remain Server Components, preserving performance.
        */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}