/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Sparkles, Send, Bot, User, X, Minimize2, Maximize2, RefreshCw, FileText, HelpCircle } from 'lucide-react';
import { Note, QuestionPaper } from '../types';

interface AIChatBotProps {
  notes?: Note[];
  questionPapers?: QuestionPaper[];
  courseCode?: string;
}

export default function AIChatBot({ notes = [], questionPapers = [], courseCode }: AIChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string; timestamp: Date }[]>([
    {
      sender: 'ai',
      text: `Welcome to the Nexus Academic AI Assistant! 🎓\n\nI can help you with your coursework for **${courseCode || 'your classes'}**:\n- Summarize complex PDF notes\n- Answer conceptual questions\n- Generate step-by-step study plans\n- Explain previous year exam papers\n\nHow can I support your studies today?`,
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedContextId, setSelectedContextId] = useState<string>('');

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText;
    setInputText('');
    setMessages(prev => [...prev, { sender: 'user', text: userMsg, timestamp: new Date() }]);
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      const userEmail = localStorage.getItem('userEmail') || 'student@nexus.edu';

      const response = await fetch('/api/ai/search-explain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': userEmail,
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          prompt: userMsg,
          materialId: selectedContextId || undefined
        })
      });

      const data = await response.json();
      if (response.ok) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.answer || 'No response generated.', timestamp: new Date() }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: `Error: ${data.error || 'Failed to analyze materials.'}`, timestamp: new Date() }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { sender: 'ai', text: 'Network connection failed. Please ensure the server is fully started and try again.', timestamp: new Date() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const selectContext = (id: string, name: string) => {
    setSelectedContextId(id);
    setInputText(`Explain the concepts covered in "${name}" and suggest 3 high-yield study topics for the exam.`);
  };

  return (
    <div id="ai-academic-bot" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Floating launcher button when closed */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 bg-blue-900 text-white px-5 py-4 rounded-full shadow-2xl hover:bg-blue-800 active:scale-95 transition-all duration-300 border border-yellow-500 group"
        >
          <Sparkles className="w-5 h-5 text-yellow-500 group-hover:animate-pulse" />
          <span className="font-medium tracking-wide">Nexus AI Tutor</span>
          <span className="bg-yellow-500 text-blue-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">LIVE</span>
        </button>
      )}

      {/* Main chat window */}
      {isOpen && (
        <div className={`bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col transition-all duration-300 ${isMinimized ? 'h-16 w-80' : 'h-[32rem] w-96'}`}>
          {/* Header */}
          <div className="bg-blue-900 text-white px-4 py-3 rounded-t-2xl flex items-center justify-between border-b border-yellow-500">
            <div className="flex items-center gap-2">
              <div className="bg-blue-800 p-1.5 rounded-lg border border-yellow-500/30">
                <Sparkles className="w-4 h-4 text-yellow-500" />
              </div>
              <div>
                <h3 className="font-serif font-semibold text-sm tracking-wide">Nexus AI Study Assistant</h3>
                <p className="text-[10px] text-gray-300">Powered by Nexus AI Engine</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-gray-300">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="hover:text-white p-1 rounded hover:bg-white/10"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:text-white p-1 rounded hover:bg-white/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Context Selector Bar for Notes / Papers */}
              {(notes.length > 0 || questionPapers.length > 0) && (
                <div className="bg-gray-50 border-b border-gray-100 px-3 py-2">
                  <p className="text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-blue-900" />
                    Include Study Reference Context:
                  </p>
                  <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {notes.map(n => (
                      <button
                        key={n.id}
                        onClick={() => selectContext(n.id, n.title)}
                        className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap border transition-all ${selectedContextId === n.id ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                        Note: {n.title.slice(0, 18)}...
                      </button>
                    ))}
                    {questionPapers.map(q => (
                      <button
                        key={q.id}
                        onClick={() => selectContext(q.id, q.title)}
                        className={`text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap border transition-all ${selectedContextId === q.id ? 'bg-blue-900 text-yellow-500 border-blue-900' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}`}
                      >
                        Exam: {q.year} - {q.term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex gap-2.5 ${
                      msg.sender === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.sender === 'ai' && (
                      <div className="w-8 h-8 rounded-lg bg-blue-900 text-yellow-500 flex items-center justify-center shrink-0 border border-yellow-500/20">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[75%] rounded-2xl p-3.5 shadow-sm text-sm whitespace-pre-wrap leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-blue-900 text-white rounded-br-none'
                          : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'
                      }`}
                    >
                      {msg.text}
                      <span
                        className={`block text-[9px] mt-1 text-right ${
                          msg.sender === 'user' ? 'text-white/60' : 'text-gray-400'
                        }`}
                      >
                        {msg.timestamp.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {msg.sender === 'user' && (
                      <div className="w-8 h-8 rounded-lg bg-yellow-500 text-blue-900 flex items-center justify-center shrink-0 border border-blue-900/20">
                        <User className="w-4 h-4 font-bold" />
                      </div>
                    )}
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-900 text-yellow-500 flex items-center justify-center shrink-0 border border-yellow-500/20">
                      <Bot className="w-4 h-4" />
                    </div>

                    <div className="bg-white rounded-2xl p-3.5 border border-gray-100 rounded-bl-none shadow-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-yellow-500 animate-spin" />
                      <span className="text-xs text-gray-500 font-medium">
                        Analyzing material concepts...
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Form Input */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white rounded-b-2xl flex gap-1.5 items-center">
                {selectedContextId && (
                  <button
                    type="button"
                    onClick={() => setSelectedContextId('')}
                    className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-500"
                    title="Remove reference context"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={selectedContextId ? "Ask about this study material..." : "Ask a concept or exam search..."}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-900 transition-colors"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className={`p-2.5 rounded-xl text-white transition-all ${!inputText.trim() || isLoading ? 'bg-gray-200 text-gray-400' : 'bg-blue-900 hover:bg-blue-800'}`}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}