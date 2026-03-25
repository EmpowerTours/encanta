'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { fetchCollection } from '@/lib/api';
import Link from 'next/link';

interface CollectionItem {
  contentId: string;
  artistWallet: string;
  artistName: string;
  category: string;
}

export default function CollectionPage() {
  const { address, connect } = useWallet();
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<CollectionItem | null>(null);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchCollection(address)
      .then((res) => {
        const mapped = (res.items || []).map((item) => ({
          contentId: (item.content_id as string) || (item.contentId as string) || '',
          artistWallet: (item.artist_wallet as string) || (item.artistWallet as string) || '',
          artistName: (item.artist_name as string) || (item.artistName as string) || '',
          category: (item.category as string) || '',
        }));
        setItems(mapped);
      })
      .catch((err) => {
        console.error('Error fetching collection:', err);
        setItems([]);
      })
      .finally(() => setLoading(false));
  }, [address]);

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass-card p-12 max-w-md w-full text-center rounded-sm">
          <div className="text-5xl mb-4 text-[var(--gold)]">◆</div>
          <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Conecta tu Wallet
          </h2>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Tu colección está vinculada a tu wallet.
          </p>
          <button onClick={connect} className="btn-primary">Conectar MetaMask</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-3">Tu Espacio</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Mi <span className="italic text-gradient-carmin">Colección</span>
          </h1>
          {!loading && (
            <p className="text-[var(--text-secondary)] text-sm mt-2">
              {items.length} {items.length === 1 ? 'pieza' : 'piezas'} desbloqueadas
            </p>
          )}
        </motion.div>

        {/* Loading state */}
        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[var(--text-muted)] text-sm">Cargando colección...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">◇</div>
            <p className="text-[var(--text-muted)] text-lg mb-2" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              Tu colección está vacía
            </p>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Desliza hacia arriba en el Feed para desbloquear contenido.
            </p>
            <Link href="/feed" className="btn-primary">Ir al Feed</Link>
          </motion.div>
        )}

        {/* Collection grid */}
        {!loading && items.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {items.map((item, i) => (
              <motion.div
                key={item.contentId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="cursor-pointer"
                onClick={() => setSelectedItem(item)}
              >
                <div className="glass-card rounded-sm overflow-hidden group">
                  <div className="silhouette aspect-[3/4] relative">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-24 h-32 rounded-full opacity-20"
                        style={{
                          background: `radial-gradient(ellipse, var(--carmin) 0%, transparent 70%)`,
                          filter: 'blur(15px)',
                        }} />
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-[var(--bg-card)] to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] text-[var(--gold)] tracking-wider uppercase px-2 py-1 border border-[var(--gold)] rounded-sm bg-[rgba(0,0,0,0.5)]">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-base font-semibold group-hover:text-[var(--gold)] transition-colors"
                      style={{ fontFamily: 'Playfair Display, serif' }}>
                      {item.artistName}
                    </h3>
                    <span className="text-xs text-[var(--text-muted)] capitalize">{item.category}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Full-screen view */}
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-6"
            onClick={() => setSelectedItem(null)}
          >
            <div className="max-w-lg w-full" onClick={e => e.stopPropagation()}>
              <div className="silhouette aspect-[3/4] rounded-sm relative mb-4">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-48 h-64 rounded-full opacity-30"
                    style={{
                      background: `radial-gradient(ellipse, var(--carmin) 0%, transparent 70%)`,
                      filter: 'blur(20px)',
                    }} />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-center" style={{ fontFamily: 'Playfair Display, serif' }}>
                {selectedItem.artistName}
              </h3>
              <p className="text-center text-[var(--text-muted)] text-sm mt-1 capitalize">{selectedItem.category}</p>
              <button onClick={() => setSelectedItem(null)}
                className="btn-secondary w-full text-center mt-4">
                Cerrar
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
