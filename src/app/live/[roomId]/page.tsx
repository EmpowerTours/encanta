'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { VideoChat } from '@/components/VideoChat';
import { AudienceView } from '@/components/AudienceView';
import { joinLiveRoom, getLiveWebSocketUrl } from '@/lib/api';

export default function LiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const { address, connect } = useWallet();

  const [role, setRole] = useState<'artist' | 'audience' | null>(null);
  const [token, setToken] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const handleJoinAsAudience = async () => {
    if (!address) return;
    setJoining(true);
    setJoinError(null);
    try {
      const response = await joinLiveRoom(roomId, address);
      setToken(response.token);
      setRole('audience');
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Error al unirse a la sala');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinAsArtist = async () => {
    if (!address) return;
    setJoining(true);
    setJoinError(null);
    try {
      const response = await joinLiveRoom(roomId, address);
      setToken(response.token);
      setRole('artist');
    } catch (err: unknown) {
      setJoinError(err instanceof Error ? err.message : 'Error al unirse a la sala');
    } finally {
      setJoining(false);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-12 max-w-md w-full text-center rounded-sm">
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Conecta tu Wallet
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Necesitas conectar tu wallet para unirte a esta sala.
          </p>
          <button onClick={connect} className="btn-primary">Conectar MetaMask</button>
        </div>
      </div>
    );
  }

  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 max-w-md w-full text-center rounded-sm">
          <div className="flex items-center justify-center gap-2 mb-6">
            <span className="w-2 h-2 rounded-full bg-[var(--carmin)] pulse-live" />
            <span className="text-xs text-[var(--gold)] tracking-widest uppercase">Sala {roomId}</span>
          </div>

          <h2 className="text-2xl font-bold mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            ¿Cómo quieres unirte?
          </h2>

          {joinError && (
            <div className="mb-4 p-3 rounded-sm border border-[var(--carmin)] bg-[rgba(155,27,48,0.1)]">
              <p className="text-xs text-[var(--carmin-light)]">{joinError}</p>
            </div>
          )}

          <div className="space-y-3">
            <button onClick={handleJoinAsArtist} disabled={joining}
              className="btn-primary w-full text-center">
              {joining ? 'Uniéndose...' : 'Unirme como Artista'}
            </button>
            <button onClick={handleJoinAsAudience} disabled={joining}
              className="btn-secondary w-full text-center">
              {joining ? 'Uniéndose...' : 'Ver como Audiencia'}
            </button>
          </div>

          <button onClick={() => router.push('/live')}
            className="text-xs text-[var(--text-muted)] mt-6 block mx-auto hover:text-[var(--text-secondary)]">
            ← Volver a Salas
          </button>
        </motion.div>
      </div>
    );
  }

  const wsUrl = getLiveWebSocketUrl(roomId, token);

  return (
    <div className="min-h-screen px-4 pt-20 pb-24 md:pt-24">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--carmin)] pulse-live" />
            <span className="text-sm text-[var(--gold)] font-medium">Sala en Vivo</span>
            <span className="text-xs text-[var(--text-muted)]">
              — {role === 'artist' ? 'Artista' : 'Audiencia'}
            </span>
          </div>
          <button onClick={() => router.push('/live')}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            Salir de Sala
          </button>
        </div>

        {/* Video + Chat */}
        {role === 'artist' ? (
          <VideoChat roomId={roomId} wsUrl={wsUrl} isArtist={true} />
        ) : (
          <AudienceView roomId={roomId} wsUrl={wsUrl} />
        )}
      </div>
    </div>
  );
}
