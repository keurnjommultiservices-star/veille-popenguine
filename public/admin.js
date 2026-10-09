(function () {
  function noApi(s) { return s === 503 || s === 404 || s === 405 || s === 501; } // pas d'API : mode démonstration
  var V = window.VEILLE, esc = window.esc;
  var pwd = '';
  var email = '';
  var demo = false;
  var rows = [];

  function $(id) { return document.getElementById(id); }

  function api(method, path, body) {
    if (demo) return demoApi(method, path, body);
    return fetch(path, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd, 'x-admin-email': email },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || 'Erreur'); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  function demoApi(method, path, body) {
    if (path === '/api/settings') {
      if (method === 'GET') return Promise.resolve({ settings: window.Settings.demoRead() });
      if (method === 'PUT') { window.Settings.demoWrite(body.settings || {}); return Promise.resolve({ settings: body.settings || {} }); }
      if (method === 'DELETE') { window.Settings.demoReset(); return Promise.resolve({ ok: true }); }
    }
    var data = window.Demo.load();
    if (method === 'GET') return Promise.resolve(data);
    if (method === 'PATCH') {
      data = data.map(function (r) { return r.id === body.id ? Object.assign({}, r, body) : r; });
      window.Demo.save(data);
      return Promise.resolve({ ok: true });
    }
    if (method === 'DELETE') {
      var id = path.split('id=')[1];
      window.Demo.save(data.filter(function (r) { return r.id !== id; }));
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({});
  }

  function msg(type, text) {
    $('msg').innerHTML = '<div class="notice ' + type + '">' + esc(text) + '</div>';
    setTimeout(function () { $('msg').innerHTML = ''; }, 4000);
  }

  function showPanel() {
    $('login').hidden = true; $('panel').hidden = false; $('logout').hidden = false;
    $('demo-banner').hidden = !demo;
  }

  function loadAll() {
    return api('GET', '/api/admin').then(function (r) { rows = r; render(); });
  }

  // ---------- Paramètres du site ----------
  var FIELDS = [
    { group: 'En-tête de l\'accueil', items: [
      { k: 'heroTitle', label: 'Titre principal', area: false, max: 160 },
      { k: 'heroText', label: 'Texte d\'introduction', area: true, max: 500 } ] },
    { group: 'Section « Pourquoi cette plateforme ? »', items: [
      { k: 'aboutTitle', label: 'Titre de la section', area: false, max: 100 },
      { k: 'about1', label: 'Premier paragraphe', area: true, max: 800 },
      { k: 'about2', label: 'Deuxième paragraphe', area: true, max: 800 } ] },
    { group: 'Les trois étapes', steps: true },
    { group: 'Mot du Maire (accueil)', items: [
      { k: 'mayorTitle', label: 'Titre de la section', area: false, max: 80 },
      { k: 'mayorText', label: 'Message du Maire', area: true, max: 1500, hint: 'Laissez vide pour masquer la section. Un paragraphe par ligne. À publier seulement après accord du Maire.' },
      { k: 'mayorName', label: 'Signature', area: false, max: 160, hint: 'Ex. : Prénom NOM, Maire de la Commune de Popenguine-Ndayane' } ] },
    { group: 'Association', items: [
      { k: 'portedBy', label: 'Mention « Porté par »', area: false, max: 120 },
      { k: 'portedByNote', label: 'Note sous la mention', area: true, max: 250 } ] },
    { group: 'Localités', localities: true },
    { group: 'Numéros d\'urgence', items: [
      { k: 'emergency', label: 'Texte affiché en bas de page', area: true, max: 500 } ] },
  ];

  function field(id, label, value, area, max, hint) {
    var ctl = area
      ? '<textarea id="' + id + '" maxlength="' + max + '" rows="' + (max >= 700 ? 7 : 3) + '">' + esc(value) + '</textarea>'
      : '<input id="' + id + '" maxlength="' + max + '" value="' + esc(value) + '">';
    var bar = '<div class="fmt-bar" role="toolbar" aria-label="Mise en forme">' +
      '<button type="button" data-fmt="**" data-for="' + id + '" title="Mettre en gras"><strong>Gras</strong></button>' +
      '<button type="button" data-fmt="{{" data-for="' + id + '" title="Gras et couleur"><span style="color:#0e7490;font-weight:700">Couleur</span></button>' +
      '<button type="button" data-fmt="++" data-for="' + id + '" title="Agrandir les caractères"><span style="font-size:17px">Grand</span></button></div>';
    return '<div class="field"><label for="' + id + '">' + esc(label) + '</label>' + bar + ctl + (hint ? '<span class="hint">' + esc(hint) + '</span>' : '') + '</div>';
  }

  // Boutons de mise en forme : entourent le texte sélectionné des repères (**, {{ }}, ++).
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-fmt]');
    if (!b) return;
    var el = document.getElementById(b.getAttribute('data-for'));
    if (!el) return;
    var open = b.getAttribute('data-fmt'), close = open === '{{' ? '}}' : open;
    var a = el.selectionStart || 0, z = el.selectionEnd || 0;
    var sel = el.value.slice(a, z) || 'texte';
    el.value = el.value.slice(0, a) + open + sel + close + el.value.slice(z);
    el.focus();
    el.setSelectionRange(a + open.length, a + open.length + sel.length);
  });

  function renderSettings(custom) {
    var s = window.Settings.merge(custom);
    $('settings-fields').innerHTML = FIELDS.map(function (g) {
      var inner = '';
      if (g.steps) {
        inner = s.steps.map(function (st, i) {
          return '<div class="set-step">' + field('set-st' + i + 't', 'Étape ' + (i + 1) + ' : titre', st.title, false, 60) +
            field('set-st' + i + 'x', 'Étape ' + (i + 1) + ' : texte', st.text, true, 300) + '</div>';
        }).join('');
      } else if (g.localities) {
        inner = '<div class="field"><label for="set-loc">Liste des localités</label><textarea id="set-loc" rows="8">' + esc(s.localities.join('\n')) +
          '</textarea><span class="hint">Une localité par ligne. Elle apparaît dans le formulaire de signalement et dans les filtres.</span></div>';
      } else {
        inner = g.items.map(function (it) { return field('set-' + it.k, it.label, s[it.k], it.area, it.max, it.hint); }).join('');
      }
      return '<fieldset class="set-group"><legend>' + esc(g.group) + '</legend>' + inner + '</fieldset>';
    }).join('');
  }

  function collectSettings() {
    var out = { steps: [], localities: [] };
    FIELDS.forEach(function (g) {
      if (g.items) g.items.forEach(function (it) { out[it.k] = $('set-' + it.k).value; });
    });
    for (var i = 0; i < 3; i++) out.steps.push({ title: $('set-st' + i + 't').value, text: $('set-st' + i + 'x').value });
    out.localities = $('set-loc').value.split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
    return out;
  }

  function loadSettings() {
    return api('GET', '/api/settings').then(function (r) { renderSettings(r.settings || {}); })
      .catch(function () { renderSettings({}); });
  }

  function saveSettings(e) {
    e.preventDefault();
    var btn = $('set-save'); btn.disabled = true;
    api('PUT', '/api/settings', { settings: collectSettings() })
      .then(function (r) { renderSettings(r.settings || {}); msg('ok', 'Paramètres enregistrés. Le site public est à jour.'); })
      .catch(function (err) { if (err.status === 401) return logout(); msg('err', err.message || 'Erreur'); })
      .then(function () { btn.disabled = false; });
  }

  function resetSettings() {
    if (!confirm('Rétablir tous les textes d\'origine ? Vos modifications seront perdues.')) return;
    api('DELETE', '/api/settings')
      .then(function () { renderSettings({}); msg('ok', 'Textes d\'origine rétablis.'); })
      .catch(function (err) { if (err.status === 401) return logout(); msg('err', err.message || 'Erreur'); });
  }

  function switchTab(name) {
    var isSet = name === 'settings';
    $('tab-reports').hidden = isSet; $('tab-settings').hidden = !isSet;
    $('tab-btn-reports').classList.toggle('active', !isSet); $('tab-btn-settings').classList.toggle('active', isSet);
    $('tab-btn-reports').setAttribute('aria-selected', String(!isSet)); $('tab-btn-settings').setAttribute('aria-selected', String(isSet));
    if (isSet) loadSettings();
  }

  function login(e) {
    e.preventDefault();
    pwd = $('pwd').value;
    email = $('email').value.trim();
    fetch('/api/admin', { headers: { 'x-admin-password': pwd, 'x-admin-email': email }, cache: 'no-store' })
      .then(function (r) {
        if (noApi(r.status)) {
          // Base non configurée : mode démonstration
          if (pwd !== 'demo') { $('login-msg').innerHTML = '<div class="notice err">Mode démonstration : saisissez n\'importe quel e-mail et le mot de passe « demo ».</div>'; return; }
          demo = true; showPanel(); return loadAll();
        }
        if (r.status === 401) { $('login-msg').innerHTML = '<div class="notice err">E-mail ou mot de passe incorrect.</div>'; return; }
        if (!r.ok) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            var hint = j && j.code === 401 ? ' La clé Supabase est refusée : vérifiez SUPABASE_SERVICE_ROLE_KEY dans Vercel.' : (j && j.code === 404 ? ' Tables introuvables : vérifiez SUPABASE_URL.' : '');
            $('login-msg').innerHTML = '<div class="notice err">Erreur serveur' + (j && j.code ? ' (base de données, code ' + j.code + ')' : '') + '.' + hint + '</div>';
          });
        }
        return r.json().then(function (j) {
          try { sessionStorage.setItem('veille_admin', pwd); sessionStorage.setItem('veille_admin_email', email); } catch (x) {}
          rows = j; showPanel(); render();
        });
      })
      .catch(function () { $('login-msg').innerHTML = '<div class="notice err">Connexion impossible.</div>'; });
  }

  function view(r) {
    var v = $('v-view').value;
    if (v === 'pending' && !(r.status === 'nouveau' && !r.published)) return false;
    if (v === 'published' && !r.published) return false;
    if (v === 'rejected' && r.status !== 'rejete') return false;
    if ($('v-domain').value && r.domain !== $('v-domain').value) return false;
    if ($('v-kind').value && r.kind !== $('v-kind').value) return false;
    return true;
  }

  function render() {
    $('a-new').textContent = rows.filter(function (r) { return r.status === 'nouveau' && !r.published; }).length;
    $('a-pub').textContent = rows.filter(function (r) { return r.published; }).length;
    $('a-prog').textContent = rows.filter(function (r) { return r.status === 'en_cours'; }).length;
    $('a-urg').textContent = rows.filter(function (r) { return r.urgency === 'urgente' && r.status !== 'resolu' && r.status !== 'rejete'; }).length;

    var list = rows.filter(view);
    if (!list.length) { $('list').innerHTML = '<div class="empty">Aucun signalement dans cette vue.</div>'; return; }

    $('list').innerHTML = list.map(function (r) {
      var opts = Object.keys(V.statuts).map(function (k) {
        return '<option value="' + k + '"' + (r.status === k ? ' selected' : '') + '>' + esc(V.statuts[k]) + '</option>';
      }).join('');
      return '<article class="admin-item" data-id="' + esc(r.id) + '">' +
        '<div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">' +
        '<span class="tag ' + esc(r.kind) + '">' + esc(V.types[r.kind]) + '</span>' +
        (r.urgency === 'urgente' ? '<span class="tag urgent">Urgent</span>' : '') +
        '<span class="tag">' + esc(V.domaines[r.domain]) + '</span>' +
        '<span class="tag ' + esc(r.status) + '">' + esc(V.statuts[r.status]) + '</span>' +
        '<span class="tag">' + (r.published ? 'Publié' : 'Non publié') + '</span></div>' +
        '<h3>' + esc(r.title) + '</h3>' +
        '<p style="white-space:pre-wrap;margin:0 0 6px">' + esc(r.description) + '</p>' +
        (r.photos && r.photos.length ? '<div class="photos">' + r.photos.map(function (u, i) {
          return '<a href="' + esc(u) + '" target="_blank" rel="noopener"><img src="' + esc(u) + '" alt="Photo ' + (i + 1) + '" loading="lazy"></a>';
        }).join('') + '</div>' : '') +
        '<div class="contact">' + esc(r.locality) + ' · ' + esc(window.fmtDate(r.created_at)) +
        (r.contact ? ' · Contact : ' + esc(r.contact) : '') + '</div>' +
        '<div class="row"><label style="font-weight:500">État</label><select data-f="status">' + opts + '</select></div>' +
        '<div class="row"><textarea data-f="note" placeholder="Réponse publique de l\'équipe (facultatif)">' + esc(r.admin_note || '') + '</textarea></div>' +
        '<div class="row">' +
        '<button class="btn small" data-a="save">Enregistrer</button>' +
        (r.published
          ? '<button class="btn secondary small" data-a="unpublish">Retirer de la publication</button>'
          : '<button class="btn secondary small" data-a="publish">Valider et publier</button>') +
        '<button class="btn danger small" data-a="delete">Supprimer</button>' +
        '</div></article>';
    }).join('');
  }

  function onClick(e) {
    var btn = e.target.closest('button[data-a]');
    if (!btn) return;
    var card = btn.closest('.admin-item');
    var id = card.getAttribute('data-id');
    var action = btn.getAttribute('data-a');
    var status = card.querySelector('[data-f="status"]').value;
    var note = card.querySelector('[data-f="note"]').value;

    var p;
    if (action === 'delete') {
      if (!confirm('Supprimer définitivement ce signalement ?')) return;
      p = api('DELETE', '/api/admin?id=' + encodeURIComponent(id));
    } else {
      var body = { id: id, status: status, admin_note: note };
      if (demo) { body.admin_note = note || null; }
      if (action === 'publish') body.published = true;
      if (action === 'unpublish') body.published = false;
      if (status === 'rejete') body.published = false;
      p = api('PATCH', '/api/admin', body);
    }
    btn.disabled = true;
    p.then(function () { msg('ok', 'Modification enregistrée.'); return loadAll(); })
      .catch(function (err) {
        if (err.status === 401) return logout();
        msg('err', err.message || 'Erreur');
        btn.disabled = false;
      });
  }

  function exportCsv() {
    var head = ['Date', 'Type', 'Domaine', 'Localité', 'Titre', 'Description', 'Urgence', 'État', 'Publié', 'Contact', 'Réponse'];
    function cell(v) { return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"'; }
    var lines = [head.map(cell).join(';')].concat(rows.map(function (r) {
      return [r.created_at, V.types[r.kind], V.domaines[r.domain], r.locality, r.title, r.description, r.urgency, V.statuts[r.status], r.published ? 'oui' : 'non', r.contact, r.admin_note].map(cell).join(';');
    }));
    var blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'signalements-popenguine.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function logout(e) {
    if (e && e.preventDefault) e.preventDefault();
    try { sessionStorage.removeItem('veille_admin'); sessionStorage.removeItem('veille_admin_email'); } catch (x) {}
    pwd = ''; email = ''; demo = false; rows = [];
    switchTab('reports');
    $('panel').hidden = true; $('logout').hidden = true; $('login').hidden = false; $('pwd').value = '';
  }

  function init() {
    var dom = $('v-domain'), kind = $('v-kind');
    Object.keys(V.domaines).forEach(function (k) { dom.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + esc(V.domaines[k]) + '</option>'); });
    Object.keys(V.types).forEach(function (k) { kind.insertAdjacentHTML('beforeend', '<option value="' + k + '">' + esc(V.types[k]) + '</option>'); });
    ['v-view', 'v-domain', 'v-kind'].forEach(function (id) { $(id).addEventListener('change', render); });
    $('login-form').addEventListener('submit', login);
    $('list').addEventListener('click', onClick);
    $('logout').addEventListener('click', logout);
    $('export').addEventListener('click', exportCsv);
    $('tab-btn-reports').addEventListener('click', function () { switchTab('reports'); });
    $('tab-btn-settings').addEventListener('click', function () { switchTab('settings'); });
    $('settings-form').addEventListener('submit', saveSettings);
    $('set-reset').addEventListener('click', resetSettings);

    var saved = '';
    try { saved = sessionStorage.getItem('veille_admin') || ''; email = sessionStorage.getItem('veille_admin_email') || ''; } catch (x) {}
    if (saved) {
      pwd = saved;
      fetch('/api/admin', { headers: { 'x-admin-password': pwd, 'x-admin-email': email }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { rows = j; showPanel(); render(); })
        .catch(function () { pwd = ''; });
    }
  }

  init();
})();
