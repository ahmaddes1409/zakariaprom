// Admin Panel JavaScript - Zakaria Prom
// Fix Google Drive image URLs to direct links
function fixImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  url = url.trim();
  const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/);
  if (driveMatch) {
    return 'https://lh3.googleusercontent.com/d/' + driveMatch[1];
  }
  const driveIdMatch = url.match(/drive\.google\.com\/[a-zA-Z0-9_/?&=]+(?:id=|\/d\/)([a-zA-Z0-9_-]+)/);
  if (driveIdMatch) {
    return 'https://lh3.googleusercontent.com/d/' + driveIdMatch[1];
  }
  return url;
}
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
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.token) {
      token = data.token;
      localStorage.setItem('admin_token', token);
      showAdmin();
    } else {
      showLoginError(data.error || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  } catch (err) {
    showLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
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
    case 'banners': await renderBanners(); break;
    case 'staff': await renderStaff(); break;
    case 'currencies': await renderCurrencies(); break;
    case 'sync': await renderSyncSection(); break;
    case 'customProducts': await renderCustomProducts(); break;
  }
}

function getSectionTitle(s) {
  const titles = {
    dashboard: 'لوحة المعلومات', orders: 'الطلبات', products: 'المنتجات',
    categories: 'الفئات', translations: 'الترجمات', users: 'العملاء',
    coupons: 'كوبونات الخصم', posts: 'المدونة', chatbot: 'الشات بوت',
    analytics: 'الإحصائيات', sync: 'مزامنة وقاعدة البيانات', settings: 'الإعدادات',
    banners: 'البانرات', staff: 'الموظفين', currencies: 'العملات', customProducts: 'المنتجات المخصصة'
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
      <div class="stat-card"><div class="stat-icon blue"><i class="fas fa-box"></i></div><div class="stat-info"><h3>${(data.stats && data.stats.totalProducts) || 0}</h3><p>منتج</p></div></div>
      <div class="stat-card"><div class="stat-icon green"><i class="fas fa-tags"></i></div><div class="stat-info"><h3>${(data.stats && data.stats.totalCategories) || 0}</h3><p>فئة</p></div></div>
      <div class="stat-card"><div class="stat-icon orange"><i class="fas fa-shopping-bag"></i></div><div class="stat-info"><h3>${(data.stats && data.stats.totalOrders) || 0}</h3><p>طلب</p></div></div>
      <div class="stat-card"><div class="stat-icon purple"><i class="fas fa-users"></i></div><div class="stat-info"><h3>${(data.stats && data.stats.totalUsers) || 0}</h3><p>عميل مسجل</p></div></div>
      <div class="stat-card"><div class="stat-icon teal"><i class="fas fa-sync"></i></div><div class="stat-info"><h3>${(data.stats && data.stats.totalVisits) || 0}</h3><p>زيارة (30 يوم)</p></div></div>
      <div class="stat-card"><div class="stat-icon red"><i class="fas fa-clock"></i></div><div class="stat-info"><h3>${(data.stats && data.stats.newOrders) || 0}</h3><p>طلب جديد</p></div></div>
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
  const orders = (data && data.orders) || [];
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
// Products management is handled by products-admin-ui.js
// ========== CATEGORIES (UPDATED) ==========
async function renderCategories() {
  const data = await api('/api/admin/categories');
  const area = document.getElementById('contentArea');
  const cats = (data && data.categories) || [];
  
  area.innerHTML = `
    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <h3 style="margin:0;">الفئات (${cats.length})</h3>
        <button class="btn-primary btn-sm" onclick="addNewCategory()">+ إضافة فئة جديدة</button>
      </div>
      <div class="card-body">
        <div class="table-responsive">
          <table>
            <thead><tr><th>الفئة (تركي)</th><th>الفئة (عربي)</th><th>الفئة (إنجليزي)</th><th>عدد المنتجات</th><th>الحالة</th><th>إجراءات</th></tr></thead>
            <tbody>${cats.map(c => `
              <tr style="${c.hidden ? 'opacity:0.5;' : ''}">
                <td><strong>${c.tr}</strong></td>
                <td>${c.ar || c.tr}</td>
                <td>${c.en || c.tr}</td>
                <td><span class="badge">${c.count || 0}</span></td>
                <td>${c.hidden ? '<span class="status status-cancelled">مخفي</span>' : '<span class="status status-completed">ظاهر</span>'}</td>
                <td style="display:flex;gap:6px;flex-wrap:wrap;">
                  <button class="btn-secondary btn-sm" onclick="editCategory('${encodeURIComponent(c.tr)}')">تعديل</button>
                  <button class="btn-sm ${c.hidden ? 'btn-primary' : 'btn-danger'}" onclick="toggleCategoryVisibility('${encodeURIComponent(c.tr)}', ${!c.hidden})">${c.hidden ? 'إظهار' : 'إخفاء'}</button>
                  ${c.isCustom ? `<button class="btn-sm btn-danger" style="background:#e53e3e;color:#fff;" onclick="deleteCategory('${encodeURIComponent(c.tr)}')">حذف</button>` : ''}
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.deleteCategory = async function(catTr) {
  const cat = decodeURIComponent(catTr);
  if (!confirm(`هل أنت متأكد من حذف الفئة "${cat}" نهائياً من الموقع وقاعدة البيانات؟`)) return;
  const res = await api('/api/admin/categories/' + encodeURIComponent(cat), { method: 'DELETE' });
  if (res && res.error) {
    toast(res.error, 'error');
  } else {
    toast('تم حذف الفئة بنجاح');
    renderCategories();
  }
};

window.toggleCategoryVisibility = async function(catTr, hide) {
  const cat = decodeURIComponent(catTr);
  const confirmMsg = hide ? `هل تريد إخفاء الفئة "${cat}" من الموقع؟` : `هل تريد إظهار الفئة "${cat}" على الموقع؟`;
  if (!confirm(confirmMsg)) return;
  
  await api('/api/admin/categories', { method: 'PUT', body: {
    category_tr: cat,
    hidden: hide
  }});
  toast(hide ? 'تم إخفاء الفئة' : 'تم إظهار الفئة');
  renderCategories();
};

window.addNewCategory = function() {
  showModal('إضافة فئة جديدة', `
    <form id="addCatForm">
      <div class="form-group"><label>الاسم (تركي)</label><input id="ncTr" placeholder="Category name in Turkish" required></div>
      <div class="form-group"><label>الاسم (عربي)</label><input id="ncAr" placeholder="اسم الفئة بالعربي" required></div>
      <div class="form-group"><label>الاسم (إنجليزي)</label><input id="ncEn" placeholder="Category name in English"></div>
      <div class="form-group"><label>رابط صورة الفئة</label><input id="ncImage" placeholder="https://..."></div>
      <button type="submit" class="btn-primary">إضافة الفئة</button>
    </form>
  `);
  document.getElementById('addCatForm').onsubmit = async (e) => {
    e.preventDefault();
    const name_tr = document.getElementById('ncTr').value.trim();
    const name_ar = document.getElementById('ncAr').value.trim();
    const name_en = document.getElementById('ncEn').value.trim();
    const image_url = document.getElementById('ncImage').value.trim();
    if (!name_ar) return toast('الاسم بالعربي مطلوب', 'error');
    
    await api('/api/admin/custom-categories', { method: 'POST', body: {
      name_tr, name_ar, name_en, image_url, sort_order: 0
    }});
    toast('تم إضافة الفئة بنجاح');
    closeModal();
    renderCategories();
  };
};

window.editCustomCategory = async function(id) {
  const cats = await api('/api/admin/custom-categories') || [];
  const cat = cats.find(c => c.id === id);
  if (!cat) return toast('الفئة غير موجودة', 'error');
  
  showModal('تعديل الفئة المخصصة', `
    <form id="editCustomCatForm">
      <div class="form-group"><label>الاسم (تركي)</label><input id="eccTr" value="${cat.name_tr || ''}"></div>
      <div class="form-group"><label>الاسم (عربي)</label><input id="eccAr" value="${cat.name_ar || ''}" required></div>
      <div class="form-group"><label>الاسم (إنجليزي)</label><input id="eccEn" value="${cat.name_en || ''}"></div>
      <div class="form-group"><label>رابط صورة الفئة</label><input id="eccImage" value="${cat.image_url || ''}" placeholder="https://..."></div>
      <div class="form-group"><label>نشط</label><label class="toggle"><input type="checkbox" id="eccActive" ${cat.active ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  document.getElementById('editCustomCatForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/custom-categories/' + id, { method: 'PUT', body: {
      name_tr: document.getElementById('eccTr').value.trim(),
      name_ar: document.getElementById('eccAr').value.trim(),
      name_en: document.getElementById('eccEn').value.trim(),
      image_url: document.getElementById('eccImage').value.trim(),
      sort_order: cat.sort_order || 0,
      active: document.getElementById('eccActive').checked
    }});
    toast('تم حفظ التعديلات');
    closeModal();
    renderCategories();
  };
};

window.deleteCustomCategory = async function(id) {
  if (!confirm('هل تريد حذف هذه الفئة المخصصة نهائياً؟')) return;
  await api('/api/admin/custom-categories/' + id, { method: 'DELETE' });
  toast('تم حذف الفئة');
  renderCategories();
};

window.editCategory = async function(catTr) {
  const cat = decodeURIComponent(catTr);
  const data = await api(`/api/admin/categories/${encodeURIComponent(cat)}`);
  if (!data) return;
  const c = data.category;
  const isCustom = !!c.isCustom;
  showModal('تعديل الفئة', `
    <form id="editCatForm">
      <div class="form-group">
        <label>الاسم (تركي)</label>
        <input id="ecTr" value="${c.tr || cat}" ${isCustom ? '' : 'readonly style="background:#f0f4f8;"'}>
        ${isCustom ? '<small style="color:#718096;display:block;margin-top:4px;">فئة مخصصة: يمكنك تعديل الاسم بالتركي</small>' : ''}
      </div>
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
    const new_tr = document.getElementById('ecTr').value.trim();
    await api('/api/admin/categories', { method: 'PUT', body: {
      category_tr: cat,
      new_tr: isCustom ? new_tr : undefined,
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
  const cats = (data && data.categories) || [];
  const terms = (data && data.terms) || [];
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
  const search = (document.getElementById('productTransSearch') && document.getElementById('productTransSearch').value) || '';
  const data = await api(`/api/admin/translations/products?page=${page}&limit=20&search=${encodeURIComponent(search)}`);
  const products = (data && data.products) || [];
  const total = (data && data.total) || 0;
  const totalPages = (data && data.totalPages) || 1;
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
  const users = (data && data.users) || [];
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
  const coupons = Array.isArray(data) ? data : ((data && data.coupons) || []);
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
  const posts = Array.isArray(data) ? data : ((data && data.posts) || []);
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
  const responses = Array.isArray(data) ? data : ((data && data.responses) || []);
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
            <tr><td>${r.keywords}</td><td>${(r.answer_ar || '').substring(0,50)}...</td>
            <td>${(r.answer_en || '').substring(0,50)}...</td><td>${(r.answer_tr || '').substring(0,50)}...</td>
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
      answer_ar: document.getElementById('crAr').value,
      answer_en: document.getElementById('crEn').value,
      answer_tr: document.getElementById('crTr').value
    }});
    toast('تمت إضافة الرد');
    closeModal();
    renderChatbot();
  };
};

window.editChatResponse = async function(id) {
  const data = await api('/api/admin/chatbot');
  const responses = Array.isArray(data) ? data : ((data && data.responses) || []);
  const r = responses.find(x => x.id === id);
  if (!r) return toast('لم يتم العثور على الرد');
  showModal('تعديل رد الشات بوت', `
    <form id="editChatForm">
      <div class="form-group"><label>الكلمات المفتاحية (مفصولة بفاصلة)</label><input id="ecKeywords" value="${r.keywords || ''}" required></div>
      <div class="form-group"><label>الرد (عربي)</label><textarea id="ecAr" rows="3">${r.answer_ar || ''}</textarea></div>
      <div class="form-group"><label>الرد (إنجليزي)</label><textarea id="ecEn" rows="3">${r.answer_en || ''}</textarea></div>
      <div class="form-group"><label>الرد (تركي)</label><textarea id="ecTr" rows="3">${r.answer_tr || ''}</textarea></div>
      <button type="submit" class="btn-primary">حفظ التعديلات</button>
    </form>
  `);
  document.getElementById('editChatForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/chatbot/' + id, { method: 'PUT', body: {
      keywords: document.getElementById('ecKeywords').value,
      answer_ar: document.getElementById('ecAr').value,
      answer_en: document.getElementById('ecEn').value,
      answer_tr: document.getElementById('ecTr').value,
      priority: r.priority || 0,
      active: 1
    }});
    toast('تم تحديث الرد');
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
            <div class="form-group"><label>فيسبوك</label><input id="sFacebook" value="${s.social_facebook || ''}"></div>
            <div class="form-group"><label>إنستغرام</label><input id="sInstagram" value="${s.social_instagram || ''}"></div>
            <div class="form-group"><label>تويتر/X</label><input id="sTwitter" value="${s.social_twitter || ''}"></div>
            <div class="form-group"><label>لينكد إن</label><input id="sLinkedin" value="${s.social_linkedin || ''}"></div>
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
        <div class="card-header"><h3>اللوغو والعلامة التجارية</h3></div>
        <div class="card-body">
          <form id="logoForm">
            <div class="form-group">
              <label>نوع اللوغو</label>
              <select id="sLogoType">
                <option value="text" ${s.logo_type === 'image' ? '' : 'selected'}>نص (حروف)</option>
                <option value="image" ${s.logo_type === 'image' ? 'selected' : ''}>صورة</option>
              </select>
            </div>
            <div class="form-group" id="logoTextGroup">
              <label>نص اللوغو (حرف أو حرفين)</label>
              <input id="sLogoText" value="${s.logo_text || 'مز'}" maxlength="4">
            </div>
            <div class="form-group" id="logoUrlGroup" style="display:${s.logo_type === 'image' ? 'block' : 'none'}">
              <label>رابط صورة اللوغو</label>
              <input id="sLogoUrl" value="${s.logo_url || ''}" placeholder="https://...">
            </div>
            <button type="submit" class="btn-primary">حفظ اللوغو</button>
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
      social_facebook: document.getElementById('sFacebook').value,
      social_instagram: document.getElementById('sInstagram').value,
      social_twitter: document.getElementById('sTwitter').value,
      social_linkedin: document.getElementById('sLinkedin').value
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
  
  // Logo form
  const logoTypeSelect = document.getElementById('sLogoType');
  logoTypeSelect.addEventListener('change', () => {
    document.getElementById('logoTextGroup').style.display = logoTypeSelect.value === 'text' ? 'block' : 'none';
    document.getElementById('logoUrlGroup').style.display = logoTypeSelect.value === 'image' ? 'block' : 'none';
  });
  document.getElementById('logoForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/settings', { method: 'PUT', body: {
      logo_type: document.getElementById('sLogoType').value,
      logo_text: document.getElementById('sLogoText').value,
      logo_url: document.getElementById('sLogoUrl').value
    }});
    toast('تم حفظ اللوغو');
  };
  
  document.getElementById('passwordForm').onsubmit = async (e) => {
    e.preventDefault();
    const newPass = document.getElementById('spNew').value;
    if (newPass !== document.getElementById('spConfirm').value) { toast('كلمات المرور غير متطابقة', 'error'); return; }
    const res = await api('/api/admin/change-password', { method: 'PUT', body: {
      current_password: document.getElementById('spCurrent').value,
      new_password: newPass
    }});
    if ((res && res.success)) toast('تم تغيير كلمة المرور');
    else toast((res && res.error) || 'خطأ', 'error');
  };
}

// ========== BANNERS ==========
async function renderBanners() {
  const banners = await api('/api/admin/banners') || [];
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="filters-bar">
      <button class="btn-primary" onclick="addBanner()"><i class="fas fa-plus"></i> إضافة بانر</button>
      <span style="color:var(--text-muted);">${banners.length} بانر</span>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr><th>الصورة</th><th>العنوان (عربي)</th><th>الرابط</th><th>الترتيب</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>${banners.map(b => `
            <tr>
              <td><img src="${fixImageUrl(b.image_url)}" style="width:80px;height:40px;object-fit:cover;border-radius:4px;" onerror="this.style.display='none'"></td>
              <td>${b.title_ar || '-'}</td>
              <td>${b.link || '-'}</td>
              <td>${b.sort_order || 0}</td>
              <td>${b.active ? '<span class="status status-completed">نشط</span>' : '<span class="status status-cancelled">معطل</span>'}</td>
              <td>
                <button class="btn-secondary btn-sm" onclick="editBanner(${b.id})">تعديل</button>
                <button class="btn-danger btn-sm" onclick="deleteBanner(${b.id})">حذف</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.addBanner = function() {
  showModal('إضافة بانر جديد', `
    <form id="bannerForm">
      <div class="form-group"><label>العنوان (عربي)</label><input id="bTitleAr"></div>
      <div class="form-group"><label>العنوان (إنجليزي)</label><input id="bTitleEn"></div>
      <div class="form-group"><label>العنوان (تركي)</label><input id="bTitleTr"></div>
      <div class="form-group"><label>الوصف (عربي)</label><input id="bSubAr"></div>
      <div class="form-group"><label>الوصف (إنجليزي)</label><input id="bSubEn"></div>
      <div class="form-group"><label>الوصف (تركي)</label><input id="bSubTr"></div>
      <div class="form-group"><label>رابط الصورة *</label><input id="bImage" required placeholder="https://..."></div>
      <div class="form-group"><label>رابط الزر</label><input id="bLink" placeholder="/category/..."></div>
      <div class="form-group"><label>الترتيب</label><input type="number" id="bOrder" value="0"></div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  document.getElementById('bannerForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/banners', { method: 'POST', body: {
      title_ar: document.getElementById('bTitleAr').value,
      title_en: document.getElementById('bTitleEn').value,
      title_tr: document.getElementById('bTitleTr').value,
      subtitle_ar: document.getElementById('bSubAr').value,
      subtitle_en: document.getElementById('bSubEn').value,
      subtitle_tr: document.getElementById('bSubTr').value,
      image_url: document.getElementById('bImage').value,
      link: document.getElementById('bLink').value,
      sort_order: parseInt(document.getElementById('bOrder').value) || 0
    }});
    toast('تم إضافة البانر');
    closeModal();
    renderBanners();
  };
};

window.editBanner = async function(id) {
  const banners = await api('/api/admin/banners') || [];
  const b = banners.find(x => x.id === id);
  if (!b) return;
  showModal('تعديل البانر', `
    <form id="bannerForm">
      <div class="form-group"><label>العنوان (عربي)</label><input id="bTitleAr" value="${b.title_ar || ''}"></div>
      <div class="form-group"><label>العنوان (إنجليزي)</label><input id="bTitleEn" value="${b.title_en || ''}"></div>
      <div class="form-group"><label>العنوان (تركي)</label><input id="bTitleTr" value="${b.title_tr || ''}"></div>
      <div class="form-group"><label>الوصف (عربي)</label><input id="bSubAr" value="${b.subtitle_ar || ''}"></div>
      <div class="form-group"><label>الوصف (إنجليزي)</label><input id="bSubEn" value="${b.subtitle_en || ''}"></div>
      <div class="form-group"><label>الوصف (تركي)</label><input id="bSubTr" value="${b.subtitle_tr || ''}"></div>
      <div class="form-group"><label>رابط الصورة *</label><input id="bImage" value="${b.image_url || ''}" required></div>
      <div class="form-group"><label>رابط الزر</label><input id="bLink" value="${b.link || ''}"></div>
      <div class="form-group"><label>الترتيب</label><input type="number" id="bOrder" value="${b.sort_order || 0}"></div>
      <div class="form-group"><label>نشط</label><label class="toggle"><input type="checkbox" id="bActive" ${b.active ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  document.getElementById('bannerForm').onsubmit = async (e) => {
    e.preventDefault();
    await api(`/api/admin/banners/${id}`, { method: 'PUT', body: {
      title_ar: document.getElementById('bTitleAr').value,
      title_en: document.getElementById('bTitleEn').value,
      title_tr: document.getElementById('bTitleTr').value,
      subtitle_ar: document.getElementById('bSubAr').value,
      subtitle_en: document.getElementById('bSubEn').value,
      subtitle_tr: document.getElementById('bSubTr').value,
      image_url: document.getElementById('bImage').value,
      link: document.getElementById('bLink').value,
      sort_order: parseInt(document.getElementById('bOrder').value) || 0,
      active: document.getElementById('bActive').checked
    }});
    toast('تم تعديل البانر');
    closeModal();
    renderBanners();
  };
};

window.deleteBanner = async function(id) {
  if (!confirm('هل تريد حذف هذا البانر؟')) return;
  await api(`/api/admin/banners/${id}`, { method: 'DELETE' });
  toast('تم حذف البانر');
  renderBanners();
};

// ========== STAFF ==========
async function renderStaff() {
  const staff = await api('/api/admin/staff') || [];
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="filters-bar">
      <button class="btn-primary" onclick="addStaff()"><i class="fas fa-plus"></i> إضافة موظف</button>
      <span style="color:var(--text-muted);">${staff.length} موظف</span>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr><th>الاسم</th><th>اسم المستخدم</th><th>الدور</th><th>الحالة</th><th>إجراءات</th></tr></thead>
          <tbody>${staff.map(s => `
            <tr>
              <td>${s.name}</td>
              <td>${s.username}</td>
              <td>${s.role === 'editor' ? 'محرر' : s.role === 'viewer' ? 'مشاهد' : s.role}</td>
              <td>${s.active ? '<span class="status status-completed">نشط</span>' : '<span class="status status-cancelled">معطل</span>'}</td>
              <td>
                <button class="btn-secondary btn-sm" onclick="editStaff(${s.id})">تعديل</button>
                <button class="btn-danger btn-sm" onclick="deleteStaff(${s.id})">حذف</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

window.addStaff = function() {
  showModal('إضافة موظف جديد', `
    <form id="staffForm">
      <div class="form-group"><label>الاسم *</label><input id="stName" required></div>
      <div class="form-group"><label>اسم المستخدم *</label><input id="stUsername" required></div>
      <div class="form-group"><label>كلمة المرور *</label><input type="password" id="stPassword" required></div>
      <div class="form-group"><label>الدور</label><select id="stRole"><option value="editor">محرر (تعديل منتجات وطلبات)</option><option value="viewer">مشاهد (عرض فقط)</option></select></div>
      <div class="form-group"><label>الصلاحيات</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <label><input type="checkbox" class="perm" value="products"> المنتجات</label>
          <label><input type="checkbox" class="perm" value="orders"> الطلبات</label>
          <label><input type="checkbox" class="perm" value="categories"> الفئات</label>
          <label><input type="checkbox" class="perm" value="translations"> الترجمات</label>
          <label><input type="checkbox" class="perm" value="users"> العملاء</label>
          <label><input type="checkbox" class="perm" value="coupons"> الكوبونات</label>
          <label><input type="checkbox" class="perm" value="banners"> البانرات</label>
        </div>
      </div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  document.getElementById('staffForm').onsubmit = async (e) => {
    e.preventDefault();
    const perms = {};
    document.querySelectorAll('.perm:checked').forEach(c => { perms[c.value] = true; });
    await api('/api/admin/staff', { method: 'POST', body: {
      name: document.getElementById('stName').value,
      username: document.getElementById('stUsername').value,
      password: document.getElementById('stPassword').value,
      role: document.getElementById('stRole').value,
      permissions: perms
    }});
    toast('تم إضافة الموظف');
    closeModal();
    renderStaff();
  };
};

window.editStaff = async function(id) {
  const staff = await api('/api/admin/staff') || [];
  const s = staff.find(x => x.id === id);
  if (!s) return;
  const perms = typeof s.permissions === 'string' ? JSON.parse(s.permissions || '{}') : (s.permissions || {});
  showModal('تعديل الموظف', `
    <form id="staffForm">
      <div class="form-group"><label>الاسم</label><input id="stName" value="${s.name}"></div>
      <div class="form-group"><label>كلمة مرور جديدة (اترك فارغاً لعدم التغيير)</label><input type="password" id="stPassword"></div>
      <div class="form-group"><label>الدور</label><select id="stRole"><option value="editor" ${s.role==='editor'?'selected':''}>محرر</option><option value="viewer" ${s.role==='viewer'?'selected':''}>مشاهد</option></select></div>
      <div class="form-group"><label>نشط</label><label class="toggle"><input type="checkbox" id="stActive" ${s.active ? 'checked' : ''}><span class="toggle-slider"></span></label></div>
      <div class="form-group"><label>الصلاحيات</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;">
          <label><input type="checkbox" class="perm" value="products" ${perms.products?'checked':''}> المنتجات</label>
          <label><input type="checkbox" class="perm" value="orders" ${perms.orders?'checked':''}> الطلبات</label>
          <label><input type="checkbox" class="perm" value="categories" ${perms.categories?'checked':''}> الفئات</label>
          <label><input type="checkbox" class="perm" value="translations" ${perms.translations?'checked':''}> الترجمات</label>
          <label><input type="checkbox" class="perm" value="users" ${perms.users?'checked':''}> العملاء</label>
          <label><input type="checkbox" class="perm" value="coupons" ${perms.coupons?'checked':''}> الكوبونات</label>
          <label><input type="checkbox" class="perm" value="banners" ${perms.banners?'checked':''}> البانرات</label>
        </div>
      </div>
      <button type="submit" class="btn-primary">حفظ</button>
    </form>
  `);
  document.getElementById('staffForm').onsubmit = async (e) => {
    e.preventDefault();
    const permsObj = {};
    document.querySelectorAll('.perm:checked').forEach(c => { permsObj[c.value] = true; });
    const body = {
      name: document.getElementById('stName').value,
      role: document.getElementById('stRole').value,
      active: document.getElementById('stActive').checked,
      permissions: permsObj
    };
    const pw = document.getElementById('stPassword').value;
    if (pw) body.password = pw;
    await api(`/api/admin/staff/${id}`, { method: 'PUT', body });
    toast('تم تعديل الموظف');
    closeModal();
    renderStaff();
  };
};

window.deleteStaff = async function(id) {
  if (!confirm('هل تريد حذف هذا الموظف؟')) return;
  await api(`/api/admin/staff/${id}`, { method: 'DELETE' });
  toast('تم حذف الموظف');
  renderStaff();
};

// ========== CURRENCIES ==========
async function renderCurrencies() {
  const currencies = await api('/api/admin/currencies') || [];
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="card">
      <div class="card-header"><h3>إدارة العملات وأسعار الصرف</h3></div>
      <div class="card-body">
        <p style="color:var(--text-muted);margin-bottom:16px;">الأسعار الأساسية بالليرة التركية. أدخل سعر الصرف لكل عملة (1 TRY = X عملة).</p>
        <form id="currenciesForm">
          <div class="table-responsive">
            <table>
              <thead><tr><th>الرمز</th><th>الاسم</th><th>الرمز</th><th>سعر الصرف (1 TRY =)</th><th>نشط</th></tr></thead>
              <tbody>${currencies.map(c => `
                <tr>
                  <td><strong>${c.code}</strong></td>
                  <td>${c.name_ar || c.name_en || c.code}</td>
                  <td>${c.symbol}</td>
                  <td><input type="number" step="0.0001" class="curr-rate" data-code="${c.code}" value="${c.rate_from_try}" style="width:120px;"></td>
                  <td><label class="toggle"><input type="checkbox" class="curr-active" data-code="${c.code}" ${c.active ? 'checked' : ''}><span class="toggle-slider"></span></label></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
          <button type="submit" class="btn-primary" style="margin-top:16px;">حفظ أسعار الصرف</button>
        </form>
      </div>
    </div>
    <div class="card" style="margin-top:16px;">
      <div class="card-header"><h3>إضافة عملة جديدة</h3></div>
      <div class="card-body">
        <form id="addCurrencyForm" style="display:flex;gap:8px;flex-wrap:wrap;align-items:end;">
          <div class="form-group"><label>الرمز</label><input id="ncCode" placeholder="EUR" style="width:80px;"></div>
          <div class="form-group"><label>الاسم (عربي)</label><input id="ncNameAr" placeholder="يورو"></div>
          <div class="form-group"><label>الرمز</label><input id="ncSymbol" placeholder="€" style="width:60px;"></div>
          <div class="form-group"><label>سعر الصرف</label><input type="number" step="0.0001" id="ncRate" value="1" style="width:100px;"></div>
          <button type="submit" class="btn-primary">إضافة</button>
        </form>
      </div>
    </div>
  `;
  document.getElementById('currenciesForm').onsubmit = async (e) => {
    e.preventDefault();
    const currArr = [];
    document.querySelectorAll('.curr-rate').forEach(el => {
      currArr.push({
        code: el.dataset.code,
        rate_from_try: parseFloat(el.value) || 1,
        active: document.querySelector(`.curr-active[data-code="${el.dataset.code}"]`).checked
      });
    });
    await api('/api/admin/currencies', { method: 'PUT', body: { currencies: currArr } });
    toast('تم حفظ أسعار الصرف');
  };
  document.getElementById('addCurrencyForm').onsubmit = async (e) => {
    e.preventDefault();
    await api('/api/admin/currencies', { method: 'POST', body: {
      code: document.getElementById('ncCode').value,
      name_ar: document.getElementById('ncNameAr').value,
      symbol: document.getElementById('ncSymbol').value,
      rate_from_try: parseFloat(document.getElementById('ncRate').value) || 1
    }});
    toast('تم إضافة العملة');
    renderCurrencies();
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

// ========== SYNC & DATABASE SECTION ==========
async function renderSyncSection() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div class="card" style="margin-bottom:20px;">
      <div class="card-header"><h3><i class="fas fa-sync text-primary"></i> مزامنة خلاصات المنتجات</h3></div>
      <div class="card-body">
        <p style="color:var(--text-muted);margin-bottom:15px;">قم بتحديث خلاصات المنتجات فوراً من مصادرها الرسمية وتحديث الأسعار والكميات في قاعدة البيانات الدائمة.</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <button class="btn-primary" id="btnSyncXmlLive" onclick="triggerAdminXmlSync()">
            <i class="fas fa-file-excel"></i> مزامنة خلاصة Karmedya XML الحية
          </button>
          <button class="btn-secondary" id="btnSyncAllLive" onclick="triggerAdminAllSync()">
            <i class="fas fa-sync-alt"></i> مزامنة جميع المصادر (XML + Etkin API)
          </button>
        </div>
        <div id="syncResult" style="margin-top:15px;"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <h3><i class="fas fa-database text-warning"></i> فحص واستعادة النسخ الاحتياطية للسيرفر</h3>
        <button class="btn-secondary btn-sm" onclick="inspectDatabases()"><i class="fas fa-search"></i> فحص السيرفر الآن</button>
      </div>
      <div class="card-body">
        <div id="dbInspectStatus">
          <p style="color:var(--text-muted);">انقر على زر الفحص للبحث في مجلدات السيرفر عن أي نسخ سابقة لقاعدة البيانات أو تعديلات سابقة.</p>
        </div>
        <div id="dbInspectList" style="margin-top:15px;"></div>
      </div>
    </div>
  `;
}

window.triggerAdminXmlSync = async function() {
  const btn = document.getElementById('btnSyncXmlLive');
  const resultDiv = document.getElementById('syncResult');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري مزامنة XML...'; }
  if (resultDiv) resultDiv.innerHTML = '<div style="padding:10px;background:#e0f2fe;color:#0369a1;border-radius:6px;">جاري جلب ملف XML وتحليله وتحديث المنتجات...</div>';
  try {
    const res = await api('/api/admin/sync-karmedya-xml', { method: 'POST' });
    if (res && res.success) {
      resultDiv.innerHTML = `<div style="padding:10px;background:#ecfdf5;color:#047857;border-radius:6px;">
        <strong>نجحت المزامنة!</strong> تم تحديث ${res.inserted} منتج (إجمالي منتجات Karmedya: ${res.xml}، الإجمالي الكلي: ${res.total}).
      </div>`;
    } else {
      resultDiv.innerHTML = `<div style="padding:10px;background:#fef2f2;color:#b91c1c;border-radius:6px;">
        فشلت المزامنة: ${res?.error || 'خطأ غير معروف'}
      </div>`;
    }
  } catch(e) {
    if (resultDiv) resultDiv.innerHTML = `<div style="padding:10px;background:#fef2f2;color:#b91c1c;border-radius:6px;">خطأ: ${e.message}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-file-excel"></i> مزامنة خلاصة Karmedya XML الحية'; }
  }
};

window.triggerAdminAllSync = async function() {
  const btn = document.getElementById('btnSyncAllLive');
  const resultDiv = document.getElementById('syncResult');
  if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري مزامنة جميع المصادر...'; }
  if (resultDiv) resultDiv.innerHTML = '<div style="padding:10px;background:#e0f2fe;color:#0369a1;border-radius:6px;">جاري مزامنة خلاصة Karmedya وخلاصة Etkin...</div>';
  try {
    const res = await api('/api/admin/sync-all-feeds', { method: 'POST' });
    if (res && res.success) {
      resultDiv.innerHTML = `<div style="padding:10px;background:#ecfdf5;color:#047857;border-radius:6px;">
        <strong>تمت المزامنة بنجاح!</strong> إجمالي المنتجات: ${res.dbCounts?.total || 0} (Karmedya: ${res.dbCounts?.xml || 0}, Etkin: ${res.dbCounts?.etkin || 0}).
      </div>`;
    } else {
      resultDiv.innerHTML = `<div style="padding:10px;background:#fef2f2;color:#b91c1c;border-radius:6px;">
        فشلت المزامنة: ${res?.error || 'خطأ'}
      </div>`;
    }
  } catch(e) {
    if (resultDiv) resultDiv.innerHTML = `<div style="padding:10px;background:#fef2f2;color:#b91c1c;border-radius:6px;">خطأ: ${e.message}</div>`;
  } finally {
    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fas fa-sync-alt"></i> مزامنة جميع المصادر (XML + Etkin API)'; }
  }
};

window.inspectDatabases = async function() {
  const statusDiv = document.getElementById('dbInspectStatus');
  const listDiv = document.getElementById('dbInspectList');
  if (statusDiv) statusDiv.innerHTML = '<p><i class="fas fa-spinner fa-spin"></i> جاري البحث في مسارات السيرفر...</p>';
  try {
    const res = await api('/api/admin/inspect-server-databases');
    if (res && res.success) {
      statusDiv.innerHTML = `<p><strong>قاعدة البيانات النشطة الحالية:</strong> <code>${res.currentActiveDbPath}</code><br>تم العثور على <strong>${res.databasesFoundCount}</strong> ملف قاعدة بيانات.</p>`;
      const dbs = res.databases || [];
      if (dbs.length === 0) {
        listDiv.innerHTML = '<p>لا توجد نسخ احتياطية إضافية.</p>';
        return;
      }
      listDiv.innerHTML = `
        <div class="table-responsive">
          <table>
            <thead>
              <tr>
                <th>المسار</th>
                <th>الحجم</th>
                <th>تاريخ التعديل</th>
                <th>المنتجات</th>
                <th>الترجمات</th>
                <th>الفئات</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              ${dbs.map(d => `
                <tr ${d.path === res.currentActiveDbPath ? 'style="background:#f0fdf4;"' : ''}>
                  <td style="font-size:12px;direction:ltr;text-align:left;">
                    ${d.path} ${d.path === res.currentActiveDbPath ? '<span class="badge" style="background:#22c55e;color:#fff;padding:2px 6px;border-radius:4px;">نشطة</span>' : ''}
                  </td>
                  <td>${(d.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                  <td>${new Date(d.modifiedAt).toLocaleString('ar-EG')}</td>
                  <td>${d.localProductsTotal || 0}</td>
                  <td>${d.translationOverridesCount || 0}</td>
                  <td>${d.customCategoriesCount || 0}</td>
                  <td>
                    ${d.path !== res.currentActiveDbPath ? `
                      <button class="btn-primary btn-sm" onclick="mergeAmendmentsFrom('${encodeURIComponent(d.path)}')">دمج التعديلات</button>
                    ` : '<span style="color:#22c55e;font-weight:bold;">الحالية</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      statusDiv.innerHTML = `<p style="color:var(--danger);">فشل الفحص: ${res?.error || 'خطأ'}</p>`;
    }
  } catch(e) {
    if (statusDiv) statusDiv.innerHTML = `<p style="color:var(--danger);">خطأ: ${e.message}</p>`;
  }
};

window.mergeAmendmentsFrom = async function(encPath) {
  const sourcePath = decodeURIComponent(encPath);
  if (!confirm(`هل أنت متأكد من دمج التعديلات (الترجمات، الفئات، البنرات) من:\n${sourcePath}\nإلى قاعدة البيانات النشطة؟`)) return;
  try {
    const res = await api('/api/admin/merge-amendments', {
      method: 'POST',
      body: { sourcePath }
    });
    if (res && res.success) {
      alert(`تم دمج التعديلات بنجاح!\nالترجمات المدمجة: ${res.stats?.translationsMerged || 0}\nالفئات المدمجة: ${res.stats?.categoriesMerged || 0}\nالبنرات المدمجة: ${res.stats?.bannersMerged || 0}`);
      inspectDatabases();
    } else {
      alert('فشل الدمج: ' + (res?.error || 'خطأ'));
    }
  } catch(e) {
    alert('خطأ أثناء الدمج: ' + e.message);
  }
};
