'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function AgeGate() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem('encanta-age-verified');
    if (!verified) setShow(true);
  }, []);

  const handleYes = () => {
    localStorage.setItem('encanta-age-verified', 'true');
    setShow(false);
  };

  const handleNo = () => {
    window.location.href = 'https://www.google.com';
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6"
          style={{ background: 'rgba(10, 6, 8, 0.97)' }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="glass-card p-10 max-w-md w-full text-center rounded-sm">
            <span className="text-gradient-gold text-3xl font-bold tracking-[0.2em] block mb-6"
              style={{ fontFamily: 'Playfair Display, serif' }}>
              ENCANTA
            </span>
            <p className="text-xs text-[var(--text-muted)] tracking-widest uppercase mb-6">
              Contenido Faceless Premium
            </p>
            <h2 className="text-2xl font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              ¿Tienes 18 años o más?
            </h2>
            <p className="text-sm text-[var(--text-secondary)] mb-8">
              Este sitio contiene contenido para adultos. Debes ser mayor de 18 años para acceder.
            </p>
            <div className="flex gap-4">
              <button onClick={handleYes} className="btn-primary flex-1 text-center">
                Sí, soy mayor de 18
              </button>
              <button onClick={handleNo} className="btn-secondary flex-1 text-center">
                No
              </button>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-6">
              Al entrar confirmas que tienes la edad legal para ver este contenido en tu país.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
