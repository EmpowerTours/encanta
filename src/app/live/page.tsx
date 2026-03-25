'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { fetchLiveRooms, createLiveRoom } from '@/lib/api';
import type { LiveRoom } from '@/lib/types';

export default function LivePage() {
  const { address, connect } = useWallet();
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPrice, setNewPrice] = useState('0');
  const [creating, setCreating] = useState(false);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveRooms();
      setRooms(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al cargar salas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !address) return;
    setCreating(true);
    try {
      await createLiveRoom(address, newTitle.trim(), parseFloat(newPrice) || 0);
      setShowCreate(false);
      setNewTitle('');
      setNewPrice('0');
      await loadRooms();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al crear sala');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-3">Transmisiones</p>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
              En <span className="italic text-gradient-carmin">Vivo</span>
            </h1>
          </div>
          {address && (
            <button onClick={() => setShowCreate(!showCreate)} className="btn-primary text-xs">
              + Crear Sala
            </button>
          )}
        </motion.div>

        {/* Create room form */}
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-card p-6 rounded-sm mb-8">
            <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Nueva Sala</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2 block">Título</label>
                <input type="text" className="form-input" placeholder="ej. Noche de Drama"
                  value={newTitle} onChange={e => setNewTitle(e.target.value)} maxLength={100} />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2 block">
                  Precio de Entrada (MON) — 0 = gratis
                </label>
                <input type="number" className="form-input max-w-[200px]" min="0" max="100" step="0.5"
                  value={newPrice} onChange={e => setNewPrice(e.target.value)} />
              </div>
              <div className="flex gap-3">
                <button onClick={handleCreate} disabled={!newTitle.trim() || creating} className="btn-primary">
                  {creating ? 'Creando...' : 'Crear Sala'}
                </button>
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Room list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-[var(--carmin-light)] text-sm mb-4">{error}</p>
            <button onClick={loadRooms} className="btn-secondary text-xs">Reintentar</button>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-30">●</div>
            <p className="text-[var(--text-muted)] text-lg" style={{ fontFamily: 'Cormorant Garamond, serif' }}>
              No hay salas activas en este momento.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {rooms.map((room, i) => (
              <motion.div
                key={room.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="glass-card p-6 rounded-sm">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {room.status === 'live' && (
                          <span className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--carmin)] rounded-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-white pulse-live" />
                            <span className="text-[10px] tracking-wider uppercase font-medium">En Vivo</span>
                          </span>
                        )}
                        {room.status === 'waiting' && (
                          <span className="badge badge-pending">Esperando</span>
                        )}
                        <h3 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                          {room.title}
                        </h3>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-[var(--text-secondary)]">
                        <span>{room.artist1Name}</span>
                        {room.artist2Name && (
                          <>
                            <span className="text-[var(--text-muted)]">&</span>
                            <span>{room.artist2Name}</span>
                          </>
                        )}
                        {!room.artist2Name && (
                          <span className="text-[var(--text-muted)] italic text-xs">esperando segunda artista</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-[var(--text-muted)]">
                        <span>{room.audienceCount} viendo</span>
                        <span>{room.price > 0 ? `${room.price} MON` : 'Gratis'}</span>
                      </div>
                    </div>

                    <Link href={`/live/${room.id}`}
                      className={`btn-primary text-xs whitespace-nowrap ${!address ? 'opacity-50 pointer-events-none' : ''}`}>
                      {room.price > 0 ? `Ver — ${room.price} MON` : 'Ver Gratis'}
                    </Link>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!address && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-8">
            <p className="text-[var(--text-muted)] text-sm mb-4">Conecta tu wallet para ver shows en vivo</p>
            <button onClick={connect} className="btn-primary">Conectar MetaMask</button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
