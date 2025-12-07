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

// Data Canvas Component (Translucent Center Overlay)
const DataCanvas = ({ data, entity, onClose }) => {
  if (!data || data.length === 0) return null;
  const columns = Object.keys(data[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-4xl max-h-[80vh] flex flex-col bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/50 overflow-hidden"
        style={{ animation: 'scale-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-gray-200/50 bg-white/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 capitalize">{entity || 'Database Records'}</h3>
              <p className="text-sm text-gray-500">{data.length} records found</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100/50 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Table */}
        <div className="flex-1 overflow-auto p-6 scrollbar-thin">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200/50">
                {columns.map((col) => (
                  <th key={col} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider sticky top-0 bg-white/80 backdrop-blur-md">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((row, idx) => (
                <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                  {columns.map((col) => (
                    <td key={col} className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {typeof row[col] === 'object' ? JSON.stringify(row[col]) : row[col]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-8 py-4 bg-gray-50/50 border-t border-gray-200/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl shadow-lg shadow-blue-500/30 transition-all"
          >
            Close Viewer
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
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
      content: "Hey there! I'm ready to help with weather lookups and database operations. What can I do for you?",
      isDataVisualization: false
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState(null);
  const [typingMessageId, setTypingMessageId] = useState(null);

  // Data Canvas State
  const [showCanvas, setShowCanvas] = useState(false);
  const [canvasData, setCanvasData] = useState(null);
  const [canvasEntity, setCanvasEntity] = useState('');

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

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const userQuery = inputValue.trim();
    const userMessage = {
      id: Date.now(),
      sender: 'user',
      content: userQuery
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await apiClient.post('/query', {
        query: userQuery
      });

      const { response: aiResponse, remaining, data, entity } = response.data;
      setRemainingRequests(remaining);

      // Check if we gained new data to visualize
      if (data && data.length > 0) {
        setCanvasData(data);
        setCanvasEntity(entity || 'Records');
        setShowCanvas(true); // Auto-open canvas
      }

      const aiMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        content: aiResponse,
        remainingRequests: remaining
      };

      setMessages(prev => [...prev, aiMessage]);
      setTypingMessageId(aiMessage.id);

    } catch (error) {
      // ... existing error handling
      console.error(error);
      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'ai', content: 'Something went wrong.' }]);
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

  // Auto-resize textarea logic (same as before) ...

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100">

      {/* Background Video & Overlay (same as before) */}
      <video autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-20">
        <source src={BACKGROUND_VIDEO_URL} type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-transparent to-white/40 pointer-events-none" />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-screen">
        {/* Header */}
        <header className="bg-white/95 backdrop-blur-xl shadow-sm border-b border-gray-200/50">
          <div className="max-w-6xl mx-auto px-8 py-5 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 tracking-tight">AI Assistant</h1>
                <p className="text-sm text-gray-600 font-medium">{userEmail || 'Loading...'}</p>
              </div>
            </div>

            {/* View Data Button (Only appears if data is loaded) */}
            <div className="flex items-center space-x-4">
              {canvasData && (
                <button
                  onClick={() => setShowCanvas(true)}
                  className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                  View Data
                </button>
              )}
              <button onClick={handleLogout} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Sign Out</button>
            </div>
          </div>
        </header>

        {/* Chat Container */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-6 py-8 scrollbar-thin">
          <div className="max-w-5xl mx-auto space-y-6 pb-8">
            {messages.map((message, index) => (
              <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}>
                <div className={`max-w-3xl group ${message.sender === 'user' ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl rounded-br-md shadow-lg p-5' : 'bg-white/95 backdrop-blur-xl text-gray-800 rounded-3xl rounded-bl-md shadow-lg border border-gray-200/50 px-7 py-5'}`}>
                  {message.sender === 'ai' && typingMessageId === message.id ? (
                    <TypewriterText text={message.content} onComplete={() => setTypingMessageId(null)} />
                  ) : (
                    <span className="whitespace-pre-wrap leading-relaxed text-[15px]">{message.content}</span>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-message-in">
                <div className="bg-white/95 px-7 py-5 rounded-3xl rounded-bl-md shadow-lg border border-gray-200/50">Thinking...</div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="relative bg-white/95 backdrop-blur-xl border-t border-gray-200/50 shadow-2xl p-6">
          <div className="max-w-5xl mx-auto flex items-end space-x-4">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about weather or database..."
              className="w-full px-6 py-4 bg-gray-50 border-2 rounded-3xl resize-none focus:ring-2 focus:ring-blue-500"
              style={{ minHeight: '56px', maxHeight: '140px' }}
            />
            <button
              onClick={handleSendMessage}
              className="px-8 py-4 bg-blue-600 text-white rounded-3xl hover:bg-blue-700 font-semibold shadow-lg"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Data Canvas Overlay */}
      {showCanvas && (
        <DataCanvas
          data={canvasData}
          entity={canvasEntity}
          onClose={() => setShowCanvas(false)}
        />
      )}
    </div>
  );
};

export default AIChatWindow;