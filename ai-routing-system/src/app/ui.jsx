'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import apiClient from '../lib/apiClient';
import { useAuth } from '../context/authContext';

// Configure background video URL here
const BACKGROUND_VIDEO_URL = 'https://assets.mixkit.co/videos/preview/mixkit-slow-motion-of-clouds-in-the-sky-10346-large.mp4';

// Mock data generators for visualization
const mockEmployees = [
  { id: 1, name: 'Sarah Johnson', department: 'Engineering', salary: '$95,000', status: 'Active' },
  { id: 2, name: 'Michael Chen', department: 'Marketing', salary: '$78,000', status: 'Active' },
  { id: 3, name: 'Emily Rodriguez', department: 'Sales', salary: '$82,000', status: 'Active' },
  { id: 4, name: 'David Kim', department: 'Engineering', salary: '$105,000', status: 'Active' },
  { id: 5, name: 'Jennifer Williams', department: 'HR', salary: '$72,000', status: 'Active' }
];

const mockOrders = [
  { id: 1001, customer: 'Acme Corp', amount: '$15,240', status: 'Completed', date: '2024-12-05' },
  { id: 1002, customer: 'Tech Solutions', amount: '$8,750', status: 'Pending', date: '2024-12-06' },
  { id: 1003, customer: 'Global Industries', amount: '$22,100', status: 'Completed', date: '2024-12-04' },
  { id: 1004, customer: 'StartUp Inc', amount: '$5,400', status: 'Processing', date: '2024-12-07' },
  { id: 1005, customer: 'Enterprise Ltd', amount: '$31,800', status: 'Completed', date: '2024-12-03' }
];

const mockProducts = [
  { id: 'P001', name: 'Wireless Mouse', category: 'Electronics', price: '$29.99', stock: 145 },
  { id: 'P002', name: 'USB-C Cable', category: 'Accessories', price: '$12.99', stock: 320 },
  { id: 'P003', name: 'Laptop Stand', category: 'Office', price: '$45.99', stock: 89 },
  { id: 'P004', name: 'Mechanical Keyboard', category: 'Electronics', price: '$129.99', stock: 56 },
  { id: 'P005', name: 'Monitor Arm', category: 'Office', price: '$78.99', stock: 112 }
];

