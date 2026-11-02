const { config, db } = require('./_lib');

// Appelé chaque jour par Vercel (voir « crons » dans vercel.json) : une simple lecture qui garde la base Supabase active.
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (!config().ok) return res.status(200).json({ ok: true, demo: true });
  try {
    await db('site_settings?select=id&limit=1');
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('ping error', e.status, e.message, e.cause && (e.cause.code || e.cause.message));
    return res.status(200).json({ ok: false });
  }
};
