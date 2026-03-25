'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { fetchFeed, fetchCollection, purchaseContent } from '@/lib/api';
import type { FeedItem } from '@/lib/types';

const SWIPE_THRESHOLD = 80;

export default function FeedPage() {
  const { address, connect } = useWallet();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [collection, setCollection] = useState<Set<string>>(new Set());
  const y = useMotionValue(0);
  const opacity = useTransform(y, [-200, 0, 200], [0.5, 1, 0.5]);

  // Load feed
  useEffect(() => {
    setLoading(true);
    fetchFeed()
      .then((data) => setFeed(data))
      .catch((err) => {
        console.error('Error fetching feed:', err);
        setFeed([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Load existing collection from API
  useEffect(() => {
    if (!address) return;

    fetchCollection(address)
      .then((res) => {
        const ids = (res.items || []).map((item) => (item.content_id as string) || (item.contentId as string) || '').filter(Boolean);
        setCollection(new Set(ids));
      })
      .catch((err) => console.error('Error fetching collection:', err));
  }, [address]);

  const currentItem = feed[currentIndex];

  const goNext = useCallback(() => {
    setCurrentIndex(prev => (prev + 1) % feed.length);
    setDirection(null);
  }, [feed.length]);

  const handleSwipe = useCallback(async (dir: 'up' | 'down') => {
    setDirection(dir);

    if (dir === 'up' && currentItem && address) {
      // Swipe up = purchase & add to collection
      setPurchasing(true);
      try {
        await purchaseContent(currentItem.contentId, address);
        setCollection(prev => new Set([...prev, currentItem.contentId]));
      } catch (err) {
        console.error('Purchase error:', err);
      } finally {
        setPurchasing(false);
      }
    }

    setTimeout(goNext, 300);
  }, [currentItem, goNext, address]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y < -SWIPE_THRESHOLD) {
      handleSwipe('up');
    } else if (info.offset.y > SWIPE_THRESHOLD) {
      handleSwipe('down');
    }
  };

  // Keyboard support
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') handleSwipe('up');
      else if (e.key === 'ArrowDown') handleSwipe('down');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSwipe]);

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-12 max-w-md w-full text-center rounded-sm">
          <div className="text-5xl mb-4 text-[var(--gold)]">◈</div>
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Conecta tu Wallet
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Necesitas una wallet para explorar el feed y desbloquear contenido.
          </p>
          <button onClick={connect} className="btn-primary">Conectar MetaMask</button>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">Cargando feed...</p>
        </div>
      </div>
    );
  }

  // Empty feed state
  if (feed.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-12 max-w-md w-full text-center rounded-sm">
          <div className="text-6xl mb-4 opacity-30">◇</div>
          <p className="text-[var(--text-muted)] text-lg mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
            No hay contenido disponible aún.
          </p>
          <p className="text-[var(--text-muted)] text-sm">
            Las artistas están preparando su contenido.
          </p>
        </div>
      </div>
    );
  }

  if (!currentItem) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-12 text-center rounded-sm">
          <p className="text-[var(--text-muted)]">No hay más contenido por ahora.</p>
        </div>
      </div>
    );
  }

  const isOwned = collection.has(currentItem.contentId);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-24 overflow-hidden">
      {/* Swipe hints */}
      <div className="flex items-center gap-6 mb-4">
        <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs">
          <span>↓</span> Saltar
        </div>
        <div className="flex items-center gap-2 text-[var(--gold)] text-xs">
          <span>↑</span> Desbloquear — {currentItem.price} MON
        </div>
      </div>

      {/* Card container */}
      <div className="relative w-full max-w-sm" style={{ height: '70vh', maxHeight: '600px' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.contentId}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            style={{ y, opacity }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{
              opacity: 0,
              y: direction === 'up' ? -300 : direction === 'down' ? 300 : 0,
              scale: 0.9,
              transition: { duration: 0.3 },
            }}
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
          >
            <div className="glass-card rounded-sm overflow-hidden h-full flex flex-col">
              {/* Blurred/unblurred image area */}
              <div className="flex-1 relative overflow-hidden">
                {/* Silhouette with blur */}
                <div
                  className={`absolute inset-0 transition-all duration-700 ${
                    isOwned ? '' : 'blur-[30px]'
                  }`}
                  style={{
                    background: `
                      linear-gradient(180deg, var(--bg-card) 0%, var(--bg-elevated) 30%, var(--bg-card) 100%)
                    `,
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div
                      className="w-48 h-64 rounded-full opacity-30"
                      style={{
                        background: `radial-gradient(ellipse, var(--carmin) 0%, transparent 70%)`,
                        filter: isOwned ? 'none' : 'blur(20px)',
                      }}
                    />
                  </div>
                </div>

                {/* Gradient overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-[var(--bg-card)] to-transparent z-10" />

                {/* Lock icon if not owned */}
                {!isOwned && (
                  <div className="absolute inset-0 flex items-center justify-center z-20">
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="text-center"
                    >
                      <div className="text-5xl mb-2 opacity-60">🔒</div>
                      <p className="text-xs text-[var(--gold)] tracking-widest uppercase">
                        Desliza hacia arriba
                      </p>
                    </motion.div>
                  </div>
                )}

                {/* Owned badge */}
                {isOwned && (
                  <div className="absolute top-4 right-4 z-20 badge badge-active">
                    En tu Colección
                  </div>
                )}

                {/* Category badge */}
                <div className="absolute top-4 left-4 z-20">
                  <span className="text-[10px] text-[var(--gold)] tracking-wider uppercase px-2 py-1 border border-[var(--gold)] rounded-sm bg-[rgba(0,0,0,0.5)]">
                    {currentItem.category}
                  </span>
                </div>
              </div>

              {/* Info bar */}
              <div className="p-5 relative z-10">
                <h3 className="text-xl font-semibold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {currentItem.artistName}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)] capitalize">{currentItem.category}</span>
                  {!isOwned && (
                    <span className="text-sm text-[var(--gold)] font-medium">{currentItem.price} MON</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Purchasing overlay */}
        {purchasing && (
          <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/50 rounded-sm">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-[var(--gold)]">Desbloqueando...</p>
            </div>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">{currentIndex + 1} / {feed.length}</span>
        <span className="text-xs text-[var(--text-muted)]">·</span>
        <span className="text-xs text-[var(--gold)]">{collection.size} en colección</span>
      </div>
    </div>
  );
}
