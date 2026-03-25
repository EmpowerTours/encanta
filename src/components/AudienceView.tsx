'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { LiveChat } from './LiveChat';
import type { ChatMessage } from '@/lib/types';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

interface AudienceViewProps {
  roomId: string;
  wsUrl: string;
}

export function AudienceView({ roomId, wsUrl }: AudienceViewProps) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participantCount, setParticipantCount] = useState(0);

  const video1Ref = useRef<HTMLVideoElement>(null);
  const video2Ref = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamCount = useRef(0);

  const sendWs = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendWs({ type: 'ice_candidate', candidate: e.candidate.toJSON() });
      }
    };

    // Receive-only: assign streams to video elements
    pc.ontrack = (e) => {
      if (e.streams[0]) {
        if (streamCount.current === 0 && video1Ref.current) {
          video1Ref.current.srcObject = e.streams[0];
        } else if (video2Ref.current) {
          video2Ref.current.srcObject = e.streams[0];
        }
        streamCount.current++;
      }
    };

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'offer': {
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendWs({ type: 'answer', answer });
          break;
        }
        case 'answer': {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
          break;
        }
        case 'ice_candidate': {
          if (data.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;
        }
        case 'participant_joined': {
          setParticipantCount(data.participant_count || 0);
          break;
        }
        case 'chat_message': {
          setMessages(prev => [...prev, {
            sender: data.sender,
            text: data.text,
            timestamp: data.timestamp,
            isArtist: data.isArtist,
          }]);
          break;
        }
        case 'tip': {
          setMessages(prev => [...prev, {
            sender: 'Sistema',
            text: `💰 ${data.from} envió una propina de ${data.amount} MON`,
            timestamp: Date.now(),
            isArtist: false,
          }]);
          break;
        }
      }
    };

    return () => {
      ws.close();
      pc.close();
    };
  }, [wsUrl, sendWs]);

  const handleSendChat = (text: string) => {
    sendWs({ type: 'chat_message', text });
  };

  const handleTip = () => {
    sendWs({ type: 'tip', from: 'viewer', amount: 1 });
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-full">
      {/* Video area */}
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[var(--success)]' : 'bg-[var(--danger)]'}`} />
          <span className="text-xs text-[var(--text-muted)]">
            {connected ? 'Viendo en vivo' : 'Conectando...'}
          </span>
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {participantCount} en sala
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative rounded-sm overflow-hidden bg-black aspect-video">
            <video ref={video1Ref} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded-sm">
              Artista 1
            </div>
          </div>
          <div className="relative rounded-sm overflow-hidden bg-black aspect-video">
            <video ref={video2Ref} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded-sm">
              Artista 2
            </div>
          </div>
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="lg:w-80 glass-card rounded-sm overflow-hidden" style={{ minHeight: '350px' }}>
        <LiveChat
          messages={messages}
          onSend={handleSendChat}
          onTip={handleTip}
        />
      </div>
    </div>
  );
}
