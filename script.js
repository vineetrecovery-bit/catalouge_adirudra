/* ============================================
   ADIRUDRA — APPLICATION SCRIPT (SERVER VERSION)
   ============================================ */

let products = [];
const ADMIN_USER = "ADIRUDRA";
const ADMIN_PASS = "ADIRUDRA123";
let isAdminLoggedIn = false;

// Fetch products from JSON file instead of localStorage
async function loadProducts() {
  try {
    const response = await fetch('products.json?nocache=' + Date.now());
    if (!response.ok) throw new Error('Network response was not ok');
    products = await response.json();
  } catch (e) {
    console.error("Failed to load products.json.", e);
    products = [];
  }
}

// Save products via PHP API
async function saveProducts() {
  try {
    const response = await fetch('api.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'save_products', data: products })
    });
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    return true;
  } catch (e) {
    alert("Error saving to server: " + e.message);
    return false;
  }
}

const state = {
  filters: { origin: 'All', mukhi: 'All', type: 'All', sort: 'Featured' },
  filtered: [...products],
  activeProduct: null,
  galleryIndex: 0,
  searchResults: [],
  searchActiveIndex: -1,
  lenis: null,
  editingImages: []
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

/* ---------- SVG GENERATORS ---------- */
function generateBeadSVG(product, size = 600) {
  const mukhi = product.mukhi || 5;
  const r = size * 0.32;
  const cx = size / 2, cy = size / 2;
  const isNepal = product.origin === 'Nepal';
  const bgColor1 = isNepal ? '#3a2a1f' : '#2e2218';
  const bgColor2 = isNepal ? '#1a1310' : '#15110d';
  
  let lines = '';
  for (let i = 0; i < mukhi; i++) {
    const angle = (i / mukhi) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    lines += `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#B29A68" stroke-width="1.2" opacity="0.45"/>`;
  }
  
  const id = `g${Math.random().toString(36).substr(2, 9)}`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><defs><radialGradient id="${id}" cx="40%" cy="35%"><stop offset="0%" stop-color="${bgColor1}"/><stop offset="70%" stop-color="${bgColor2}"/><stop offset="100%" stop-color="#050302"/></radialGradient></defs><rect width="${size}" height="${size}" fill="url(#${id})"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#B29A68" stroke-width="0.8" opacity="0.7"/>${lines}<text x="${cx}" y="${cy + size * 0.04}" text-anchor="middle" font-family="Cormorant Garamond, serif" font-size="${size * 0.2}" fill="#B29A68" opacity="0.55" font-weight="400">${mukhi}</text></svg>`)}`;
}

function getProductImage(product) {
  if (product.images && product.images.length > 0) return product.images[0];
  if (product.image && product.image.length > 0) return product.image;
  return generateBeadSVG(product);
}

function getProductGallery(product) {
  if (product.images && product.images.length > 0) return product.images;
  return [generateBeadSVG(product, 800)];
}

/* ---------- LENIS SMOOTH SCROLL ---------- */
function initLenis() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  state.lenis = new Lenis({ duration: 1.1, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
  state.lenis.on('scroll', () => { if (window.ScrollTrigger) ScrollTrigger.update(); });
  $$('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href === '#' || href.length < 2) return;
      const target = document.querySelector(href);
      if (target) {
        e.preventDefault();
        state.lenis?.scrollTo(target, { offset: -60, duration: 1.4 });
        closeMobileMenu();
      }
    });
  });
}

gsap.registerPlugin(ScrollTrigger);

/* ---------- LOADER ---------- */
function initLoader() {
  const loader = $('#loader');
  const heroBeadLines = $('#heroBeadLines');
  if (heroBeadLines) {
    const mukhi = 5;
    let lines = '';
    for (let i = 0; i < mukhi; i++) {
      const angle = (i / mukhi) * Math.PI * 2 - Math.PI / 2;
      const x = 200 + Math.cos(angle) * 120;
      const y = 200 + Math.sin(angle) * 120;
      lines += `<line x1="200" y1="200" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/>`;
    }
    heroBeadLines.innerHTML = lines;
  }
  
  const startAnim = () => {
    gsap.set('.loader__logo', { transformPerspective: 1000, transformOrigin: 'center center', clipPath: 'inset(0% 100% 0% 0%)', scale: 0.9, opacity: 0, filter: 'drop-shadow(0 0 20px rgba(178,154,104,0.8)) blur(8px)' });
    const tl = gsap.timeline({ onComplete: () => { loader.style.display = 'none'; initHeroAnimation(); } });
    tl.to('.loader__logo', { opacity: 1, scale: 1, clipPath: 'inset(0% 0% 0% 0%)', filter: 'drop-shadow(0 0 15px rgba(178,154,104,0.4)) blur(0px)', duration: 2.2, ease: 'expo.out' })
      .to('.loader__sub', { opacity: 0.8, duration: 0.8, ease: 'power2.out' }, "-=0.8")
      .to('.loader__logo', { scale: 1.05, duration: 1.2, ease: 'power2.inOut' }, "+=0.3")
      .to('.loader__logo', { opacity: 0, scale: 1.2, filter: 'blur(10px)', duration: 0.8, ease: 'power2.in' }, "-=0.2")
      .to('.loader', { yPercent: -100, duration: 1.2, ease: 'power4.inOut' }, "-=0.4");
  };
  
  window.addEventListener('load', startAnim);
  if (document.readyState === 'complete') startAnim();
}

