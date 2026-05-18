// Admin Panel JavaScript - Zakaria Prom
const API = '';
let token = localStorage.getItem('admin_token') || '';
let currentSection = 'dashboard';

// ========== AUTH ==========
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('loginUsername').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const res = await fetch(`${API}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.token) {
      token = data.token;
      localStorage.setItem('admin_token', token);
      showAdmin();
    } else {
      showLoginError(data.error || 'خطأ في تسجيل الدخول');
    }
  } catch (err) {
    showLoginError('خطأ في الاتصال بالسيرفر');
  }
});

function showLoginError(msg) {
  const el = document.getElementById('loginError');
  el.textContent = msg;
  el.style.display = 'block';
}

function showAdmin() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('adminPanel').style.display = 'flex';
  loadSection('dashboard');
}

document.getElementById('logoutBtn').addEventListener('click', (e) => {
  e.preventDefault();
  localStorage.removeItem('admin_token');
  token = '';
  location.reload();
});

// Check token on load
if (token) {
  fetch(`${API}/api/admin/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => { if (r.ok) showAdmin(); else { localStorage.removeItem('admin_token'); token = ''; } })
    .catch(() => {});
}

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const section = item.dataset.section;
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    loadSection(section);
    // Close mobile sidebar
    document.querySelector('.sidebar').classList.remove('open');
  });
});

document.getElementById('menuToggle').addEventListener('click', () => {
  document.querySelector('.sidebar').classList.toggle('open');
});

// ========== API HELPER ==========
async function api(url, options = {}) {
  const headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }
  const res = await fetch(`${API}${url}`, { ...options, headers });
  if (res.status === 401) { localStorage.removeItem('admin_token'); location.reload(); return null; }
  return res.json();
}

// ========== SECTIONS ==========
async function loadSection(section) {
  currentSection = section;
  document.getElementById('pageTitle').textContent = getSectionTitle(section);
  const area = document.getElementById('contentArea');
  area.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>جاري التحميل...</p></div>';
  
  switch(section) {
    case 'dashboard': await renderDashboard(); break;
    case 'orders': await renderOrders(); break;
    case 'products': await renderProducts(); break;
    case 'categories': await renderCategories(); break;
    case 'translations': await renderTranslations(); break;
    case 'users': await renderUsers(); break;
    case 'coupons': await renderCoupons(); break;
    case 'posts': await renderPosts(); break;
    case 'chatbot': await renderChatbot(); break;
    case 'analytics': await renderAnalytics(); break;
    case 'settings': await renderSettings(); break;
  }
}

function getSectionTitle(s) {
  const titles = {
    dashboard: 'لوحة المعلومات', orders: 'الطلبات', products: 'المنتجات',
    categories: 'الفئات', translations: 'الترجمات', users: 'العملاء',
    coupons: 'كوبونات الخصم', posts: 'المدونة', chatbot: 'الشات بوت',
    analytics: 'الإحصائيات', settings: 'الإعدادات'
  };
  return titles[s] || s;
}

