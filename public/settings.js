/* Paramètres du site : textes par défaut, application sur la page, stockage de démonstration. */
(function () {
  var V = window.VEILLE;
  function noApi(s) { return s === 503 || s === 404 || s === 405 || s === 501; }

  var DEFAULTS = {
    heroTitle: 'Faire remonter les difficultés de notre commune, pour mieux agir ensemble',
    heroText: 'Un espace ouvert à tous les habitants de Popenguine et des localités voisines pour signaler un problème, donner un avis ou proposer une amélioration : santé, sécurité, éducation, eau, environnement et routes.',
    aboutTitle: 'Pourquoi cette plateforme ?',
    about1: 'À Popenguine et dans les localités voisines, les difficultés du quotidien sont nombreuses : un poste de santé en manque de médicaments, une rue sans éclairage, une salle de classe en mauvais état, un point d\'eau en panne, une route impraticable. Trop souvent, elles restent connues de quelques-uns et n\'arrivent pas jusqu\'à ceux qui peuvent agir.',
    about2: 'La Commune de Popenguine-Ndayane porte cette plateforme, en partenariat avec l\'association And Bu Yagg Popenguine (ABYP), pour que chaque habitant puisse faire entendre sa voix, simplement et gratuitement. Ensemble, nous rassemblons les besoins du territoire, nous les rendons visibles et nous en suivons le traitement avec les services et les partenaires concernés. Cette plateforme ne remplace pas les services officiels : elle aide à les alerter au bon moment.',
    steps: [
      { title: 'Vous signalez', text: 'Décrivez la situation en quelques lignes, choisissez le domaine et la localité, ajoutez des photos pour une alerte.' },
      { title: 'La commune et ABYP vérifient', text: 'Chaque message est relu par l\'équipe de la commune et celle d\'ABYP avant d\'être publié. Les propos injurieux ou les accusations contre des personnes ne sont pas publiés.' },
      { title: 'Le suivi est public', text: 'Le signalement apparaît dans le suivi public avec son état : nouveau, en cours de traitement ou résolu.' },
    ],
    portedBy: 'Portée par la Commune de Popenguine-Ndayane, en partenariat avec ABYP',
    portedByNote: 'Vos coordonnées, si vous en laissez, ne sont jamais publiées et servent uniquement à vous répondre.',
    mayorTitle: 'Le mot du Maire',
    mayorText: '',
    mayorName: '',
    emergency: 'Cette plateforme n\'est pas un service d\'urgence et n\'est pas consultée en temps réel. En cas de danger, appelez directement : SAMU 1515, Sapeurs-pompiers 18, Police 17, Gendarmerie 800 00 20 20.',
    localities: V.localites.slice(),
  };

  var KEY = 'veille_popenguine_settings';
  var TEXT_KEYS = ['heroTitle', 'heroText', 'aboutTitle', 'about1', 'about2', 'portedBy', 'portedByNote', 'mayorTitle', 'mayorText', 'mayorName', 'emergency'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function filled(v) { return typeof v === 'string' && v.trim() !== ''; }

  // Réglages personnalisés + valeurs par défaut pour tout champ vide ou absent.
  function merge(custom) {
    var s = clone(DEFAULTS);
    if (!custom || typeof custom !== 'object') return s;
    TEXT_KEYS.forEach(function (k) { if (filled(custom[k])) s[k] = custom[k].trim(); });
    if (Array.isArray(custom.steps)) {
      for (var i = 0; i < 3; i++) {
        var c = custom.steps[i] || {};
        if (filled(c.title)) s.steps[i].title = c.title.trim();
        if (filled(c.text)) s.steps[i].text = c.text.trim();
      }
    }
    if (Array.isArray(custom.localities)) {
      var l = custom.localities.filter(filled).map(function (x) { return x.trim(); });
      if (l.length) s.localities = l;
    }
    return s;
  }

  function get(o, path) {
    return path.split('.').reduce(function (acc, k) { return acc == null ? acc : acc[k]; }, o);
  }

  function apply(s) {
    Array.prototype.forEach.call(document.querySelectorAll('[data-s]'), function (el) {
      var v = get(s, el.getAttribute('data-s'));
      if (typeof v === 'string') el.textContent = v;
    });
    // Mot du Maire : section visible seulement si un texte est saisi ; paragraphes créés en texte brut.
    var sec = document.getElementById('mot-du-maire');
    if (sec) {
      var txt = typeof s.mayorText === 'string' ? s.mayorText.trim() : '';
      sec.hidden = !txt;
      var box = document.getElementById('mayor-text');
      if (box) {
        box.textContent = '';
        txt.split(/\n+/).forEach(function (line) {
          if (!line.trim()) return;
          var p = document.createElement('p'); p.textContent = line.trim(); box.appendChild(p);
        });
      }
      var nm = document.getElementById('mayor-name');
      if (nm) nm.hidden = !(typeof s.mayorName === 'string' && s.mayorName.trim());
    }
  }

  function demoRead() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function demoWrite(obj) { try { localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) {} }
  function demoReset() { try { localStorage.removeItem(KEY); } catch (e) {} }

  function load() {
    return fetch('/api/settings', { cache: 'no-store' })
      .then(function (r) {
        if (noApi(r.status)) return demoRead();
        if (!r.ok) throw new Error('settings');
        return r.json().then(function (j) { return j.settings || {}; });
      })
      .catch(function () { return {}; })
      .then(merge);
  }

  window.Settings = { DEFAULTS: DEFAULTS, merge: merge, apply: apply, load: load, demoRead: demoRead, demoWrite: demoWrite, demoReset: demoReset };
})();