/* ---------- NAVIGATION ---------- */
function initNav() {
  const nav = $('#nav');
  const onScroll = () => {
    const y = window.scrollY || window.pageYOffset;
    if (y > 80) nav.classList.add('is-scrolled');
    else nav.classList.remove('is-scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const menu = $('#mobileMenu');
  $('#menuOpen').addEventListener('click', () => { menu.classList.add('is-open'); document.body.style.overflow = 'hidden'; if (state.lenis) state.lenis.stop(); });
  const close = () => closeMobileMenu();
  $('#menuClose').addEventListener('click', close);
  $$('[data-menu-close]').forEach(link => link.addEventListener('click', close));
}
function closeMobileMenu() {
  $('#mobileMenu').classList.remove('is-open');
  document.body.style.overflow = '';
  if (state.lenis) state.lenis.start();
}

/* ---------- HERO ANIMATION ---------- */
function initHeroAnimation() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.set(['.hero__title .char', '.hero__sub', '.hero__tagline', '.hero__ctas', '.hero__scroll'], { opacity: 1, y: 0 });
    return;
  }
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
  tl.to('.hero__title .char', { y: 0, opacity: 1, duration: 1.1, stagger: 0.06, ease: 'expo.out' }, 0.3)
    .to('.hero__sub', { opacity: 1, duration: 0.8 }, 0.9)
    .to('.hero__tagline', { opacity: 1, duration: 0.8 }, 1.1)
    .to('.hero__ctas', { opacity: 1, duration: 0.8 }, 1.3)
    .to('.hero__scroll', { opacity: 1, duration: 0.6 }, 1.5);
  
  gsap.to('.hero__orb--gold', { x: 150, y: -80, scale: 1.2, duration: 14, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('.hero__orb--earth', { x: -120, y: 100, scale: 1.1, duration: 18, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to('#heroBead', { scale: 1.08, duration: 8, ease: 'sine.inOut', repeat: -1, yoyo: true });
  gsap.to('#heroBeadLines', { rotation: 360, duration: 120, ease: 'none', repeat: -1, transformOrigin: '200px 200px' });
}

/* ---------- REVEAL SYSTEM ---------- */
function initRevealSystem() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  $$('[data-reveal], [data-reveal-mask]').forEach(el => observer.observe(el));
}

/* ---------- COLLECTION GRID ---------- */
function renderCollectionGrid() {
  const grid = $('#collectionGrid');
  const collections = [
    { num: '01', name: 'Rudraksha', desc: 'Sacred forms of Lord Shiva', filter: null },
    { num: '02', name: 'Malas', desc: '108 beads · hand-strung', filter: { type: 'Mala' } },
    { num: '03', name: 'Bracelets', desc: 'Daily wear essentials', filter: { type: 'Bracelet' } },
    { num: '04', name: 'Pendants', desc: 'Set in sterling silver', filter: { type: 'Pendant' } },
    { num: '05', name: 'Spiritual Collection', desc: 'Curated for the seeker', filter: null }
  ];
  
  grid.innerHTML = collections.map((c, i) => {
    const mukhi = (i + 1) * 2 + 1;
    const mockProduct = { mukhi: mukhi, origin: i % 2 === 0 ? 'Nepal' : 'Indonesia', id: `COL-${i}` };
    const bg = generateBeadSVG(mockProduct, 600);
    return `<div class="collection-card" data-collection-index="${i}" data-cursor="view"><div class="collection-card__bg" style="background-image: url('${bg}')"></div><div class="collection-card__overlay"></div><div class="collection-card__arrow"><svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="13 6 19 12 13 18"/></svg></div><div class="collection-card__content"><div class="collection-card__num">${c.num} — Collection</div><div class="collection-card__name">${c.name}</div><div class="collection-card__desc">${c.desc}</div></div></div>`;
  }).join('');
  
  $$('.collection-card').forEach((card, i) => {
    card.addEventListener('click', () => {
      const filter = collections[i].filter;
      if (filter && filter.type) {
        state.filters.type = filter.type;
        $('#filterType').value = filter.type;
      } else {
        state.filters.type = 'All';
        $('#filterType').value = 'All';
      }
      applyFilters();
      const target = document.querySelector('#rudraksha');
      if (target) { if (state.lenis) state.lenis.scrollTo(target, { offset: -60, duration: 1.4 }); else target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
}

/* ---------- CATALOGUE RENDER & FILTERS ---------- */
function renderCatalogue() {
  const grid = $('#catalogueGrid');
  const empty = $('#catalogueEmpty');
  if (state.filtered.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
  } else {
    empty.style.display = 'none';
    const sizeClasses = ['', 'product-card--large', '', 'product-card--small', '', 'product-card--large', '', '', 'product-card--small', '', '', '', '', ''];
    grid.innerHTML = state.filtered.map((p, i) => {
      const sizeClass = sizeClasses[i % sizeClasses.length];
      const img = getProductImage(p);
      const rarityBadge = p.rarity === 'Rare' || p.rarity === 'Extremely Rare' ? `<div class="product-card__badge">${p.rarity}</div>` : '';
      const certBadge = p.certification ? `<div class="product-card__cert"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Verified</div>` : '';
      const priceHtml = p.price ? `<div class="product-card__price">${p.price}</div>` : '';
      return `<article class="product-card ${sizeClass}" data-product-id="${p.id}" data-cursor="view"><div class="product-card__img-wrap"><img class="product-card__img" src="${img}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='${generateBeadSVG(p, 600)}'">${rarityBadge}${certBadge}</div><div class="product-card__info"><div class="product-card__cat">${p.mukhi} Mukhi · ${p.origin}</div><div class="product-card__name">${p.name}</div><div class="product-card__meta"><div class="product-card__meta-left">${p.type}<br>${p.size || ''}</div>${priceHtml}</div></div></article>`;
    }).join('');
    $$('.product-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.dataset.productId;
        const product = products.find(p => p.id === id);
        if (product) openProductModal(product, card);
      });
    });
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.fromTo('.product-card', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.06, ease: 'power2.out' });
    }
  }
  $('#resultCount').textContent = state.filtered.length;
}

function applyFilters() {
  const { origin, mukhi, type, sort } = state.filters;
  let result = products.filter(p => {
    if (origin !== 'All' && p.origin !== origin) return false;
    if (mukhi !== 'All' && p.mukhi !== parseInt(mukhi)) return false;
    if (type !== 'All' && p.type !== type) return false;
    return true;
  });
  switch (sort) {
    case 'AZ': result.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'PriceLow': result.sort((a, b) => parsePrice(a.price) - parsePrice(b.price)); break;
    case 'PriceHigh': result.sort((a, b) => parsePrice(b.price) - parsePrice(a.price)); break;
    case 'Featured': default: result.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)); break;
  }
  state.filtered = result;
  renderCatalogue();
  updateSortLabel();
}

function parsePrice(str) { return str ? (parseInt(str.replace(/[^\d]/g, '')) || 0) : 0; }
function updateSortLabel() {
  const { origin, mukhi, type } = state.filters;
  const parts = [];
  if (origin !== 'All') parts.push(origin);
  if (mukhi !== 'All') parts.push(mukhi + ' Mukhi');
  if (type !== 'All') parts.push(type);
  $('#sortLabel').textContent = parts.length > 0 ? parts.join(' · ') : 'Showing all pieces';
}

function initFilters() {
  ['filterOrigin', 'filterMukhi', 'filterType', 'filterSort'].forEach(id => {
    $('#' + id).addEventListener('change', (e) => {
      const key = id.replace('filter', '').toLowerCase();
      const map = { origin: 'origin', mukhi: 'mukhi', type: 'type', sort: 'sort' };
      state.filters[map[key]] = e.target.value;
      applyFilters();
    });
  });
  applyFilters();
}

/* ---------- HORIZONTAL SCROLL ---------- */
function renderHorizontalScroll() {
  const track = $('#horizontalTrack');
  const featuredProducts = products.filter(p => p.featured).slice(0, 6);
  if (featuredProducts.length === 0) {
    track.innerHTML = `<div style="color: var(--ivory); padding: 4rem; text-align: center;">No featured products. Add some in the Admin Panel.</div>`;
    return;
  }
  track.innerHTML = featuredProducts.map((p, i) => {
    const img = getProductImage(p);
    const num = String(i + 1).padStart(2, '0');
    const priceHtml = p.price ? `<div class="horizontal-card__price">${p.price}</div>` : '';
    return `<div class="horizontal-card" data-product-id="${p.id}" data-cursor="view"><img class="horizontal-card__img" src="${img}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='${generateBeadSVG(p, 600)}'"><div class="horizontal-card__overlay"></div><div class="horizontal-card__content"><div class="horizontal-card__num">${num} — ${p.mukhi} Mukhi</div><div class="horizontal-card__name">${p.name}</div><div class="horizontal-card__meta">${p.origin} · ${p.type}</div>${priceHtml}</div></div>`;
  }).join('');
  $$('.horizontal-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.productId;
      const product = products.find(p => p.id === id);
      if (product) openProductModal(product, card);
    });
  });
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const wrap = $('#horizontalWrap');
    const progressBar = $('#horizontalProgress');
    const getScrollAmount = () => Math.max(0, track.scrollWidth - window.innerWidth);
    let killTrigger = ScrollTrigger.getById('horizScroll');
    if (killTrigger) killTrigger.kill();
    gsap.to(track, {
      id: 'horizScroll', x: () => -getScrollAmount(), ease: 'none',
      scrollTrigger: { trigger: wrap, start: 'top top', end: () => '+=' + getScrollAmount(), scrub: 1, pin: true, invalidateOnRefresh: true, onUpdate: (self) => { progressBar.style.width = (self.progress * 100) + '%'; } }
    });
  }
}