const DataTable = ({ data, entity }) => {
  if (!data || data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="mt-6 overflow-hidden animate-fade-in-up">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{entity} Data</h3>
        <span className="text-xs text-gray-500">{data.length} records</span>
      </div>
      <div className="rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100">
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, idx) => (
                <tr 
                  key={idx} 
                  className="hover:bg-blue-50/50 transition-all duration-200"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {columns.map((col) => (
                    <td key={col} className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">
                      {row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const TypewriterText = ({ text, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, 12);
      return () => clearTimeout(timeout);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, onComplete]);

  return <span className="whitespace-pre-wrap leading-relaxed">{displayedText}</span>;
};

const AIChatWindow = () => {
  const { user, logout, email: userEmail } = useAuth();
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      content: "Hey there! How's the day going? I'm ready to help with weather lookups and database operations. What can I do for you?",
      isDataVisualization: false,
      remainingRequests: null
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState(null);
  const [typingMessageId, setTypingMessageId] = useState(null);
  const chatEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingMessageId]);

  const inferVisualization = (responseText, userQuery) => {
    const lowerText = responseText.toLowerCase();
    const lowerQuery = (userQuery || '').toLowerCase();
    
    // Check for database queries (READ, LIST, COUNT) or insufficient info
    const isDatabaseQuery = lowerText.includes('employee') || lowerText.includes('order') || lowerText.includes('product') || 
                           lowerText.includes('record') || lowerText.includes('database');
    
    const hasCountOrList = lowerText.match(/\d+\s+(employee|order|product|record)/i) || 
                          lowerText.includes('found') || 
                          lowerText.includes('there are') ||
                          lowerText.includes('there is') ||
                          lowerText.includes('matching your criteria');
    
    // Check for insufficient info responses
    const isInsufficientInfo = lowerText.includes('i need') || 
                               lowerText.includes('please specify') || 
                               lowerText.includes('here\'s what i can help');
    
    if (isDatabaseQuery && (hasCountOrList || isInsufficientInfo)) {
      // Determine entity type from query or response
      if (lowerText.includes('employee') || lowerQuery.includes('employee')) {
        return { shouldVisualize: true, entity: 'Employees', data: mockEmployees };
      }
      
      if (lowerText.includes('order') || lowerQuery.includes('order')) {
        return { shouldVisualize: true, entity: 'Orders', data: mockOrders };
      }
      
      if (lowerText.includes('product') || lowerQuery.includes('product')) {
        return { shouldVisualize: true, entity: 'Products', data: mockProducts };
      }
      
      // Default to employees if entity is unclear
      if (isInsufficientInfo || hasCountOrList) {
        return { shouldVisualize: true, entity: 'Sample Data', data: mockEmployees };
      }
    }

    return { shouldVisualize: false, entity: null, data: null };
  };

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userQuery = inputValue.trim();
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: userQuery,
      isDataVisualization: false,
      remainingRequests: null
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/query', {
        query: userQuery
      });

      const { response: aiResponse, remaining } = response.data;
      setRemainingRequests(remaining);

      const visualization = inferVisualization(aiResponse, userQuery);

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        content: aiResponse,
        isDataVisualization: visualization.shouldVisualize,
        visualizationData: visualization.data,
        visualizationEntity: visualization.entity,
        remainingRequests: remaining
      };

      setMessages(prev => [...prev, aiMessage]);
      setTypingMessageId(aiMessage.id);

    } catch (error) {
      let errorMessage = 'An unexpected error occurred. Please try again.';
      let errorRemaining = remainingRequests;

      if (error.response) {
        const { status, data } = error.response;
        
        if (status === 429) {
          errorMessage = data.error || 'Rate limit exceeded. Please try again later.';
          errorRemaining = data.remaining || 0;
          setRemainingRequests(errorRemaining);
        } else if (status === 401) {
          errorMessage = 'Authentication failed. Please sign in again.';
        } else if (status === 400) {
          errorMessage = data.error || 'Invalid request. Please try again.';
        } else {
          errorMessage = data.error || errorMessage;
        }
      }

      const errorAiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        content: errorMessage,
        isDataVisualization: false,
        remainingRequests: errorRemaining
      };

      setMessages(prev => [...prev, errorAiMessage]);
      setTypingMessageId(errorAiMessage.id);
    } finally {
      setIsLoading(false);
    }
  }, [inputValue, isLoading, remainingRequests]);

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '56px';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 140)}px`;
    }
  }, [inputValue]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">
      {/* Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-20"
      >
        <source src={BACKGROUND_VIDEO_URL} type="video/mp4" />
      </video>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/40 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Enhanced Header */}
        <header className="bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-200/50">
          <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">AI Assistant</h1>
                <p className="text-sm text-gray-600 font-medium">{userEmail || 'Loading...'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {remainingRequests !== null && (
                <div className="flex items-center space-x-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-3 rounded-full border border-blue-200/50 shadow-sm">
                  <div className="text-right">
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Requests Available</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {remainingRequests}<span className="text-lg text-gray-400">/10</span>
                    </p>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        {/* Chat Container with Enhanced Glassmorphism */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto px-6 py-8 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
        >
          <div className="max-w-5xl mx-auto space-y-6 pb-8">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div
                  className={`max-w-3xl group ${
                    message.sender === 'user'
                      ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-br-md shadow-lg hover:shadow-xl'
                      : 'bg-white/95 backdrop-blur-xl text-gray-800 rounded-3xl rounded-bl-md shadow-lg hover:shadow-xl border border-gray-200/50'
                  } px-7 py-5 transition-all duration-300 transform hover:scale-[1.01]`}
                >
                  {message.sender === 'ai' && typingMessageId === message.id ? (
                    <TypewriterText
                      text={message.content}
                      onComplete={() => setTypingMessageId(null)}
                    />
                  ) : (
                    <span className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</span>
                  )}

                  {message.isDataVisualization && message.visualizationData && typingMessageId !== message.id && (
                    <DataTable
                      data={message.visualizationData}
                      entity={message.visualizationEntity}
                    />
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-message-in">
                <div className="bg-white/95 backdrop-blur-xl rounded-3xl rounded-bl-md shadow-lg px-7 py-5 border border-gray-200/50">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Enhanced Input Area with Premium Glassmorphism */}
        <div className="relative bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl">
          <div className="max-w-5xl mx-auto px-6 py-6">
            <div className="flex items-end space-x-4">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  placeholder="Ask about weather or database operations..."
                  rows="1"
                  className="w-full px-6 py-4 bg-gray-50/80 border-2 border-gray-200 rounded-3xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all duration-200 text-gray-800 placeholder-gray-400 text-[15px] leading-relaxed shadow-sm hover:shadow-md"
                  style={{ minHeight: '56px', maxHeight: '140px' }}
                />
              </div>
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputValue.trim()}
                className="group px-7 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-3xl hover:from-blue-700 hover:to-blue-800 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center justify-center transform hover:scale-105 active:scale-95"
                style={{ minHeight: '56px', minWidth: '120px' }}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{ animationDelay: '300ms' }}></div>
                  </div>
                ) : (
                  <>
                    <span className="mr-2">Send</span>
                    <svg
                      className="w-5 h-5 transform group-hover:translate-x-1 transition-transform"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Press Enter to send • Shift + Enter for new line
              </span>
              {remainingRequests !== null && (
                <span className="flex items-center text-gray-600 font-medium">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {remainingRequests} requests remaining
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes message-in {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(15px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-message-in {
          animation: message-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .animate-fade-in-up {
          animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .scrollbar-thin::-webkit-scrollbar {
          width: 8px;
        }

        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 4px;
        }

        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }
      `}</style>
    </div>
  );
};

export default AIChatWindow;