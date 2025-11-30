/**
 * Document Analyzer - Simplified document analysis with AI chat
 */

import React, { useState, useRef } from 'react';
import { PromptInput } from './ui/ai-chat-input';
import { ShimmerButton } from './ui/shimmer-button';
import { useAnimatedText } from './ui/animated-text';

function AnimatedMessage({ content }: { content: string }) {
  const animatedText = useAnimatedText(content, " ");
  return <p className="text-sm leading-relaxed">{animatedText}</p>;
}

export function DocumentAnalyzer() {
  const [hasDocument, setHasDocument] = useState(false);
  const [documentName, setDocumentName] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocumentName(file.name);
    setHasDocument(true);

    const reader = new FileReader();
    reader.onload = () => {
      // Auto-add initial message about document upload
      setMessages([
        {
          role: 'assistant',
          content: `I've received your document "${file.name}". Ask me anything about it, or request a simplified version!`
        }
      ]);
    };
    reader.readAsText(file);
  };

  const handleFileUploadFromButton = () => {
    fileInputRef.current?.click();
  };

  const handleChatSubmit = async (message: string) => {
    if (!message.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);
    setIsProcessing(true);

    try {
      // TODO: Replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Demo response
      const response = `I understand you asked: "${message}". This is a demo response. In production, this would analyze your document and provide meaningful insights.`;
      
      setMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request.' 
      }]);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="w-full max-w-4xl mx-auto">
      {!hasDocument ? (
          // Empty state - Upload document button
          <div className="flex flex-col items-center justify-center space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.doc,.docx,.pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <ShimmerButton
              onClick={handleFileUploadFromButton}
              className="text-base px-16 py-5"
              borderRadius="0.5rem"
            >
              Upload a Document
            </ShimmerButton>

            <p className="text-sm text-gray-500 dark:text-gray-500">
              Supports TXT, MD, DOC, DOCX, and PDF files
            </p>
          </div>
        ) : (
          // Chat interface when document is uploaded
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col h-[600px]">
            {/* Header */}
            <div className="bg-gray-900 dark:bg-gray-800 px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h2 className="text-white font-semibold">{documentName}</h2>
                    <p className="text-gray-300 dark:text-gray-400 text-sm">Ready to analyze</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50 dark:bg-gray-900">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Document Loaded
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md">
                    Ask me anything about your document, or request a simplified version
                  </p>
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' ? (
                      <div className="max-w-[80%]">
                        <AnimatedMessage content={msg.content} />
                      </div>
                    ) : (
                      <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-gray-900 dark:bg-gray-700 text-white">
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
              <PromptInput
                placeholder="Ask about your document..."
                onSubmit={handleChatSubmit}
                disabled={isProcessing}
              />
            </div>
          </div>
        )}
      </div>
  );
}

export default DocumentAnalyzer;

