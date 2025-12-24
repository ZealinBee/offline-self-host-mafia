'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  content: string;
  timestamp: number;
  isMafiaChat: boolean;
}

interface ChatBoxProps {
  messages: ChatMessage[];
  onSendMessage: (content: string) => void;
  placeholder?: string;
  isMafiaChat?: boolean;
  disabled?: boolean;
}

export default function ChatBox({
  messages,
  onSendMessage,
  placeholder = 'Type a message...',
  isMafiaChat = false,
  disabled = false,
}: ChatBoxProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex flex-col h-full ${isMafiaChat ? 'bg-[#1a0a0a]' : 'bg-[#0d0d0d]'} rounded-lg border ${isMafiaChat ? 'border-red-900' : 'border-gray-800'}`}>
      {/* Header */}
      <div className={`px-4 py-2 border-b ${isMafiaChat ? 'border-red-900 bg-red-900/20' : 'border-gray-800'}`}>
        <h4 className={`font-semibold text-sm ${isMafiaChat ? 'text-red-400' : 'text-gray-400'}`}>
          {isMafiaChat ? '🔫 Mafia Chat (Private)' : '💬 Town Discussion'}
        </h4>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[300px]">
        {messages.length === 0 ? (
          <p className="text-gray-600 text-center text-sm">No messages yet...</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`chat-message ${isMafiaChat ? 'chat-mafia' : ''} p-2 rounded`}
            >
              <div className="flex items-baseline gap-2">
                <span className={`font-semibold text-sm ${isMafiaChat ? 'text-red-400' : 'text-[#d4a017]'}`}>
                  {msg.playerName}
                </span>
                <span className="text-gray-600 text-xs">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="text-gray-300 text-sm mt-1">{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={disabled ? 'Chat disabled' : placeholder}
            disabled={disabled}
            maxLength={500}
            className="input-mafia flex-1 text-sm py-2"
          />
          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className={`px-4 py-2 rounded ${
              isMafiaChat
                ? 'bg-red-900 hover:bg-red-800 disabled:bg-red-900/50'
                : 'bg-[#8b0000] hover:bg-[#a00000] disabled:bg-[#8b0000]/50'
            } disabled:cursor-not-allowed transition-colors`}
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
