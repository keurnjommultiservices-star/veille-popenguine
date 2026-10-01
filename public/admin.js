(function () {
  var V = window.VEILLE, esc = window.esc;
  var pwd = '';
  var demo = false;
  var rows = [];

  function $(id) { return document.getElementById(id); }

  function api(method, path, body) {
    if (demo) return demoApi(method, path, body);
    return fetch(path, {
      method: method,
      headers: { 'Content-Type': 'application/json', 'x-admin-password': pwd },
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

  function login(e) {
    e.preventDefault();
    pwd = $('pwd').value;
    fetch('/api/admin', { headers: { 'x-admin-password': pwd }, cache: 'no-store' })
      .then(function (r) {
        if (r.status === 503) {
          // Base non configurée : mode démonstration
          if (pwd !== 'demo') { $('login-msg').innerHTML = '<div class="notice err">Mode démonstration : utilisez le mot de passe « demo ».</div>'; return; }
          demo = true; showPanel(); return loadAll();
        }
        if (r.status === 401) { $('login-msg').innerHTML = '<div class="notice err">Mot de passe incorrect.</div>'; return; }
        if (!r.ok) { $('login-msg').innerHTML = '<div class="notice err">Erreur serveur.</div>'; return; }
        return r.json().then(function (j) {
          try { sessionStorage.setItem('veille_admin', pwd); } catch (x) {}
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
    try { sessionStorage.removeItem('veille_admin'); } catch (x) {}
    pwd = ''; demo = false; rows = [];
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

    var saved = '';
    try { saved = sessionStorage.getItem('veille_admin') || ''; } catch (x) {}
    if (saved) {
      pwd = saved;
      fetch('/api/admin', { headers: { 'x-admin-password': pwd }, cache: 'no-store' })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (j) { rows = j; showPanel(); render(); })
        .catch(function () { pwd = ''; });
    }
  }

  init();
})();
