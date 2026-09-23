'use strict';

/**
 * The panel, in the browser. Vanilla JavaScript, one file, talking to
 * admin/server.js over /admin/api/. The whole of the editable content is one
 * object, `content`; each section renders from it and writes back into it,
 * Save sends it, Publish builds the site from what was last saved.
 */
(function () {
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
  let content = null, me = null, repoPhotos = [], uploaded = [], versions = [], dirty = false;

  /* ---------------------------------------------------------------- api */
  async function api(method, path, body, raw) {
    const headers = { 'x-requested-with': 'pookie-admin' };
    if (body !== undefined && !raw) headers['content-type'] = 'application/json';
    const res = await fetch('/admin/api' + path, { method, headers, body: body === undefined ? undefined : (raw ? body : JSON.stringify(body)), credentials: 'same-origin' });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401 && path !== '/login') { showLogin(); throw new Error(data.error || 'Please sign in.'); }
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`);
    return data;
  }

  /* -------------------------------------------------------------- toast */
  let toastTimer;
  function toast(msg, isError) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.toggle('is-error', !!isError);
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, isError ? 7000 : 3200);
  }
  function setDirty(v) {
    dirty = v; const s = $('#save-status');
    s.textContent = v ? 'Unsaved changes' : ''; s.classList.toggle('is-dirty', v);
  }
  window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ------------------------------------------------------------- login */
  function showLogin() { $('#login').hidden = false; $('#app').hidden = true; }
  async function showApp() {
    $('#login').hidden = true; $('#app').hidden = false;
    await reload();
    route();
  }
  $('#login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#login-error'); err.hidden = true;
    try { await api('POST', '/login', { password: e.target.password.value }); e.target.reset(); await showApp(); }
    catch (ex) { err.textContent = ex.message; err.hidden = false; }
  });
  $('#logout').addEventListener('click', async () => { try { await api('POST', '/logout'); } catch (e) {} showLogin(); });

  /* -------------------------------------------------------------- load */
  async function reload() {
    me = await api('GET', '/me');
    const c = await api('GET', '/content');
    content = c.content; repoPhotos = c.repoPhotos; uploaded = c.uploaded; versions = c.versions;
    renderAll(); setDirty(false);
  }
  function renderAll() { renderOverview(); renderMenu(); renderPhotos(); renderOpening(); renderContact(); renderHistory(); }

  /* ------------------------------------------------------------- route */
  function route() {
    const id = (location.hash || '#overview').slice(1);
    $$('.adm-sec').forEach(s => { s.hidden = s.dataset.sec !== id; });
    $$('[data-nav]').forEach(a => { if (a.dataset.nav === id) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (!$$('.adm-sec').some(s => !s.hidden)) location.hash = '#overview';
  }
  window.addEventListener('hashchange', route);

  /* ----------------------------------------------------------- overview */
  function renderOverview() {
    const c = content;
    const addressOk = !!(c.contact.address.line1 && c.contact.address.locality && c.contact.address.postcode);
    const hoursOk = DAYS.every(([k]) => c.contact.hours[k] === 'closed' || Array.isArray(c.contact.hours[k]));
    const checks = [
      ['Address', addressOk], ['Hours for every day', hoursOk], ['Phone or email', !!(c.contact.phone || c.contact.email)],
      ['Company name and number (required by law)', !!(c.company.companyName && c.company.companyNumber)],
      ['Allergen statement (required by law)', !!(c.allergens.statement || c.allergens.perItem)],
    ];
    const missing = checks.filter(([, ok]) => !ok).length;
    $('#ov-lede').textContent = missing
      ? `The site is live. ${missing === 1 ? 'One thing is' : `${missing} things are`} still missing from it — each appears on the site the moment you fill it in.`
      : 'The site is live, and everything it needs is filled in.';
    $('#ov-checks').innerHTML = checks.map(([l, ok]) => `<li class="${ok ? 'is-ok' : ''}">${esc(l)}</li>`).join('');
    const dishes = c.menu.reduce((n, ch) => n + ch.items.length, 0);
    const hidden = c.menu.reduce((n, ch) => n + ch.items.filter(i => i.hidden).length, 0);
    const noPrice = c.menu.reduce((n, ch) => n + ch.items.filter(i => i.price == null || i.priceConfirmed === false).length, 0);
    $('#ov-numbers').textContent = `${c.menu.length} chapters · ${dishes} dishes (${hidden} hidden) · ${noPrice} without a confirmed price · ${uploaded.length} uploaded photos`;
    $('#ov-published').textContent = me.lastPublished ? new Date(me.lastPublished).toLocaleString('en-GB') : 'Never';
    const r = me.lastResult;
    $('#ov-result').textContent = r ? (r.ok ? `Passed the checks with ${r.warnings.length} note(s).` : `Refused: ${r.errors.length} problem(s).`) : '';
    const w = $('#ov-warnings');
    if (r && (r.errors.length || r.warnings.length)) {
      w.hidden = false; w.classList.toggle('is-error', !r.ok);
      w.innerHTML = `<strong>${r.ok ? 'Notes from the last publish' : 'The last publish was refused'}</strong><ul>${[...r.errors, ...r.warnings].map(x => `<li>${esc(x)}</li>`).join('')}</ul>`;
    } else w.hidden = true;
  }

  /* --------------------------------------------------------------- menu */
  function photoOptions(current) {
    const all = [...uploaded.filter(u => u.complete).map(u => u.slug), ...repoPhotos];
    return `<option value="">— no photo —</option>` + all.map(s => `<option value="${esc(s)}"${s === current ? ' selected' : ''}>${esc(s)}</option>`).join('');
  }
  function sauceOptions(current) {
    return `<option value="">— sauce —</option>` + Object.entries(me.families).map(([k, v]) => `<option value="${k}"${k === current ? ' selected' : ''}>${esc(v.label)}</option>`).join('');
  }
  function renderMenu() {
    const root = $('#menu-editor');
    root.innerHTML = content.menu.map((ch, ci) => `
      <section class="adm-chapter" data-ci="${ci}">
        <div class="adm-chapter__head">
          <input type="text" value="${esc(ch.name)}" data-f="name" aria-label="Chapter name">
          <input type="text" class="adm-statement" value="${esc(ch.priceStatement || '')}" data-f="priceStatement" placeholder="Price line, e.g. Everything here is £3.90" aria-label="Price line">
          <div class="adm-chapter__tools">
            <button class="adm-mini" type="button" data-act="ch-up" title="Move up">↑</button>
            <button class="adm-mini" type="button" data-act="ch-down" title="Move down">↓</button>
            <button class="adm-mini adm-mini--danger" type="button" data-act="ch-del" title="Remove chapter">✕</button>
          </div>
        </div>
        ${ch.items.map((it, ii) => `
        <div class="adm-item${it.hidden ? ' is-hidden' : ''}" data-ii="${ii}">
          <input class="adm-item__name" type="text" value="${esc(it.name)}" data-f="name" placeholder="Dish name" aria-label="Dish name">
          <input type="number" step="0.10" min="0" value="${it.price == null ? '' : it.price}" data-f="price" placeholder="£" aria-label="Price">
          <select data-f="sauce" aria-label="Sauce family">${sauceOptions(it.sauce)}</select>
          <select data-f="photo" aria-label="Photograph">${photoOptions(it.photo)}</select>
          <div class="adm-item__tools">
            <button class="adm-mini" type="button" data-act="it-up" title="Move up">↑</button>
            <button class="adm-mini" type="button" data-act="it-down" title="Move down">↓</button>
            <button class="adm-mini adm-mini--danger" type="button" data-act="it-del" title="Remove dish">✕</button>
          </div>
          <label class="adm-item__desc"><textarea data-f="desc" placeholder="Description — ingredients, plainly" aria-label="Description">${esc(it.desc || '')}</textarea></label>
          <div class="adm-item__meta">
            <label><input type="checkbox" data-f="priceConfirmed" ${it.priceConfirmed !== false ? 'checked' : ''}> price confirmed</label>
            <label>kcal <input type="number" min="0" step="1" value="${it.kcal == null ? '' : it.kcal}" data-f="kcal"></label>
            <label>heat (1–5) <input type="number" min="1" max="5" step="1" value="${it.heat || ''}" data-f="heat"></label>
            <label><input type="checkbox" data-f="hidden" ${it.hidden ? 'checked' : ''}> hidden from the site</label>
          </div>
        </div>`).join('')}
        <div class="adm-chapter__foot"><button class="adm-mini" type="button" data-act="it-add">+ Add a dish</button></div>
      </section>`).join('');
  }
  $('#menu-editor').addEventListener('input', e => {
    const f = e.target.dataset.f; if (!f) return;
    const ch = content.menu[+e.target.closest('.adm-chapter').dataset.ci];
    const itemEl = e.target.closest('.adm-item');
    const target = itemEl ? ch.items[+itemEl.dataset.ii] : ch;
    if (e.target.type === 'checkbox') target[f] = e.target.checked;
    else if (e.target.type === 'number') target[f] = e.target.value === '' ? null : Number(e.target.value);
    else target[f] = e.target.value;
    if (f === 'hidden' && itemEl) itemEl.classList.toggle('is-hidden', !!target.hidden);
    setDirty(true);
  });
  $('#menu-editor').addEventListener('click', e => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const ci = +b.closest('.adm-chapter').dataset.ci; const ch = content.menu[ci];
    const itemEl = b.closest('.adm-item'); const ii = itemEl ? +itemEl.dataset.ii : -1;
    const move = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; };
    switch (b.dataset.act) {
      case 'ch-up': move(content.menu, ci, -1); break;
      case 'ch-down': move(content.menu, ci, 1); break;
      case 'ch-del': if (!confirm(`Remove the chapter "${ch.name}" and its ${ch.items.length} dishes?`)) return; content.menu.splice(ci, 1); break;
      case 'it-add': ch.items.push({ name: '', price: null, priceConfirmed: true, sauce: null, kcal: null, kcalConfirmed: false, desc: null, hidden: false }); break;
      case 'it-up': move(ch.items, ii, -1); break;
      case 'it-down': move(ch.items, ii, 1); break;
      case 'it-del': if (!confirm(`Remove "${ch.items[ii].name || 'this dish'}"?`)) return; ch.items.splice(ii, 1); break;
      default: return;
    }
    setDirty(true); renderMenu();
  });
  $('#add-chapter').addEventListener('click', () => {
    const name = prompt('Chapter name (e.g. Desserts)'); if (!name) return;
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'chapter';
    let unique = id, n = 2; while (content.menu.some(c => c.id === unique)) unique = `${id}-${n++}`;
    content.menu.push({ id: unique, name, priceStatement: null, items: [] });
    setDirty(true); renderMenu(); renderOverview();
  });

  /* ------------------------------------------------------------- photos */
  function usedBy(slug) {
    const names = [];
    for (const ch of content.menu) for (const it of ch.items) if (it.photo === slug) names.push(it.name);
    return names;
  }
  function renderPhotos() {
    $('#photos-uploaded').innerHTML = uploaded.length ? uploaded.map(u => `
      <li><img src="/admin/photos/${esc(u.slug)}-400.webp" alt=""><code>${esc(u.slug)}</code>${u.complete ? '' : ' <em>(incomplete)</em>'}
        <span class="adm-used">${usedBy(u.slug).length ? 'Used by: ' + esc(usedBy(u.slug).join(', ')) : 'Not on any dish yet'}</span>
        <button class="adm-mini adm-mini--danger" type="button" data-del="${esc(u.slug)}">Delete</button></li>`).join('')
      : '<li class="adm-muted">Nothing uploaded yet.</li>';
    $('#photos-repo').innerHTML = repoPhotos.map(s => `
      <li><img src="/admin/repo-photos/${esc(s)}-400.webp" alt=""><code>${esc(s)}</code>
        <span class="adm-used">${usedBy(s).length ? 'Used by: ' + esc(usedBy(s).join(', ')) : 'Not on any dish'}</span></li>`).join('');
  }
  $('#photos-uploaded').addEventListener('click', async e => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    const slug = b.dataset.del; const used = usedBy(slug);
    if (!confirm(`Delete "${slug}"${used.length ? ` — it is on: ${used.join(', ')}` : ''}?`)) return;
    try {
      const r = await api('DELETE', `/photos/${slug}`);
      content = r.content; uploaded = r.uploaded; renderAll(); toast('Photograph removed.');
    } catch (ex) { toast(ex.message, true); }
  });
  $('#upload-file').addEventListener('change', async e => {
    const f = e.target.files[0]; if (!f) return;
    const slugEl = $('#upload-slug');
    if (!slugEl.value) slugEl.value = f.name.replace(/\.[^.]+$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    try { const bmp = await loadImage(f); drawPlate($('#upload-canvas'), bmp, 600); $('#upload-preview').hidden = false; }
    catch (ex) { toast('That file could not be read as an image.', true); }
  });
  function loadImage(file) {
    if ('createImageBitmap' in window) return createImageBitmap(file);
    return new Promise((ok, no) => { const img = new Image(); img.onload = () => ok(img); img.onerror = no; img.src = URL.createObjectURL(file); });
  }
  // The site's photo norm, done here instead of on the server: a 3:2 canvas
  // on the warm ground, the picture fitted inside with a margin. The sizes
  // are the same three the site's own photographs ship in.
  function drawPlate(canvas, img, w) {
    const h = Math.round(w * 2 / 3); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.fillStyle = '#F2EDE6'; ctx.fillRect(0, 0, w, h);
    const m = 0.06, bw = w * (1 - 2 * m), bh = h * (1 - 2 * m);
    const s = Math.min(bw / img.width, bh / img.height);
    const dw = Math.round(img.width * s), dh = Math.round(img.height * s);
    ctx.drawImage(img, Math.round((w - dw) / 2), Math.round((h - dh) / 2), dw, dh);
    return canvas;
  }
  const toBlob = (canvas, type, q) => new Promise(ok => canvas.toBlob(ok, type, q));
  $('#upload-form').addEventListener('submit', async e => {
    e.preventDefault();
    const file = $('#upload-file').files[0]; const slug = $('#upload-slug').value.trim();
    const status = $('#upload-status'); const go = $('#upload-go');
    if (!file || !slug) return;
    go.disabled = true;
    try {
      const img = await loadImage(file);
      const work = document.createElement('canvas');
      for (const w of [1200, 800, 400]) {
        drawPlate(work, img, w);
        for (const [type, ext, q] of [['image/webp', 'webp', 0.82], ['image/jpeg', 'jpg', 0.84]]) {
          status.textContent = `Uploading ${w}px ${ext}…`;
          const blob = await toBlob(work, type, q);
          if (!blob || blob.type !== type) throw new Error(`This browser cannot save ${ext} images; please use Chrome, Edge, Firefox or Safari 16+.`);
          await api('PUT', `/photos/${slug}/${w}.${ext}`, blob, true);
        }
      }
      const r = await api('POST', `/photos/${slug}`, { width: 1200, height: 800 });
      uploaded = r.uploaded; status.textContent = ''; e.target.reset(); $('#upload-preview').hidden = true;
      renderPhotos(); renderMenu(); renderOverview(); toast(`"${slug}" uploaded. Pick it on a dish in the Menu tab, then Save and Publish.`);
    } catch (ex) { status.textContent = ''; toast(ex.message, true); }
    finally { go.disabled = false; }
  });

  /* ------------------------------------------------------------ opening */
  const bind = (id, get, set) => { const el = $(id); el.addEventListener('input', () => { set(el.type === 'checkbox' ? el.checked : el.value); setDirty(true); }); return el; };
  function renderOpening() {
    const c = content;
    $('#f-lunchName').value = c.lunchDeal.name || ''; $('#f-lunchClaim').value = c.lunchDeal.claim || '';
    $('#f-lunchFrom').value = c.contact.lunchDeal.from || ''; $('#f-lunchTo').value = c.contact.lunchDeal.to || '';
    $('#f-lunchPrices').value = (c.lunchDeal.prices || []).join(', '); $('#f-lunchConfirmed').checked = !!c.lunchDeal.priceConfirmed;
    $('#hours').innerHTML = `<tr><th>Day</th><th>Closed</th><th>Opens</th><th>Closes</th></tr>` + DAYS.map(([k, label]) => {
      const v = c.contact.hours[k]; const closed = v === 'closed'; const [o, cl] = Array.isArray(v) ? v : ['', ''];
      return `<tr data-day="${k}"><td>${label}</td><td><input type="checkbox" data-h="closed" ${closed ? 'checked' : ''}></td>
        <td><input type="time" data-h="open" value="${o}" ${closed ? 'disabled' : ''}></td><td><input type="time" data-h="close" value="${cl}" ${closed ? 'disabled' : ''}></td></tr>`;
    }).join('');
  }
  bind('#f-lunchName', null, v => { content.lunchDeal.name = v; });
  bind('#f-lunchClaim', null, v => { content.lunchDeal.claim = v; });
  bind('#f-lunchFrom', null, v => { content.contact.lunchDeal.from = v; content.lunchDeal.from = v; });
  bind('#f-lunchTo', null, v => { content.contact.lunchDeal.to = v; content.lunchDeal.to = v; });
  bind('#f-lunchPrices', null, v => { content.lunchDeal.prices = v.split(',').map(x => x.trim()).filter(Boolean).map(Number).filter(n => !Number.isNaN(n)); });
  bind('#f-lunchConfirmed', null, v => { content.lunchDeal.priceConfirmed = v; });
  $('#hours').addEventListener('input', e => {
    const tr = e.target.closest('tr'); const day = tr && tr.dataset.day; if (!day) return;
    const closed = $('[data-h="closed"]', tr).checked; const o = $('[data-h="open"]', tr); const cl = $('[data-h="close"]', tr);
    o.disabled = cl.disabled = closed;
    content.contact.hours[day] = closed ? 'closed' : (o.value && cl.value ? [o.value, cl.value] : null);
    setDirty(true); renderOverview();
  });

  /* ------------------------------------------------------------ contact */
  const F = [
    ['#f-phone', c => c.contact, 'phone'], ['#f-email', c => c.contact, 'email'], ['#f-cateringEmail', c => c.contact, 'cateringEmail'], ['#f-jobsEmail', c => c.contact, 'jobsEmail'],
    ['#f-announcement', c => c, 'announcement'],
    ['#f-line1', c => c.contact.address, 'line1'], ['#f-locality', c => c.contact.address, 'locality'], ['#f-postcode', c => c.contact.address, 'postcode'], ['#f-mapsUrl', c => c.contact.address, 'mapsUrl'],
    ['#f-companyName', c => c.company, 'companyName'], ['#f-companyNumber', c => c.company, 'companyNumber'], ['#f-vatNumber', c => c.company, 'vatNumber'],
    ['#f-allergens', c => c.allergens, 'statement'],
  ];
  function renderContact() {
    for (const [id, get, key] of F) $(id).value = get(content)[key] || '';
    for (const d of content.delivery) { const el = $('#f-' + d.id); if (el) el.value = d.url || ''; }
  }
  for (const [id, get, key] of F) bind(id, null, v => { get(content)[key] = v || null; renderOverview(); });
  for (const id of ['deliveroo', 'ubereats', 'justeat']) bind('#f-' + id, null, v => { const d = content.delivery.find(x => x.id === id); if (d) d.url = v || null; });

  /* ------------------------------------------------------------ history */
  function renderHistory() {
    $('#versions').innerHTML = versions.length ? versions.map(v => `
      <li><span>${esc(new Date(v.at).toLocaleString('en-GB'))}</span><span class="adm-tag">${esc(v.note)}</span>
        <button class="adm-mini" type="button" data-restore="${esc(v.id)}">Restore</button></li>`).join('') : '<li class="adm-muted">No versions yet.</li>';
  }
  $('#versions').addEventListener('click', async e => {
    const b = e.target.closest('[data-restore]'); if (!b) return;
    if (!confirm('Restore this version? Your current content is kept in the history too.')) return;
    try { await api('POST', `/versions/${b.dataset.restore}/restore`); await reload(); toast('Restored. Publish to put it on the site.'); }
    catch (ex) { toast(ex.message, true); }
  });

  /* ------------------------------------------------------ save / publish */
  async function save() {
    try {
      const r = await api('PUT', '/content', content);
      content = r.content; renderAll(); setDirty(false); toast('Saved.');
      const c = await api('GET', '/content'); versions = c.versions; renderHistory();
      return true;
    } catch (ex) { toast(ex.message, true); return false; }
  }
  $('#save').addEventListener('click', save);
  $('#publish').addEventListener('click', async () => {
    const btn = $('#publish'); btn.disabled = true; btn.textContent = 'Publishing…';
    try {
      if (dirty && !(await save())) return;
      const r = await api('POST', '/publish');
      me = await api('GET', '/me'); renderOverview();
      if (r.ok) toast(`Published${r.warnings.length ? ` with ${r.warnings.length} note(s) — see Overview` : ''}.`);
      else { toast(`Not published: ${r.errors[0]}`, true); location.hash = '#overview'; }
    } catch (ex) { toast(ex.message, true); }
    finally { btn.disabled = false; btn.textContent = 'Publish'; }
  });

  /* ----------------------------------------------------------- password */
  $('#password-form').addEventListener('submit', async e => {
    e.preventDefault();
    const st = $('#pw-status');
    try { await api('POST', '/password', { current: $('#pw-current').value, next: $('#pw-next').value }); e.target.reset(); st.textContent = 'Password changed.'; }
    catch (ex) { st.textContent = ex.message; }
  });

  /* --------------------------------------------------------------- boot */
  (async () => { try { await api('GET', '/me'); await showApp(); } catch (e) { showLogin(); } })();
}());