/* ---------- PARALLAX ---------- */
function initParallax() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  gsap.to($('#parallaxSvg'), { y: -120, ease: 'none', scrollTrigger: { trigger: '#parallax', start: 'top bottom', end: 'bottom top', scrub: 1.2 } });
  gsap.fromTo('.parallax__content', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.2, ease: 'power2.out', scrollTrigger: { trigger: '#parallax', start: 'top 70%' } });
}

/* ---------- FEATURED RENDER ---------- */
function renderFeatured() {
  const grid = $('#featuredGrid');
  const featuredProducts = products.filter(p => p.featured).slice(0, 5);
  if (featuredProducts.length === 0) {
    grid.innerHTML = `<div style="color: var(--earth); padding: 4rem; text-align: center; grid-column: 1/-1;">No featured products.</div>`;
    return;
  }
  grid.innerHTML = featuredProducts.map(p => {
    const img = getProductImage(p);
    const rarityBadge = p.rarity === 'Rare' || p.rarity === 'Extremely Rare' ? `<div class="product-card__badge">${p.rarity}</div>` : '';
    const priceHtml = p.price ? `<div class="product-card__price">${p.price}</div>` : '';
    return `<article class="product-card featured__card" data-product-id="${p.id}" data-cursor="view"><div class="product-card__img-wrap"><img class="product-card__img" src="${img}" alt="${p.name}" loading="lazy" onerror="this.onerror=null; this.src='${generateBeadSVG(p, 600)}'">${rarityBadge}</div><div class="product-card__info"><div class="product-card__cat">${p.mukhi} Mukhi · ${p.origin}</div><div class="product-card__name">${p.name}</div><div class="product-card__meta"><div class="product-card__meta-left">${p.type}<br>${p.size || ''}</div>${priceHtml}</div></div></article>`;
  }).join('');
  $$('.featured__card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.productId;
      const product = products.find(p => p.id === id);
      if (product) openProductModal(product, card);
    });
  });
}

