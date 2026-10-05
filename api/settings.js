const { config, db, readBody, isAdmin, clean } = require('./_lib');

// Limites de longueur : le serveur ne fait jamais confiance au navigateur.
const LIMITS = {
  heroTitle: 160, heroText: 500, aboutTitle: 100, about1: 800, about2: 800,
  portedBy: 120, portedByNote: 250, mayorTitle: 80, mayorName: 160, emergency: 500,
};
const MAX_LOCALITIES = 30;

function sanitize(input) {
  const b = input && typeof input === 'object' ? input : {};
  const out = {};
  for (const [k, max] of Object.entries(LIMITS)) {
    if (typeof b[k] === 'string') { const v = clean(b[k], max); if (v) out[k] = v; }
  }
  // Mot du Maire : on garde les retours à la ligne (un paragraphe par ligne).
  if (typeof b.mayorText === 'string') {
    const v = b.mayorText.split(/\r?\n/).map((l) => clean(l, 1500)).filter(Boolean).join('\n').slice(0, 1500);
    if (v) out.mayorText = v;
  }
  if (Array.isArray(b.steps)) {
    out.steps = [0, 1, 2].map((i) => {
      const s = b.steps[i] && typeof b.steps[i] === 'object' ? b.steps[i] : {};
      const o = {};
      if (typeof s.title === 'string') { const v = clean(s.title, 60); if (v) o.title = v; }
      if (typeof s.text === 'string') { const v = clean(s.text, 300); if (v) o.text = v; }
      return o;
    });
  }
  if (Array.isArray(b.localities)) {
    const seen = new Set();
    const list = [];
    for (const x of b.localities) {
      const v = clean(x, 60);
      if (v && !seen.has(v.toLowerCase())) { seen.add(v.toLowerCase()); list.push(v); }
      if (list.length >= MAX_LOCALITIES) break;
    }
    if (list.length) out.localities = list;
  }
  return out;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!config().ok) return res.status(503).json({ demo: true, error: 'Base de données non configurée' });

  try {
    // Lecture publique : les textes affichés sur le site.
    if (req.method === 'GET') {
      const rows = await db('site_settings?id=eq.main&select=data');
      return res.status(200).json({ settings: rows && rows[0] && rows[0].data ? rows[0].data : {} });
    }

    // Écriture : administrateur uniquement.
    if (!isAdmin(req)) {
      await new Promise((r) => setTimeout(r, 500));
      return res.status(401).json({ error: 'E-mail ou mot de passe incorrect' });
    }

    if (req.method === 'PUT') {
      const settings = sanitize(readBody(req).settings);
      await db('site_settings', {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        body: JSON.stringify({ id: 'main', data: settings, updated_at: new Date().toISOString() }),
      });
      return res.status(200).json({ settings });
    }

    if (req.method === 'DELETE') {
      await db('site_settings?id=eq.main', { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error('settings error', e.status, e.detail);
    if (e.status === 404) {
      return res.status(500).json({ error: "La table des paramètres n'existe pas : exécutez de nouveau supabase/schema.sql dans Supabase." });
    }
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
