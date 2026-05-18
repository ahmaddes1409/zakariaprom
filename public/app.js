// ===== STATE =====
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
  loading: false,
  user: null,
  token: null,
  cart: [],
  wishlist: [],
  chatbotOpen: false,
  chatMessages: []
};

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
  loadUserSession();
  loadCartFromStorage();
  loadWishlistFromStorage();
  loadTranslations(state.lang);
  loadCategories();
  loadFeaturedProducts();
  setupEventListeners();
  updateCartBadge();
  updateWishlistBadge();
});

// ===== API CALLS =====
async function fetchAPI(url, options = {}) {
  if (state.token) {
    options.headers = { ...options.headers, 'Authorization': 'Bearer ' + state.token };
  }
  if (options.body && typeof options.body === 'object') {
    options.headers = { ...options.headers, 'Content-Type': 'application/json' };
    options.body = JSON.stringify(options.body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }
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

// ===== RENDERING: CATEGORIES =====
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

// ===== RENDERING: PRODUCTS =====
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
  const inWishlist = state.wishlist.includes(product.id);

  return `
    <div class="product-card" data-id="${product.id}">
      <img class="product-card-img" src="${img}" alt="${name}" loading="lazy" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22200%22%3E%3Crect fill=%22%23f1f5f9%22 width=%22200%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%2394a3b8%22 font-size=%2214%22%3ENo Image%3C/text%3E%3C/svg%3E'">
      <div class="product-card-body">
        <h3 class="product-card-title">${name}</h3>
        <p class="product-card-model">${product.model}</p>
        ${price ? `<p class="product-card-price">${price}</p>` : ''}
      </div>
      <div class="product-card-actions">
        <button class="btn-add-cart" onclick="event.stopPropagation();addToCart('${product.id}','${name.replace(/'/g, "\\'")}','${img}',${product.price})">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          ${state.translations.addToCart || 'أضف للسلة'}
        </button>
        <button class="btn-add-wishlist ${inWishlist ? 'active' : ''}" onclick="event.stopPropagation();toggleWishlist('${product.id}')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="${inWishlist ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function attachProductCardListeners(container) {
  container.querySelectorAll('.product-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.product-card-actions')) return;
      loadProductDetail(card.dataset.id);
    });
  });
}

// ===== RENDERING: PRODUCT MODAL =====
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
  const img0 = product.images[0] || '';

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
        <div class="quantity-input">
          <button onclick="changeModalQty(-1)">-</button>
          <input type="number" id="modalQty" value="1" min="1" max="999">
          <button onclick="changeModalQty(1)">+</button>
        </div>
        <div class="modal-detail-actions">
          <button class="btn-primary" onclick="addToCart('${product.id}','${name.replace(/'/g, "\\'")}','${img0}',${product.price},getModalQty())">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            ${state.translations.addToCart || 'أضف للسلة'}
          </button>
          <a href="https://wa.me/905428104208?text=${whatsappMsg}" target="_blank" class="btn-secondary" style="display:inline-flex;align-items:center;gap:0.4rem;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            ${state.translations.requestQuote || 'طلب عرض سعر'}
          </a>
        </div>
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

function changeModalQty(delta) {
  const input = document.getElementById('modalQty');
  let val = parseInt(input.value) + delta;
  if (val < 1) val = 1;
  if (val > 999) val = 999;
  input.value = val;
}

function getModalQty() {
  const input = document.getElementById('modalQty');
  return input ? parseInt(input.value) || 1 : 1;
}

// ===== CART =====
function addToCart(id, name, img, price, qty = 1) {
  const existing = state.cart.find(item => item.id === id);
  if (existing) {
    existing.qty += qty;
  } else {
    state.cart.push({ id, name, img, price: parseFloat(price) || 0, qty });
  }
  saveCartToStorage();
  updateCartBadge();
  showToast(state.translations.addedToCart || 'تمت الإضافة إلى السلة', 'success');
}

function removeFromCart(id) {
  state.cart = state.cart.filter(item => item.id !== id);
  saveCartToStorage();
  updateCartBadge();
  if (state.currentPage === 'cart') renderCartPage();
}

function updateCartQty(id, qty) {
  const item = state.cart.find(i => i.id === id);
  if (item) {
    item.qty = Math.max(1, parseInt(qty) || 1);
    saveCartToStorage();
    updateCartBadge();
    renderCartPage();
  }
}

function clearCart() {
  state.cart = [];
  saveCartToStorage();
  updateCartBadge();
  renderCartPage();
}

function saveCartToStorage() {
  localStorage.setItem('zakariaprom_cart', JSON.stringify(state.cart));
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem('zakariaprom_cart');
    if (saved) state.cart = JSON.parse(saved);
  } catch (e) {}
}

function updateCartBadge() {
  const badge = document.getElementById('cartBadge');
  const count = state.cart.reduce((s, i) => s + i.qty, 0);
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

function renderCartPage() {
  const container = document.getElementById('cartContent');
  if (!container) return;

  if (state.cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        <p>${state.translations.cartEmpty || 'السلة فارغة'}</p>
        <button class="btn-primary" onclick="navigateTo('products')">${state.translations.browseProducts || 'تصفح المنتجات'}</button>
      </div>`;
    return;
  }

  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);

  container.innerHTML = `
    <table class="cart-table">
      <thead>
        <tr>
          <th>${state.translations.product || 'المنتج'}</th>
          <th>${state.translations.price || 'السعر'}</th>
          <th>${state.translations.quantity || 'الكمية'}</th>
          <th>${state.translations.total || 'المجموع'}</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${state.cart.map(item => `
          <tr>
            <td style="display:flex;align-items:center;gap:0.5rem;">
              <img src="${item.img}" alt="" onerror="this.style.display='none'">
              <span class="cart-item-name">${item.name}</span>
            </td>
            <td>${item.price > 0 ? item.price.toFixed(2) + ' TL' : '-'}</td>
            <td><input type="number" value="${item.qty}" min="1" style="width:60px;padding:0.3rem;border:1px solid var(--gray-200);border-radius:4px;text-align:center;" onchange="updateCartQty('${item.id}',this.value)"></td>
            <td>${item.price > 0 ? (item.price * item.qty).toFixed(2) + ' TL' : '-'}</td>
            <td><button class="btn-danger" onclick="removeFromCart('${item.id}')">&times;</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="cart-summary">
      <div class="cart-total">${state.translations.total || 'المجموع'}: ${total > 0 ? total.toFixed(2) + ' TL' : '-'}</div>
      <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
        <button class="btn-danger" onclick="clearCart()">${state.translations.clearCart || 'إفراغ السلة'}</button>
        <button class="btn-primary" onclick="submitQuoteRequest()">${state.translations.requestQuote || 'طلب عرض سعر'}</button>
      </div>
    </div>
  `;
}

async function submitQuoteRequest() {
  if (state.cart.length === 0) return;

  // Build WhatsApp message with cart items
  let msg = (state.translations.quoteRequestMsg || 'مرحباً، أريد طلب عرض سعر للمنتجات التالية:') + '\n\n';
  state.cart.forEach((item, i) => {
    msg += `${i + 1}. ${item.name} - ${state.translations.quantity || 'الكمية'}: ${item.qty}`;
    if (item.price > 0) msg += ` - ${item.price.toFixed(2)} TL`;
    msg += '\n';
  });
  const total = state.cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (total > 0) msg += `\n${state.translations.total || 'المجموع'}: ${total.toFixed(2)} TL`;

  // If user is logged in, also try to submit order via API
  if (state.token) {
    try {
      const items = state.cart.map(i => ({ productId: i.id, name: i.name, quantity: i.qty, price: i.price }));
      await fetchAPI('/api/user/orders', { method: 'POST', body: { items, notes: '' } });
      showToast(state.translations.orderSubmitted || 'تم إرسال طلبك بنجاح', 'success');
    } catch (e) {
      console.error('Order submit failed:', e);
    }
  }

  window.open(`https://wa.me/905428104208?text=${encodeURIComponent(msg)}`, '_blank');
}