/* ---------- SEARCH ---------- */
function initSearch() {
  const overlay = $('#searchOverlay');
  const openBtn = $('#searchOpen');
  const closeBtn = $('#searchClose');
  const input = $('#searchInput');
  const results = $('#searchResults');
  
  const openSearch = () => { overlay.classList.add('is-open'); document.body.style.overflow = 'hidden'; if (state.lenis) state.lenis.stop(); setTimeout(() => input.focus(), 300); renderSearchResults(''); };
  const closeSearch = () => { overlay.classList.remove('is-open'); document.body.style.overflow = ''; if (state.lenis) state.lenis.start(); input.value = ''; state.searchActiveIndex = -1; };
  
  openBtn.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);
  input.addEventListener('input', () => { state.searchActiveIndex = -1; renderSearchResults(input.value); });
  input.addEventListener('keydown', (e) => {
    const items = results.querySelectorAll('.search-result');
    if (e.key === 'ArrowDown') { e.preventDefault(); state.searchActiveIndex = Math.min(items.length - 1, state.searchActiveIndex + 1); updateActiveResult(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); state.searchActiveIndex = Math.max(0, state.searchActiveIndex - 1); updateActiveResult(); }
    else if (e.key === 'Enter') { e.preventDefault(); if (state.searchActiveIndex >= 0 && items[state.searchActiveIndex]) { items[state.searchActiveIndex].click(); } else if (items.length > 0) { items[0].click(); } }
  });
}

