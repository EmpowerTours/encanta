'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { ADMIN_WALLETS } from '@/lib/constants';

const navItems = [
  { href: '/', label: 'Inicio', icon: '◆' },
  { href: '/feed', label: 'Feed', icon: '▲' },
  { href: '/explore', label: 'Explorar', icon: '◈' },
  { href: '/live', label: 'En Vivo', icon: '●', live: true },
  { href: '/tasks', label: 'Tareas', icon: '✦' },
  { href: '/dashboard', label: 'Panel', icon: '▣' },
];

export function Navigation() {
  const pathname = usePathname();
  const { address, connect, disconnect, shortAddress, isConnecting } = useWallet();
  const [showMenu, setShowMenu] = useState(false);

  if (pathname === '/') return null;

  return (
    <>
      {/* Desktop top nav */}
      <header className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-center justify-between px-8 py-4"
        style={{ background: 'linear-gradient(180deg, rgba(10,6,8,0.98), rgba(10,6,8,0))' }}>
        <Link href="/" className="flex items-center gap-3">
          <span className="text-gradient-gold font-[var(--font-display)] text-2xl font-bold tracking-wider"
            style={{ fontFamily: 'Playfair Display, serif' }}>
            ENCANTA
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {navItems.slice(1).map((item) => (
            <Link key={item.href} href={item.href}
              className={`text-sm tracking-widest uppercase transition-colors duration-300 flex items-center gap-1.5 ${
                pathname.startsWith(item.href) && item.href !== '/'
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}>
              {item.live && (
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--carmin)] pulse-live" />
              )}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative">
          {address ? (
            <button onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 px-4 py-2 border border-[var(--border)] rounded-sm text-sm text-[var(--gold)] hover:border-[var(--gold)] transition-colors">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              {shortAddress}
            </button>
          ) : (
            <button onClick={connect} disabled={isConnecting}
              className="btn-primary text-xs">
              {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
            </button>
          )}

          <AnimatePresence>
            {showMenu && address && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-12 glass-card rounded-sm p-3 min-w-[180px] z-50">
                <Link href="/dashboard" className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => setShowMenu(false)}>
                  Mi Panel
                </Link>
                <Link href="/collection" className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => setShowMenu(false)}>
                  Mi Colección
                </Link>
                {address && ADMIN_WALLETS.has(address.toLowerCase()) && (
                  <Link href="/admin" className="block px-3 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                    onClick={() => setShowMenu(false)}>
                    Administración
                  </Link>
                )}
                <hr className="border-[var(--border)] my-1" />
                <button onClick={() => { disconnect(); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[var(--carmin-light)] hover:text-[var(--carmin)] transition-colors">
                  Desconectar
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bottom-nav px-2 pt-6 pb-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-1 py-2 px-2 transition-colors duration-300 ${
                (pathname.startsWith(item.href) && item.href !== '/') || pathname === item.href
                  ? 'text-[var(--gold)]'
                  : 'text-[var(--text-muted)]'
              }`}>
              <span className="text-lg relative">
                {item.icon}
                {item.live && (
                  <span className="absolute -top-0.5 -right-1 w-1.5 h-1.5 rounded-full bg-[var(--carmin)] pulse-live" />
                )}
              </span>
              <span className="text-[9px] tracking-widest uppercase">{item.label}</span>
            </Link>
          ))}
          {address ? (
            <Link href="/collection" className="flex flex-col items-center gap-1 py-2 px-2 text-[var(--text-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--success)]" />
              <span className="text-[9px] tracking-widest text-[var(--gold)]">{shortAddress}</span>
            </Link>
          ) : (
            <button onClick={connect}
              className="flex flex-col items-center gap-1 py-2 px-2 text-[var(--text-muted)]">
              <span className="text-lg">⬡</span>
              <span className="text-[9px] tracking-widest uppercase">Wallet</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
