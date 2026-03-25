'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { LiveChat } from './LiveChat';
import type { ChatMessage } from '@/lib/types';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

interface VideoChatProps {
  roomId: string;
  wsUrl: string;
  isArtist: boolean;
}

export function VideoChat({ roomId, wsUrl, isArtist }: VideoChatProps) {
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participantCount, setParticipantCount] = useState(0);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  const sendWs = useCallback((data: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  const setupPeerConnection = useCallback(async () => {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendWs({ type: 'ice_candidate', candidate: e.candidate.toJSON() });
      }
    };

    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
      }
    };

    // Add local stream if artist
    if (isArtist) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localStreamRef.current = stream;
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
      } catch (err) {
        console.error('Camera error:', err);
      }
    }

    return pc;
  }, [isArtist, sendWs]);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case 'offer': {
          const pc = pcRef.current || await setupPeerConnection();
          await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          sendWs({ type: 'answer', answer });
          break;
        }
        case 'answer': {
          if (pcRef.current) {
            await pcRef.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
          break;
        }
        case 'ice_candidate': {
          if (pcRef.current && data.candidate) {
            await pcRef.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
          break;
        }
        case 'participant_joined': {
          setParticipantCount(data.participant_count || 0);
          // If we're an artist and someone joins, create offer
          if (isArtist && pcRef.current) {
            const offer = await pcRef.current.createOffer();
            await pcRef.current.setLocalDescription(offer);
            sendWs({ type: 'offer', offer });
          }
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

    // Setup peer connection
    setupPeerConnection();

    return () => {
      ws.close();
      pcRef.current?.close();
      localStreamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [wsUrl, isArtist, setupPeerConnection, sendWs]);

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
            {connected ? 'Conectado' : 'Conectando...'}
          </span>
          <span className="text-xs text-[var(--text-muted)] ml-auto">
            {participantCount} en sala
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Local video (artist) */}
          {isArtist && (
            <div className="relative rounded-sm overflow-hidden bg-black aspect-video">
              <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded-sm">
                Tú
              </div>
            </div>
          )}

          {/* Remote video */}
          <div className="relative rounded-sm overflow-hidden bg-black aspect-video">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 text-xs text-white bg-black/50 px-2 py-1 rounded-sm">
              {isArtist ? 'Otra Artista' : 'Artistas'}
            </div>
          </div>
        </div>
      </div>

      {/* Chat sidebar */}
      <div className="lg:w-80 glass-card rounded-sm overflow-hidden" style={{ minHeight: '350px' }}>
        <LiveChat
          messages={messages}
          onSend={handleSendChat}
          onTip={!isArtist ? handleTip : undefined}
        />
      </div>
    </div>
  );
}
