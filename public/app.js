// ===== Zakaria Prom - Frontend Application =====

const state = {
  lang: 'ar',
  currentPage: 'home',
  products: [],
  categories: [],
  selectedCategory: 'all',
  searchQuery: '',
  sort: 'default',
  page: 1,
  totalPages: 1,
  total: 0,
  translations: {},
  loading: false
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  loadTranslations(state.lang);
  loadCategories();
  loadFeaturedProducts();
  setupEventListeners();
});

// ===== API CALLS =====
async function fetchAPI(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function loadTranslations(lang) {
  try {
    const data = await fetchAPI(`/api/translations/${lang}`);
    state.translations = data;
    applyTranslations();
    updateDirection(lang);
  } catch (err) {
    console.error('Failed to load translations:', err);
  }
}

async function loadCategories() {
  try {
    const categories = await fetchAPI('/api/categories');
    state.categories = categories;
    renderCategories();
    renderCategorySidebar();
  } catch (err) {
    console.error('Failed to load categories:', err);
  }
}

async function loadFeaturedProducts() {
  try {
    const data = await fetchAPI('/api/products?limit=8&lang=' + state.lang);
    renderFeaturedProducts(data.products);
  } catch (err) {
    console.error('Failed to load featured products:', err);
  }
}

async function loadProducts() {
  if (state.loading) return;
  state.loading = true;
  showLoading(true);

  try {
    let url = `/api/products?page=${state.page}&limit=24&lang=${state.lang}`;
    if (state.selectedCategory !== 'all') url += `&category=${encodeURIComponent(state.selectedCategory)}`;
    if (state.searchQuery) url += `&search=${encodeURIComponent(state.searchQuery)}`;
    if (state.sort !== 'default') url += `&sort=${state.sort}`;

    const data = await fetchAPI(url);
    state.products = data.products;
    state.totalPages = data.pagination.totalPages;
    state.total = data.pagination.total;

    renderProducts();
    renderPagination();
    document.getElementById('productsCount').textContent = state.total;
  } catch (err) {
    console.error('Failed to load products:', err);
  } finally {
    state.loading = false;
    showLoading(false);
  }
}

async function loadProductDetail(id) {
  try {
    const product = await fetchAPI(`/api/product/${id}`);
    renderProductModal(product);
  } catch (err) {
    console.error('Failed to load product:', err);
  }
}

// ===== RENDERING =====
function renderCategories() {
  const grid = document.getElementById('categoriesGrid');
  if (!grid) return;
  const lang = state.lang;

  grid.innerHTML = state.categories.map(cat => `
    <div class="category-card" data-category="${cat.tr}">
      <h3>${cat[lang] || cat.tr}</h3>
      <span class="count">${cat.count} ${state.translations.productsCount || 'منتج'}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.category-card').forEach(card => {
    card.addEventListener('click', () => {
      state.selectedCategory = card.dataset.category;
      state.page = 1;
      navigateTo('products');
      loadProducts();
      updateCategorySidebarActive();
    });
  });
}

function renderCategorySidebar() {
  const list = document.getElementById('categoryList');
  if (!list) return;
  const lang = state.lang;

  let html = `<li><a href="#" class="active" data-category="all">${state.translations.allCategories || 'جميع الفئات'} <span class="cat-count">${state.categories.reduce((s, c) => s + c.count, 0)}</span></a></li>`;

  state.categories.forEach(cat => {
    html += `<li><a href="#" data-category="${cat.tr}">${cat[lang] || cat.tr} <span class="cat-count">${cat.count}</span></a></li>`;
  });

  list.innerHTML = html;

  list.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      state.selectedCategory = link.dataset.category;
      state.page = 1;
      loadProducts();
      updateCategorySidebarActive();
    });
  });
}

function updateCategorySidebarActive() {
  document.querySelectorAll('#categoryList a').forEach(a => {
    a.classList.toggle('active', a.dataset.category === state.selectedCategory);
  });
}

function renderFeaturedProducts(products) {
  const grid = document.getElementById('featuredProducts');
  if (!grid) return;
  grid.innerHTML = products.map(p => renderProductCard(p)).join('');
  attachProductCardListeners(grid);
}

function renderProducts() {
  const grid = document.getElementById('productsGrid');
  if (!grid) return;

  if (state.products.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:3rem;color:var(--text-muted);">${state.translations.noProducts || 'لا توجد منتجات'}</div>`;
    return;
  }

  grid.innerHTML = state.products.map(p => renderProductCard(p)).join('');
  attachProductCardListeners(grid);
}

function renderProductCard(product) {
  const lang = state.lang;
  const name = product.name[lang] || product.name.tr;
  const img = product.images[0] || '';
  const price = product.price > 0 ? `${product.price.toFixed(2)} TL` : '';
  const stockClass = product.quantity > 0 ? 'in-stock' : '';
  const stockText = product.quantity > 0
    ? `${state.translations.available || 'متوفر'} (${product.quantity})`
    : (state.translations.outOfStock || 'غير متوفر');

  return `
    <div class="product-card" data-id="${product.id}">
      <img class="product-card-img" src="${img}" alt="${name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f1f5f9%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2394a3b8%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E'">
      <div class="product-card-body">
        <h3 class="product-card-title">${name}</h3>
        <p class="product-card-model">${product.model}</p>
        ${price ? `<p class="product-card-price">${price}</p>` : ''}
        <p class="product-card-stock ${stockClass}">${stockText}</p>
      </div>
    </div>
  `;
}

function attachProductCardListeners(container) {
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', () => {
      loadProductDetail(card.dataset.id);
    });
  });
}

