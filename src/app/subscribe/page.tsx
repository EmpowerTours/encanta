'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { checkSubscription } from '@/lib/api';
import Link from 'next/link';

export default function SubscribePage() {
  const { address, connect } = useWallet();
  const [referrer, setReferrer] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [expiry, setExpiry] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) { setLoading(false); return; }
    const load = async () => {
      try {
        const data = await checkSubscription(address);
        setSubscribed(data.active);
        setExpiry(data.expiry);
      } catch {
        // not subscribed or error
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [address]);

  const handleSubscribe = async () => {
    if (!address) { connect(); return; }
    setSubscribing(true);
    try {
      // TODO: call smart contract Encanta.subscribeWithMON(referrer || address(0))
      // For now show success state — actual MON transaction needs smart contract
      alert('La suscripción requiere interacción con el smart contract. Próximamente.');
    } finally {
      setSubscribing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--text-muted)] text-sm tracking-widest uppercase">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-3">Suscripción</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Acceso <span className="italic text-gradient-carmin">Completo</span>
          </h1>
        </motion.div>

        {subscribed ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="glass-card p-8 rounded-sm text-center">
            <span className="text-4xl block mb-4">✦</span>
            <h2 className="text-xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              Ya estás suscrito
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-2">Tu suscripción está activa.</p>
            {expiry && (
              <p className="text-xs text-[var(--text-muted)] mb-4">Expira: {expiry}</p>
            )}
            <Link href="/explore" className="btn-primary">Explorar Artistas</Link>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {/* Price card */}
            <div className="glass-card p-8 rounded-sm text-center mb-6 shimmer-border">
              <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-4">Un solo plan</p>
              <p className="text-5xl font-bold text-gradient-gold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                100 MON
              </p>
              <p className="text-sm text-[var(--text-muted)]">por mes — acceso al feed completo</p>
            </div>

            {/* Benefits */}
            <div className="glass-card p-6 rounded-sm mb-6">
              <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-4">Incluye</p>
              <ul className="space-y-3">
                {[
                  'Acceso completo a TODAS las artistas verificadas',
                  'Contenido faceless exclusivo — fotos y videos',
                  'El 90% va al pool — distribuido por engagement (likes + colecciones)',
                  'Tus likes y colecciones determinan qué artistas ganan más del pool',
                  'Sin contratos — cancela cuando quieras',
                  'Pago con crypto — sin estados de cuenta bancarios',
                  'Tu wallet es tu identidad — 100% anónimo',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                    <span className="text-[var(--gold)] mt-0.5 text-xs">◆</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Referral input */}
            <div className="glass-card p-5 rounded-sm mb-6">
              <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-2">
                Código de Referido (opcional)
              </p>
              <input
                type="text"
                className="form-input"
                placeholder="Wallet de quien te invitó (0x...)"
                value={referrer}
                onChange={(e) => setReferrer(e.target.value)}
              />
              <p className="text-[10px] text-[var(--text-muted)] mt-2">
                Si alguien te invitó, ellos reciben +7 días gratis en su suscripción.
              </p>
            </div>

            {/* Subscribe button */}
            {address ? (
              <button onClick={handleSubscribe} disabled={subscribing}
                className="btn-primary w-full text-center shimmer-border">
                {subscribing ? 'Procesando...' : 'Suscribirse — 100 MON/mes'}
              </button>
            ) : (
              <button onClick={connect} className="btn-primary w-full text-center">
                Conectar Wallet para Suscribirse
              </button>
            )}

            <p className="text-center text-xs text-[var(--text-muted)] mt-4">
              Al suscribirte aceptas los <Link href="/terms" className="text-[var(--gold)] underline">términos de servicio</Link>.
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
