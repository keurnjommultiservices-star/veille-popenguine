const { STATUSES, config, db, readBody, isAdmin, clean, removePhotos } = require('./_lib');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!config().ok || !process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Configuration serveur incomplète (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ADMIN_PASSWORD)' });
  }
  if (!isAdmin(req)) {
    return res.status(401).json({ error: 'Mot de passe incorrect' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await db('reports?select=*&order=created_at.desc&limit=1000');
      return res.status(200).json(rows);
    }

    if (req.method === 'PATCH') {
      const b = readBody(req);
      if (!UUID.test(String(b.id || ''))) return res.status(400).json({ error: 'Identifiant invalide' });

      const patch = { updated_at: new Date().toISOString() };
      if (typeof b.published === 'boolean') patch.published = b.published;
      if (b.status !== undefined) {
        if (!STATUSES.includes(b.status)) return res.status(400).json({ error: 'Statut invalide' });
        patch.status = b.status;
      }
      if (b.admin_note !== undefined) patch.admin_note = clean(b.admin_note, 1000) || null;

      const rows = await db(`reports?id=eq.${b.id}`, { method: 'PATCH', body: JSON.stringify(patch) });
      return res.status(200).json(rows && rows[0] ? rows[0] : { ok: true });
    }

    if (req.method === 'DELETE') {
      const id = String((req.query && req.query.id) || '');
      if (!UUID.test(id)) return res.status(400).json({ error: 'Identifiant invalide' });
      const found = await db(`reports?id=eq.${id}&select=photos`);
      await db(`reports?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } });
      if (found && found[0]) await removePhotos(found[0].photos);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error('admin error', e.status, e.detail);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
