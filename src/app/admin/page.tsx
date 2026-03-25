'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { fetchArtists } from '@/lib/api';
import { ADMIN_WALLETS } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Tab = 'solicitudes' | 'artistas' | 'estadisticas';

interface Application {
  wallet_address: string;
  stage_name: string;
  applied_at: string;
  categories: string[];
  interview_date?: string;
}

interface Artist {
  wallet_address: string;
  stage_name: string;
  status: string;
  views: number;
  earned: number;
  health_until?: string;
}

interface Stats {
  total_artists: number;
  active_artists: number;
  total_subscribers: number;
  monthly_pool: number;
  platform_revenue: number;
  artist_pool: number;
  pending_applications: number;
  verification_budget: number;
  verification_used: number;
}

export default function AdminPage() {
  const { address, connect } = useWallet();
  const [tab, setTab] = useState<Tab>('solicitudes');
  const [processingAction, setProcessingAction] = useState<string | null>(null);

  const [applications, setApplications] = useState<Application[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);

  const [loadingApps, setLoadingApps] = useState(true);
  const [loadingArtists, setLoadingArtists] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);

  const [errorApps, setErrorApps] = useState<string | null>(null);
  const [errorArtists, setErrorArtists] = useState<string | null>(null);
  const [errorStats, setErrorStats] = useState<string | null>(null);

  const loadApplications = useCallback(async () => {
    setLoadingApps(true);
    setErrorApps(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/pending`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setApplications(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      setErrorApps(err instanceof Error ? err.message : 'Error al cargar solicitudes');
    } finally {
      setLoadingApps(false);
    }
  }, []);

  const loadArtists = useCallback(async () => {
    setLoadingArtists(true);
    setErrorArtists(null);
    try {
      const data = await fetchArtists();
      setArtists((data as unknown as Artist[]) || []);
    } catch (err: unknown) {
      setErrorArtists(err instanceof Error ? err.message : 'Error al cargar artistas');
    } finally {
      setLoadingArtists(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    setErrorStats(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/stats`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      setStats(data);
    } catch (err: unknown) {
      setErrorStats(err instanceof Error ? err.message : 'Error al cargar estadísticas');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    if (!address) return;
    loadApplications();
    loadArtists();
    loadStats();
  }, [address, loadApplications, loadArtists, loadStats]);

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Acceso de Administrador</h1>
          <button onClick={connect} className="btn-primary">Conectar Wallet</button>
        </div>
      </div>
    );
  }

  if (!ADMIN_WALLETS.has(address.toLowerCase())) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>No Autorizado</h1>
          <p className="text-[var(--text-secondary)] text-sm">Esta wallet no tiene permisos de administrador.</p>
        </div>
      </div>
    );
  }

  const handleApprove = async (wallet: string) => {
    setProcessingAction(`Aprobar-${wallet}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/approve/${wallet}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await loadApplications();
      await loadArtists();
      await loadStats();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al aprobar');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleSuspend = async (wallet: string) => {
    setProcessingAction(`Suspender-${wallet}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/suspend/${wallet}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await loadArtists();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al suspender');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReactivate = async (wallet: string) => {
    setProcessingAction(`Reactivar-${wallet}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/reactivate/${wallet}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await loadArtists();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al reactivar');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleHealth = async (wallet: string) => {
    setProcessingAction(`Salud-${wallet}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/verify-health/${wallet}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await loadArtists();
      await loadApplications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al verificar salud');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleReject = async (wallet: string) => {
    setProcessingAction(`Rechazar-${wallet}`);
    try {
      const res = await fetch(`${API_URL}/api/admin/reject/${wallet}`, { method: 'POST' });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      await loadApplications();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Error al rechazar');
    } finally {
      setProcessingAction(null);
    }
  };

  const LoadingSpinner = () => (
    <div className="flex justify-center py-12">
      <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const ErrorBox = ({ message }: { message: string }) => (
    <div className="text-center py-12">
      <p className="text-[var(--carmin-light)] text-sm">{message}</p>
    </div>
  );

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-2">Administración</p>
          <h1 className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            Panel de <span className="italic text-gradient-carmin">Admin</span>
          </h1>
        </motion.div>

        <div className="flex gap-2 mb-8 overflow-x-auto">
          {[
            { id: 'solicitudes' as Tab, label: 'Solicitudes', count: applications.length },
            { id: 'artistas' as Tab, label: 'Artistas', count: artists.length },
            { id: 'estadisticas' as Tab, label: 'Estadísticas', count: null },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-5 py-2.5 text-xs tracking-widest uppercase rounded-sm transition-all flex items-center gap-2 whitespace-nowrap ${
                tab === t.id
                  ? 'bg-[var(--carmin)] text-white'
                  : 'border border-[var(--border)] text-[var(--text-muted)]'
              }`}>
              {t.label}
              {t.count !== null && (
                <span className={`px-1.5 py-0.5 rounded-sm text-[10px] ${
                  tab === t.id ? 'bg-white/20' : 'bg-[var(--bg-elevated)]'
                }`}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'solicitudes' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {loadingApps ? (
              <LoadingSpinner />
            ) : errorApps ? (
              <ErrorBox message={errorApps} />
            ) : applications.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)] text-sm">No hay solicitudes pendientes.</p>
              </div>
            ) : (
              applications.map((app, i) => (
                <motion.div
                  key={app.wallet_address}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="glass-card p-6 rounded-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                          {app.stage_name}
                        </h3>
                        <span className="badge badge-pending">Pendiente</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                        <span>Wallet: {app.wallet_address.slice(0, 6)}...{app.wallet_address.slice(-4)}</span>
                        <span>Solicitud: {app.applied_at}</span>
                        {app.interview_date && <span>Entrevista: {app.interview_date}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(app.categories || []).map(c => (
                          <span key={c} className="text-[10px] tracking-wider uppercase text-[var(--text-muted)] border border-[var(--border)] px-2 py-0.5 rounded-sm capitalize">
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleHealth(app.wallet_address)}
                        disabled={processingAction === `Salud-${app.wallet_address}`}
                        className="px-4 py-2 text-xs tracking-wider uppercase border border-[var(--warning)] text-[var(--warning)] rounded-sm hover:bg-[rgba(196,135,46,0.1)] transition-colors">
                        {processingAction === `Salud-${app.wallet_address}` ? '...' : 'Salud'}
                      </button>
                      <button
                        onClick={() => handleApprove(app.wallet_address)}
                        disabled={processingAction === `Aprobar-${app.wallet_address}`}
                        className="px-4 py-2 text-xs tracking-wider uppercase bg-[var(--success)] text-white rounded-sm hover:opacity-90 transition-opacity">
                        {processingAction === `Aprobar-${app.wallet_address}` ? '...' : 'Aprobar'}
                      </button>
                      <button
                        onClick={() => handleReject(app.wallet_address)}
                        disabled={processingAction === `Rechazar-${app.wallet_address}`}
                        className="px-4 py-2 text-xs tracking-wider uppercase border border-[var(--carmin)] text-[var(--carmin-light)] rounded-sm hover:bg-[rgba(155,27,48,0.1)] transition-colors">
                        {processingAction === `Rechazar-${app.wallet_address}` ? '...' : 'Rechazar'}
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        )}

        {tab === 'artistas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {loadingArtists ? (
              <LoadingSpinner />
            ) : errorArtists ? (
              <ErrorBox message={errorArtists} />
            ) : artists.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)] text-sm">No hay artistas registradas.</p>
              </div>
            ) : (
              artists.map((artist, i) => {
                const isActive = artist.status === 'active' || artist.status === 'Activa';
                return (
                  <motion.div
                    key={artist.wallet_address}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="glass-card p-6 rounded-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                            {artist.stage_name}
                          </h3>
                          <span className={`badge ${isActive ? 'badge-active' : 'badge-suspended'}`}>
                            {isActive ? 'Activa' : 'Suspendida'}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-[var(--text-muted)]">
                          <span>{artist.wallet_address.slice(0, 6)}...{artist.wallet_address.slice(-4)}</span>
                          <span>{(artist.views || 0).toLocaleString()} vistas</span>
                          <span>{artist.earned || 0} MON ganados</span>
                          {artist.health_until && <span>Salud hasta {artist.health_until}</span>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleHealth(artist.wallet_address)}
                          disabled={processingAction === `Salud-${artist.wallet_address}`}
                          className="px-3 py-2 text-xs tracking-wider uppercase border border-[var(--warning)] text-[var(--warning)] rounded-sm hover:bg-[rgba(196,135,46,0.1)] transition-colors">
                          {processingAction === `Salud-${artist.wallet_address}` ? '...' : 'Salud'}
                        </button>
                        {isActive ? (
                          <button onClick={() => handleSuspend(artist.wallet_address)}
                            disabled={processingAction === `Suspender-${artist.wallet_address}`}
                            className="px-3 py-2 text-xs tracking-wider uppercase border border-[var(--carmin)] text-[var(--carmin-light)] rounded-sm hover:bg-[rgba(155,27,48,0.1)] transition-colors">
                            {processingAction === `Suspender-${artist.wallet_address}` ? '...' : 'Suspender'}
                          </button>
                        ) : (
                          <button onClick={() => handleReactivate(artist.wallet_address)}
                            disabled={processingAction === `Reactivar-${artist.wallet_address}`}
                            className="px-3 py-2 text-xs tracking-wider uppercase bg-[var(--success)] text-white rounded-sm hover:opacity-90 transition-opacity">
                            {processingAction === `Reactivar-${artist.wallet_address}` ? '...' : 'Reactivar'}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}

        {tab === 'estadisticas' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {loadingStats ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : errorStats ? (
              <div className="text-center py-12">
                <p className="text-[var(--carmin-light)] text-sm">{errorStats}</p>
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                  {[
                    { label: 'Artistas Totales', value: stats.total_artists },
                    { label: 'Artistas Activas', value: stats.active_artists },
                    { label: 'Solicitudes Pendientes', value: stats.pending_applications },
                    { label: 'Suscriptores', value: stats.total_subscribers },
                    { label: 'Pool Mensual (90%)', value: `${(stats.artist_pool || 0).toLocaleString()} MON` },
                    { label: 'Ingreso Plataforma (10%)', value: `${(stats.platform_revenue || 0).toLocaleString()} MON` },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className="glass-card p-6 rounded-sm">
                      <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2">{stat.label}</p>
                      <p className="text-2xl font-bold text-gradient-gold" style={{ fontFamily: 'Playfair Display, serif' }}>
                        {stat.value}
                      </p>
                    </motion.div>
                  ))}
                </div>

                {/* Verification budget */}
                <div className="glass-card p-6 rounded-sm mb-6">
                  <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-3">Presupuesto de Verificación</p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-[var(--text-secondary)]">Usado: {stats.verification_used} MON</span>
                    <span className="text-sm text-[var(--text-secondary)]">Presupuesto: {stats.verification_budget} MON/mes</span>
                  </div>
                  <div className="milestone-bar">
                    <div className="milestone-fill" style={{ width: `${stats.verification_budget > 0 ? (stats.verification_used / stats.verification_budget) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Quedan {stats.verification_budget - stats.verification_used} MON — para {Math.floor((stats.verification_budget - stats.verification_used) / 15)} artistas más
                  </p>
                </div>

                {/* Revenue breakdown */}
                <div className="glass-card p-6 rounded-sm">
                  <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-3">Modelo de Ingresos</p>
                  <div className="space-y-3 text-sm text-[var(--text-secondary)]">
                    <div className="flex justify-between p-3 border border-[var(--border)] rounded-sm">
                      <span>Suscripción mensual</span>
                      <span className="text-[var(--gold)]">100 MON/mes</span>
                    </div>
                    <div className="flex justify-between p-3 border border-[var(--border)] rounded-sm">
                      <span>Pool de artistas (90%)</span>
                      <span className="text-[var(--gold)]">90 MON/suscriptor</span>
                    </div>
                    <div className="flex justify-between p-3 border border-[var(--border)] rounded-sm">
                      <span>Plataforma (10%)</span>
                      <span className="text-[var(--gold)]">10 MON/suscriptor</span>
                    </div>
                    <div className="flex justify-between p-3 border border-[var(--gold)] bg-[var(--gold-dim)] rounded-sm">
                      <span>Distribución a artistas</span>
                      <span className="text-[var(--gold)]">Por vistas + likes</span>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </motion.div>
        )}
      </div>
    </div>
  );
}
