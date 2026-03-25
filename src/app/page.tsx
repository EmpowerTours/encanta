'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useWallet } from '@/context/WalletContext';
import { useState, useEffect } from 'react';

const steps = [
  {
    num: '01',
    title: 'Aplica',
    desc: 'Conecta tu wallet y completa una breve solicitud. Sin costo — nunca.',
    icon: '✦',
  },
  {
    num: '02',
    title: 'Verifica',
    desc: 'Completa tareas de verificación y gana MON mientras te verificas.',
    icon: '◈',
  },
  {
    num: '03',
    title: 'Crea',
    desc: 'Sube contenido faceless en tus propios términos. Tú decides qué y cuánto.',
    icon: '▣',
  },
  {
    num: '04',
    title: 'Gana',
    desc: 'Los suscriptores pagan al pool. Tu contenido gana según likes y colecciones.',
    icon: '◆',
  },
];

function AnimatedCounter({ target, suffix }: { target: number | string; suffix: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof target === 'string') return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target]);

  if (typeof target === 'string') return <>{target}</>;
  return <>{count}{suffix}</>;
}

export default function LandingPage() {
  const { connect, address } = useWallet();

  const [stats, setStats] = useState([
    { label: 'Artistas', value: 0 as number | string, suffix: '' },
    { label: 'Suscriptores', value: 0 as number | string, suffix: '' },
    { label: 'Comisión', value: 10 as number | string, suffix: '%' },
    { label: 'Blockchain', value: 'Monad' as number | string, suffix: '' },
  ]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/admin/stats`
        );
        if (!res.ok) throw new Error('Stats fetch failed');
        const data = await res.json();
        setStats([
          { label: 'Artistas', value: data.artist_count ?? 0, suffix: '' },
          { label: 'Suscriptores', value: data.subscriber_count ?? 0, suffix: '' },
          { label: 'Comisión', value: 10, suffix: '%' },
          { label: 'Blockchain', value: 'Monad', suffix: '' },
        ]);
      } catch {
        // keep defaults (0) on error
      }
    };
    loadStats();
  }, []);

  return (
    <div className="relative">
      {/* Hero Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0" style={{
          background: `
            radial-gradient(ellipse at 20% 50%, rgba(155, 27, 48, 0.08) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(201, 168, 76, 0.04) 0%, transparent 40%),
            radial-gradient(ellipse at 50% 80%, rgba(155, 27, 48, 0.05) 0%, transparent 50%),
            var(--bg-void)
          `
        }} />
        <div className="absolute inset-0 flex justify-around opacity-[0.03]">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-px h-full bg-[var(--gold)]" />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}>
          <span className="text-gradient-gold text-3xl md:text-4xl font-bold tracking-[0.2em]"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            ENCANTA
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}>
          {address ? (
            <Link href="/explore" className="btn-primary">
              Entrar
            </Link>
          ) : (
            <button onClick={connect} className="btn-secondary">
              Conectar Wallet
            </button>
          )}
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 min-h-[90vh] flex flex-col items-center justify-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
          className="max-w-4xl">

          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-6"
            style={{ fontFamily: 'Outfit, sans-serif' }}>
            Contenido Faceless Premium
          </p>

          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold leading-[0.95] mb-8"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            Donde el arte
            <br />
            <span className="italic text-gradient-carmin">se encuentra con el deseo</span>
          </h1>

          <p className="text-[var(--text-secondary)] text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.4rem' }}>
            La primera plataforma de contenido faceless donde las artistas
            permanecen anónimas, ponen sus propios términos y ganan sin intermediarios.
            Impulsada por Monad. Protegida por privacidad.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/apply" className="btn-primary text-center">
              Comienza a Ganar
            </Link>
            <Link href="/explore" className="btn-secondary text-center">
              Explorar Artistas
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 flex flex-col items-center gap-2">
          <span className="text-[var(--text-muted)] text-xs tracking-[0.3em] uppercase">Desliza</span>
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="w-px h-8 bg-gradient-to-b from-[var(--gold)] to-transparent"
          />
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-[var(--border)] py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gradient-gold mb-2"
                style={{ fontFamily: 'Playfair Display, serif' }}>
                <AnimatedCounter target={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-[var(--text-muted)] text-xs tracking-[0.2em] uppercase">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Cómo Funciona */}
      <section className="relative z-10 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16">
            <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-4">El Proceso</p>
            <h2 className="text-4xl md:text-5xl font-bold"
              style={{ fontFamily: 'Playfair Display, serif' }}>
              Cómo funciona <span className="italic text-gradient-carmin">Encanta</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="glass-card p-8 rounded-sm relative group">
                <span className="absolute top-4 right-4 text-[var(--text-muted)] text-xs tracking-widest">
                  {step.num}
                </span>
                <span className="text-3xl text-[var(--gold)] mb-4 block">{step.icon}</span>
                <h3 className="text-xl font-semibold mb-3"
                  style={{ fontFamily: 'Playfair Display, serif' }}>
                  {step.title}
                </h3>
                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                  {step.desc}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--carmin)] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Propuesta de Valor */}
      <section className="relative z-10 py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}>
            <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-4">Para Artistas</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6"
              style={{ fontFamily: 'Playfair Display, serif' }}>
              Tu cuerpo.<br />
              <span className="italic text-gradient-carmin">Tus reglas.</span>
            </h2>
            <ul className="space-y-4">
              {[
                'Gratis para unirte — sin cuotas, sin costos ocultos',
                'Gana del pool mensual — más likes y colecciones = más ingresos',
                '100% faceless — tu identidad siempre protegida',
                'Pagos en crypto — ningún banco puede congelar tu dinero',
                'Gana MON durante la verificación — te pagan desde el inicio',
                'Solo nombre artístico + wallet — sin datos personales expuestos',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                  <span className="text-[var(--gold)] mt-1 text-xs">◆</span>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}>
            <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-4">Para Suscriptores</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-6"
              style={{ fontFamily: 'Playfair Display, serif' }}>
              Acceso exclusivo.<br />
              <span className="italic text-gradient-carmin">Privacidad total.</span>
            </h2>
            <ul className="space-y-4">
              {[
                'Sin estados de cuenta — paga solo con crypto',
                'Una suscripción simple — acceso al feed completo de artistas',
                'Todas las artistas verificadas en persona con exámenes de salud',
                'Tu interacción decide — likes y colecciones distribuyen el pool',
                'Contenido faceless curado — sensual, no explícito',
                'Tu wallet es tu identidad — sin datos personales',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[var(--text-secondary)]">
                  <span className="text-[var(--gold)] mt-1 text-xs">◆</span>
                  <span className="text-sm leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </section>

      {/* Modelo de Ingresos */}
      <section className="relative z-10 py-24 px-6 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}>
            <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-4">Cómo Ganas</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-10"
              style={{ fontFamily: 'Playfair Display, serif' }}>
              Gana desde el <span className="italic text-gradient-carmin">primer día</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-6 rounded-sm text-left">
              <p className="text-xs text-[var(--gold)] tracking-widest uppercase mb-3">Fase 1 — Verificación</p>
              <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                100 MON
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                Completa 6 tareas de verificación y gana MON por cada una.
                Te pagamos por demostrar que eres real.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="glass-card p-6 rounded-sm text-left">
              <p className="text-xs text-[var(--gold)] tracking-widest uppercase mb-3">Fase 2 — Pool Mensual</p>
              <p className="text-2xl font-bold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                Pool Mensual
              </p>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                El 90% de todas las suscripciones se reparte entre artistas según engagement — likes y colecciones determinan tu porción.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-24 px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto">
          <div className="divider-diamond text-[var(--gold)] text-sm mb-12">◆</div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            ¿Lista para <span className="italic text-gradient-carmin">encantar</span>?
          </h2>
          <p className="text-[var(--text-secondary)] mb-10"
            style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '1.3rem' }}>
            Ya sea que crees o aprecies el arte,<br />
            Encanta es tu escenario.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/apply" className="btn-primary text-center">
              Comienza a Ganar
            </Link>
            <Link href="/explore" className="btn-secondary text-center">
              Explorar Artistas
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[var(--border)] py-8 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gradient-gold text-lg font-bold tracking-[0.2em]"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            ENCANTA
          </span>
          <p className="text-[var(--text-muted)] text-xs tracking-wider">
            Impulsada por Monad &middot; Solo +18 &middot; Todas las artistas verificadas
          </p>
        </div>
      </footer>
    </div>
  );
}