function renderProductModal(product) {
  const lang = state.lang;
  const name = product.name[lang] || product.name.tr;
  const price = product.price > 0 ? `${product.price.toFixed(2)} TL` : '';
  const stockClass = product.quantity > 0 ? 'in-stock' : 'out-of-stock';
  const stockText = product.quantity > 0
    ? `${state.translations.available || 'متوفر'} (${product.quantity})`
    : (state.translations.outOfStock || 'غير متوفر');

  let imagesHtml = '';
  if (product.images.length > 0) {
    imagesHtml = `<img class="modal-main-img" id="modalMainImg" src="${product.images[0]}" alt="${name}">`;
    if (product.images.length > 1) {
      imagesHtml += `<div class="modal-thumbs">`;
      product.images.forEach((img, i) => {
        imagesHtml += `<img class="modal-thumb ${i === 0 ? 'active' : ''}" src="${img}" alt="" data-src="${img}">`;
      });
      imagesHtml += `</div>`;
    }
  }

  let optionsHtml = '';
  if (product.options && product.options.length > 0) {
    product.options.forEach(opt => {
      optionsHtml += `<div class="modal-options"><h4>${opt.name}</h4><div class="modal-options-list">`;
      opt.items.forEach(item => {
        optionsHtml += `<span class="option-tag">${item.name} (${item.quantity})</span>`;
      });
      optionsHtml += `</div></div>`;
    });
  }

  const whatsappMsg = encodeURIComponent(`مرحباً، أريد الاستفسار عن المنتج: ${name} - ${product.model}`);

  document.getElementById('modalBody').innerHTML = `
    <div class="modal-product">
      <div class="modal-images">${imagesHtml}</div>
      <div class="modal-info">
        <h2>${name}</h2>
        <p class="modal-model">${state.translations.model || 'الموديل'}: ${product.model}</p>
        ${price ? `<p class="modal-price">${price}</p>` : ''}
        <p class="modal-stock ${stockClass}">${stockText}</p>
        ${product.description ? `<p class="modal-desc">${product.description}</p>` : ''}
        ${optionsHtml}
        <a href="https://wa.me/905428104208?text=${whatsappMsg}" target="_blank" class="btn-primary" style="display:inline-flex;align-items:center;gap:0.5rem;text-decoration:none;margin-top:1rem;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          ${state.translations.requestQuote || 'طلب عرض سعر'}
        </a>
      </div>
    </div>
  `;

  // Thumbnail click
  document.querySelectorAll('.modal-thumb').forEach(thumb => {
    thumb.addEventListener('click', () => {
      document.getElementById('modalMainImg').src = thumb.dataset.src;
      document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
      thumb.classList.add('active');
    });
  });

  document.getElementById('productModal').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function renderPagination() {
  const container = document.getElementById('pagination');
  if (!container || state.totalPages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button ${state.page <= 1 ? 'disabled' : ''} data-page="${state.page - 1}">${state.translations.prev || 'السابق'}</button>`;

  const maxVisible = 5;
  let start = Math.max(1, state.page - Math.floor(maxVisible / 2));
  let end = Math.min(state.totalPages, start + maxVisible - 1);
  if (end - start < maxVisible - 1) start = Math.max(1, end - maxVisible + 1);

  if (start > 1) html += `<button data-page="1">1</button><span>...</span>`;

  for (let i = start; i <= end; i++) {
    html += `<button class="${i === state.page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (end < state.totalPages) html += `<span>...</span><button data-page="${state.totalPages}">${state.totalPages}</button>`;

  html += `<button ${state.page >= state.totalPages ? 'disabled' : ''} data-page="${state.page + 1}">${state.translations.next || 'التالي'}</button>`;

  container.innerHTML = html;

  container.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if (p && p !== state.page && p >= 1 && p <= state.totalPages) {
        state.page = p;
        loadProducts();
        window.scrollTo({ top: 200, behavior: 'smooth' });
      }
    });
  });
}

