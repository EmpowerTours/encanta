'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage } from '@/lib/types';

interface LiveChatProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  onTip?: () => void;
  disabled?: boolean;
}

export function LiveChat({ messages, onSend, onTip, disabled }: LiveChatProps) {
  const [text, setText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[var(--border)]">
        <p className="text-xs text-[var(--gold)] tracking-widest uppercase">Chat en Vivo</p>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2" style={{ maxHeight: '300px' }}>
        {messages.length === 0 && (
          <p className="text-xs text-[var(--text-muted)] text-center py-4">
            Sé el primero en escribir...
          </p>
        )}
        {messages.map((msg, i) => (
          <div key={i} className="text-sm">
            <span className={`font-medium text-xs ${msg.isArtist ? 'text-[var(--gold)]' : 'text-[var(--text-secondary)]'}`}>
              {msg.sender}
            </span>
            {msg.isArtist && (
              <span className="text-[8px] text-[var(--gold)] ml-1 border border-[var(--gold)] px-1 rounded-sm">
                ARTISTA
              </span>
            )}
            <p className={`text-xs mt-0.5 ${msg.isArtist ? 'text-[var(--gold-light)]' : 'text-[var(--text-primary)]'}`}>
              {msg.text}
            </p>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-2 border-t border-[var(--border)] flex gap-2">
        <input
          type="text"
          className="form-input text-xs flex-1 !py-2 !px-3"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          maxLength={200}
          disabled={disabled}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="px-3 py-2 text-xs bg-[var(--carmin)] text-white rounded-sm hover:bg-[var(--carmin-light)] transition-colors disabled:opacity-30"
        >
          →
        </button>
        {onTip && (
          <button
            onClick={onTip}
            className="px-3 py-2 text-xs border border-[var(--gold)] text-[var(--gold)] rounded-sm hover:bg-[var(--gold-dim)] transition-colors"
            title="Enviar Propina"
          >
            💰
          </button>
        )}
      </div>
    </div>
  );
}