// ===== WISHLIST =====
function toggleWishlist(id) {
  const idx = state.wishlist.indexOf(id);
  if (idx > -1) {
    state.wishlist.splice(idx, 1);
    showToast(state.translations.removedFromWishlist || 'تمت الإزالة من المفضلة', 'info');
  } else {
    state.wishlist.push(id);
    showToast(state.translations.addedToWishlist || 'تمت الإضافة إلى المفضلة', 'success');
  }
  saveWishlistToStorage();
  updateWishlistBadge();
  // Re-render if on products page
  if (state.currentPage === 'products') renderProducts();
  if (state.currentPage === 'home') loadFeaturedProducts();
  if (state.currentPage === 'wishlist') renderWishlistPage();
}

function saveWishlistToStorage() {
  localStorage.setItem('zakariaprom_wishlist', JSON.stringify(state.wishlist));
}

function loadWishlistFromStorage() {
  try {
    const saved = localStorage.getItem('zakariaprom_wishlist');
    if (saved) state.wishlist = JSON.parse(saved);
  } catch (e) {}
}

function updateWishlistBadge() {
  const badge = document.getElementById('wishlistBadge');
  if (state.wishlist.length > 0) {
    badge.textContent = state.wishlist.length;
    badge.style.display = 'flex';
  } else {
    badge.style.display = 'none';
  }
}

