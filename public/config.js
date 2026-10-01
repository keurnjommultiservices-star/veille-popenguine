/* Configuration commune : à adapter si besoin */
window.VEILLE = {
  nom: 'Veille citoyenne de Popenguine',
  localites: ['Popenguine', 'Ndayane', 'Toubab Dialaw', 'Guéréo', 'Sindia', 'Autre localité'],
  domaines: {
    sante: 'Santé',
    securite: 'Sécurité',
    education: 'Éducation',
    eau_environnement_routes: 'Eau, environnement et routes',
  },
  types: { alerte: 'Alerte', remarque: 'Remarque', suggestion: 'Suggestion' },
  statuts: { nouveau: 'Nouveau', en_cours: 'En cours de traitement', resolu: 'Résolu', rejete: 'Rejeté' },
};

window.esc = function (s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
};

window.fmtDate = function (iso) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch (e) { return ''; }
};

/* Mode démonstration : utilisé tant que la base de données n'est pas configurée. */
window.Demo = {
  KEY: 'veille_popenguine_demo',
  load: function () {
    try {
      var raw = localStorage.getItem(this.KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    var now = Date.now(), day = 86400000;
    var seed = [
      { id: 'd1', created_at: new Date(now - 2 * day).toISOString(), kind: 'alerte', domain: 'eau_environnement_routes', locality: 'Popenguine', title: 'Route dégradée près du marché', description: 'De grands nids-de-poule rendent la circulation dangereuse, surtout la nuit. Plusieurs motos ont failli chuter.', urgency: 'urgente', status: 'en_cours', published: true, admin_note: 'Signalé aux services techniques de la commune.', contact: null },
      { id: 'd2', created_at: new Date(now - 5 * day).toISOString(), kind: 'remarque', domain: 'sante', locality: 'Ndayane', title: 'Rupture de certains médicaments au poste de santé', description: 'Les familles doivent se rendre à Mbour pour des médicaments de base.', urgency: 'normale', status: 'nouveau', published: true, admin_note: null, contact: null },
      { id: 'd3', created_at: new Date(now - 9 * day).toISOString(), kind: 'suggestion', domain: 'education', locality: 'Popenguine', title: 'Cours de soutien pendant les vacances', description: 'Organiser des cours de soutien gratuits pour les élèves de CM2 en vue de l\'entrée en 6ème.', urgency: 'normale', status: 'nouveau', published: true, admin_note: null, contact: null },
      { id: 'd4', created_at: new Date(now - 1 * day).toISOString(), kind: 'alerte', domain: 'securite', locality: 'Toubab Dialaw', title: 'Éclairage public en panne sur la corniche', description: 'Plusieurs lampadaires ne fonctionnent plus depuis deux semaines.', urgency: 'normale', status: 'nouveau', published: false, admin_note: null, contact: '' },
    ];
    this.save(seed);
    return seed;
  },
  save: function (rows) { try { localStorage.setItem(this.KEY, JSON.stringify(rows)); } catch (e) {} },
};
