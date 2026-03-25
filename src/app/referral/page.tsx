'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';

export default function ReferralPage() {
  const { address, connect, shortAddress } = useWallet();
  const [copied, setCopied] = useState('');

  const referralCode = address || '';
  const shareTextArtist = `Gana dinero con tu cuerpo de forma anónima. Únete a Encanta — contenido faceless premium. Usa mi código: ${shortAddress}`;
  const shareTextSub = `Únete a Encanta — contenido faceless premium. Usa mi código al suscribirte: ${shortAddress}`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  if (!address) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>Conecta tu Wallet</h1>
          <p className="text-[var(--text-secondary)] text-sm mb-6">Accede a tu panel de referidos.</p>
          <button onClick={connect} className="btn-primary">Conectar Wallet</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-lg mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-3">Programa de Referidos</p>
          <h1 className="text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Invita y <span className="italic text-gradient-carmin">Gana</span>
          </h1>
        </motion.div>

        {/* Referral code */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6 rounded-sm mb-6 text-center">
          <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-3">Tu Código de Referido</p>
          <p className="text-sm font-mono text-[var(--gold)] bg-[var(--bg-dark)] p-3 rounded-sm break-all mb-3">
            {referralCode}
          </p>
          <button
            onClick={() => copyToClipboard(referralCode, 'code')}
            className="btn-secondary text-xs">
            {copied === 'code' ? '¡Copiado!' : 'Copiar Código'}
          </button>
        </motion.div>

        {/* Invite Artists */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card p-6 rounded-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-[var(--gold)]">✦</span>
            <div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                Invita Artistas
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Gana 5 MON por cada artista verificada</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
            Cuando una artista aplica con tu código y completa la verificación, recibes <strong className="text-[var(--gold)]">5 MON</strong> de bono automáticamente.
          </p>
          <div className="p-3 bg-[var(--bg-dark)] rounded-sm mb-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Mensaje para compartir:</p>
            <p className="text-sm text-[var(--text-secondary)] italic">&ldquo;{shareTextArtist}&rdquo;</p>
          </div>
          <button onClick={() => copyToClipboard(shareTextArtist, 'artist')}
            className="text-xs text-[var(--gold)] tracking-wider uppercase">
            {copied === 'artist' ? '¡Copiado!' : 'Copiar Mensaje'}
          </button>
        </motion.div>

        {/* Invite Subscribers */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card p-6 rounded-sm mb-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl text-[var(--gold)]">◈</span>
            <div>
              <h3 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                Invita Suscriptores
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Recibe +7 días gratis por cada invitado</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
            Cuando alguien se suscribe usando tu código, tu suscripción se extiende <strong className="text-[var(--gold)]">7 días gratis</strong>.
          </p>
          <div className="p-3 bg-[var(--bg-dark)] rounded-sm mb-3">
            <p className="text-xs text-[var(--text-muted)] mb-1">Mensaje para compartir:</p>
            <p className="text-sm text-[var(--text-secondary)] italic">&ldquo;{shareTextSub}&rdquo;</p>
          </div>
          <button onClick={() => copyToClipboard(shareTextSub, 'sub')}
            className="text-xs text-[var(--gold)] tracking-wider uppercase">
            {copied === 'sub' ? '¡Copiado!' : 'Copiar Mensaje'}
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-4">
          <div className="glass-card p-5 rounded-sm text-center">
            <p className="text-2xl font-bold text-gradient-gold" style={{ fontFamily: 'Playfair Display, serif' }}>0</p>
            <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase">Artistas Referidas</p>
          </div>
          <div className="glass-card p-5 rounded-sm text-center">
            <p className="text-2xl font-bold text-gradient-gold" style={{ fontFamily: 'Playfair Display, serif' }}>0</p>
            <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase">Suscriptores Referidos</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