function renderSearchResults(query) {
  const results = $('#searchResults');
  const q = query.trim().toLowerCase();
  let matched = [];
  if (q.length > 0) {
    matched = products.filter(p => {
      const haystack = [p.name, p.id, p.origin, p.mukhi + ' mukhi', p.mukhi + 'mukhi', p.type, p.category, p.size, p.rarity, p.price, ...(p.keywords || [])].join(' ').toLowerCase();
      return haystack.includes(q);
    });
  } else {
    matched = products.filter(p => p.featured).slice(0, 4);
  }
  state.searchResults = matched;
  if (matched.length === 0) { results.innerHTML = `<div class="search-overlay__empty">No pieces found. Try another search.</div>`; return; }
  results.innerHTML = matched.map((p, i) => {
    const img = getProductImage(p);
    const priceHtml = p.price ? `<div class="search-result__price">${p.price}</div>` : '';
    return `<div class="search-result" data-product-id="${p.id}" style="animation-delay: ${i * 50}ms"><div class="search-result__img"><img src="${img}" alt=""></div><div class="search-result__info"><div class="search-result__name">${p.name}</div><div class="search-result__meta">${p.mukhi} Mukhi · ${p.origin} · ${p.type} · ${p.id}</div></div>${priceHtml}</div>`;
  }).join('');
  $$('.search-result').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.dataset.productId;
      const product = products.find(p => p.id === id);
      if (product) { closeSearchOverlay(); setTimeout(() => openProductModal(product, null), 300); }
    });
  });
}

