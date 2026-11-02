/* Paramètres du site : textes par défaut, application sur la page, stockage de démonstration. */
(function () {
  var V = window.VEILLE;
  function noApi(s) { return s === 503 || s === 404 || s === 405 || s === 501; }

  var DEFAULTS = {
    heroTitle: 'Faire remonter les difficultés de notre commune, pour mieux agir ensemble',
    heroText: 'Un espace ouvert à tous les habitants de Popenguine et des localités voisines pour signaler un problème, donner un avis ou proposer une amélioration : santé, sécurité, éducation, eau, environnement et routes.',
    aboutTitle: 'Pourquoi cette plateforme ?',
    about1: 'À Popenguine et dans les localités voisines, les difficultés du quotidien sont nombreuses : un poste de santé en manque de médicaments, une rue sans éclairage, une salle de classe en mauvais état, un point d\'eau en panne, une route impraticable. Trop souvent, elles restent connues de quelques-uns et n\'arrivent pas jusqu\'à ceux qui peuvent agir.',
    about2: 'La Commune de Popenguine-Ndayane porte cette plateforme pour que chaque habitant puisse faire entendre sa voix, simplement et gratuitement. Ensemble, nous rassemblons les besoins du territoire, nous les rendons visibles et nous en suivons le traitement avec les services et les partenaires concernés. Cette plateforme ne remplace pas les services officiels : elle aide à les alerter au bon moment.',
    steps: [
      { title: 'Vous signalez', text: 'Décrivez la situation en quelques lignes, choisissez le domaine et la localité, ajoutez des photos pour une alerte.' },
      { title: 'La commune vérifie', text: 'Chaque message est relu par l\'équipe de la commune avant d\'être publié. Les propos injurieux ou les accusations contre des personnes ne sont pas publiés.' },
      { title: 'Le suivi est public', text: 'Le signalement apparaît dans le suivi public avec son état : nouveau, en cours de traitement ou résolu.' },
    ],
    portedBy: 'Portée par la Commune de Popenguine-Ndayane',
    portedByNote: 'Vos coordonnées, si vous en laissez, ne sont jamais publiées et servent uniquement à vous répondre.',
    mayorTitle: 'Le mot du Maire',
    mayorText: '',
    mayorName: '',
    emergency: 'Cette plateforme n\'est pas un service d\'urgence et n\'est pas consultée en temps réel. En cas de danger, appelez directement : SAMU 1515, Sapeurs-pompiers 18, Police 17, Gendarmerie 800 00 20 20.',
    localities: V.localites.slice(),
    footerText: 'Veille citoyenne de Popenguine et environs, portée par la Commune de Popenguine-Ndayane',
    carrier: 'commune',
  };


  // Porteur de la plateforme : 'commune' (Mairie seule), 'abyp' (ABYP seule) ou 'both' (les deux).
  var CARRIERS = ['commune', 'abyp', 'both'];
  var VARIANTS = {
    commune: {
      about2: 'La Commune de Popenguine-Ndayane porte cette plateforme pour que chaque habitant puisse faire entendre sa voix, simplement et gratuitement. Ensemble, nous rassemblons les besoins du territoire, nous les rendons visibles et nous en suivons le traitement avec les services et les partenaires concernés. Cette plateforme ne remplace pas les services officiels : elle aide à les alerter au bon moment.',
      portedBy: 'Portée par la Commune de Popenguine-Ndayane',
      footerText: 'Veille citoyenne de Popenguine et environs, portée par la Commune de Popenguine-Ndayane',
      s1title: 'La commune vérifie',
      s1text: 'Chaque message est relu par l\'équipe de la commune avant d\'être publié. Les propos injurieux ou les accusations contre des personnes ne sont pas publiés.'
    },
    abyp: {
      about2: 'L\'association And Bu Yagg Popenguine (ABYP) porte cette plateforme pour que chaque habitant puisse faire entendre sa voix, simplement et gratuitement. Ensemble, nous rassemblons les besoins du territoire, nous les rendons visibles et nous en suivons le traitement avec les services et les partenaires concernés. Cette plateforme ne remplace pas les services officiels : elle aide à les alerter au bon moment.',
      portedBy: 'Portée par l\'association And Bu Yagg Popenguine (ABYP)',
      footerText: 'Veille citoyenne de Popenguine et environs, portée par l\'association And Bu Yagg Popenguine (ABYP)',
      s1title: 'ABYP vérifie',
      s1text: 'Chaque message est relu par l\'équipe d\'ABYP avant d\'être publié. Les propos injurieux ou les accusations contre des personnes ne sont pas publiés.'
    },
    both: {
      about2: 'La Commune de Popenguine-Ndayane porte cette plateforme, en partenariat avec l\'association And Bu Yagg Popenguine (ABYP), pour que chaque habitant puisse faire entendre sa voix, simplement et gratuitement. Ensemble, nous rassemblons les besoins du territoire, nous les rendons visibles et nous en suivons le traitement avec les services et les partenaires concernés. Cette plateforme ne remplace pas les services officiels : elle aide à les alerter au bon moment.',
      portedBy: 'Portée par la Commune de Popenguine-Ndayane, en partenariat avec ABYP',
      footerText: 'Veille citoyenne de Popenguine et environs, portée par la Commune de Popenguine-Ndayane, en partenariat avec l\'association And Bu Yagg Popenguine (ABYP)',
      s1title: 'La commune et ABYP vérifient',
      s1text: 'Chaque message est relu par l\'équipe de la commune et celle d\'ABYP avant d\'être publié. Les propos injurieux ou les accusations contre des personnes ne sont pas publiés.'
    }
  };
  var DEFAULT_CARRIER = 'commune';
  function variantOf(c) { return VARIANTS[c] || VARIANTS[DEFAULT_CARRIER]; }
  // Remplace un texte d'origine (de n'importe quelle variante) par celui du porteur choisi ; un texte réécrit à la main n'est jamais touché.
  function swap(value, key, carrier) {
    for (var i = 0; i < CARRIERS.length; i++) if (VARIANTS[CARRIERS[i]][key] === value) return variantOf(carrier)[key];
    return value;
  }

  var KEY = 'veille_popenguine_settings';
  var TEXT_KEYS = ['heroTitle', 'heroText', 'aboutTitle', 'about1', 'about2', 'portedBy', 'portedByNote', 'mayorTitle', 'mayorText', 'mayorName', 'emergency'];

  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function filled(v) { return typeof v === 'string' && v.trim() !== ''; }

  // Réglages personnalisés + valeurs par défaut pour tout champ vide ou absent.
  function merge(custom) {
    var s = clone(DEFAULTS);
    if (!custom || typeof custom !== 'object') custom = {};
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
    var c = custom.carrier;
    s.carrier = CARRIERS.indexOf(c) >= 0 ? c : DEFAULT_CARRIER;
    s.about2 = swap(s.about2, 'about2', s.carrier);
    s.portedBy = swap(s.portedBy, 'portedBy', s.carrier);
    s.footerText = swap(s.footerText, 'footerText', s.carrier);
    s.steps[1].title = swap(s.steps[1].title, 's1title', s.carrier);
    s.steps[1].text = swap(s.steps[1].text, 's1text', s.carrier);
    return s;
  }

  function get(o, path) {
    return path.split('.').reduce(function (acc, k) { return acc == null ? acc : acc[k]; }, o);
  }

  // Mise en forme sûre : **gras** et {{mise en valeur}} (gras + couleur). Aucun HTML n'est interprété.
  var RICH = /(\*\*[^*]+?\*\*|\{\{[^{}]+?\}\}|\+\+[^+]+?\+\+)/;
  function rich(el, text) {
    el.textContent = '';
    String(text).split(RICH).forEach(function (part) {
      if (!part) return;
      var node;
      if (part.length > 4 && part.slice(0, 2) === '**' && part.slice(-2) === '**') {
        node = document.createElement('strong'); node.textContent = part.slice(2, -2);
      } else if (part.length > 4 && part.slice(0, 2) === '{{' && part.slice(-2) === '}}') {
        node = document.createElement('span'); node.className = 'em'; node.textContent = part.slice(2, -2);
      } else if (part.length > 4 && part.slice(0, 2) === '++' && part.slice(-2) === '++') {
        node = document.createElement('span'); node.className = 'big'; node.textContent = part.slice(2, -2);
      } else {
        node = document.createTextNode(part);
      }
      el.appendChild(node);
    });
  }

  function apply(s) {
    // Logos : blason de la commune, logo d'ABYP ou les deux selon le porteur choisi.
    var car = s.carrier || DEFAULT_CARRIER;
    var showC = car !== 'abyp', showA = car !== 'commune';
    Array.prototype.forEach.call(document.querySelectorAll('.logo-commune'), function (el) { el.style.display = showC ? '' : 'none'; });
    Array.prototype.forEach.call(document.querySelectorAll('.logo-abyp'), function (el) { el.style.display = showA ? '' : 'none'; });
    var hb = document.querySelector('.brand-logo.logo-commune'), ha = document.querySelector('.brand-logo.logo-abyp');
    if (hb && ha) { hb.style.display = showC ? '' : 'none'; ha.style.display = (!showC) ? '' : 'none'; }
    Array.prototype.forEach.call(document.querySelectorAll('[data-s]'), function (el) {
      var v = get(s, el.getAttribute('data-s'));
      if (typeof v === 'string') rich(el, v);
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
          var p = document.createElement('p'); rich(p, line.trim()); box.appendChild(p);
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

  window.Settings = { rich: rich, DEFAULTS: DEFAULTS, merge: merge, apply: apply, load: load, demoRead: demoRead, demoWrite: demoWrite, demoReset: demoReset };
})();
