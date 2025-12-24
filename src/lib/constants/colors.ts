// Colores oficiales MARMAQ - Brand Manual
export const MARMAQ_COLORS = {
  // Colores principales (Pantone)
  blue: {
    light: '#31A7D4',    // Pantone 312C
    dark: '#092139',     // Pantone 2965C
    medium: '#1a4a6e',   // Interpolación para gradientes
  },
  orange: '#D57828',     // Pantone 158C

  // Colores del sistema de semáforo
  semaforo: {
    rojo: '#ef4444',     // Crítico: equipo listo > 5 días sin recoger
    naranja: '#f97316',  // Urgente: esperando refacciones
    amarillo: '#eab308', // Atención: sin cotización > 72h
    verde: '#22c55e',    // Normal: en proceso sin alertas
    azul: '#3b82f6',     // Info: recién recibido
  },

  // Grises y neutros
  gray: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },

  white: '#ffffff',
  black: '#000000',
} as const;

// CSS Variables para Tailwind
export const cssVariables = `
  --marmaq-blue-light: ${MARMAQ_COLORS.blue.light};
  --marmaq-blue-dark: ${MARMAQ_COLORS.blue.dark};
  --marmaq-blue-medium: ${MARMAQ_COLORS.blue.medium};
  --marmaq-orange: ${MARMAQ_COLORS.orange};
`;
