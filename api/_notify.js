// Notifications envoyées à l'équipe quand un nouveau signalement arrive.
// Chaque canal est optionnel : il ne s'active que si ses variables d'environnement sont renseignées.
// Une notification qui échoue ne fait jamais échouer le dépôt du signalement.

const LABELS = {
  kinds: { alerte: 'Alerte', remarque: 'Remarque', suggestion: 'Suggestion' },
  domains: {
    sante: 'Santé',
    securite: 'Sécurité',
    education: 'Éducation',
    eau_environnement_routes: 'Eau, environnement et routes',
  },
};

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function withTimeout(promise, ms) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))]);
}

function list(value) {
  return String(value || '').split(',').map((x) => x.trim()).filter(Boolean);
}

function adminUrl(siteUrl) {
  return siteUrl ? `${siteUrl.replace(/\/+$/, '')}/admin` : '';
}

async function sendEmail(report, siteUrl) {
  const key = process.env.RESEND_API_KEY;
  const to = list(process.env.NOTIFY_EMAIL_TO);
  if (!key || !to.length) return 'email: désactivé';

  const from = process.env.NOTIFY_EMAIL_FROM || 'Veille Popenguine <onboarding@resend.dev>';
  const urgent = report.urgency === 'urgente';
  const kind = LABELS.kinds[report.kind] || report.kind;
  const domain = LABELS.domains[report.domain] || report.domain;
  const subject = `${urgent ? '[URGENT] ' : ''}${kind} - ${domain} - ${report.locality}`;
  const link = adminUrl(siteUrl);

  const html = `<div style="font-family:Arial,sans-serif;max-width:560px;color:#1f2937">
    <h2 style="margin:0 0 8px;color:#1e3a8a">Nouveau signalement à valider</h2>
    <p style="margin:0 0 12px">${urgent ? '<strong style="color:#dc2626">URGENT</strong> · ' : ''}${esc(kind)} · ${esc(domain)} · ${esc(report.locality)}</p>
    <h3 style="margin:0 0 6px">${esc(report.title)}</h3>
    <p style="white-space:pre-wrap;margin:0 0 12px">${esc(report.description)}</p>
    ${report.photoCount ? `<p style="margin:0 0 12px;color:#6b7280">${report.photoCount} photo(s) jointe(s)</p>` : ''}
    ${report.contact ? `<p style="margin:0 0 12px;color:#6b7280">Contact laissé : ${esc(report.contact)}</p>` : ''}
    ${link ? `<p><a href="${esc(link)}" style="background:#1e3a8a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none">Ouvrir l'administration</a></p>` : ''}
  </div>`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) throw new Error(`email HTTP ${res.status}`);
  return 'email: envoyé';
}

async function sendWhatsApp(report, siteUrl) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const to = list(process.env.NOTIFY_WHATSAPP_TO).map((n) => n.replace(/[^\d]/g, ''));
  if (!token || !phoneId || !to.length) return 'whatsapp: désactivé';

  // Par défaut, seules les alertes urgentes déclenchent un message WhatsApp.
  const mode = process.env.NOTIFY_WHATSAPP_MODE || 'urgent';
  if (mode === 'urgent' && report.urgency !== 'urgente') return 'whatsapp: ignoré (non urgent)';

  const kind = LABELS.kinds[report.kind] || report.kind;
  const domain = LABELS.domains[report.domain] || report.domain;
  const flat = (s, n) => String(s).replace(/\s+/g, ' ').trim().slice(0, n);
  const template = process.env.WHATSAPP_TEMPLATE;

  const results = await Promise.allSettled(to.map(async (num) => {
    let payload;
    if (template) {
      // Message modèle approuvé par Meta : variables {{1}} type et domaine, {{2}} localité, {{3}} titre.
      payload = {
        messaging_product: 'whatsapp', to: num, type: 'template',
        template: {
          name: template,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'fr' },
          components: [{
            type: 'body',
            parameters: [
              { type: 'text', text: flat(`${kind} - ${domain}`, 60) },
              { type: 'text', text: flat(report.locality, 60) },
              { type: 'text', text: flat(report.title, 120) },
            ],
          }],
        },
      };
    } else {
      // Texte libre : Meta ne le livre que si le destinataire a écrit au numéro dans les dernières 24 h.
      const link = adminUrl(siteUrl);
      payload = {
        messaging_product: 'whatsapp', to: num, type: 'text',
        text: { body: `${report.urgency === 'urgente' ? 'URGENT - ' : ''}${kind} (${domain}) à ${flat(report.locality, 60)} : ${flat(report.title, 120)}${link ? `\nValider : ${link}` : ''}` },
      };
    }
    const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`whatsapp HTTP ${res.status}`);
  }));

  const failed = results.filter((r) => r.status === 'rejected').length;
  if (failed === results.length) throw new Error('whatsapp: tous les envois ont échoué');
  return `whatsapp: ${results.length - failed}/${results.length} envoyé(s)`;
}

async function notifyNewReport(report, siteUrl) {
  const outcomes = await Promise.allSettled([
    withTimeout(sendEmail(report, siteUrl), 4000),
    withTimeout(sendWhatsApp(report, siteUrl), 4000),
  ]);
  outcomes.forEach((o) => {
    if (o.status === 'rejected') console.error('notification', o.reason && o.reason.message);
  });
  return outcomes.map((o) => (o.status === 'fulfilled' ? o.value : `erreur: ${o.reason && o.reason.message}`));
}

module.exports = { notifyNewReport };
