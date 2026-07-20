// Partagé entre le CORS HTTP (main.ts) et le CORS du gateway WebSocket
// (notifications.gateway.ts) — les deux doivent rester synchronisés, sinon les
// notifications temps réel (négociations, etc.) échouent silencieusement sur
// les origines couvertes par l'un mais pas l'autre.
export const CORS_ORIGINS = [
  'https://lefinancier.io',
  'https://www.lefinancier.io',
  process.env.FRONTEND_URL ?? 'http://localhost:4200',
  'http://localhost:3000', // Optionnel : pour que ton local continue de fonctionner
];
