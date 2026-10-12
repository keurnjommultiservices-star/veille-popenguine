const crypto = require('crypto');

const KINDS = ['alerte', 'remarque', 'suggestion'];
const DOMAINS = ['sante', 'securite', 'education', 'eau_environnement_routes'];
const STATUSES = ['nouveau', 'en_cours', 'resolu', 'rejete'];
const URGENCIES = ['normale', 'urgente'];

function config() {
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  return { url, key, ok: Boolean(url && key) };
}

// Les nouvelles clés Supabase (sb_secret_...) ne sont pas des JWT : elles vont dans « apikey » seulement.
// Les anciennes clés (service_role, eyJ...) vont aussi dans « Authorization ».
function authHeaders(key) {
  return /^sb_/.test(key) ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}

async function db(path, options = {}) {
  const { url, key } = config();
  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...authHeaders(key),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
  if (!res.ok) {
    const err = new Error('Erreur base de données');
    err.status = res.status;
    err.detail = data;
    throw err;
  }
  return data;
}

function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (e) { return {}; }
  }
  return {};
}

function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

// Comptes administrateurs : ADMIN_USERS (liste JSON de {"email","password"}) et/ou le couple historique
// ADMIN_EMAIL + ADMIN_PASSWORD. Pour ADMIN_USERS, l'e-mail ET le mot de passe doivent correspondre au même compte.
function adminUsers() {
  try {
    const list = JSON.parse(process.env.ADMIN_USERS || '[]');
    return Array.isArray(list) ? list.filter((u) => u && u.email && u.password) : [];
  } catch (e) { return []; }
}

function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD) || adminUsers().length > 0;
}

function isAdmin(req) {
  const givenPwd = String(req.headers['x-admin-password'] || '');
  const givenEmail = String(req.headers['x-admin-email'] || '').trim().toLowerCase();
  let ok = false;

  // Couple historique : mot de passe obligatoire ; si ADMIN_EMAIL est défini, l'e-mail doit aussi correspondre.
  const expectedPwd = process.env.ADMIN_PASSWORD || '';
  if (expectedPwd && givenPwd && safeEqual(givenPwd, expectedPwd)) {
    const expectedEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    if (!expectedEmail || (givenEmail && safeEqual(givenEmail, expectedEmail))) ok = true;
  }

  // Comptes multiples : on parcourt toujours toute la liste (pas d'arrêt anticipé).
  for (const u of adminUsers()) {
    const emailOk = Boolean(givenEmail) && safeEqual(givenEmail, String(u.email).trim().toLowerCase());
    const pwdOk = Boolean(givenPwd) && safeEqual(givenPwd, String(u.password));
    if (emailOk && pwdOk) ok = true;
  }
  return ok;
}

function clean(value, max) {
  return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max);
}

const BUCKET = 'report-photos';
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 700 * 1024;

// Accepte uniquement des JPEG (le navigateur convertit et retire les métadonnées GPS).
function decodePhoto(dataUrl) {
  const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) return null;
  const buf = Buffer.from(m[1], 'base64');
  if (buf.length < 100 || buf.length > MAX_PHOTO_BYTES) return null;
  if (!(buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)) return null;
  return buf;
}

async function uploadPhoto(buf) {
  const { url, key } = config();
  const name = `${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.jpg`;
  const res = await fetch(`${url}/storage/v1/object/${BUCKET}/${name}`, {
    method: 'POST',
    headers: { ...authHeaders(key), 'Content-Type': 'image/jpeg' },
    body: buf,
  });
  if (!res.ok) {
    const err = new Error('Échec du téléversement');
    err.status = res.status;
    throw err;
  }
  return { name, publicUrl: `${url}/storage/v1/object/public/${BUCKET}/${name}` };
}

async function removePhotos(publicUrls) {
  const { url, key } = config();
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const names = (publicUrls || [])
    .map((u) => { const i = String(u).indexOf(marker); return i === -1 ? null : String(u).slice(i + marker.length); })
    .filter(Boolean);
  if (!names.length) return;
  await fetch(`${url}/storage/v1/object/${BUCKET}`, {
    method: 'DELETE',
    headers: { ...authHeaders(key), 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefixes: names }),
  }).catch(() => {});
}

module.exports = { KINDS, DOMAINS, STATUSES, URGENCIES, MAX_PHOTOS, config, db, readBody, isAdmin, adminConfigured, clean, decodePhoto, uploadPhoto, removePhotos };