// ========== DASHBOARD ==========
async function renderDashboard() {
  const data = await api('/api/admin/dashboard');
  if (!data) return;
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-box"></i></div><div class="stat-info"><h3>${data.stats?.totalProducts || 0}</h3><p>منتج</p></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-tags"></i></div><div class="stat-info"><h3>${data.stats?.totalCategories || 0}</h3><p>فئة</p></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-shopping-bag"></i></div><div class="stat-info"><h3>${data.stats?.totalOrders || 0}</h3><p>طلب</p></div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${data.stats?.totalUsers || 0}</h3><p>عميل مسجل</p></div></div>
      <div class="stat-card"><div class="stat-icon teal"><i class="fas fa-sync"></i></div><div class="stat-info"><h3>${data.stats?.totalVisits || 0}</h3><p>زيارة (30 يوم)</p></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fas fa-clock"></i></div><div class="stat-info"><h3>${data.stats?.newOrders || 0}</h3><p>طلب جديد</p></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>آخر الطلبات</h3></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>#</th><th>العميل</th><th>المنتجات</th><th>الحالة</th><th>التاريخ</th></tr></thead>
            <tbody id="recentOrders">${data.recentOrders ? data.recentOrders.map(o => `
              <tr><td>${o.id}</td><td>${o.customer_name || 'ضيف'}</td><td>${o.items_count} منتج</td>
              <td><span class="status status-${o.status}">${getStatusLabel(o.status)}</span></td>
              <td>${formatDate(o.created_at)}</td></tr>`).join('') : '<tr><td colspan="5" class="empty-state">لا توجد طلبات بعد</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ========== ORDERS ==========
async function renderOrders() {
  const data = await api('/api/admin/orders');
  const area = document.getElementById('contentArea');
  const orders = data?.orders || [];
  area.innerHTML = `
    <div class="filters-bar">
      <select id="orderStatusFilter" onchange="filterOrders()">
        <option value="">جميع الحالات</option>
        <option value="new">جديد</option>
        <option value="processing">قيد المعالجة</option>
        <option value="quoted">تم التسعير</option>
        <option value="confirmed">مؤكد</option>
        <option value="completed">مكتمل</option>
        <option value="cancelled">ملغي</option>
      </select>
      <input type="text" placeholder="بحث بالاسم أو الإيميل..." id="orderSearch" oninput="filterOrders()">
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr><th>#</th><th>العميل</th><th>الهاتف</th><th>المنتجات</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
          <tbody id="ordersTable">${orders.length ? orders.map(o => renderOrderRow(o)).join('') : '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-shopping-bag"></i><p>لا توجد طلبات بعد</p></div></td></tr>'}</tbody>
        </table>
      </div>
    </div>
  `;
}

function renderOrderRow(o) {
  return `<tr data-status="${o.status}" data-name="${(o.customer_name||'').toLowerCase()} ${(o.customer_email||'').toLowerCase()}">
    <td>${o.id}</td><td>${o.customer_name || 'ضيف'}</td><td>${o.customer_phone || '-'}</td>
    <td>${o.items_count || 0} منتج</td>
    <td><span class="status status-${o.status}">${getStatusLabel(o.status)}</span></td>
    <td>${formatDate(o.created_at)}</td>
    <td><button class="btn-primary btn-sm" onclick="viewOrder(${o.id})">عرض</button>
    <button class="btn-secondary btn-sm" onclick="updateOrderStatus(${o.id})">تحديث</button></td>
  </tr>`;
}

window.filterOrders = function() {
  const status = document.getElementById('orderStatusFilter').value;
  const search = document.getElementById('orderSearch').value.toLowerCase();
  document.querySelectorAll('#ordersTable tr').forEach(row => {
    const matchStatus = !status || row.dataset.status === status;
    const matchSearch = !search || (row.dataset.name || '').includes(search);
    row.style.display = matchStatus && matchSearch ? '' : 'none';
  });
};

window.viewOrder = async function(id) {
  const data = await api(`/api/admin/orders/${id}`);
  if (!data) return;
  const o = data.order;
  const items = data.items || [];
  showModal('تفاصيل الطلب #' + id, `
    <div style="margin-bottom:16px;">
      <p><strong>العميل:</strong> ${o.customer_name || 'ضيف'}</p>
      <p><strong>الإيميل:</strong> ${o.customer_email || '-'}</p>
      <p><strong>الهاتف:</strong> ${o.customer_phone || '-'}</p>
      <p><strong>الشركة:</strong> ${o.company_name || '-'}</p>
      <p><strong>ملاحظات:</strong> ${o.notes || '-'}</p>
      <p><strong>الحالة:</strong> <span class="status status-${o.status}">${getStatusLabel(o.status)}</span></p>
    </div>
    <table><thead><tr><th>المنتج</th><th>الكمية</th><th>الخيارات</th></tr></thead>
    <tbody>${items.map(i => `<tr><td>${i.product_name || i.product_id}</td><td>${i.quantity}</td><td>${i.options || '-'}</td></tr>`).join('')}</tbody></table>
  `);
};

window.updateOrderStatus = async function(id) {
  const status = prompt('اختر الحالة الجديدة:\nnew, processing, quoted, confirmed, completed, cancelled');
  if (!status) return;
  await api(`/api/admin/orders/${id}/status`, { method: 'PUT', body: { status } });
  toast('تم تحديث حالة الطلب');
  loadSection('orders');
};

// ========== PRODUCTS ==========
let productsPage = 1;
async function renderProducts() {
  const data = await api(`/api/admin/products?page=${productsPage}&limit=20`);
  const area = document.getElementById('contentArea');
  const products = data?.products || [];
  const total = data?.total || 0;
  area.innerHTML = `
    <div class="filters-bar">
      <input type="text" placeholder="بحث بالاسم أو الموديل..." id="productSearch" style="flex:1;">
      <button class="btn-primary" onclick="searchAdminProducts()">بحث</button>
      <span style="color:var(--text-muted);">${total} منتج</span>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr><th>صورة</th><th>الاسم (تركي)</th><th>الاسم (عربي)</th><th>الموديل</th><th>السعر</th><th>الكمية</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody id="productsTable">${products.map(p => `
            <tr>
              <td><img src="${p.images?.[0] || ''}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'"></td>
              <td>${p.name?.tr || ''}</td>
              <td>${p.name?.ar || ''}</td>
              <td>${p.model || ''}</td>
              <td>${p.price ? p.price + ' TL' : '-'}</td>
              <td>${p.quantity || 0}</td>
              <td>${p.hidden ? '<span class="status status-cancelled">مخفي</span>' : '<span class="status status-completed">ظاهر</span>'}</td>
              <td>
                <button class="btn-secondary btn-sm" onclick="editProduct('${p.id}')">تعديل</button>
                <button class="btn-sm ${p.hidden ? 'btn-success' : 'btn-danger'}" onclick="toggleProduct('${p.id}', ${!p.hidden})">${p.hidden ? 'إظهار' : 'إخفاء'}</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="pagination">
      <button onclick="productsPage--;renderProducts()" ${productsPage <= 1 ? 'disabled' : ''}>السابق</button>
      <span>صفحة ${productsPage} من ${Math.ceil(total/20)}</span>
      <button onclick="productsPage++;renderProducts()" ${productsPage >= Math.ceil(total/20) ? 'disabled' : ''}>التالي</button>
    </div>
  `;
}

window.searchAdminProducts = async function() {
  const q = document.getElementById('productSearch').value;
  const data = await api(`/api/admin/products?search=${encodeURIComponent(q)}&limit=50`);
  const products = data?.products || [];
  document.getElementById('productsTable').innerHTML = products.map(p => `
    <tr>
      <td><img src="${p.images?.[0] || ''}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'"></td>
      <td>${p.name?.tr || ''}</td><td>${p.name?.ar || ''}</td><td>${p.model || ''}</td>
      <td>${p.price ? p.price + ' TL' : '-'}</td><td>${p.quantity || 0}</td>
      <td>${p.hidden ? '<span class="status status-cancelled">مخفي</span>' : '<span class="status status-completed">ظاهر</span>'}</td>
      <td><button class="btn-secondary btn-sm" onclick="editProduct('${p.id}')">تعديل</button></td>
    </tr>`).join('');
};

window.editProduct = async function(id) {
  const data = await api(`/api/admin/products/${id}`);
  if (!data) return;
  const p = data.product;
  showModal('تعديل المنتج', `
    <form id="editProductForm">
      <div class="form-group"><label>الاسم (تركي)</label><input id="epNameTr" value="${p.name?.tr || ''}"></div>
      <div class="form-group"><label>الاسم (عربي)</label><input id="epNameAr" value="${p.name?.ar || ''}"></div>
      <div class="form-group"><label>الاسم (إنجليزي)</label><input id="epNameEn" value="${p.name?.en || ''}"></div>
      <div class="form-group"><label>السعر (TL)</label><input type="number" id="epPrice" value="${p.price || 0}"></div>
      <button type="submit" class="btn-primary">حفظ التعديلات</button>
    </form>
  `);
  document.getElementById('editProductForm').onsubmit = async (e) => {
    e.preventDefault();
    await api(`/api/admin/products/${id}`, { method: 'PUT', body: {
      name_tr: document.getElementById('epNameTr').value,
      name_ar: document.getElementById('epNameAr').value,
      name_en: document.getElementById('epNameEn').value,
      price: parseFloat(document.getElementById('epPrice').value)
    }});
    toast('تم حفظ التعديلات');
    closeModal();
    renderProducts();
  };
};

window.toggleProduct = async function(id, hide) {
  await api(`/api/admin/products/${id}/visibility`, { method: 'PUT', body: { hidden: hide } });
  toast(hide ? 'تم إخفاء المنتج' : 'تم إظهار المنتج');
  renderProducts();
};

// ========== CATEGORIES ==========
async function renderCategories() {
  const data = await api('/api/admin/categories');
  const area = document.getElementById('contentArea');
  const cats = data?.categories || [];
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>الفئات (${cats.length})</h3></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>الفئة (تركي)</th><th>الفئة (عربي)</th><th>الفئة (إنجليزي)</th><th>عدد المنتجات</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>${cats.map(c => `
              <tr>
                <td>${c.tr}</td><td>${c.ar}</td><td>${c.en}</td><td>${c.count}</td>
                <td>${c.hidden ? '<span class="status status-cancelled">مخفي</span>' : '<span class="status status-completed">ظاهر</span>'}</td>
                <td><button class="btn-secondary btn-sm" onclick="editCategory('${encodeURIComponent(c.tr)}')">تعديل</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.editCategory = async function(catTr) {
  const cat = decodeURIComponent(catTr);
  const data = await api(`/api/admin/categories/${encodeURIComponent(cat)}`);
  if (!data) return;
  const c = data.category;
  showModal('تعديل الفئة', `
    <form id="editCatForm">
      <div class="form-group"><label>الاسم (تركي)</label><input id="ecTr" value="${c.tr || cat}" readonly style="background:#f0f4f8;"></div>
      <div class="form-group"><label>الاسم (عربي)</label><input id="ecAr" value="${c.ar || ''}"></div>
      <div class="form-group"><label>الاسم (إنجليزي)</label><input id="ecEn" value="${c.en || ''}"></div>
      <div class="form-group"><label>رابط صورة الفئة</label><input id="ecImage" value="${c.image || ''}" placeholder="https://..."></div>
      ${c.image ? '<div style="margin-bottom:12px;"><img src="' + c.image + '" style="max-width:200px;border-radius:8px;"></div>' : ''}
      <div class="form-group"><label>إخفاء الفئة</label><label class="toggle"><input type="checkbox" id="ecHidden" ${c.hidden ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  document.getElementById('editCatForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/categories', { method: 'PUT', body: {
      category_tr: cat,
      ar: document.getElementById('ecAr').value,
      en: document.getElementById('ecEn').value,
      image: document.getElementById('ecImage').value,
      hidden: document.getElementById('ecHidden').checked
    }});
    toast('تم حفظ التعديلات');
    closeModal();
    renderCategories();
  };
};

// ========== TRANSLATIONS ==========
async function renderTranslations() {
  const data = await api('/api/admin/translations');
  const area = document.getElementById('contentArea');
  const cats = data?.categories || [];
  const terms = data?.terms || [];
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>ترجمات الفئات</h3><button class="btn-primary btn-sm" onclick="addTranslation('category')">+ إضافة</button></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>تركي</th><th>عربي</th><th>إنجليزي</th><th>إجراءات</th></tr></thead>
            <tbody>${cats.map(c => `
              <tr><td>${c.tr}</td><td>${c.ar}</td><td>${c.en}</td>
              <td><button class="btn-secondary btn-sm" onclick="editTranslation('category','${encodeURIComponent(c.tr)}')">تعديل</button></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>ترجمات المصطلحات</h3><button class="btn-primary btn-sm" onclick="addTranslation('term')">+ إضافة</button></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>تركي</th><th>عربي</th><th>إنجليزي</th><th>إجراءات</th></tr></thead>
            <tbody>${terms.map(t => `
              <tr><td>${t.tr}</td><td>${t.ar}</td><td>${t.en}</td>
              <td><button class="btn-secondary btn-sm" onclick="editTranslation('term','${encodeURIComponent(t.tr)}')">تعديل</button></td></tr>`).join('')}
            </tbody>
          </table>
        </div>
            </div>
    </div>
    <div class="card">
      <div class="card-header"><h3>ترجمات المنتجات</h3>
        <input id="productTransSearch" type="text" placeholder="ابحث عن منتج..." style="padding:6px 12px;border:1px solid #ddd;border-radius:6px;width:200px;" onkeyup="searchProductTranslations()">
      </div>
      <div class="card-body">
        <div id="productTransList">جاري التحميل...</div>
        <div id="productTransPagination" style="margin-top:12px;display:flex;gap:8px;justify-content:center;"></div>
      </div>
    </div>
  `;
  loadProductTranslations(1);
}
let productTransPage = 1;
async function loadProductTranslations(page) {
  productTransPage = page;
  const search = document.getElementById('productTransSearch')?.value || '';
  const data = await api(`/api/admin/translations/products?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
  const products = data?.products || [];
  const total = data?.total || 0;
  const totalPages = data?.totalPages || 1;
  const listEl = document.getElementById('productTransList');
  if (!products.length) { listEl.innerHTML = '<p style="color:#888;">لا توجد منتجات</p>'; return; }
  listEl.innerHTML = `<div class="table-responsive"><table>
    <thead><tr><th>الموديل</th><th>تركي</th><th>عربي</th><th>إنجليزي</th><th>إجراءات</th></tr></thead>
    <tbody>${products.map(p => `
      <tr><td style="font-size:11px;color:#666;">${p.model}</td><td>${p.tr}</td><td>${p.ar}</td><td>${p.en}</td>
      <td><button class="btn-secondary btn-sm" onclick="editTranslation('product','${encodeURIComponent(p.model)}')">تعديل</button></td></tr>`).join('')}
    </tbody>
  </table></div>`;
  // Pagination
  const pagEl = document.getElementById('productTransPagination');
  if (totalPages > 1) {
    let btns = '';
    if (page > 1) btns += `<button class="btn-secondary btn-sm" onclick="loadProductTranslations(${page-1})">السابق</button>`;
    btns += `<span style="padding:4px 8px;">${page} / ${totalPages}</span>`;
    if (page < totalPages) btns += `<button class="btn-secondary btn-sm" onclick="loadProductTranslations(${page+1})">التالي</button>`;
    pagEl.innerHTML = btns;
  } else { pagEl.innerHTML = ''; }
}
window.loadProductTranslations = loadProductTranslations;
let searchTimeout;
function searchProductTranslations() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadProductTranslations(1), 300);
}
window.searchProductTranslations = searchProductTranslations;
window.editTranslation = async function(type, key) {
  const k = decodeURIComponent(key);
  showModal('تعديل الترجمة', `
    <form id="editTransForm">
      <div class="form-group"><label>النص (تركي)</label><input id="etTr" value="${k}" readonly style="background:#f0f4f8;"></div>
      <div class="form-group"><label>الترجمة (عربي)</label><input id="etAr" value=""></div>
      <div class="form-group"><label>الترجمة (إنجليزي)</label><input id="etEn" value=""></div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  // Fetch current values
  const data = await api(`/api/admin/translations/${type}/${encodeURIComponent(k)}`);
  if (data) {
    document.getElementById('etAr').value = data.ar || '';
    document.getElementById('etEn').value = data.en || '';
  }
  document.getElementById('editTransForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/translations', { method: 'PUT', body: {
      type, key: k,
      ar: document.getElementById('etAr').value,
      en: document.getElementById('etEn').value
    }});
    toast('تم حفظ الترجمة');
    closeModal();
    renderTranslations();
  };
};

window.addTranslation = function(type) {
  showModal('إضافة ترجمة جديدة', `
    <form id="addTransForm">
      <div class="form-group"><label>النص (تركي)</label><input id="atTr" required></div>
      <div class="form-group"><label>الترجمة (عربي)</label><input id="atAr" required></div>
      <div class="form-group"><label>الترجمة (إنجليزي)</label><input id="atEn" required></div>
      <button type="submit" class="btn-primary">إضافة</button>
    </form>
  `);
  document.getElementById('addTransForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/translations', { method: 'POST', body: {
      type,
      key: document.getElementById('atTr').value,
      ar: document.getElementById('atAr').value,
      en: document.getElementById('atEn').value
    }});
    toast('تمت إضافة الترجمة');
    closeModal();
    renderTranslations();
  };
};

// ========== USERS ==========
async function renderUsers() {
  const data = await api('/api/admin/users');
  const area = document.getElementById('contentArea');
  const users = data?.users || [];
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>العملاء المسجلين (${users.length})</h3></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>#</th><th>الاسم</th><th>الإيميل</th><th>الهاتف</th><th>الشركة</th><th>الطلبات</th><th>تاريخ التسجيل</th></tr></thead>
            <tbody>${users.length ? users.map(u => `
              <tr><td>${u.id}</td><td>${u.name}</td><td>${u.email}</td><td>${u.phone || '-'}</td>
              <td>${u.company || '-'}</td><td>${u.orders_count || 0}</td><td>${formatDate(u.created_at)}</td></tr>`).join('') 
              : '<tr><td colspan="7"><div class="empty-state"><i class="fas fa-users"></i><p>لا يوجد عملاء مسجلين بعد</p></div></td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ========== COUPONS ==========
async function renderCoupons() {
  const data = await api('/api/admin/coupons');
  const area = document.getElementById('contentArea');
  const coupons = Array.isArray(data) ? data : (data?.coupons || []);
  area.innerHTML = `
    <div class="filters-bar">
      <button class="btn-primary" onclick="addCoupon()"><i class="fas fa-plus"></i> إضافة كوبون</button>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr><th>الكود</th><th>النوع</th><th>القيمة</th><th>الحد الأدنى</th><th>الاستخدام</th><th>الصلاحية</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>${coupons.length ? coupons.map(c => `
            <tr><td><strong>${c.code}</strong></td><td>${c.discount_type === 'percentage' ? 'نسبة %' : 'مبلغ ثابت'}</td>
            <td>${c.discount_value}${c.discount_type === 'percentage' ? '%' : ' TL'}</td>
            <td>${c.min_order || '-'}</td><td>${c.used_count}/${c.max_uses || '∞'}</td>
            <td>${c.expires_at ? formatDate(c.expires_at) : 'بدون'}</td>
            <td>${c.active ? '<span class="status status-completed">فعال</span>' : '<span class="status status-cancelled">معطل</span>'}</td>
            <td><button class="btn-danger btn-sm" onclick="deleteCoupon(${c.id})">حذف</button></td></tr>`).join('')
            : '<tr><td colspan="8"><div class="empty-state"><i class="fas fa-ticket-alt"></i><p>لا توجد كوبونات</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.addCoupon = function() {
  showModal('إضافة كوبون خصم', `
    <form id="addCouponForm">
      <div class="form-group"><label>كود الكوبون</label><input id="acCode" required placeholder="SUMMER2026"></div>
      <div class="form-group"><label>النوع</label><select id="acType"><option value="percentage">نسبة مئوية</option><option value="fixed">مبلغ ثابت</option></select></div>
      <div class="form-group"><label>القيمة</label><input type="number" id="acValue" required></div>
      <div class="form-group"><label>الحد الأدنى للطلب (TL)</label><input type="number" id="acMin" value="0"></div>
      <div class="form-group"><label>عدد الاستخدامات الأقصى</label><input type="number" id="acMax" placeholder="اتركه فارغاً لبدون حد"></div>
      <div class="form-group"><label>تاريخ الانتهاء</label><input type="date" id="acExpires"></div>
      <button type="submit" class="btn-primary">إنشاء الكوبون</button>
    </form>
  `);
  document.getElementById('addCouponForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/coupons', { method: 'POST', body: {
      code: document.getElementById('acCode').value,
      type: document.getElementById('acType').value,
      value: parseFloat(document.getElementById('acValue').value),
      min_order: parseFloat(document.getElementById('acMin').value) || 0,
      max_uses: parseInt(document.getElementById('acMax').value) || null,
      expires_at: document.getElementById('acExpires').value || null
    }});
    toast('تم إنشاء الكوبون');
    closeModal();
    renderCoupons();
  };
};

window.deleteCoupon = async function(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
  await api(`/api/admin/coupons/${id}`, { method: 'DELETE' });
  toast('تم حذف الكوبون');
  renderCoupons();
};

// ========== POSTS (Blog) ==========
async function renderPosts() {
  const data = await api('/api/admin/posts');
  const area = document.getElementById('contentArea');
  const posts = Array.isArray(data) ? data : (data?.posts || []);
  area.innerHTML = `
    <div class="filters-bar">
      <button class="btn-primary" onclick="addPost()"><i class="fas fa-plus"></i> إضافة مقال</button>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr><th>العنوان</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th></tr></thead>
          <tbody>${posts.length ? posts.map(p => `
            <tr><td>${p.title}</td>
            <td>${p.published ? '<span class="status status-completed">منشور</span>' : '<span class="status status-new">مسودة</span>'}</td>
            <td>${formatDate(p.created_at)}</td>
            <td><button class="btn-secondary btn-sm" onclick="editPost(${p.id})">تعديل</button>
            <button class="btn-danger btn-sm" onclick="deletePost(${p.id})">حذف</button></td></tr>`).join('')
            : '<tr><td colspan="4"><div class="empty-state"><i class="fas fa-newspaper"></i><p>لا توجد مقالات</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.addPost = function() {
  showModal('إضافة مقال جديد', `
    <form id="addPostForm">
      <div class="form-group"><label>العنوان (عربي)</label><input id="apTitle" required></div>
      <div class="form-group"><label>العنوان (إنجليزي)</label><input id="apTitleEn"></div>
      <div class="form-group"><label>العنوان (تركي)</label><input id="apTitleTr"></div>
      <div class="form-group"><label>المحتوى</label><textarea id="apContent" rows="6"></textarea></div>
      <div class="form-group"><label>نشر مباشرة</label><label class="toggle"><input type="checkbox" id="apPublished" checked><span class="toggle-slider"></span></label></div>
      <button type="submit" class="btn-primary">حفظ المقال</button>
    </form>
  `);
  document.getElementById('addPostForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/posts', { method: 'POST', body: {
      title: document.getElementById('apTitle').value,
      title_en: document.getElementById('apTitleEn').value,
      title_tr: document.getElementById('apTitleTr').value,
      content: document.getElementById('apContent').value,
      published: document.getElementById('apPublished').checked
    }});
    toast('تم حفظ المقال');
    closeModal();
    renderPosts();
  };
};

window.deletePost = async function(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المقال؟')) return;
  await api(`/api/admin/posts/${id}`, { method: 'DELETE' });
  toast('تم حذف المقال');
  renderPosts();
};

// ========== CHATBOT ==========
async function renderChatbot() {
  const data = await api('/api/admin/chatbot');
  const area = document.getElementById('contentArea');
  const responses = Array.isArray(data) ? data : (data?.responses || []);
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>إعدادات الشات بوت</h3></div>
      <div class="card-body">
        <p style="color:var(--text-muted);margin-bottom:16px;">الشات بوت يرد تلقائياً على أسئلة الزوار بناءً على الكلمات المفتاحية. يمكنك إضافة وتعديل الردود هنا.</p>
        <button class="btn-primary" onclick="addChatResponse()"><i class="fas fa-plus"></i> إضافة رد جديد</button>
      </div>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr><th>الكلمات المفتاحية</th><th>الرد (عربي)</th><th>الرد (إنجليزي)</th><th>الرد (تركي)</th><th>إجراءات</th></tr></thead>
          <tbody>${responses.length ? responses.map(r => `
            <tr><td>${r.keywords}</td><td>${(r.response_ar || '').substring(0,50)}...</td>
            <td>${(r.response_en || '').substring(0,50)}...</td><td>${(r.response_tr || '').substring(0,50)}...</td>
            <td><button class="btn-secondary btn-sm" onclick="editChatResponse(${r.id})">تعديل</button>
            <button class="btn-danger btn-sm" onclick="deleteChatResponse(${r.id})">حذف</button></td></tr>`).join('')
            : '<tr><td colspan="5"><div class="empty-state"><i class="fas fa-robot"></i><p>لا توجد ردود مخصصة</p></div></td></tr>'}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.addChatResponse = function() {
  showModal('إضافة رد للشات بوت', `
    <form id="addChatForm">
      <div class="form-group"><label>الكلمات المفتاحية (مفصولة بفاصلة)</label><input id="crKeywords" required placeholder="سعر, تكلفة, كم السعر"></div>
      <div class="form-group"><label>الرد (عربي)</label><textarea id="crAr" rows="3"></textarea></div>
      <div class="form-group"><label>الرد (إنجليزي)</label><textarea id="crEn" rows="3"></textarea></div>
      <div class="form-group"><label>الرد (تركي)</label><textarea id="crTr" rows="3"></textarea></div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  document.getElementById('addChatForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/chatbot', { method: 'POST', body: {
      keywords: document.getElementById('crKeywords').value,
      response_ar: document.getElementById('crAr').value,
      response_en: document.getElementById('crEn').value,
      response_tr: document.getElementById('crTr').value
    }});
    toast('تمت إضافة الرد');
    closeModal();
    renderChatbot();
  };
};

window.deleteChatResponse = async function(id) {
  if (!confirm('حذف هذا الرد؟')) return;
  await api(`/api/admin/chatbot/${id}`, { method: 'DELETE' });
  toast('تم الحذف');
  renderChatbot();
};

// ========== ANALYTICS ==========
async function renderAnalytics() {
  const data = await api('/api/admin/analytics');
  const area = document.getElementById('contentArea');
  const stats = data || {};
  area.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-eye"></i></div><div class="stat-info"><h3>${stats.totalViews || 0}</h3><p>إجمالي الزيارات</p></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-eye"></i></div><div class="stat-info"><h3>${stats.todayViews || 0}</h3><p>زيارات اليوم</p></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-box"></i></div><div class="stat-info"><h3>${stats.topProduct || '-'}</h3><p>أكثر منتج مشاهدة</p></div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-tags"></i></div><div class="stat-info"><h3>${stats.topCategory || '-'}</h3><p>أكثر فئة زيارة</p></div></div>
    </div>
    <div class="card">
      <div class="card-header"><h3>أكثر المنتجات مشاهدة</h3></div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>المنتج</th><th>المشاهدات</th></tr></thead>
            <tbody>${(stats.topProducts || []).map(p => `<tr><td>${p.name}</td><td>${p.views}</td></tr>`).join('') || '<tr><td colspan="2">لا توجد بيانات بعد</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ========== SETTINGS ==========
async function renderSettings() {
  const s = await api('/api/admin/settings') || {};
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="settings-grid">
      <div class="card">
        <div class="card-header"><h3>معلومات الشركة</h3></div>
        <div class="card-body">
          <form id="settingsForm">
            <div class="form-group"><label>اسم الشركة (عربي)</label><input id="sNameAr" value="${s.site_name_ar || 'زكريا بروم'}"></div>
            <div class="form-group"><label>اسم الشركة (إنجليزي)</label><input id="sNameEn" value="${s.site_name_en || 'Zakaria Prom'}"></div>
            <div class="form-group"><label>اسم الشركة (تركي)</label><input id="sNameTr" value="${s.site_name_tr || 'Zakaria Prom'}"></div>
            <div class="form-group"><label>الهاتف</label><input id="sPhone" value="${s.phone || '+905428104208'}"></div>
            <div class="form-group"><label>واتساب</label><input id="sWhatsapp" value="${s.whatsapp || '905428104208'}"></div>
            <div class="form-group"><label>البريد الإلكتروني</label><input id="sEmail" value="${s.email || 'info@zakariaprom.com'}"></div>
            <div class="form-group"><label>العنوان (عربي)</label><input id="sAddressAr" value="${s.address_ar || 'إسطنبول، تركيا'}"></div>
            <div class="form-group"><label>العنوان (إنجليزي)</label><input id="sAddressEn" value="${s.address_en || 'Istanbul, Turkey'}"></div>
            <button type="submit" class="btn-primary">حفظ الإعدادات</button>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>روابط التواصل الاجتماعي</h3></div>
        <div class="card-body">
          <form id="socialForm">
            <div class="form-group"><label>فيسبوك</label><input id="sFacebook" value="${s.facebook || ''}"></div>
            <div class="form-group"><label>إنستغرام</label><input id="sInstagram" value="${s.instagram || ''}"></div>
            <div class="form-group"><label>تويتر/X</label><input id="sTwitter" value="${s.twitter || ''}"></div>
            <div class="form-group"><label>لينكد إن</label><input id="sLinkedin" value="${s.linkedin || ''}"></div>
            <button type="submit" class="btn-primary">حفظ</button>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>إعدادات الموقع</h3></div>
        <div class="card-body">
          <form id="siteForm">
            <div class="form-group"><label>شعار البانر (عربي)</label><textarea id="sBannerAr" rows="2">${s.banner_text_ar || ''}</textarea></div>
            <div class="form-group"><label>شعار البانر (إنجليزي)</label><textarea id="sBannerEn" rows="2">${s.banner_text_en || ''}</textarea></div>
            <div class="form-group"><label>عملة الأسعار</label><input id="sCurrency" value="${s.currency || 'TL'}"></div>
            <button type="submit" class="btn-primary">حفظ</button>
          </form>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><h3>تغيير كلمة المرور</h3></div>
        <div class="card-body">
          <form id="passwordForm">
            <div class="form-group"><label>كلمة المرور الحالية</label><input type="password" id="spCurrent"></div>
            <div class="form-group"><label>كلمة المرور الجديدة</label><input type="password" id="spNew"></div>
            <div class="form-group"><label>تأكيد كلمة المرور</label><input type="password" id="spConfirm"></div>
            <button type="submit" class="btn-primary">تغيير</button>
          </form>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('settingsForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/settings', { method: 'PUT', body: {
      site_name_ar: document.getElementById('sNameAr').value,
      site_name_en: document.getElementById('sNameEn').value,
      site_name_tr: document.getElementById('sNameTr').value,
      phone: document.getElementById('sPhone').value,
      whatsapp: document.getElementById('sWhatsapp').value,
      email: document.getElementById('sEmail').value,
      address_ar: document.getElementById('sAddressAr').value,
      address_en: document.getElementById('sAddressEn').value
    }});
    toast('تم حفظ الإعدادات');
  };
  
  document.getElementById('socialForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/settings', { method: 'PUT', body: {
      facebook: document.getElementById('sFacebook').value,
      instagram: document.getElementById('sInstagram').value,
      twitter: document.getElementById('sTwitter').value,
      linkedin: document.getElementById('sLinkedin').value
    }});
    toast('تم حفظ الروابط');
  };
  
  document.getElementById('siteForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/settings', { method: 'PUT', body: {
      banner_text_ar: document.getElementById('sBannerAr').value,
      banner_text_en: document.getElementById('sBannerEn').value,
      currency: document.getElementById('sCurrency').value
    }});
    toast('تم حفظ إعدادات الموقع');
  };
  
  document.getElementById('passwordForm').onsubmit = async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('spNew').value;
    if (newPass !== document.getElementById('spConfirm').value) { toast('كلمات المرور غير متطابقة', 'error'); return; }
    const res = await api('/api/admin/change-password', { method: 'PUT', body: {
      current_password: document.getElementById('spCurrent').value,
      new_password: newPass
    }});
    if (res?.success) toast('تم تغيير كلمة المرور');
    else toast(res?.error || 'خطأ', 'error');
  };
}

// ========== HELPERS ==========
function getStatusLabel(status) {
  const labels = { new: 'جديد', processing: 'قيد المعالجة', quoted: 'تم التسعير', confirmed: 'مؤكد', completed: 'مكتمل', cancelled: 'ملغي' };
  return labels[status] || status;
}

function formatDate(d) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showModal(title, content) {
  let overlay = document.querySelector('.modal-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    document.body.appendChild(overlay);
  }
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-header"><h3>${title}</h3><button class="modal-close" onclick="closeModal()">&times;</button></div>
      <div class="modal-body">${content}</div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
}

window.closeModal = function() {
  const overlay = document.querySelector('.modal-overlay');
  if (overlay) overlay.classList.add('hidden');
};
