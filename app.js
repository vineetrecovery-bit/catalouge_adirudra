(() => {
  'use strict';

  const STORAGE_KEY = 'adirudra_products';
  const ADMIN_USER = 'ADIRUDRA';
  const ADMIN_PASS = 'ADIRUDRA123';
  const contact = window.CATALOGUE_CONTACT || {};
  const phoneDigits = String(contact.whatsappNumber || '').replace(/\D/g, '');
  const whatsappNumber = /^\d{8,15}$/.test(phoneDigits) ? phoneDigits : '';
  const configuredEmail = String(contact.email || '').trim();
  const contactEmail = /^[^\s@?&]+@[^\s@?&]+\.[^\s@?&]+$/.test(configuredEmail) ? configuredEmail : 'hello@adirudra.com';
  const whatsappHref = message => `https://wa.me/${whatsappNumber}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  const defaults = Array.isArray(window.CATALOGUE_DEFAULT_PRODUCTS) ? window.CATALOGUE_DEFAULT_PRODUCTS : [];
  const sourceByView = new WeakMap();
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const escapeAttribute = escapeHtml;
  const validImage = url => typeof url === 'string' && (/^https?:\/\//i.test(url) || /^uploads\//.test(url) || /^data:image\/(png|jpeg|webp|gif);base64,/i.test(url));
  const priceNumber = price => Number(String(price || '').replace(/[^0-9]/g, '')) || 0;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let storageReadOnly = false;
  let products = readProducts();
  let lastProductTrigger = null;
  let editingIndex = null;
  let editingImages = [];
  let toastTimer;
  const state = { query: '', type: 'All', origin: 'All', mukhi: 'All', sort: 'Featured' };

  function normalize(product) {
    return {
      ...product,
      id: String(product.id || ''),
      name: String(product.name || 'Untitled piece'),
      origin: String(product.origin || ''),
      mukhi: Number(product.mukhi) || 0,
      type: String(product.type || 'Loose Bead'),
      images: Array.isArray(product.images) ? product.images : [],
      image: typeof product.image === 'string' ? product.image : '',
      keywords: Array.isArray(product.keywords) ? product.keywords : []
    };
  }

  function viewProducts(raw) {
    return raw.map(item => {
      const view = normalize(item);
      sourceByView.set(view, item);
      return view;
    });
  }

  function readProducts() {
    // Preserve the old site's browser data exactly. Startup never writes to localStorage.
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.every(item => item && typeof item === 'object')) return viewProducts(parsed);
        storageReadOnly = true;
      }
    } catch (error) {
      storageReadOnly = true;
      console.error('Could not read saved catalogue data; the original value has not been changed.', error);
    }
    return viewProducts(defaults);
  }

  function persist(nextProducts) {
    if (storageReadOnly) {
      showToast('Saved data could not be read. Download a backup before making changes.');
      return false;
    }
    try {
      // Unedited records are written back from their original objects, so
      // changing one product cannot silently rewrite fields on every other one.
      const raw = nextProducts.map(item => sourceByView.get(item) || item);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(raw));
      products = nextProducts;
      nextProducts.forEach((item, index) => sourceByView.set(item, raw[index]));
      return true;
    } catch (error) {
      showToast('Could not save in this browser. Existing catalogue data is unchanged.');
      return false;
    }
  }

  function showToast(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 4000);
  }

  function imageFor(product) {
    return [...(product.images || []), product.image].find(validImage) || '';
  }

  function imageSources(product) {
    return [...new Set([...(product.images || []), product.image].filter(validImage))];
  }

  function placeholder(product) {
    const label = product.mukhi ? String(product.mukhi).padStart(2, '0') : '—';
    return `<div class="placeholder" role="img" aria-label="Product image not available"><span class="placeholder__number">${escapeHtml(label)}</span><span class="placeholder__label">Mukhi</span><span class="placeholder__caption">Photo coming soon</span></div>`;
  }

  function productImage(product) {
    const source = imageFor(product);
    if (!source) return placeholder(product);
    return `<img src="${escapeAttribute(source)}" alt="${escapeAttribute(product.name)}" loading="lazy" width="600" height="600">`;
  }

  function syncStateFromUrl() {
    const params = new URLSearchParams(location.search);
    state.query = params.get('search') || '';
    state.type = ['All', 'Loose Bead', 'Mala', 'Bracelet', 'Pendant'].includes(params.get('type')) ? params.get('type') : 'All';
    state.origin = ['All', 'Nepal', 'Indonesia'].includes(params.get('origin')) ? params.get('origin') : 'All';
    state.mukhi = params.get('mukhi') || 'All';
    state.sort = ['Featured', 'PriceLow', 'PriceHigh', 'AZ'].includes(params.get('sort')) ? params.get('sort') : 'Featured';
    $('#searchInput').value = state.query;
    $('#originFilter').value = state.origin;
    $('#sortFilter').value = state.sort;
    $('#mukhiFilter').value = [...$('#mukhiFilter').options].some(option => option.value === state.mukhi) ? state.mukhi : 'All';
    state.mukhi = $('#mukhiFilter').value;
    updateTypeButtons();
  }

  function syncUrl() {
    const url = new URL(location.href);
    for (const [key, value] of Object.entries(state)) {
      const name = key === 'query' ? 'search' : key;
      if (!value || value === 'All' || (key === 'sort' && value === 'Featured')) url.searchParams.delete(name);
      else url.searchParams.set(name, value);
    }
    history.replaceState(null, '', url);
  }

  function updateTypeButtons() {
    document.querySelectorAll('.type-filter').forEach(button => {
      const active = button.dataset.type === state.type;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }

  function populateMukhi() {
    const select = $('#mukhiFilter');
    const values = [...new Set(products.map(item => item.mukhi).filter(Boolean))].sort((a, b) => a - b);
    select.innerHTML = '<option value="All">All mukhi</option>' + values.map(value => `<option value="${value}">${value} Mukhi</option>`).join('');
  }

  function visibleProducts() {
    const query = state.query.trim().toLowerCase();
    const list = products.filter(product => {
      if (state.type !== 'All' && product.type !== state.type) return false;
      if (state.origin !== 'All' && product.origin !== state.origin) return false;
      if (state.mukhi !== 'All' && product.mukhi !== Number(state.mukhi)) return false;
      if (!query) return true;
      return [product.name, product.id, product.origin, product.type, product.mukhi + ' mukhi', product.mukhi + 'mukhi', ...(product.keywords || [])]
        .join(' ').toLowerCase().includes(query);
    });
    switch (state.sort) {
      case 'PriceLow': list.sort((a, b) => (priceNumber(a.price) || Infinity) - (priceNumber(b.price) || Infinity)); break;
      case 'PriceHigh': list.sort((a, b) => priceNumber(b.price) - priceNumber(a.price)); break;
      case 'AZ': list.sort((a, b) => a.name.localeCompare(b.name)); break;
      default: list.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
    }
    return list;
  }

  function renderCard(product) {
    const price = product.price ? escapeHtml(product.price) : 'Ask for price';
    const badge = product.certification ? '<span class="product-card__badge">Certificate details</span>' : '';
    const facts = [product.type, product.size].filter(Boolean).map(value => `<span>${escapeHtml(value)}</span>`).join('');
    return `<article class="product-card"><button class="product-card__open" type="button" data-product-id="${escapeAttribute(product.id)}" aria-label="View ${escapeAttribute(product.name)} details">
      <div class="product-card__visual">${productImage(product)}${badge}</div>
      <div class="product-card__content"><div class="product-card__meta"><span>${escapeHtml(product.mukhi)} Mukhi</span><span aria-hidden="true">/</span><span>${escapeHtml(product.origin)}</span></div>
        <h3>${escapeHtml(product.name)}</h3><div class="product-card__facts">${facts}</div>
        <div class="product-card__bottom"><span class="product-card__price${product.price ? '' : ' product-card__price--empty'}">${price}</span><span class="product-card__link">View details <span aria-hidden="true">↗</span></span></div>
      </div></button></article>`;
  }

  function render() {
    const visible = visibleProducts();
    $('#productGrid').innerHTML = visible.map(renderCard).join('');
    $('#collectionCount').textContent = `${visible.length} ${visible.length === 1 ? 'piece' : 'pieces'}`;
    $('#emptyState').hidden = visible.length > 0;
    $('#resetFilters').hidden = !state.query && state.type === 'All' && state.origin === 'All' && state.mukhi === 'All' && state.sort === 'Featured';
    $('#productGrid').querySelectorAll('img').forEach(img => {
      img.addEventListener('error', () => {
        const productId = img.closest('[data-product-id]')?.dataset.productId;
        const product = products.find(item => item.id === productId);
        img.parentElement.innerHTML = placeholder(product || {mukhi: 0});
      }, {once: true});
    });
    syncUrl();
  }

  function resetFilters() {
    Object.assign(state, { query: '', type: 'All', origin: 'All', mukhi: 'All', sort: 'Featured' });
    $('#searchInput').value = '';
    $('#originFilter').value = 'All';
    $('#mukhiFilter').value = 'All';
    $('#sortFilter').value = 'Featured';
    updateTypeButtons();
    render();
  }

  function spec(label, value) {
    return `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || 'Not specified')}</dd></div>`;
  }

  function openProduct(id, trigger) {
    const product = products.find(item => item.id === id);
    if (!product) return;
    lastProductTrigger = trigger;
    const images = imageSources(product);
    const image = images[0];
    const specs = [spec('Origin', product.origin), spec('Mukhi', product.mukhi ? product.mukhi + ' Mukhi' : ''), spec('Type', product.type), spec('Size', product.size), spec('Weight', product.weight), spec('SKU', product.id)].join('');
    const certificate = product.certification ? `<div class="certificate-note"><strong>Certificate details available</strong>${product.verification ? `Verification number: ${escapeHtml(product.verification)}<br>` : ''}<a href="https://globallabtesting.in/" target="_blank" rel="noopener noreferrer">Visit verification lab ↗</a></div>` : '';
    const video = /^https?:\/\//i.test(product.video || '') ? `<p class="product-detail__video"><a href="${escapeAttribute(product.video)}" target="_blank" rel="noopener noreferrer">Watch product video ↗</a></p>` : '';
    const gallery = images.length > 1 ? `<div class="product-detail__gallery" aria-label="Product photos">${images.map((source, index) => `<button type="button" data-gallery-image="${escapeAttribute(source)}" aria-label="View photo ${index + 1}" aria-pressed="${index === 0}"><img src="${escapeAttribute(source)}" alt="" loading="lazy"></button>`).join('')}</div>` : '';
    const whatsappMessage = `Hello Adirudra, I am interested in ${product.name}, SKU ${product.id}. Please share availability and details.`;
    const whatsapp = whatsappHref(whatsappMessage);
    const subject = encodeURIComponent(`Enquiry: ${product.name} (${product.id})`);
    const body = encodeURIComponent(`Hello Adirudra,\n\nI am interested in ${product.name}, SKU ${product.id}. Please share availability and details.`);
    const visual = image
      ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.name)}" width="800" height="800">`
      : placeholder(product);
    const whatsappLabel = whatsappNumber ? 'Message Adirudra on WhatsApp' : 'Share enquiry via WhatsApp';
    $('#productDetail').innerHTML = `
      <div class="product-detail">
        <div class="product-detail__visual">
          <div class="product-detail__main">${visual}</div>
          ${gallery}
        </div>
        <div class="product-detail__info">
          <div class="product-detail__eyebrow">${escapeHtml(product.mukhi)} Mukhi · ${escapeHtml(product.origin)}</div>
          <h2 id="dialogTitle">${escapeHtml(product.name)}</h2>
          <div class="product-detail__price">${product.price ? escapeHtml(product.price) : 'Ask for price'}</div>
          <div class="product-detail__actions">
            <a class="button button--dark enquiry-link" href="${whatsapp}" target="_blank" rel="noopener noreferrer">${whatsappLabel} <span aria-hidden="true">↗</span></a>
            <a class="email-link" href="mailto:${escapeAttribute(contactEmail)}?subject=${subject}&body=${body}">Open email draft to ${escapeHtml(contactEmail)}</a>
          </div>
          <p class="product-detail__description">${escapeHtml(product.description || 'Contact us for more details about this piece.')}</p>
          <dl class="product-specs">${specs}</dl>
          ${certificate}
          ${video}
        </div>
      </div>`;
    const img = $('#productDetail .product-detail__main img');
    if (img) img.addEventListener('error', () => {
      img.parentElement.innerHTML = placeholder(product);
    }, {once: true});
    $('#productDialog').showModal();
    document.body.classList.add('dialog-open');
    $('#productClose').focus();
  }

  function closeDialog(dialog) {
    dialog.close();
    document.body.classList.remove('dialog-open');
    if (dialog.id === 'productDialog' && lastProductTrigger?.isConnected) lastProductTrigger.focus();
  }

  function renderAdminList() {
    $('#adminList').innerHTML = products.map((product, index) => `<div class="admin-row"><div><strong>${escapeHtml(product.name)}</strong><span>${escapeHtml(product.id)} · ${escapeHtml(product.mukhi)} Mukhi · ${escapeHtml(product.origin)}</span></div><div class="admin-row__actions"><button type="button" data-edit-index="${index}">Edit</button><button type="button" data-delete-index="${index}">Delete</button></div></div>`).join('') || '<p>No pieces in this catalogue.</p>';
  }

  function renderAdminGallery() {
    $('#adminGallery').innerHTML = editingImages.length ? `<p>Current photos</p><div class="admin-gallery__items">${editingImages.map((source, index) => `<div>${validImage(source) ? `<img src="${escapeAttribute(source)}" alt="Photo ${index + 1}">` : '<span class="admin-gallery__unavailable">Preview unavailable</span>'}<button type="button" data-remove-image="${index}" aria-label="Remove photo ${index + 1}">×</button></div>`).join('')}</div>` : '';
  }

  function openEditor(index = null) {
    editingIndex = index;
    const product = index === null ? null : products[index];
    editingImages = [...(product?.images || [])];
    $('#adminFormTitle').textContent = product ? 'Edit piece' : 'Add a piece';
    $('#editName').value = product?.name || '';
    $('#editOrigin').value = product?.origin || 'Nepal';
    $('#editMukhi').value = product?.mukhi || 5;
    $('#editType').value = product?.type || 'Loose Bead';
    $('#editPrice').value = product?.price || '';
    $('#editSize').value = product?.size || '';
    $('#editWeight').value = product?.weight || '';
    $('#editRarity').value = product?.rarity || 'Common';
    $('#editFeatured').value = String(Boolean(product?.featured));
    $('#editCertified').value = String(Boolean(product?.certification));
    $('#editVerification').value = product?.verification || '';
    $('#editDescription').value = product?.description || '';
    $('#editVideo').value = product?.video || '';
    $('#editImage').value = /^https?:\/\//i.test(product?.image || '') ? product.image : '';
    $('#editImageFiles').value = '';
    renderAdminGallery();
    $('#adminForm').hidden = false;
    $('#editName').focus();
  }

  function saveEditor(event) {
    event.preventDefault();
    const existing = editingIndex === null ? null : products[editingIndex];
    const imageUrl = $('#editImage').value.trim();
    const name = $('#editName').value.trim();
    const existingIds = new Set(products.map(item => item.id));
    let nextNumber = 1;
    while (existingIds.has(`AR-${String(nextNumber).padStart(3, '0')}`)) nextNumber++;
    const next = normalize({
      ...(sourceByView.get(existing) || existing || {}), id: existing?.id || `AR-${String(nextNumber).padStart(3, '0')}`,
      name, origin: $('#editOrigin').value, mukhi: Number($('#editMukhi').value),
      type: $('#editType').value, price: $('#editPrice').value.trim(), size: $('#editSize').value.trim(),
      weight: $('#editWeight').value.trim(), rarity: $('#editRarity').value,
      featured: $('#editFeatured').value === 'true', certification: $('#editCertified').value === 'true',
      verification: $('#editVerification').value.trim(), description: $('#editDescription').value.trim(),
      video: $('#editVideo').value.trim(),
      images: [...editingImages], image: imageUrl || existing?.image || '',
      keywords: [...new Set([...(existing?.keywords || []), name.toLowerCase()])]
    });
    if (!name || next.mukhi < 1) return;
    const candidate = existing ? products.map((item, index) => index === editingIndex ? next : item) : [...products, next];
    if (!persist(candidate)) return;
    $('#adminForm').hidden = true;
    populateMukhi();
    renderAdminList();
    render();
    showToast(existing ? 'Piece updated in this browser.' : 'Piece added in this browser.');
  }

  function initAdmin() {
    const dialog = $('#adminDialog');
    const logout = () => {
      $('#adminLogin').hidden = false;
      $('#adminPanel').hidden = true;
      $('#adminForm').hidden = true;
      $('#adminUsername').value = '';
      $('#adminPassword').value = '';
      $('#adminError').textContent = '';
      editingIndex = null;
      editingImages = [];
    };
    $('#adminOpen').addEventListener('click', () => { dialog.showModal(); document.body.classList.add('dialog-open'); $('#adminUsername').focus(); });
    $('#adminClose').addEventListener('click', () => closeDialog(dialog));
    $('#adminLogout').addEventListener('click', () => { logout(); $('#adminUsername').focus(); });
    dialog.addEventListener('close', logout);
    $('#adminLoginForm').addEventListener('submit', event => {
      event.preventDefault();
      if ($('#adminUsername').value === ADMIN_USER && $('#adminPassword').value === ADMIN_PASS) {
        $('#adminLogin').hidden = true;
        $('#adminPanel').hidden = false;
        $('#adminError').textContent = '';
        renderAdminList();
        $('#addProduct').focus();
      } else {
        $('#adminError').textContent = 'Those details did not match. Check the username and password.';
      }
    });
    $('#addProduct').addEventListener('click', () => openEditor());
    $('#downloadBackup').addEventListener('click', () => {
      let content;
      try { content = localStorage.getItem(STORAGE_KEY); }
      catch { showToast('Could not read this browser’s saved catalogue.'); return; }
      const blob = new Blob([content === null ? JSON.stringify(defaults, null, 2) : content], {type:'application/json'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `adirudra-catalogue-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    });
    $('#editImageFiles').addEventListener('change', async event => {
      const files = [...event.target.files].filter(file => /^image\/(png|jpeg|webp|gif)$/.test(file.type));
      const results = await Promise.all(files.map(file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }).catch(() => null)));
      editingImages.push(...results.filter(validImage));
      event.target.value = '';
      renderAdminGallery();
    });
    $('#adminGallery').addEventListener('click', event => {
      const remove = event.target.closest('[data-remove-image]');
      if (!remove) return;
      editingImages.splice(Number(remove.dataset.removeImage), 1);
      renderAdminGallery();
    });
    $('#cancelEdit').addEventListener('click', () => { $('#adminForm').hidden = true; $('#addProduct').focus(); });
    $('#adminForm').addEventListener('submit', saveEditor);
    $('#adminList').addEventListener('click', event => {
      const edit = event.target.closest('[data-edit-index]');
      if (edit) return openEditor(Number(edit.dataset.editIndex));
      const remove = event.target.closest('[data-delete-index]');
      if (!remove) return;
      const indexToRemove = Number(remove.dataset.deleteIndex);
      const product = products[indexToRemove];
      if (!product || !confirm(`Delete ${product.name} from this browser's catalogue?`)) return;
      if (!persist(products.filter((item, index) => index !== indexToRemove))) return;
      populateMukhi(); renderAdminList(); render(); showToast('Piece removed from this browser.');
    });
  }

  function init() {
    $('#footerEmail').href = `mailto:${contactEmail}`;
    $('#footerEmail').textContent = contactEmail;
    $('#footerWhatsapp').href = whatsappHref('');
    $('#footerWhatsapp').textContent = whatsappNumber ? 'Message Adirudra on WhatsApp ↗' : 'Share via WhatsApp ↗';
    populateMukhi();
    syncStateFromUrl();
    render();
    $('#searchShortcut').addEventListener('click', () => {
      $('#catalogue').scrollIntoView({behavior: prefersReducedMotion ? 'instant' : 'smooth'});
      $('#searchInput').focus({preventScroll:true});
    });
    $('#menuToggle').addEventListener('click', () => {
      const open = $('#primaryNav').classList.toggle('is-open');
      $('#menuToggle').setAttribute('aria-expanded', String(open));
      $('#menuToggle').setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    });
    $('#primaryNav').addEventListener('click', event => {
      if (!event.target.closest('a')) return;
      $('#primaryNav').classList.remove('is-open');
      $('#menuToggle').setAttribute('aria-expanded', 'false');
      $('#menuToggle').setAttribute('aria-label', 'Open menu');
    });
    $('#searchInput').addEventListener('input', event => {state.query = event.target.value; render();});
    document.querySelectorAll('.type-filter').forEach(button => button.addEventListener('click', () => {state.type = button.dataset.type; updateTypeButtons(); render();}));
    $('#originFilter').addEventListener('change', event => {state.origin = event.target.value; render();});
    $('#mukhiFilter').addEventListener('change', event => {state.mukhi = event.target.value; render();});
    $('#sortFilter').addEventListener('change', event => {state.sort = event.target.value; render();});
    $('#resetFilters').addEventListener('click', resetFilters);
    $('#emptyReset').addEventListener('click', resetFilters);
    $('#productGrid').addEventListener('click', event => {
      const trigger = event.target.closest('[data-product-id]');
      if (trigger) openProduct(trigger.dataset.productId, trigger);
    });
    $('#productDetail').addEventListener('click', event => {
      const thumb = event.target.closest('[data-gallery-image]');
      if (!thumb) return;
      const main = $('#productDetail .product-detail__main img');
      if (main) main.src = thumb.dataset.galleryImage;
      $('#productDetail').querySelectorAll('[data-gallery-image]').forEach(button => button.setAttribute('aria-pressed', String(button === thumb)));
    });
    $('#productClose').addEventListener('click', () => closeDialog($('#productDialog')));
    $('#productDialog').addEventListener('click', event => {if (event.target === $('#productDialog')) closeDialog($('#productDialog'));});
    $('#productDialog').addEventListener('close', () => document.body.classList.remove('dialog-open'));
    $('#adminDialog').addEventListener('close', () => document.body.classList.remove('dialog-open'));
    initAdmin();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
