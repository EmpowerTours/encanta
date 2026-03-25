'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const CONSENT_SCRIPT = `Yo declaro que estoy actuando por mi propia voluntad.
Nadie me ha obligado ni forzado a participar.
Doy mi consentimiento para ser grabada en esta plataforma.
Confirmo que tengo 18 años o más.
Todo lo que hago aquí es voluntario y bajo mis propios términos.`;

const MAX_DURATION = 60; // seconds

type RecordingState = 'idle' | 'previewing' | 'recording' | 'review' | 'confirmed';

export function VideoRecorder({ onRecorded }: { onRecorded: (blob: Blob) => void }) {
  const [state, setState] = useState<RecordingState>('idle');
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const reviewRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const blobRef = useRef<Blob | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startPreview = async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState('previewing');
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos.');
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : 'video/webm';

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      blobRef.current = blob;
      cleanup();
      setState('review');
    };

    recorder.start(1000);
    setState('recording');
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev >= MAX_DURATION - 1) {
          recorder.stop();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') {
      recorderRef.current.stop();
    }
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const confirmRecording = () => {
    if (blobRef.current) {
      onRecorded(blobRef.current);
      setState('confirmed');
    }
  };

  const retake = () => {
    blobRef.current = null;
    setState('idle');
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
        Video de Audición
      </h2>
      <p className="text-[var(--text-secondary)] text-sm mb-6">
        Graba un video leyendo la declaración de consentimiento. Máximo {MAX_DURATION} segundos.
      </p>

      {error && (
        <div className="p-3 mb-4 border border-[var(--danger)] rounded-sm bg-[rgba(155,27,48,0.1)]">
          <p className="text-sm text-[var(--carmin-light)]">{error}</p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {state === 'idle' && (
          <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <button onClick={startPreview} className="btn-primary w-full text-center">
              Activar Cámara
            </button>
          </motion.div>
        )}

        {(state === 'previewing' || state === 'recording') && (
          <motion.div key="camera" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="relative rounded-sm overflow-hidden mb-4">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full aspect-video bg-black rounded-sm"
              />

              {state === 'recording' && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 bg-[var(--carmin)] rounded-sm">
                  <span className="w-2 h-2 rounded-full bg-white pulse-live" />
                  <span className="text-xs font-medium">{elapsed}s / {MAX_DURATION}s</span>
                </div>
              )}
            </div>

            {/* Consent script teleprompter */}
            <div className="glass-card p-4 rounded-sm mb-4">
              <p className="text-xs text-[var(--gold)] tracking-widest uppercase mb-3">Lee en voz alta:</p>
              <div className="space-y-2">
                {CONSENT_SCRIPT.split('\n').map((line, i) => (
                  <p key={i} className="text-sm text-[var(--text-primary)] leading-relaxed"
                    style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '17px' }}>
                    &ldquo;{line.trim()}&rdquo;
                  </p>
                ))}
              </div>
            </div>

            {state === 'previewing' ? (
              <button onClick={startRecording} className="btn-primary w-full text-center">
                Comenzar Grabación
              </button>
            ) : (
              <button onClick={stopRecording} className="btn-secondary w-full text-center border-[var(--carmin)] text-[var(--carmin-light)]">
                Detener Grabación
              </button>
            )}
          </motion.div>
        )}

        {state === 'review' && blobRef.current && (
          <motion.div key="review" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <p className="text-xs text-[var(--gold)] tracking-widest uppercase mb-3">Revisa tu video:</p>
            <div className="rounded-sm overflow-hidden mb-4">
              <video
                ref={reviewRef}
                src={URL.createObjectURL(blobRef.current)}
                controls
                playsInline
                className="w-full aspect-video bg-black rounded-sm"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={retake} className="btn-secondary flex-1 text-center">
                Repetir
              </button>
              <button onClick={confirmRecording} className="btn-primary flex-1 text-center">
                Confirmar Video
              </button>
            </div>
          </motion.div>
        )}

        {state === 'confirmed' && (
          <motion.div key="confirmed" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="glass-card p-6 rounded-sm text-center">
              <div className="w-12 h-12 rounded-full bg-[var(--success)] mx-auto mb-3 flex items-center justify-center text-white text-xl">
                ✓
              </div>
              <p className="text-[var(--gold)] text-sm font-medium">Video de audición grabado</p>
              <button onClick={retake} className="text-xs text-[var(--text-muted)] mt-2 underline">
                Grabar de nuevo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