function updateActiveResult() {
  $$('.search-result').forEach((el, i) => {
    el.classList.toggle('is-active', i === state.searchActiveIndex);
    if (i === state.searchActiveIndex) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function closeSearchOverlay() {
  $('#searchOverlay').classList.remove('is-open');
  document.body.style.overflow = '';
  if (state.lenis) state.lenis.start();
  $('#searchInput').value = '';
}

/* ---------- PRODUCT MODAL ---------- */
function openProductModal(product, cardElement) {
  state.activeProduct = product;
  state.galleryIndex = 0;
  const modal = $('#productModal');
  const inner = $('#productModalInner');
  const gallery = getProductGallery(product);
  
  const videoHtml = product.video ? `<div class="product-modal__video">${product.video.includes('youtube') || product.video.includes('vimeo') ? `<iframe src="${product.video}" allowfullscreen></iframe>` : `<video src="${product.video}" controls></video>`}</div>` : '';
  const priceHtml = product.price ? `<div class="product-modal__price">${product.price}</div>` : '';
  
  inner.innerHTML = `<div class="product-modal__gallery"><div class="product-modal__main-img" id="modalMainImg"><img src="${gallery[0]}" alt="${product.name}" id="modalMainImage"></div><div class="product-modal__thumbs">${gallery.map((g, i) => `<div class="product-modal__thumb ${i === 0 ? 'is-active' : ''}" data-thumb-index="${i}"><img src="${g}" alt=""></div>`).join('')}</div></div><div class="product-modal__details"><div class="product-modal__cat">${product.mukhi} Mukhi · ${product.category} · ${product.origin} Origin</div><h2 class="product-modal__name">${product.name}</h2><div class="product-modal__origin">${product.origin}n Origin · ${product.rarity}</div>${videoHtml}<p class="product-modal__desc">${product.description || ''}</p><div class="product-modal__specs"><div class="product-modal__spec"><div class="product-modal__spec-label">Origin</div><div class="product-modal__spec-value">${product.origin}</div></div><div class="product-modal__spec"><div class="product-modal__spec-label">Mukhi</div><div class="product-modal__spec-value">${product.mukhi}</div></div><div class="product-modal__spec"><div class="product-modal__spec-label">Size</div><div class="product-modal__spec-value">${product.size || '-'}</div></div><div class="product-modal__spec"><div class="product-modal__spec-label">Weight</div><div class="product-modal__spec-value">${product.weight || '-'}</div></div><div class="product-modal__spec"><div class="product-modal__spec-label">Type</div><div class="product-modal__spec-value">${product.type}</div></div><div class="product-modal__spec"><div class="product-modal__spec-label">Treatment</div><div class="product-modal__spec-value">None</div></div><div class="product-modal__spec"><div class="product-modal__spec-label">Certification</div><div class="product-modal__spec-value">${product.certification ? 'Lab Verified' : 'Not Certified'}</div></div><div class="product-modal__spec"><div class="product-modal__spec-label">SKU</div><div class="product-modal__spec-value">${product.id}</div></div></div>${product.certification ? `<div class="product-modal__cert"><div class="product-modal__cert-head"><svg viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V7l-9-5z"/><polyline points="9 12 11 14 15 10"/></svg><div class="product-modal__cert-title">Lab Verified</div></div><div class="product-modal__cert-num"><span>Verification No.</span>${product.verification || ''}</div><button class="btn btn--solid" id="verifyBtn" data-cursor="hover">Verify Authenticity</button></div>` : ''}<div class="product-modal__actions"><button class="btn" id="whatsappBtn" data-cursor="hover">Enquire About This Piece</button>${priceHtml}</div></div>`;
  
  modal.classList.add('is-open');
  document.body.style.overflow = 'hidden';
  if (state.lenis) state.lenis.stop();
  
  $$('.product-modal__thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      const idx = parseInt(thumb.dataset.thumbIndex);
      state.galleryIndex = idx;
      $('#modalMainImage').src = gallery[idx];
      $$('.product-modal__thumb').forEach(t => t.classList.remove('is-active'));
      thumb.classList.add('is-active');
    });
  });
  $('#modalMainImg').addEventListener('click', () => { openImageViewer(gallery, state.galleryIndex); });
  $('#whatsappBtn').addEventListener('click', () => { const msg = `Hello Adirudra, I am interested in ${product.name}, SKU ${product.id}. Please share availability and details.`; window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank'); });
  const verifyBtn = $('#verifyBtn');
  if (verifyBtn) { verifyBtn.addEventListener('click', () => { window.open(`https://globallabtesting.in/?batch=${product.verification}`, '_blank'); }); }
  
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    gsap.fromTo('.product-modal__details > *', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.06, ease: 'power2.out', delay: 0.15 });
    gsap.fromTo('.product-modal__gallery', { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
  }
  modal.scrollTop = 0;
}

function closeProductModal() {
  $('#productModal').classList.remove('is-open');
  document.body.style.overflow = '';
  if (state.lenis) state.lenis.start();
  state.activeProduct = null;
}

/* ---------- IMAGE VIEWER ---------- */
let viewerGallery = [];
let viewerIndex = 0;

function openImageViewer(gallery, index) {
  viewerGallery = gallery;
  viewerIndex = index;
  const viewer = $('#imageViewer');
  const img = $('#imageViewerImg');
  const counter = $('#imageViewerCounter');
  img.src = gallery[index];
  counter.textContent = `${index + 1} / ${gallery.length}`;
  viewer.classList.add('is-open');
}

function closeImageViewer() { $('#imageViewer').classList.remove('is-open'); }

function navigateImageViewer(dir) {
  viewerIndex = (viewerIndex + dir + viewerGallery.length) % viewerGallery.length;
  const img = $('#imageViewerImg');
  const counter = $('#imageViewerCounter');
  gsap.to(img, { opacity: 0, duration: 0.2, onComplete: () => { img.src = viewerGallery[viewerIndex]; counter.textContent = `${viewerIndex + 1} / ${viewerGallery.length}`; gsap.to(img, { opacity: 1, duration: 0.3 }); } });
}

/* ---------- CUSTOM CURSOR ---------- */
function initCursor() {
  if (window.matchMedia('(hover: none)').matches || window.innerWidth < 1025) return;
  const cursor = $('#cursor');
  const xTo = gsap.quickTo(cursor, 'x', { duration: 0.4, ease: 'power2.out' });
  const yTo = gsap.quickTo(cursor, 'y', { duration: 0.4, ease: 'power2.out' });
  window.addEventListener('mousemove', (e) => { xTo(e.clientX); yTo(e.clientY); });
  document.addEventListener('mouseover', (e) => {
    const target = e.target.closest('[data-cursor], a, button, .product-card, .horizontal-card, .collection-card, .search-result');
    if (target) {
      const mode = target.dataset.cursor;
      if (mode === 'view' || target.classList.contains('product-card') || target.classList.contains('horizontal-card') || target.classList.contains('collection-card')) { cursor.classList.add('is-view'); cursor.classList.remove('is-hover'); }
      else { cursor.classList.add('is-hover'); cursor.classList.remove('is-view'); }
    } else { cursor.classList.remove('is-hover', 'is-view'); }
  });
  document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
  document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
}

/* ---------- SCROLL PROGRESS & BACK TO TOP ---------- */
function initScrollUI() {
  const progress = $('#scrollProgress');
  const backToTop = $('#backToTop');
  const update = () => {
    const scrollTop = window.scrollY || window.pageYOffset;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    progress.style.width = pct + '%';
    if (scrollTop > window.innerHeight * 1.2) { backToTop.classList.add('is-visible'); } else { backToTop.classList.remove('is-visible'); }
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
  backToTop.addEventListener('click', () => { if (state.lenis) state.lenis.scrollTo(0, { duration: 1.6 }); else window.scrollTo({ top: 0, behavior: 'smooth' }); });
}

/* ---------- KEYBOARD ---------- */
function initKeyboard() {
  document.addEventListener('keydown', (e) => {
    const searchOpen = $('#searchOverlay').classList.contains('is-open');
    const modalOpen = $('#productModal').classList.contains('is-open');
    const viewerOpen = $('#imageViewer').classList.contains('is-open');
    const menuOpen = $('#mobileMenu').classList.contains('is-open');
    if (e.key === 'Escape') {
      if (viewerOpen) closeImageViewer();
      else if (modalOpen) closeProductModal();
      else if (searchOpen) closeSearchOverlay();
      else if (menuOpen) closeMobileMenu();
    }
    if (viewerOpen) {
      if (e.key === 'ArrowLeft') navigateImageViewer(-1);
      if (e.key === 'ArrowRight') navigateImageViewer(1);
    }
  });
  $('#imageViewerClose').addEventListener('click', closeImageViewer);
  $('#imageViewerPrev').addEventListener('click', () => navigateImageViewer(-1));
  $('#imageViewerNext').addEventListener('click', () => navigateImageViewer(1));
  $('#productModalClose').addEventListener('click', closeProductModal);
}

/* ============================================
   ADMIN PANEL LOGIC (SERVER-BASED)
   ============================================ */
function initAdmin() {
  const trigger = $('#adminTrigger');
  const loginOverlay = $('#adminLoginOverlay');
  const dashboardOverlay = $('#adminDashboardOverlay');
  const formOverlay = $('#adminFormOverlay');
  
  trigger.addEventListener('click', () => {
    if (isAdminLoggedIn) { openDashboard(); }
    else { loginOverlay.classList.add('is-open'); setTimeout(() => $('#adminUser').focus(), 300); }
  });
  
  $('#adminLoginBtn').addEventListener('click', () => {
    const user = $('#adminUser').value;
    const pass = $('#adminPass').value;
    if (user === ADMIN_USER && pass === ADMIN_PASS) { isAdminLoggedIn = true; loginOverlay.classList.remove('is-open'); openDashboard(); }
    else { $('#adminError').textContent = 'Invalid credentials. Please try again.'; }
  });
  
  $('#adminPass').addEventListener('keypress', (e) => { if (e.key === 'Enter') $('#adminLoginBtn').click(); });
  $('#adminLogout').addEventListener('click', () => { isAdminLoggedIn = false; dashboardOverlay.classList.remove('is-open'); document.body.style.overflow = ''; if (state.lenis) state.lenis.start(); });
  $('#adminAddNew').addEventListener('click', () => openForm(null));
  $('#adminFormCancel').addEventListener('click', () => { formOverlay.classList.remove('is-open'); });
  $('#adminFormSave').addEventListener('click', saveProductForm);
  $('#formImages').addEventListener('change', handleImageUpload);
  
  $('#adminList').addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const item = btn.closest('.admin-item');
    if (!item) return;
    const id = item.dataset.id;
    if (btn.classList.contains('admin-edit')) openForm(id);
    if (btn.classList.contains('admin-delete')) deleteProduct(id);
  });
  
  $('#formImageList').addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.admin-media-remove');
    if (!removeBtn) return;
    const index = parseInt(removeBtn.dataset.index, 10);
    state.editingImages.splice(index, 1);
    renderFormImages();
  });
}

