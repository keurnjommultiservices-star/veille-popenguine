const { KINDS, DOMAINS, URGENCIES, MAX_PHOTOS, config, db, readBody, clean, decodePhoto, uploadPhoto, removePhotos } = require('./_lib');
const { notifyNewReport } = require('./_notify');

const PUBLIC_FIELDS = 'id,created_at,kind,domain,locality,title,description,urgency,status,admin_note,photos';

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (!config().ok) {
    return res.status(503).json({ demo: true, error: 'Base de données non configurée' });
  }

  try {
    if (req.method === 'GET') {
      const rows = await db(
        `reports?published=eq.true&status=neq.rejete&select=${PUBLIC_FIELDS}&order=created_at.desc&limit=300`
      );
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const b = readBody(req);

      // Champ piège anti-robots : un humain ne le remplit jamais.
      if (b.website) return res.status(201).json({ ok: true });

      const report = {
        kind: clean(b.kind, 20),
        domain: clean(b.domain, 40),
        locality: clean(b.locality, 60),
        title: clean(b.title, 120),
        description: clean(b.description, 2000),
        urgency: clean(b.urgency || 'normale', 10),
        contact: clean(b.contact, 120) || null,
      };

      const errors = [];
      if (!KINDS.includes(report.kind)) errors.push('Type invalide');
      if (!DOMAINS.includes(report.domain)) errors.push('Domaine invalide');
      if (!URGENCIES.includes(report.urgency)) errors.push('Urgence invalide');
      if (!report.locality) errors.push('Localité obligatoire');
      if (report.title.length < 5) errors.push('Titre trop court (5 caractères minimum)');
      if (report.description.length < 10) errors.push('Description trop courte (10 caractères minimum)');
      if (errors.length) return res.status(400).json({ error: errors.join(' · ') });

      // Photos : réservées aux alertes, JPEG uniquement, 3 maximum.
      const rawPhotos = Array.isArray(b.photos) ? b.photos : [];
      if (rawPhotos.length && report.kind !== 'alerte') {
        return res.status(400).json({ error: 'Les photos sont réservées aux alertes' });
      }
      if (rawPhotos.length > MAX_PHOTOS) {
        return res.status(400).json({ error: `${MAX_PHOTOS} photos maximum` });
      }
      const buffers = rawPhotos.map(decodePhoto);
      if (buffers.some((x) => !x)) {
        return res.status(400).json({ error: 'Photo invalide ou trop lourde (JPEG, 700 Ko maximum)' });
      }
      const uploaded = [];
      try {
        for (const buf of buffers) uploaded.push(await uploadPhoto(buf));
        // Publication uniquement après validation par l'administrateur.
        await db('reports', {
          method: 'POST',
          body: JSON.stringify({ ...report, photos: uploaded.map((u) => u.publicUrl), published: false, status: 'nouveau' }),
        });
      } catch (e) {
        await removePhotos(uploaded.map((u) => u.publicUrl));
        throw e;
      }

      // Prévenir l'équipe (attendu avant de répondre : la fonction s'arrête dès la réponse envoyée).
      const host = req.headers['x-forwarded-host'] || req.headers.host || '';
      const siteUrl = process.env.SITE_URL || (host ? `https://${host}` : '');
      await notifyNewReport({ ...report, photoCount: uploaded.length }, siteUrl).catch(() => {});

      return res.status(201).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Méthode non autorisée' });
  } catch (e) {
    console.error('reports error', e.status, e.detail);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
};