async function renderWishlistPage() {
  const container = document.getElementById('wishlistContent');
  if (!container) return;

  if (state.wishlist.length === 0) {
    container.innerHTML = `<div class="wishlist-empty"><p>${state.translations.wishlistEmpty || 'المفضلة فارغة'}</p><button class="btn-primary" onclick="navigateTo('products')">${state.translations.browseProducts || 'تصفح المنتجات'}</button></div>`;
    return;
  }

  container.innerHTML = '<div class="spinner" style="margin:2rem auto;"></div>';

  try {
    // Fetch each wishlist product
    const products = [];
    for (const id of state.wishlist) {
      try {
        const p = await fetchAPI(`/api/product/${id}`);
        products.push(p);
      } catch (e) {}
    }
    container.innerHTML = `<div class="wishlist-grid">${products.map(p => renderProductCard(p)).join('')}</div>`;
    attachProductCardListeners(container);
  } catch (e) {
    container.innerHTML = `<p>${state.translations.error || 'حدث خطأ'}</p>`;
  }
}

// ===== USER AUTH =====
function loadUserSession() {
  try {
    const token = localStorage.getItem('zakariaprom_token');
    const user = localStorage.getItem('zakariaprom_user');
    if (token && user) {
      state.token = token;
      state.user = JSON.parse(user);
    }
  } catch (e) {}
}

function handleAccountClick() {
  if (state.user) {
    navigateTo('account');
    renderAccountPage();
  } else {
    openAuthModal();
  }
}

function openAuthModal() {
  document.getElementById('authModal').classList.add('active');
  document.body.style.overflow = 'hidden';
  showLoginForm();
}

function closeAuthModal() {
  document.getElementById('authModal').classList.remove('active');
  document.body.style.overflow = '';
}

function showLoginForm() {
  document.getElementById('authLoginForm').style.display = 'block';
  document.getElementById('authRegisterForm').style.display = 'none';
  document.getElementById('authError').style.display = 'none';
}

