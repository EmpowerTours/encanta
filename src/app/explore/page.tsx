'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { fetchArtists, checkSubscription } from '@/lib/api';

const FILTER_CATEGORIES = ['Todas', 'Lencería', 'Topless', 'Cuerpo', 'Video', 'En Vivo'];

interface Artist {
  wallet_address: string;
  stage_name: string;
  categories: string[];
  total_earned?: number;
  bio?: string;
  status?: string;
}

export default function ExplorePage() {
  const [activeFilter, setActiveFilter] = useState('Todas');
  const [searchQuery, setSearchQuery] = useState('');
  const { address } = useWallet();

  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchArtists()
      .then((data) => {
        const mapped = (data as Record<string, unknown>[]).map((a) => ({
          wallet_address: (a.wallet_address as string) || '',
          stage_name: (a.stage_name as string) || '',
          categories: (a.categories as string[]) || [],
          total_earned: (a.total_earned as number) || 0,
          bio: (a.bio as string) || '',
          status: (a.status as string) || '',
        }));
        setArtists(mapped);
      })
      .catch((err) => {
        console.error('Error fetching artists:', err);
        setArtists([]);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!address) {
      setIsSubscribed(false);
      return;
    }
    checkSubscription(address)
      .then((res) => setIsSubscribed(res.active))
      .catch(() => setIsSubscribed(false));
  }, [address]);

  const filtered = artists.filter(a => {
    const matchesCategory = activeFilter === 'Todas' ||
      a.categories.some(c => c.toLowerCase().startsWith(activeFilter.toLowerCase()));
    const matchesSearch = a.stage_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-3">Descubrir</p>
          <h1 className="text-3xl md:text-4xl font-bold"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            Explorar <span className="italic text-gradient-carmin">Artistas</span>
          </h1>
        </motion.div>

        {/* Subscription banner */}
        {!isSubscribed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-5 rounded-sm mb-8 border border-[var(--gold)] bg-[var(--gold-dim)]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  Suscríbete por <strong className="text-[var(--gold)]">100 MON/mes</strong> — acceso completo a todas las artistas
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  El 90% se reparte entre las artistas según las interacciones de los suscriptores
                </p>
              </div>
              <Link href="/subscribe" className="btn-primary whitespace-nowrap">
                Suscribirse
              </Link>
            </div>
          </motion.div>
        )}

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8 space-y-4">
          <input
            type="text"
            className="form-input max-w-md"
            placeholder="Buscar por nombre artístico..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <div className="flex flex-wrap gap-2">
            {FILTER_CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-4 py-2 text-xs tracking-widest uppercase border rounded-sm transition-all duration-300 ${
                  activeFilter === cat
                    ? 'border-[var(--gold)] text-[var(--gold)] bg-[var(--gold-dim)]'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-hover)] hover:text-[var(--text-secondary)]'
                }`}>
                {cat}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Cargando artistas...</p>
          </div>
        )}

        {/* Artist Grid */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {filtered.map((artist, i) => (
              <motion.div
                key={artist.wallet_address}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/artist/${artist.wallet_address}`} className="block group">
                  <div className="glass-card rounded-sm overflow-hidden">
                    <div className="silhouette aspect-[3/4] relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-24 h-32 rounded-full opacity-20"
                          style={{
                            background: `radial-gradient(ellipse, var(--carmin) 0%, transparent 70%)`,
                            filter: 'blur(15px)',
                          }} />
                      </div>
                      <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />

                      {artist.categories.some(c => c.toLowerCase().includes('en vivo')) && (
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-[var(--carmin)] rounded-sm">
                          <span className="w-1.5 h-1.5 rounded-full bg-white pulse-live" />
                          <span className="text-[10px] tracking-wider uppercase font-medium">En Vivo</span>
                        </div>
                      )}

                      {/* Lock overlay if not subscribed */}
                      {!isSubscribed && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <span className="text-2xl">🔒</span>
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <h3 className="text-base font-semibold mb-1 group-hover:text-[var(--gold)] transition-colors"
                        style={{ fontFamily: 'Playfair Display, serif' }}>
                        {artist.stage_name}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {artist.categories.slice(0, 2).map((c, idx) => (
                          <span key={c} className="text-[10px] text-[var(--text-muted)] tracking-wider uppercase capitalize">
                            {c}
                            {idx < Math.min(artist.categories.length, 2) - 1 ? ' ·' : ''}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--text-muted)]">
                          {(artist.total_earned || 0).toLocaleString()} MON ganado
                        </span>
                        <span className="badge badge-active text-[8px]">Verificada</span>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Empty states */}
        {!loading && artists.length === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">◇</div>
            <p className="text-[var(--text-muted)] text-lg" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              No hay artistas verificadas aún
            </p>
            <p className="text-[var(--text-muted)] text-sm mt-2">
              Las artistas están en proceso de verificación. Vuelve pronto.
            </p>
          </div>
        )}

        {!loading && artists.length > 0 && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--text-muted)] text-lg" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              No se encontraron artistas con esa búsqueda.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