function openDashboard() {
  $('#adminDashboardOverlay').classList.add('is-open');
  document.body.style.overflow = 'hidden';
  if (state.lenis) state.lenis.stop();
  renderAdminList();
}

function renderAdminList() {
  const list = $('#adminList');
  list.innerHTML = products.map((p) => {
    const img = getProductImage(p);
    return `<div class="admin-item" data-id="${p.id}"><div class="admin-item__info"><img src="${img}" class="admin-item__img" alt=""><div><div class="admin-item__name">${p.name}</div><div class="admin-item__meta">${p.id} · ${p.mukhi} Mukhi · ${p.origin} · ${p.type}</div></div></div><div class="admin-item__actions"><button class="admin-btn-sm admin-edit">Edit</button><button class="admin-btn-sm danger admin-delete">Delete</button></div></div>`;
  }).join('');
}

function openForm(id) {
  const overlay = $('#adminFormOverlay');
  const title = $('#adminFormTitle');
  state.editingImages = [];
  if (id) {
    const p = products.find(p => p.id === id);
    if (!p) return;
    title.textContent = 'Edit Product';
    $('#formId').value = p.id;
    $('#formName').value = p.name || '';
    $('#formCategory').value = p.category || 'Rudraksha';
    $('#formOrigin').value = p.origin || 'Nepal';
    $('#formMukhi').value = p.mukhi || 5;
    $('#formType').value = p.type || 'Loose Bead';
    $('#formPrice').value = p.price || '';
    $('#formSize').value = p.size || '';
    $('#formWeight').value = p.weight || '';
    $('#formRarity').value = p.rarity || 'Common';
    $('#formFeatured').value = p.featured ? 'true' : 'false';
    $('#formCertification').value = p.certification ? 'true' : 'false';
    $('#formVerification').value = p.verification || '';
    $('#formDesc').value = p.description || '';
    $('#formVideo').value = p.video || '';
    state.editingImages = [...(p.images || [])];
  } else {
    title.textContent = 'Add New Product';
    $('#formId').value = ''; $('#formName').value = ''; $('#formCategory').value = 'Rudraksha'; $('#formOrigin').value = 'Nepal'; $('#formMukhi').value = '5'; $('#formType').value = 'Loose Bead'; $('#formPrice').value = ''; $('#formSize').value = ''; $('#formWeight').value = ''; $('#formRarity').value = 'Common'; $('#formFeatured').value = 'false'; $('#formCertification').value = 'true'; $('#formVerification').value = ''; $('#formDesc').value = ''; $('#formVideo').value = '';
  }
  renderFormImages();
  overlay.classList.add('is-open');
}