function showRegisterForm() {
  document.getElementById('authLoginForm').style.display = 'none';
  document.getElementById('authRegisterForm').style.display = 'block';
  document.getElementById('registerError').style.display = 'none';
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  try {
    const data = await fetchAPI('/api/user/login', {
      method: 'POST',
      body: { email, password }
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('zakariaprom_token', data.token);
    localStorage.setItem('zakariaprom_user', JSON.stringify(data.user));
    closeAuthModal();
    showToast(state.translations.loginSuccess || 'تم تسجيل الدخول بنجاح', 'success');
  } catch (err) {
    document.getElementById('authError').textContent = err.message;
    document.getElementById('authError').style.display = 'block';
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const password = document.getElementById('regPassword').value;
  const phone = document.getElementById('regPhone').value;
  const company = document.getElementById('regCompany').value;
  const country = document.getElementById('regCountry').value;

  try {
    const data = await fetchAPI('/api/user/register', {
      method: 'POST',
      body: { name, email, password, phone, company, country }
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('zakariaprom_token', data.token);
    localStorage.setItem('zakariaprom_user', JSON.stringify(data.user));
    closeAuthModal();
    showToast(state.translations.registerSuccess || 'تم إنشاء الحساب بنجاح', 'success');
  } catch (err) {
    document.getElementById('registerError').textContent = err.message;
    document.getElementById('registerError').style.display = 'block';
  }
}

function logout() {
  state.user = null;
  state.token = null;
  localStorage.removeItem('zakariaprom_token');
  localStorage.removeItem('zakariaprom_user');
  navigateTo('home');
  showToast(state.translations.logoutSuccess || 'تم تسجيل الخروج', 'info');
}

async function renderAccountPage() {
  const container = document.getElementById('accountContent');
  if (!container || !state.user) return;

  container.innerHTML = `
    <div class="account-header">
      <h1>${state.translations.myAccount || 'حسابي'} - ${state.user.name}</h1>
      <button class="btn-danger" onclick="logout()">${state.translations.logout || 'تسجيل الخروج'}</button>
    </div>
    <div class="account-tabs">
      <button class="account-tab active" onclick="showAccountTab('orders')">${state.translations.myOrders || 'طلباتي'}</button>
      <button class="account-tab" onclick="showAccountTab('profile')">${state.translations.profile || 'الملف الشخصي'}</button>
    </div>
    <div id="accountTabContent">
      <div class="spinner" style="margin:2rem auto;"></div>
    </div>
  `;

  showAccountTab('orders');
}

async function showAccountTab(tab) {
  document.querySelectorAll('.account-tab').forEach((t, i) => {
    t.classList.toggle('active', (tab === 'orders' && i === 0) || (tab === 'profile' && i === 1));
  });

  const container = document.getElementById('accountTabContent');
  if (!container) return;

  if (tab === 'orders') {
    try {
      const orders = await fetchAPI('/api/user/orders');
      if (orders.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:var(--text-muted);padding:2rem;">${state.translations.noOrders || 'لا توجد طلبات'}</p>`;
      } else {
        container.innerHTML = `<div class="orders-list">${orders.map(o => `
          <div class="order-card">
            <div class="order-card-header">
              <span class="order-number">#${o.id}</span>
              <span class="order-status status-${o.status}">${o.status}</span>
            </div>
            <p style="font-size:0.85rem;color:var(--text-muted);">${new Date(o.created_at).toLocaleDateString()}</p>
            <p style="font-size:0.85rem;margin-top:0.5rem;">${o.items.map(i => `${i.name} x${i.quantity}`).join(', ')}</p>
          </div>
        `).join('')}</div>`;
      }
    } catch (e) {
      container.innerHTML = `<p style="color:var(--danger);">${e.message}</p>`;
    }
  } else if (tab === 'profile') {
    container.innerHTML = `
      <div style="max-width:400px;">
        <div class="form-group"><label>${state.translations.fullName || 'الاسم'}</label><input type="text" value="${state.user.name}" id="profileName"></div>
        <div class="form-group"><label>${state.translations.email || 'البريد'}</label><input type="email" value="${state.user.email}" disabled></div>
        <div class="form-group"><label>${state.translations.phone || 'الهاتف'}</label><input type="tel" value="${state.user.phone || ''}" id="profilePhone"></div>
        <div class="form-group"><label>${state.translations.company || 'الشركة'}</label><input type="text" value="${state.user.company || ''}" id="profileCompany"></div>
        <button class="btn-primary" onclick="updateProfile()">${state.translations.save || 'حفظ'}</button>
      </div>
    `;
  }
}

async function updateProfile() {
  try {
    const data = await fetchAPI('/api/user/profile', {
      method: 'PUT',
      body: {
        name: document.getElementById('profileName').value,
        phone: document.getElementById('profilePhone').value,
        company: document.getElementById('profileCompany').value
      }
    });
    state.user = { ...state.user, ...data };
    localStorage.setItem('zakariaprom_user', JSON.stringify(state.user));
    showToast(state.translations.profileUpdated || 'تم تحديث الملف الشخصي', 'success');
  } catch (e) {
    showToast(e.message, 'error');
  }
}

// ===== CHATBOT =====
function toggleChatbot() {
  state.chatbotOpen = !state.chatbotOpen;
  const window = document.getElementById('chatbotWindow');
  const badge = document.getElementById('chatbotBadge');

  if (state.chatbotOpen) {
    window.style.display = 'flex';
    badge.style.display = 'none';
    if (state.chatMessages.length === 0) {
      initChatbot();
    }
  } else {
    window.style.display = 'none';
  }
}

function initChatbot() {
  const welcomeMsg = state.translations.chatbotWelcome || 'مرحباً! أنا مساعد زكريا بروم. كيف يمكنني مساعدتك اليوم؟';
  addChatMessage('bot', welcomeMsg);
  showQuickReplies();
}

function showQuickReplies() {
  const container = document.getElementById('chatbotQuickReplies');
  const replies = [
    state.translations.chatShowCategories || 'عرض الفئات',
    state.translations.chatSearchProduct || 'البحث عن منتج',
    state.translations.chatContactUs || 'التواصل معنا',
    state.translations.chatShipping || 'الشحن والتوصيل'
  ];

  container.innerHTML = replies.map(r => `<button class="quick-reply-btn" onclick="handleQuickReply('${r}')">${r}</button>`).join('');
}

function addChatMessage(type, text) {
  state.chatMessages.push({ type, text });
  const container = document.getElementById('chatbotMessages');
  const msgEl = document.createElement('div');
  msgEl.className = `chat-msg ${type}`;
  msgEl.textContent = text;
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById('chatbotInput');
  const text = input.value.trim();
  if (!text) return;

  addChatMessage('user', text);
  input.value = '';

  // Process message
  setTimeout(() => processChatbotResponse(text), 500);
}

function handleQuickReply(text) {
  addChatMessage('user', text);
  setTimeout(() => processChatbotResponse(text), 500);
}

async function processChatbotResponse(userMsg) {
  const msg = userMsg.toLowerCase();

  // Categories
  if (msg.includes('فئ') || msg.includes('categ') || msg.includes('kategori') || msg.includes('عرض الفئات') || msg.includes('show categories')) {
    const cats = state.categories.slice(0, 8).map(c => c[state.lang] || c.tr).join('\n• ');
    addChatMessage('bot', (state.translations.chatCategoriesIntro || 'إليك أهم الفئات المتوفرة:') + '\n\n• ' + cats + '\n\n' + (state.translations.chatCategoriesHelp || 'يمكنك الضغط على أي فئة في الموقع لعرض منتجاتها.'));
    return;
  }

  // Contact
  if (msg.includes('تواصل') || msg.includes('contact') || msg.includes('iletişim') || msg.includes('واتساب') || msg.includes('whatsapp')) {
    addChatMessage('bot', (state.translations.chatContactInfo || 'يمكنك التواصل معنا عبر:') + '\n\n📞 +90 542 810 4208\n📧 info@zakariaprom.com\n💬 WhatsApp: wa.me/905428104208\n\n' + (state.translations.chatContactHelp || 'أو يمكنك إرسال رسالة مباشرة عبر زر الواتساب في الأعلى.'));
    return;
  }

  // Shipping
  if (msg.includes('شحن') || msg.includes('توصيل') || msg.includes('shipping') || msg.includes('delivery') || msg.includes('kargo')) {
    addChatMessage('bot', state.translations.chatShippingInfo || 'نوفر خدمة الشحن لجميع أنحاء تركيا والدول العربية. مدة التوصيل:\n\n🇹🇷 داخل تركيا: 2-4 أيام عمل\n🌍 دولي: 5-10 أيام عمل\n\nللطلبات الكبيرة نوفر أسعار شحن خاصة. تواصل معنا للمزيد من التفاصيل.');
    return;
  }

  // Price / Quote
  if (msg.includes('سعر') || msg.includes('price') || msg.includes('fiyat') || msg.includes('عرض سعر')) {
    addChatMessage('bot', state.translations.chatPriceInfo || 'أسعارنا تعتمد على الكمية المطلوبة ونوع الطباعة. للحصول على عرض سعر مخصص:\n\n1. أضف المنتجات إلى السلة\n2. اضغط "طلب عرض سعر"\n3. سنرد عليك خلال ساعات\n\nأو تواصل معنا مباشرة عبر الواتساب.');
    return;
  }

  // Search product
  if (msg.includes('بحث') || msg.includes('search') || msg.includes('ara') || msg.includes('البحث عن منتج')) {
    addChatMessage('bot', state.translations.chatSearchHelp || 'يمكنك البحث عن أي منتج باستخدام شريط البحث في أعلى الصفحة. أو أخبرني ما الذي تبحث عنه وسأساعدك!');
    return;
  }

  // Try to search for product
  try {
    const data = await fetchAPI(`/api/products?search=${encodeURIComponent(userMsg)}&limit=3&lang=${state.lang}`);
    if (data.products.length > 0) {
      const results = data.products.map(p => `• ${p.name[state.lang] || p.name.tr}${p.price > 0 ? ' - ' + p.price.toFixed(2) + ' TL' : ''}`).join('\n');
      addChatMessage('bot', (state.translations.chatFoundProducts || 'وجدت هذه المنتجات:') + '\n\n' + results + '\n\n' + (state.translations.chatViewAll || 'يمكنك عرض المزيد من صفحة المنتجات.'));
    } else {
      addChatMessage('bot', state.translations.chatNoResults || 'لم أجد نتائج مطابقة. يمكنك تجربة كلمات أخرى أو التواصل معنا مباشرة عبر الواتساب وسنساعدك في إيجاد ما تبحث عنه.');
    }
  } catch (e) {
    addChatMessage('bot', state.translations.chatDefault || 'شكراً لرسالتك! للحصول على مساعدة أفضل، يمكنك التواصل معنا مباشرة عبر الواتساب على الرقم +90 542 810 4208');
  }

  showQuickReplies();
}

// ===== PAGINATION =====
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
  const pageEl = document.getElementById(page + 'Page');
  if (pageEl) pageEl.classList.add('active');

  document.querySelectorAll('.nav-link').forEach(l => {
    l.classList.toggle('active', l.dataset.page === page);
  });

  if (page === 'products') loadProducts();
  if (page === 'cart') renderCartPage();
  if (page === 'wishlist') renderWishlistPage();
  if (page === 'account') renderAccountPage();

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
  document.getElementById('authModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeAuthModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeModal(); closeAuthModal(); }
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

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
