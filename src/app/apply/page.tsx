'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { ethers } from 'ethers';
import { VideoRecorder } from '@/components/VideoRecorder';
import { submitApplication, uploadAudition } from '@/lib/api';

const CATEGORIES = [
  { id: 'lenceria', label: 'Faceless Lencería', desc: 'Sets de fotos en lencería y traje de baño — del cuello para abajo' },
  { id: 'topless', label: 'Faceless Topless', desc: 'Contenido topless con poses elegantes — del cuello para abajo' },
  { id: 'cuerpo', label: 'Fotos Faceless de Cuerpo', desc: 'Fotos de cuerpo completo o parcial en cualquier estilo — del cuello para abajo' },
  { id: 'video', label: 'Videos Faceless', desc: 'Contenido en video, cámara del cuello para abajo' },
  { id: 'custom', label: 'Pedidos Personalizados', desc: 'Contenido faceless personalizado solicitado por suscriptores' },
  { id: 'envivo', label: 'Sesiones Faceless en Vivo', desc: 'Transmisiones privadas en vivo — cámara del cuello para abajo' },
];

const TOTAL_STEPS = 6;

export default function ApplyPage() {
  const { address, connect, signer } = useWallet();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [stageName, setStageName] = useState('');
  const [bio, setBio] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Record<string, boolean>>({});
  const [hardLimits, setHardLimits] = useState('');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [auditionVideo, setAuditionVideo] = useState<Blob | null>(null);

  const toggleCategory = (id: string) => {
    setSelectedCategories(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleSubmit = async () => {
    if (!signer || !address) return;
    setSubmitting(true);
    try {
      const profileData = JSON.stringify({
        stageName, bio, categories: selectedCategories, hardLimits, timestamp: Date.now(),
      });
      const profileHash = ethers.keccak256(ethers.toUtf8Bytes(profileData));
      console.log('Profile hash:', profileHash);

      // Submit application
      await submitApplication({
        wallet_address: address,
        stage_name: stageName,
        bio,
        categories: Object.keys(selectedCategories).filter(k => selectedCategories[k]),
        hard_limits: hardLimits,
        referrer: '',
      });

      // Upload audition video
      if (auditionVideo) {
        await uploadAudition(address, auditionVideo);
      }

      setSubmitted(true);
    } catch (err) {
      console.error('Error al enviar:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!address;
      case 2: return stageName.length >= 2 && bio.length >= 10;
      case 3: return Object.values(selectedCategories).some(Boolean);
      case 4: return ageConfirmed;
      case 5: return !!auditionVideo;
      case 6: return true;
      default: return false;
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-lg w-full text-center rounded-sm">
          <div className="text-6xl mb-6 text-[var(--gold)]">✦</div>
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Solicitud <span className="italic text-gradient-carmin">Recibida</span>
          </h1>
          <p className="text-[var(--text-secondary)] mb-2 text-sm">
            Tu estado: <span className="badge badge-pending">Pendiente</span>
          </p>
          <p className="text-[var(--text-secondary)] mb-8 text-sm leading-relaxed">
            Ahora ve a la sección de <strong className="text-[var(--text-primary)]">Tareas</strong> para completar tu verificación y empezar a ganar MON.
          </p>
          <a href="/tasks" className="btn-primary">Ir a Tareas</a>
          <p className="text-[var(--text-muted)] text-xs mt-4">
            Wallet: {address?.slice(0, 10)}...{address?.slice(-6)}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-3">Casting de Artistas</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Comienza tu <span className="italic text-gradient-carmin">Camino</span>
          </h1>
        </motion.div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-10">
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[var(--bg-elevated)]">
              <motion.div
                className="h-full rounded-full"
                style={{ background: i + 1 <= step ? 'linear-gradient(90deg, var(--carmin), var(--gold))' : 'transparent' }}
                initial={{ width: 0 }}
                animate={{ width: i + 1 <= step ? '100%' : '0%' }}
                transition={{ duration: 0.5 }}
              />
            </div>
          ))}
          <span className="text-xs text-[var(--text-muted)] ml-2">{step}/{TOTAL_STEPS}</span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="glass-card p-8 md:p-10 rounded-sm">

            {step === 1 && (
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Conecta tu Wallet</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-8">
                  Tu wallet es tu identidad en Encanta. Sin email, sin teléfono, sin datos personales.
                </p>
                {address ? (
                  <div className="glass-card p-6 rounded-sm text-center">
                    <div className="w-3 h-3 rounded-full bg-[var(--success)] mx-auto mb-3" />
                    <p className="text-[var(--gold)] text-sm font-medium mb-1">Wallet Conectada</p>
                    <p className="text-[var(--text-muted)] text-xs font-mono">{address}</p>
                  </div>
                ) : (
                  <button onClick={connect} className="btn-primary w-full text-center flex items-center justify-center gap-3">
                    <span>⬡</span> Conectar MetaMask
                  </button>
                )}
                <p className="text-[var(--text-muted)] text-xs mt-6 text-center">
                  Encanta funciona en la blockchain de Monad. Tu wallet se cambiará automáticamente.
                </p>
              </div>
            )}

            {step === 2 && (
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Crea tu Perfil</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-8">
                  Elige un nombre artístico que te represente. Esto es lo que verán los suscriptores.
                </p>
                <div className="space-y-6">
                  <div>
                    <label className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2 block">Nombre Artístico</label>
                    <input type="text" className="form-input" placeholder="ej. Luna Noir, Valentina Rose..."
                      value={stageName} onChange={(e) => setStageName(e.target.value)} maxLength={30} />
                  </div>
                  <div>
                    <label className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2 block">Bio</label>
                    <textarea className="form-input min-h-[120px] resize-none"
                      placeholder="Cuéntale a los suscriptores sobre tu estilo artístico, qué te inspira..."
                      value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} />
                    <p className="text-xs text-[var(--text-muted)] mt-1 text-right">{bio.length}/500</p>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-sm border border-[var(--border)] bg-[var(--bg-dark)]">
                  <p className="text-xs text-[var(--warning)] flex items-center gap-2">
                    <span>⚠</span> No incluyas tu nombre real, ubicación, ni información identificable en tu bio.
                  </p>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Categorías de Contenido</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-8">
                  Selecciona las categorías en las que aceptas crear contenido. Puedes cambiar esto en cualquier momento.
                </p>
                <div className="space-y-3">
                  {CATEGORIES.map((cat) => (
                    <div key={cat.id}
                      className={`p-4 rounded-sm border transition-all duration-300 cursor-pointer ${
                        selectedCategories[cat.id]
                          ? 'border-[var(--gold)] bg-[var(--gold-dim)]'
                          : 'border-[var(--border)] hover:border-[var(--border-hover)]'
                      }`}
                      onClick={() => toggleCategory(cat.id)}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" className="consent-check mt-1"
                          checked={!!selectedCategories[cat.id]}
                          onChange={() => toggleCategory(cat.id)}
                          onClick={(e) => e.stopPropagation()} />
                        <div>
                          <p className="text-sm font-medium">{cat.label}</p>
                          <p className="text-xs text-[var(--text-muted)] mt-1">{cat.desc}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Tus Límites y Confirmación</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-6">
                  Lista lo que <strong>no</strong> harás. Esto es privado — solo el equipo de Encanta lo ve.
                </p>
                <textarea className="form-input min-h-[140px] resize-none mb-6"
                  placeholder="Ejemplo:&#10;- No close-ups de cara&#10;- No locaciones al aire libre&#10;- No contenido con contacto físico..."
                  value={hardLimits} onChange={(e) => setHardLimits(e.target.value)} />

                <div className="flex items-start gap-3 p-4 rounded-sm border border-[var(--border)]">
                  <input type="checkbox" className="consent-check mt-0.5"
                    checked={ageConfirmed} onChange={(e) => setAgeConfirmed(e.target.checked)} />
                  <p className="text-sm text-[var(--text-secondary)]">
                    Confirmo que tengo <strong className="text-[var(--text-primary)]">18 años o más</strong> y
                    estoy aplicando voluntariamente. Entiendo que necesitaré verificar mi identidad
                    y presentar documentación de salud en la entrevista en persona.
                  </p>
                </div>
              </div>
            )}

            {step === 5 && (
              <VideoRecorder onRecorded={setAuditionVideo} />
            )}

            {step === 6 && (
              <div>
                <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>Revisa tu Solicitud</h2>
                <p className="text-[var(--text-secondary)] text-sm mb-8">
                  Verifica todo. Esta solicitud es <strong className="text-[var(--gold)]">completamente gratis</strong>.
                </p>
                <div className="space-y-4">
                  <div className="glass-card p-4 rounded-sm">
                    <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-1">Nombre Artístico</p>
                    <p className="text-lg font-medium" style={{ fontFamily: 'Playfair Display, serif' }}>{stageName}</p>
                  </div>
                  <div className="glass-card p-4 rounded-sm">
                    <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-1">Bio</p>
                    <p className="text-sm text-[var(--text-secondary)]">{bio}</p>
                  </div>
                  <div className="glass-card p-4 rounded-sm">
                    <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2">Categorías</p>
                    <div className="flex flex-wrap gap-2">
                      {CATEGORIES.filter(c => selectedCategories[c.id]).map(cat => (
                        <span key={cat.id} className="text-xs text-[var(--gold)] border border-[var(--gold)] px-2 py-1 rounded-sm">
                          {cat.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="glass-card p-4 rounded-sm">
                    <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-1">Video de Audición</p>
                    <p className="text-sm text-[var(--success)] flex items-center gap-2">
                      <span>✓</span> Video de audición grabado
                    </p>
                  </div>
                  <div className="glass-card p-4 rounded-sm">
                    <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-1">Wallet</p>
                    <p className="text-sm font-mono text-[var(--text-secondary)]">{address}</p>
                  </div>
                  <div className="p-4 rounded-sm border border-[var(--gold)] bg-[var(--gold-dim)]">
                    <p className="text-sm text-[var(--text-primary)] flex items-center gap-2">
                      <span className="text-[var(--gold)]">✦</span>
                      Costo de solicitud: <strong className="text-[var(--gold)]">GRATIS</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between mt-8">
          <button onClick={() => setStep(Math.max(1, step - 1))}
            className={`text-sm tracking-widest uppercase transition-colors ${
              step === 1 ? 'opacity-0 pointer-events-none' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}>
            ← Atrás
          </button>
          {step < TOTAL_STEPS ? (
            <button onClick={() => setStep(step + 1)} disabled={!canProceed()}
              className={`btn-primary ${!canProceed() ? 'opacity-30 cursor-not-allowed' : ''}`}>
              Continuar
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting} className="btn-primary shimmer-border">
              {submitting ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
