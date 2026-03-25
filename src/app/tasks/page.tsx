'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { getTaskStatus, submitTask } from '@/lib/api';
import Link from 'next/link';

interface Task {
  id: number;
  title: string;
  description: string;
  requirements: string[];
  payout: number;
  status: 'locked' | 'available' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  submittedFiles?: string[];
  rejectionNote?: string;
}

export default function TasksPage() {
  const { address, connect } = useWallet();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noApplication, setNoApplication] = useState(false);
  const [activeTask, setActiveTask] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [claiming, setClaiming] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    setError(null);
    setNoApplication(false);

    getTaskStatus(address)
      .then((data) => {
        const taskList = data as unknown as Task[];
        if (!taskList || taskList.length === 0) {
          setNoApplication(true);
          setTasks([]);
        } else {
          setTasks(taskList);
        }
      })
      .catch((err) => {
        const msg = err?.message || '';
        if (msg.includes('404') || msg.includes('not found') || msg.toLowerCase().includes('no application')) {
          setNoApplication(true);
        } else {
          setError(msg || 'Error al cargar tareas');
        }
      })
      .finally(() => setLoading(false));
  }, [address]);

  const totalEarned = tasks.filter(t => t.status === 'approved').reduce((sum, t) => sum + t.payout, 0);
  const totalPending = tasks.filter(t => t.status === 'in_review').reduce((sum, t) => sum + t.payout, 0);
  const completedCount = tasks.filter(t => t.status === 'approved').length;
  const totalPayout = tasks.reduce((sum, t) => sum + t.payout, 0);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'locked': return '🔒';
      case 'available': return '○';
      case 'submitted': return '◐';
      case 'in_review': return '◑';
      case 'approved': return '✓';
      case 'rejected': return '✗';
    }
  };

  const getStatusLabel = (status: Task['status']) => {
    switch (status) {
      case 'locked': return 'Bloqueada';
      case 'available': return 'Disponible';
      case 'submitted': return 'Enviada';
      case 'in_review': return 'En Revisión';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Reenviar';
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'locked': return 'text-[var(--text-muted)]';
      case 'available': return 'text-[var(--gold)]';
      case 'submitted': return 'text-[var(--warning)]';
      case 'in_review': return 'text-[var(--warning)]';
      case 'approved': return 'text-[var(--success)]';
      case 'rejected': return 'text-[var(--carmin-light)]';
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (taskId: number) => {
    if (selectedFiles.length === 0 || !address) return;
    setUploading(true);
    try {
      await submitTask(address, taskId, selectedFiles);
      // Refetch tasks to get updated status from backend
      const updated = await getTaskStatus(address) as unknown as Task[];
      setTasks(updated);
      setSelectedFiles([]);
      setActiveTask(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al enviar tarea';
      alert(message);
    } finally {
      setUploading(false);
    }
  };

  const handleClaim = async (taskId: number) => {
    setClaiming(taskId);
    try {
      const task = tasks.find(t => t.id === taskId);
      alert(`${task?.payout} MON se enviarán a tu wallet cuando el contrato inteligente esté activo. Guarda tu progreso.`);
    } finally {
      setClaiming(null);
    }
  };

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center">
          <span className="text-5xl text-[var(--gold)] block mb-6">✦</span>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            Conecta para Empezar a Ganar
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Completa tareas de verificación y recibe pago en MON.
          </p>
          <button onClick={connect} className="btn-primary">Conectar Wallet</button>
        </motion.div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center">
          <div className="w-8 h-8 border-2 border-[var(--gold)] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[var(--text-muted)] text-sm">Cargando tareas...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center">
          <span className="text-4xl block mb-4">⚠</span>
          <p className="text-[var(--carmin-light)] text-sm mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-secondary text-xs">
            Reintentar
          </button>
        </motion.div>
      </div>
    );
  }

  if (noApplication) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center">
          <span className="text-5xl text-[var(--gold)] block mb-6">✦</span>
          <h1 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            Aplica primero para ver tus tareas
          </h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6">
            Debes enviar tu solicitud antes de acceder a las tareas de verificación.
          </p>
          <Link href="/apply" className="btn-primary">Ir a Aplicar</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-24 pb-28 md:pt-28 md:px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-2">Verificación</p>
          <h1 className="text-2xl md:text-3xl font-bold"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            Tus <span className="italic text-gradient-carmin">Tareas</span>
          </h1>
        </motion.div>

        {/* Earnings bar */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-4 rounded-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Ganado</p>
                <p className="text-lg font-bold text-[var(--gold)]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {totalEarned} MON
                </p>
              </div>
              <div>
                <p className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Pendiente</p>
                <p className="text-lg font-bold text-[var(--warning)]" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {totalPending} MON
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase">Progreso</p>
              <p className="text-sm text-[var(--text-secondary)]">{completedCount}/{tasks.length} tareas</p>
            </div>
          </div>
          <div className="milestone-bar">
            <motion.div
              className="milestone-fill"
              initial={{ width: 0 }}
              animate={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-[var(--text-muted)]">Inicio</span>
            <span className="text-[10px] text-[var(--text-muted)]">Verificada — {totalPayout} MON total</span>
          </div>
        </motion.div>

        {/* Task list */}
        <div className="space-y-3">
          {tasks.map((task, i) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <div
                className={`glass-card rounded-sm overflow-hidden transition-all duration-300 ${
                  task.status === 'locked' ? 'opacity-50' : ''
                } ${activeTask === task.id ? 'border-[var(--gold)]' : ''}`}
              >
                <button
                  onClick={() => task.status !== 'locked' && setActiveTask(activeTask === task.id ? null : task.id)}
                  disabled={task.status === 'locked'}
                  className="w-full p-4 flex items-center gap-4 text-left"
                >
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-sm flex-shrink-0 ${
                    task.status === 'approved'
                      ? 'border-[var(--success)] bg-[rgba(45,134,89,0.15)]'
                      : task.status === 'rejected'
                        ? 'border-[var(--carmin)] bg-[rgba(155,27,48,0.15)]'
                        : task.status === 'available'
                          ? 'border-[var(--gold)] bg-[var(--gold-dim)]'
                          : 'border-[var(--border)]'
                  }`}>
                    <span className={getStatusColor(task.status)}>{getStatusIcon(task.status)}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium truncate">{task.title}</h3>
                      <span className={`text-[10px] tracking-wider uppercase ${getStatusColor(task.status)}`}>
                        {getStatusLabel(task.status)}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{task.description}</p>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-[var(--gold)]" style={{ fontFamily: 'Playfair Display, serif' }}>
                      {task.payout}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)]">MON</p>
                  </div>
                </button>

                <AnimatePresence>
                  {activeTask === task.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1 border-t border-[var(--border)]">
                        <div className="mb-4 mt-3">
                          <p className="text-[10px] text-[var(--text-muted)] tracking-widest uppercase mb-2">Requisitos</p>
                          <ul className="space-y-1.5">
                            {task.requirements.map((req, ri) => (
                              <li key={ri} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                                <span className="text-[var(--gold)] mt-0.5 text-[8px]">◆</span>
                                {req}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {task.status === 'rejected' && task.rejectionNote && (
                          <div className="mb-4 p-3 rounded-sm border border-[var(--carmin)] bg-[rgba(155,27,48,0.1)]">
                            <p className="text-xs text-[var(--carmin-light)]">
                              <strong>Retroalimentación:</strong> {task.rejectionNote}
                            </p>
                          </div>
                        )}

                        {(task.status === 'available' || task.status === 'rejected') && task.id !== 6 && (
                          <div>
                            <input
                              ref={fileInputRef}
                              type="file"
                              multiple
                              accept="image/*,video/*"
                              onChange={handleFileSelect}
                              className="hidden"
                            />

                            {selectedFiles.length === 0 ? (
                              <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full border-2 border-dashed border-[var(--border)] rounded-sm p-6 text-center hover:border-[var(--border-hover)] transition-colors">
                                <span className="text-xl text-[var(--gold)] block mb-1">+</span>
                                <p className="text-xs text-[var(--text-secondary)]">Toca para seleccionar fotos/video</p>
                              </button>
                            ) : (
                              <div>
                                <div className="flex flex-wrap gap-2 mb-3">
                                  {selectedFiles.map((file, fi) => (
                                    <div key={fi} className="px-3 py-1.5 bg-[var(--bg-elevated)] rounded-sm text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                      <span>{file.name}</span>
                                      <button
                                        onClick={() => setSelectedFiles(prev => prev.filter((_, idx) => idx !== fi))}
                                        className="text-[var(--text-muted)] hover:text-[var(--carmin-light)]">
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="text-xs text-[var(--gold)] mb-3 block">
                                  + Agregar más archivos
                                </button>
                                <button
                                  onClick={() => handleSubmit(task.id)}
                                  disabled={uploading}
                                  className="btn-primary w-full text-center">
                                  {uploading ? 'Subiendo...' : `Enviar para Revisión — Ganar ${task.payout} MON`}
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {task.id === 6 && task.status === 'available' && (
                          <div className="p-4 rounded-sm border border-[var(--gold)] bg-[var(--gold-dim)]">
                            <p className="text-xs text-[var(--text-primary)] mb-2">
                              Completaste todas las tareas en línea. Agenda tu entrevista en persona para terminar la verificación y ganar {task.payout} MON.
                            </p>
                            <p className="text-xs text-[var(--text-muted)]">
                              Trae: Identificación oficial + resultados de ETS (30 días) + tú misma
                            </p>
                          </div>
                        )}

                        {(task.status === 'submitted' || task.status === 'in_review') && (
                          <div className="p-3 rounded-sm border border-[var(--warning)] bg-[rgba(196,135,46,0.1)]">
                            <p className="text-xs text-[var(--warning)]">
                              Enviado y esperando revisión. Te notificaremos cuando sea aprobado.
                            </p>
                          </div>
                        )}

                        {task.status === 'approved' && (
                          <div className="flex items-center justify-between p-3 rounded-sm border border-[var(--success)] bg-[rgba(45,134,89,0.1)]">
                            <p className="text-xs text-[var(--success)]">Aprobada y verificada</p>
                            <button
                              onClick={() => handleClaim(task.id)}
                              disabled={claiming === task.id}
                              className="px-4 py-2 text-xs tracking-wider uppercase bg-[var(--success)] text-white rounded-sm hover:opacity-90 transition-opacity">
                              {claiming === task.id ? '...' : `Reclamar ${task.payout} MON`}
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ))}
        </div>

        {tasks.length > 0 && completedCount === tasks.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 glass-card p-8 rounded-sm text-center shimmer-border">
            <span className="text-4xl block mb-4">✦</span>
            <h2 className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Completamente <span className="italic text-gradient-carmin">Verificada</span>
            </h2>
            <p className="text-[var(--text-secondary)] text-sm mb-4">
              Ganaste {totalPayout} MON y desbloqueaste las suscripciones.
              Los suscriptores ahora pueden acceder a tu contenido.
            </p>
            <span className="badge badge-active">Artista Verificada</span>
          </motion.div>
        )}

        <div className="mt-6 p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-dark)]">
          <p className="text-[10px] text-[var(--text-muted)] leading-relaxed">
            <span className="text-[var(--gold)]">◆ Privacidad:</span> Todo el contenido enviado es encriptado y almacenado de forma segura. Solo revisores autorizados ven tus envíos. Ningún contenido se publica sin tu consentimiento explícito. Tu dirección de wallet es tu único identificador — sin datos personales en la blockchain.
          </p>
        </div>
      </div>
    </div>
  );
}