function renderFormImages() {
  $('#formImageList').innerHTML = state.editingImages.map((src, i) => `<div class="admin-media-item"><img src="${src}" alt=""><div class="admin-media-remove" data-index="${i}">×</div></div>`).join('');
}

// Upload via API to Hostinger
async function handleImageUpload(e) {
  const files = e.target.files;
  if (!files.length) return;
  for (const file of files) {
    const formData = new FormData();
    formData.append('image', file);
    try {
      const response = await fetch('api.php', { method: 'POST', body: formData });
      const result = await response.json();
      if (result.success) {
        state.editingImages.push(result.url);
        renderFormImages();
      } else {
        alert('Upload failed: ' + result.message);
      }
    } catch (err) {
      alert('Upload error: ' + err.message);
    }
  }
  e.target.value = '';
}

async function saveProductForm() {
  const id = $('#formId').value;
  const isEditing = id && products.find(p => p.id === id);
  const newId = isEditing ? id : `AR-${Date.now().toString().slice(-6)}`;
  const productData = {
    id: newId, name: $('#formName').value || 'Untitled Product', category: $('#formCategory').value, origin: $('#formOrigin').value,
    mukhi: parseInt($('#formMukhi').value) || 1, type: $('#formType').value, price: $('#formPrice').value, size: $('#formSize').value,
    weight: $('#formWeight').value, rarity: $('#formRarity').value, featured: $('#formFeatured').value === 'true',
    certification: $('#formCertification').value === 'true', verification: $('#formVerification').value,
    description: $('#formDesc').value, video: $('#formVideo').value, images: [...state.editingImages],
    keywords: [$('#formName').value.toLowerCase(), $('#formOrigin').value.toLowerCase()]
  };
  if (isEditing) { const index = products.findIndex(p => p.id === id); products[index] = productData; }
  else { products.push(productData); }
  
  if (await saveProducts()) {
    renderAdminList();
    $('#adminFormOverlay').classList.remove('is-open');
    applyFilters(); renderCollectionGrid(); renderHorizontalScroll(); renderFeatured(); ScrollTrigger.refresh();
  }
}

async function deleteProduct(id) {
  if (!confirm('Are you sure you want to permanently remove this piece?')) return;
  products = products.filter(p => p.id !== id);
  if (await saveProducts()) {
    renderAdminList(); applyFilters(); renderCollectionGrid(); renderHorizontalScroll(); renderFeatured(); ScrollTrigger.refresh();
  }
}

/* ---------- INIT ---------- */
async function init() {
  await loadProducts();
  initLenis();
  initLoader();
  initNav();
  initMobileMenu();
  initRevealSystem();
  renderCollectionGrid();
  initFilters();
  renderHorizontalScroll();
  initParallax();
  renderFeatured();
  initSearch();
  initCursor();
  initScrollUI();
  initKeyboard();
  initAdmin();
  setTimeout(() => { ScrollTrigger.refresh(); }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

gsap.ticker.add((time) => { if (state.lenis) state.lenis.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);
