(function () {
  function noApi(s) { return s === 503 || s === 404 || s === 405 || s === 501; } // pas d'API : mode démonstration
  var V = window.VEILLE, esc = window.esc;
  var demo = false;
  var reports = [];

  var DOMAIN_HELP = {
    sante: 'Postes de santé, médicaments, hygiène, épidémies',
    securite: 'Vols, agressions, éclairage, accidents',
    education: 'Écoles, classes, absentéisme, infrastructures',
    eau_environnement_routes: 'Accès à l\'eau, déchets, érosion, voirie',
  };

  function $(id) { return document.getElementById(id); }

  var MAX_PHOTOS = 3;
  var photos = []; // data URLs JPEG

  function compress(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var max = 1280, w = img.width, h = img.height, s = Math.min(1, max / Math.max(w, h));
        var c = document.createElement('canvas');
        c.width = Math.round(w * s); c.height = Math.round(h * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        var q = 0.75, out = c.toDataURL('image/jpeg', q);
        while (out.length * 0.75 > 600 * 1024 && q > 0.35) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
        if (out.length * 0.75 > 650 * 1024) return reject(new Error('Photo trop lourde'));
        resolve(out);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Fichier illisible')); };
      img.src = url;
    });
  }

  function renderThumbs() {
    $('thumbs').innerHTML = photos.map(function (p, i) {
      return '<div class="thumb"><img src="' + p + '" alt="Photo ' + (i + 1) + '"><button type="button" data-rm="' + i + '" aria-label="Retirer la photo ' + (i + 1) + '">&times;</button></div>';
    }).join('');
  }

  function togglePhotoField() {
    var isAlert = document.querySelector('input[name="kind"]:checked').value === 'alerte';
    $('photo-field').hidden = !isAlert;
    if (!isAlert) { photos = []; renderThumbs(); $('photos').value = ''; }
  }

  function onPhotos() {
    var files = Array.prototype.slice.call($('photos').files);
    $('photos').value = '';
    var room = MAX_PHOTOS - photos.length;
    if (files.length > room) msg('info', 'Maximum ' + MAX_PHOTOS + ' photos : les photos en trop sont ignorées.');
    files.slice(0, Math.max(room, 0)).reduce(function (chain, f) {
      return chain.then(function () {
        if (!/^image\//.test(f.type)) return;
        return compress(f).then(function (d) { photos.push(d); renderThumbs(); }, function () { msg('err', 'Une photo n\'a pas pu être lue.'); });
      });
    }, Promise.resolve());
  }

  function fillSelect(sel, map, firstLabel) {
    if (firstLabel) sel.innerHTML = '<option value="">' + esc(firstLabel) + '</option>';
    else sel.innerHTML = '';
    Object.keys(map).forEach(function (k) {
      var o = document.createElement('option');
      o.value = k; o.textContent = map[k]; sel.appendChild(o);
    });
  }

  function init() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-ico]'), function (el) {
      var parts = el.getAttribute('data-ico').split(':');
      el.outerHTML = window.icon(parts[0], parts[1]);
    });
    fillSelect($('domain'), V.domaines);
    var loc = $('locality');
    loc.innerHTML = '<option value="">Choisir une localité</option>' +
      V.localites.map(function (l) { return '<option>' + esc(l) + '</option>'; }).join('');

    fillSelect($('f-domain'), V.domaines, 'Tous les domaines');
    fillSelect($('f-kind'), V.types, 'Tous les types');
    fillSelect($('f-status'), { nouveau: V.statuts.nouveau, en_cours: V.statuts.en_cours, resolu: V.statuts.resolu }, 'Tous les états');
    $('f-locality').innerHTML = '<option value="">Toutes les localités</option>' +
      V.localites.map(function (l) { return '<option>' + esc(l) + '</option>'; }).join('');

    $('domains').innerHTML = Object.keys(V.domaines).map(function (k) {
      return '<div class="domain" data-d="' + k + '">' + window.icon(k, 'teal') + '<h3>' + esc(V.domaines[k]) + '</h3><p>' + esc(DOMAIN_HELP[k]) +
        '</p><span class="c" data-count="' + k + '"></span></div>';
    }).join('');

    $('description').addEventListener('input', function () { $('count').textContent = this.value.length; });
    ['f-q', 'f-domain', 'f-locality', 'f-kind', 'f-status'].forEach(function (id) {
      $(id).addEventListener('input', render);
    });
    $('report-form').addEventListener('submit', submit);
    $('photos').addEventListener('change', onPhotos);
    $('thumbs').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-rm]');
      if (!b) return;
      photos.splice(Number(b.getAttribute('data-rm')), 1); renderThumbs();
    });
    Array.prototype.forEach.call(document.querySelectorAll('input[name="kind"]'), function (r) { r.addEventListener('change', togglePhotoField); });
    togglePhotoField();
    load();
  }

  function load() {
    fetch('/api/reports', { cache: 'no-store' })
      .then(function (r) {
        if (noApi(r.status)) { demo = true; return window.Demo.load().filter(function (x) { return x.published && x.status !== 'rejete'; }); }
        if (!r.ok) throw new Error('Chargement impossible');
        return r.json();
      })
      .then(function (rows) {
        reports = rows;
        $('demo-banner').hidden = !demo;
        render();
      })
      .catch(function () {
        demo = true;
        reports = window.Demo.load().filter(function (x) { return x.published && x.status !== 'rejete'; });
        $('demo-banner').hidden = false;
        render();
      });
  }

  function render() {
    var q = $('f-q').value.trim().toLowerCase();
    var fd = $('f-domain').value, fl = $('f-locality').value, fk = $('f-kind').value, fs = $('f-status').value;

    var list = reports.filter(function (r) {
      if (fd && r.domain !== fd) return false;
      if (fl && r.locality !== fl) return false;
      if (fk && r.kind !== fk) return false;
      if (fs && r.status !== fs) return false;
      if (q && (r.title + ' ' + r.description + ' ' + r.locality).toLowerCase().indexOf(q) === -1) return false;
      return true;
    });

    $('s-total').textContent = reports.length;
    $('s-open').textContent = reports.filter(function (r) { return r.status === 'nouveau'; }).length;
    $('s-progress').textContent = reports.filter(function (r) { return r.status === 'en_cours'; }).length;
    $('s-done').textContent = reports.filter(function (r) { return r.status === 'resolu'; }).length;

    Object.keys(V.domaines).forEach(function (k) {
      var n = reports.filter(function (r) { return r.domain === k; }).length;
      var el = document.querySelector('[data-count="' + k + '"]');
      if (el) el.textContent = n + (n > 1 ? ' signalements' : ' signalement');
    });

    if (!list.length) {
      $('feed').innerHTML = '<div class="empty">Aucun signalement ne correspond à votre recherche.</div>';
      return;
    }
    $('feed').innerHTML = list.map(function (r) {
      return '<article class="item' + (r.urgency === 'urgente' ? ' urgent' : '') + '">' +
        '<div class="meta">' +
        '<span class="tag ' + esc(r.kind) + '">' + esc(V.types[r.kind] || r.kind) + '</span>' +
        (r.urgency === 'urgente' ? '<span class="tag urgent">Urgent</span>' : '') +
        '<span class="tag">' + esc(V.domaines[r.domain] || r.domain) + '</span>' +
        '<span class="tag ' + esc(r.status) + '">' + esc(V.statuts[r.status] || r.status) + '</span>' +
        '</div>' +
        '<h3>' + esc(r.title) + '</h3>' +
        '<p>' + esc(r.description) + '</p>' +
        (r.photos && r.photos.length ? '<div class="photos">' + r.photos.map(function (u, i) {
          return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Photo ' + (i + 1) + ' du signalement" loading="lazy"></a>';
        }).join('') + '</div>' : '') +
        '<div class="foot">' + esc(r.locality) + ' · ' + esc(window.fmtDate(r.created_at)) + '</div>' +
        (r.admin_note ? '<div class="reply"><strong>Réponse de l\'équipe :</strong> ' + esc(r.admin_note) + '</div>' : '') +
        '</article>';
    }).join('');
  }

  function msg(type, text) {
    $('form-msg').innerHTML = '<div class="notice ' + type + '">' + esc(text) + '</div>';
    $('form-msg').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function data_kind_photos(kind) { return kind === 'alerte' ? photos.slice(0, MAX_PHOTOS) : []; }

  function submit(e) {
    e.preventDefault();
    var f = e.target;
    var data = {
      kind: f.kind.value, domain: f.domain.value, locality: f.locality.value,
      title: f.title.value.trim(), description: f.description.value.trim(),
      urgency: f.urgency.value, contact: f.contact.value.trim(), website: f.website.value,
      photos: data_kind_photos(f.kind.value),
    };
    if (!data.locality) return msg('err', 'Veuillez choisir une localité.');
    if (data.title.length < 5) return msg('err', 'Le titre doit contenir au moins 5 caractères.');
    if (data.description.length < 10) return msg('err', 'La description doit contenir au moins 10 caractères.');

    var btn = $('submit-btn');
    btn.disabled = true; btn.textContent = 'Envoi en cours...';

    function done() {
      f.reset(); $('count').textContent = '0'; photos = []; renderThumbs(); togglePhotoField();
      msg('ok', 'Merci, votre signalement a bien été reçu. Il sera publié après validation par l\'équipe.');
    }
    function fail(t) { msg('err', t || 'Envoi impossible. Vérifiez votre connexion et réessayez.'); }
    function reset() { btn.disabled = false; btn.textContent = 'Envoyer le signalement'; }

    fetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) {
        if (noApi(r.status)) {
          var rows = window.Demo.load();
          rows.unshift({ id: 'd' + Date.now(), created_at: new Date().toISOString(), kind: data.kind, domain: data.domain, locality: data.locality, title: data.title, description: data.description, urgency: data.urgency, contact: data.contact || null, photos: data.photos, status: 'nouveau', published: false, admin_note: null });
          window.Demo.save(rows);
          return done();
        }
        if (r.ok) return done();
        return r.json().then(function (j) { fail(j && j.error); }, function () { fail(); });
      })
      .catch(function () { fail(); })
      .then(reset);
  }

  init();
})();
