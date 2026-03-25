'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { fetchArtist, checkSubscription, uploadContent } from '@/lib/api';
import Link from 'next/link';

type DashboardView = 'artista' | 'suscriptor';

interface ArtistData {
  status: string;
  total_earned: number;
  pending_balance: number;
  withdrawable: number;
  total_views: number;
  total_likes: number;
  content_count: number;
  share_percentage: number;
  milestone_threshold: number;
  health_verified_until: string;
}

interface SubData {
  active: boolean;
  expiry: string | null;
  referral_count: number;
}

export default function DashboardPage() {
  const { address, connect } = useWallet();
  const [view, setView] = useState<DashboardView>('artista');
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [artistData, setArtistData] = useState<ArtistData | null>(null);
  const [subData, setSubData] = useState<SubData | null>(null);
  const [isArtist, setIsArtist] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await fetchArtist(address);
        setArtistData(data as unknown as ArtistData);
        setIsArtist(true);
        setView('artista');
      } catch {
        // Not an artist — show subscriber view
        setIsArtist(false);
        setView('suscriptor');
      }

      try {
        const sub = await checkSubscription(address);
        setSubData(sub);
      } catch {
        // not subscribed or error
      }

      setLoading(false);
    };
    load();
  }, [address]);

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Conecta tu Wallet
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6">Accede a tu panel conectando tu wallet.</p>
          <button onClick={connect} className="btn-primary">Conectar Wallet</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  const artist = artistData || {
    status: 'Inactiva',
    total_earned: 0,
    pending_balance: 0,
    withdrawable: 0,
    total_views: 0,
    total_likes: 0,
    content_count: 0,
    share_percentage: 0,
    milestone_threshold: 50,
    health_verified_until: '',
  };

  const milestoneProgress = artist.milestone_threshold > 0
    ? (artist.pending_balance / artist.milestone_threshold) * 100
    : 0;

  const handleWithdraw = async () => {
    setWithdrawing(true);
    try {
      alert('El retiro requiere interacción con el smart contract. Próximamente.');
    } finally {
      setWithdrawing(false);
    }
  };

  const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
  const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'];
  const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB
  const MAX_VIDEO_SIZE = 200 * 1024 * 1024; // 200MB

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !address) return;

    const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
    const isVideo = ALLOWED_VIDEO_TYPES.includes(file.type);

    if (!isImage && !isVideo) {
      alert('Formato no permitido. Usa: JPEG, PNG, WebP, MP4 o WebM.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const maxSize = isImage ? MAX_IMAGE_SIZE : MAX_VIDEO_SIZE;
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      alert(`El archivo excede el limite de ${maxMB}MB.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      await uploadContent(file, address, 'general');
      alert('Contenido subido exitosamente.');
    } catch (err) {
      alert(`Error al subir: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-10">
          <div>
            <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-2">Panel</p>
            <h1 className="text-2xl md:text-3xl font-bold"
              style={{ fontFamily: 'Playfair Display, serif' }}>
              Bienvenida de vuelta
            </h1>
          </div>

          <div className="flex gap-2">
            {isArtist && (
              <button
                onClick={() => setView('artista')}
                className={`px-4 py-2 text-xs tracking-widest uppercase rounded-sm transition-all ${
                  view === 'artista'
                    ? 'bg-[var(--carmin)] text-white'
                    : 'border border-[var(--border)] text-[var(--text-muted)]'
                }`}>
                Artista
              </button>
            )}
            <button
              onClick={() => setView('suscriptor')}
              className={`px-4 py-2 text-xs tracking-widest uppercase rounded-sm transition-all ${
                view === 'suscriptor'
                  ? 'bg-[var(--carmin)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-muted)]'
              }`}>
              Suscriptor
            </button>
          </div>
        </motion.div>

        {view === 'artista' && isArtist ? (
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-4 glass-card p-4 rounded-sm">
              <span className="badge badge-active">{artist.status}</span>
              {artist.health_verified_until && (
                <span className="text-xs text-[var(--text-muted)]">
                  Salud verificada hasta {artist.health_verified_until}
                </span>
              )}
            </motion.div>

            {/* Earnings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Ganado', value: `${artist.total_earned} MON` },
                { label: 'Pendiente', value: `${artist.pending_balance} MON` },
                { label: 'Retirable', value: `${artist.withdrawable} MON` },
                { label: 'Tu Porción', value: `${artist.share_percentage}%` },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-5 rounded-sm">
                  <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2">{stat.label}</p>
                  <p className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {stat.value}
                  </p>
                </motion.div>
              ))}
            </div>

            {/* How earnings work */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card p-5 rounded-sm">
              <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-3">Cómo ganas</p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Cada mes, el 90% de todas las suscripciones se reparte entre las artistas según los <strong className="text-[var(--text-primary)]">likes</strong> y <strong className="text-[var(--text-primary)]">colecciones</strong> que recibes. Más interacción = más ingresos.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="p-3 rounded-sm border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">Vistas este mes</p>
                  <p className="text-lg font-bold text-[var(--gold)]">{artist.total_views.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-sm border border-[var(--border)]">
                  <p className="text-xs text-[var(--text-muted)]">Likes este mes</p>
                  <p className="text-lg font-bold text-[var(--gold)]">{artist.total_likes}</p>
                </div>
              </div>
            </motion.div>

            {/* Milestone */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-6 rounded-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase">Progreso de Milestone</p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {artist.pending_balance} / {artist.milestone_threshold} MON
                </p>
              </div>
              <div className="milestone-bar">
                <motion.div
                  className="milestone-fill"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(milestoneProgress, 100)}%` }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-2">
                Faltan {Math.max(artist.milestone_threshold - artist.pending_balance, 0)} MON para desbloquear retiro
              </p>
            </motion.div>

            {/* Withdraw */}
            {artist.withdrawable > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="glass-card p-6 rounded-sm border border-[var(--gold)] bg-[var(--gold-dim)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-[var(--gold)]">Fondos Listos para Retirar</p>
                    <p className="text-2xl font-bold mt-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {artist.withdrawable} MON
                    </p>
                  </div>
                  <button onClick={handleWithdraw} disabled={withdrawing} className="btn-primary">
                    {withdrawing ? 'Procesando...' : 'Retirar'}
                  </button>
                </div>
              </motion.div>
            )}

            {/* Upload */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="glass-card p-6 rounded-sm">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase">Tu Contenido</p>
                <span className="text-xs text-[var(--text-secondary)]">{artist.content_count} total</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
                onChange={handleUpload}
                className="hidden"
                id="content-upload"
              />
              <label
                htmlFor="content-upload"
                className={`block border-2 border-dashed border-[var(--border)] rounded-sm p-10 text-center hover:border-[var(--border-hover)] transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                <span className="text-3xl text-[var(--gold)] mb-3 block">+</span>
                <p className="text-sm text-[var(--text-secondary)]">
                  {uploading ? 'Subiendo...' : 'Subir Nueva Escena'}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">Arrastra o toca para seleccionar</p>
              </label>
            </motion.div>
          </div>
        ) : (
          /* SUBSCRIBER VIEW */
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-6 rounded-sm">
              <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-4">Tu Suscripción</p>
              {subData?.active ? (
                <div className="flex items-center justify-between p-4 rounded-sm border border-[var(--gold)] bg-[var(--gold-dim)]">
                  <div>
                    <p className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                      Encanta Premium
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">Acceso completo a todas las artistas</p>
                    {subData.expiry && (
                      <p className="text-xs text-[var(--text-muted)]">Expira: {subData.expiry}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-[var(--gold)]">100 MON<span className="text-xs font-normal text-[var(--text-muted)]">/mes</span></p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-sm border border-[var(--border)] text-center">
                  <p className="text-sm text-[var(--text-secondary)] mb-4">No tienes una suscripción activa.</p>
                  <Link href="/subscribe" className="btn-primary">Suscribirse — 100 MON/mes</Link>
                </div>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-sm">
              <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-4">Tus Artistas Favoritas</p>
              <p className="text-sm text-[var(--text-muted)] text-center py-8">
                Da like y colecciona contenido para apoyar a tus artistas favoritas. Tus interacciones determinan cómo se distribuye el pool mensual.
              </p>
              <div className="text-center">
                <Link href="/explore" className="btn-secondary">Explorar Artistas</Link>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