// ===== TRANSLATIONS =====
function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (state.translations[key]) {
      el.textContent = state.translations[key];
    }
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (state.translations[key]) {
      el.placeholder = state.translations[key];
    }
  });

  // Update page title
  document.title = `${state.translations.siteName || 'زكريا بروم'} - ${state.translations.siteSlogan || 'منتجات الدعاية والإعلان'}`;
}

function updateDirection(lang) {
  const html = document.documentElement;
  if (lang === 'ar') {
    html.setAttribute('dir', 'rtl');
    html.setAttribute('lang', 'ar');
  } else {
    html.setAttribute('dir', 'ltr');
    html.setAttribute('lang', lang);
  }
}

// ===== NAVIGATION =====
function navigateTo(page) {
  state.currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(page + 'Page').classList.add('active');
  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  if (page === 'products') {
    loadProducts();
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== EVENT LISTENERS =====
function setupEventListeners() {
  // Navigation
  document.querySelectorAll('[data-page]').forEach(el => {
    el.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(el.dataset.page);
    });
  });

  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const lang = btn.dataset.lang;
      state.lang = lang;
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadTranslations(lang);
      renderCategories();
      renderCategorySidebar();
      if (state.currentPage === 'home') loadFeaturedProducts();
      if (state.currentPage === 'products') loadProducts();
    });
  });

  // Search
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');

  searchBtn.addEventListener('click', () => {
    state.searchQuery = searchInput.value.trim();
    state.page = 1;
    navigateTo('products');
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      state.searchQuery = searchInput.value.trim();
      state.page = 1;
      navigateTo('products');
    }
  });

  // Sort
  document.getElementById('sortSelect').addEventListener('change', (e) => {
    state.sort = e.target.value;
    state.page = 1;
    loadProducts();
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('productModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Mobile menu
  document.getElementById('mobileMenuBtn').addEventListener('click', () => {
    document.getElementById('mainNav').classList.toggle('active');
  });
}

function closeModal() {
  document.getElementById('productModal').classList.remove('active');
  document.body.style.overflow = '';
}

function showLoading(show) {
  document.getElementById('loadingOverlay').classList.toggle('active', show);
}
