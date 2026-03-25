'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { fetchArtist, checkSubscription } from '@/lib/api';

interface Artist {
  wallet_address: string;
  stage_name: string;
  bio: string;
  categories: string[];
  total_earned: number;
  status: string;
  applied_at?: string;
  approved_at?: string;
}

export default function ArtistProfilePage() {
  const { id } = useParams();
  const { address, connect } = useWallet();
  const [likedContent, setLikedContent] = useState<Set<number>>(new Set());

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setNotFound(false);
    fetchArtist(id as string)
      .then((data) => {
        const a = data as Record<string, unknown>;
        setArtist({
          wallet_address: (a.wallet_address as string) || '',
          stage_name: (a.stage_name as string) || '',
          bio: (a.bio as string) || '',
          categories: (a.categories as string[]) || [],
          total_earned: (a.total_earned as number) || 0,
          status: (a.status as string) || '',
          applied_at: (a.applied_at as string) || undefined,
          approved_at: (a.approved_at as string) || undefined,
        });
      })
      .catch((err) => {
        console.error('Error fetching artist:', err);
        setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!address) {
      setIsSubscribed(false);
      return;
    }
    checkSubscription(address)
      .then((res) => setIsSubscribed(res.active))
      .catch(() => setIsSubscribed(false));
  }, [address]);

  const toggleLike = (contentId: number) => {
    setLikedContent(prev => {
      const next = new Set(prev);
      if (next.has(contentId)) next.delete(contentId);
      else next.add(contentId);
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">Cargando perfil...</p>
        </div>
      </div>
    );
  }

  // 404 state
  if (notFound || !artist) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-12 max-w-md w-full text-center rounded-sm">
          <div className="text-5xl mb-4 opacity-30">◇</div>
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Artista no encontrada
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            No pudimos encontrar esta artista. Puede que el perfil no exista o haya sido eliminado.
          </p>
          <Link href="/explore" className="btn-primary">Explorar Artistas</Link>
        </div>
      </div>
    );
  }

  // Build placeholder content grid based on categories
  const placeholderContent = artist.categories.flatMap((cat, catIdx) =>
    Array.from({ length: 4 }, (_, i) => ({
      id: catIdx * 4 + i,
      category: cat,
    }))
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Cover */}
      <div className="relative h-64 md:h-80 silhouette">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 50% 60%, rgba(155, 27, 48, 0.2) 0%, transparent 60%),
            linear-gradient(180deg, transparent 50%, var(--bg-void) 100%)
          `
        }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[var(--bg-void)] to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10">
          <div className="flex items-end gap-4 mb-4">
            <div className="w-20 h-20 rounded-sm silhouette border-2 border-[var(--bg-void)] flex items-center justify-center">
              <span className="text-2xl text-[var(--gold)] opacity-50">✦</span>
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold"
                style={{ fontFamily: 'Playfair Display, serif' }}>
                {artist.stage_name}
              </h1>
              <div className="flex items-center gap-4 mt-1">
                <span className="text-xs text-[var(--text-muted)]">{artist.total_earned.toLocaleString()} MON ganado</span>
                <span className="text-xs text-[var(--text-muted)]">{placeholderContent.length} escenas</span>
                <span className="badge badge-active">Verificada</span>
              </div>
            </div>
          </div>

          <p className="text-[var(--text-secondary)] text-sm leading-relaxed max-w-2xl"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.1rem' }}>
            {artist.bio || 'Esta artista aún no ha escrito su biografía.'}
          </p>

          <div className="flex flex-wrap gap-2 mt-4">
            {artist.categories.map(cat => (
              <span key={cat} className="px-3 py-1 text-xs tracking-wider uppercase border border-[var(--border)] text-[var(--text-muted)] rounded-sm">
                {cat}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Subscribe banner if not subscribed */}
        {!isSubscribed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-6 rounded-sm mb-8 border border-[var(--gold)] bg-[var(--gold-dim)] text-center">
            <p className="text-lg font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Suscríbete para ver todo el contenido
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              <strong className="text-[var(--gold)]">100 MON/mes</strong> — acceso a todas las artistas de Encanta
            </p>
            <Link href="/subscribe" className="btn-primary">
              Suscribirse — 100 MON/mes
            </Link>
            <p className="text-xs text-[var(--text-muted)] mt-3">
              El 90% se reparte entre artistas según tus interacciones
            </p>
          </motion.div>
        )}

        {/* Content Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs text-[var(--text-muted)] tracking-[0.3em] uppercase">Contenido</p>
            <p className="text-xs text-[var(--text-muted)]">{placeholderContent.length} escenas</p>
          </div>

          {placeholderContent.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--text-muted)] text-sm" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
                Esta artista aún no ha subido contenido.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 md:gap-3">
              {placeholderContent.map((content) => (
                <div key={content.id}
                  className="aspect-square silhouette rounded-sm relative overflow-hidden group cursor-pointer">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-full opacity-30"
                      style={{
                        background: `radial-gradient(ellipse at ${30 + content.id * 5}% ${40 + content.id * 3}%, var(--carmin) 0%, transparent 60%)`,
                        filter: !isSubscribed ? 'blur(20px)' : 'blur(5px)',
                      }} />
                  </div>

                  {!isSubscribed && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                      <span className="text-xl mb-1">🔒</span>
                    </div>
                  )}

                  {/* Like button (only if subscribed) */}
                  {isSubscribed && (
                    <button
                      onClick={() => toggleLike(content.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className={likedContent.has(content.id) ? 'text-[var(--carmin-light)]' : 'text-white/50'}>
                        {likedContent.has(content.id) ? '♥' : '♡'}
                      </span>
                    </button>
                  )}

                  <div className="absolute bottom-2 left-2">
                    <span className="text-[9px] tracking-wider uppercase text-[var(--text-muted)] bg-black/50 px-2 py-0.5 rounded-sm">
                      {content.category}
                    </span>
                  </div>

                  <div className="absolute inset-0 border border-transparent group-hover:border-[var(--border-hover)] transition-colors rounded-sm" />
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
