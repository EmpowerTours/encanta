'use client';

import { motion } from 'framer-motion';

const sections = [
  {
    title: '1. Edad Mínima',
    content: 'Debes tener 18 años o más para usar Encanta. Al crear una cuenta o acceder al contenido, confirmas que tienes la edad legal. La verificación de edad se realiza mediante identificación oficial durante la entrevista en persona.',
  },
  {
    title: '2. Contenido Faceless',
    content: 'Todo el contenido en Encanta debe ser faceless — del cuello para abajo. Está estrictamente prohibido mostrar la cara, rasgos faciales identificables, o cualquier elemento que revele la identidad de la artista. Contenido que viole esta regla será removido inmediatamente.',
  },
  {
    title: '3. Verificación de Artistas',
    content: 'Todas las artistas deben completar un proceso de verificación que incluye: tareas de verificación en línea, entrevista presencial, presentación de identificación oficial, y resultados de exámenes de salud/ETS vigentes (máximo 30 días). La verificación de salud se renueva cada 6 meses.',
  },
  {
    title: '4. Consentimiento',
    content: 'La participación en Encanta es 100% voluntaria. Las artistas firman formularios de consentimiento y cesión de derechos de imagen en la entrevista presencial. Las artistas pueden retirar su consentimiento en cualquier momento y solicitar la eliminación de todo su contenido.',
  },
  {
    title: '5. Derechos del Contenido',
    content: 'Las artistas retienen los derechos sobre su contenido. Encanta obtiene una licencia para distribuir el contenido a suscriptores activos. Al retirarse, todo el contenido es eliminado de la plataforma y del almacenamiento.',
  },
  {
    title: '6. Modelo de Ingresos',
    content: 'Suscripción única de 100 MON/mes que da acceso a todas las artistas. El 90% de los ingresos se distribuye entre las artistas según su engagement (vistas y likes). El 10% es comisión de la plataforma. La distribución se realiza mensualmente.',
  },
  {
    title: '7. Programa de Referidos',
    content: 'Las artistas reciben 5 MON de bono por cada artista referida que complete la verificación. Los suscriptores reciben 7 días adicionales de suscripción por cada nuevo suscriptor que refieran. Los bonos de referido se pagan del presupuesto de verificación.',
  },
  {
    title: '8. Privacidad y Datos',
    content: 'Encanta no almacena datos personales en la blockchain. Solo se registran direcciones de wallet y pagos. El contenido se almacena encriptado en servidores privados. Los documentos de verificación (ID, resultados de salud) se verifican en persona y no se almacenan digitalmente. Tu wallet es tu única identidad en la plataforma.',
  },
  {
    title: '9. Prohibiciones',
    content: 'Está prohibido: contenido que muestre la cara, contenido de menores de edad, contenido no consensuado, redistribución del contenido fuera de la plataforma, hacer capturas de pantalla o grabar contenido, acoso a artistas o suscriptores.',
  },
  {
    title: '10. Pagos y Retiros',
    content: 'Todos los pagos se realizan en MON (token nativo de Monad). Las artistas pueden retirar sus ganancias en cualquier momento una vez que alcancen el umbral mínimo. Los pagos de verificación se envían directamente a la wallet de la artista.',
  },
  {
    title: '11. Suspensión y Baneo',
    content: 'Encanta se reserva el derecho de suspender o banear cuentas que violen estos términos. Las artistas suspendidas mantienen su balance pendiente. Las artistas baneadas pueden solicitar el retiro de fondos restantes contactando al equipo.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen px-6 pt-24 pb-24 md:pt-28">
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <p className="text-[var(--gold)] text-xs tracking-[0.4em] uppercase mb-3">Legal</p>
          <h1 className="text-3xl md:text-4xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Términos de <span className="italic text-gradient-carmin">Servicio</span>
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-3">Última actualización: Marzo 2026</p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 rounded-sm">
              <h2 className="text-lg font-semibold mb-3 text-[var(--gold)]"
                style={{ fontFamily: 'Playfair Display, serif' }}>
                {section.title}
              </h2>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 p-6 rounded-sm border border-[var(--border)] bg-[var(--bg-dark)] text-center">
          <p className="text-xs text-[var(--text-muted)]">
            Al usar Encanta, aceptas estos términos en su totalidad.
            Para preguntas, contacta al equipo de Encanta.
          </p>
        </div>
      </div>
    </div>
  );
}
