// ========== Enhanced Products Management UI ==========
// This replaces the renderProducts function and adds new product management features

let productsPage = 1;
let localProductsPage = 1;
let currentProductsTab = 'xml'; // 'xml' or 'local'

async function renderProducts() {
  const area = document.getElementById('contentArea');
  area.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:20px;align-items:center;flex-wrap:wrap;">
      <h2 style="margin:0;">إدارة المنتجات</h2>
      <div style="flex:1;"></div>
      <button class="btn-primary" onclick="showAddProductModal()">
        <i class="fas fa-plus"></i> إضافة منتج جديد
      </button>
    </div>
    <div class="tabs" style="margin-bottom:20px;">
      <button class="tab ${currentProductsTab === 'xml' ? 'active' : ''}" onclick="currentProductsTab='xml';renderProducts()">منتجات XML (${await getXmlProductCount()})</button>
      <button class="tab ${currentProductsTab === 'local' ? 'active' : ''}" onclick="currentProductsTab='local';renderProducts()">منتجات مضافة يدوياً</button>
    </div>
    <div id="productsContent"></div>
  `;
  if (currentProductsTab === 'xml') {
    await renderXmlProducts();
  } else {
    await renderLocalProducts();
  }
}

async function getXmlProductCount() {
  try {
    const data = await api('/api/admin/products?limit=1');
    return data?.total || 0;
  } catch(e) { return 0; }
}

async function renderXmlProducts() {
  const data = await api(`/api/admin/products?page=${productsPage}&limit=20`);
  const products = data?.products || [];
  const total = data?.total || 0;
  const categories = await api('/api/admin/categories');
  const catList = categories?.categories || [];

  document.getElementById('productsContent').innerHTML = `
    <div class="filters-bar" style="display:flex;gap:10px;margin-bottom:15px;flex-wrap:wrap;">
      <input type="text" placeholder="بحث بالاسم أو الموديل..." id="productSearch" style="flex:1;min-width:200px;">
      <select id="categoryFilter" style="min-width:150px;">
        <option value="">كل الفئات</option>
        ${catList.map(c => `<option value="${c.tr}">${c.tr}</option>`).join('')}
      </select>
      <button class="btn-primary" onclick="searchAdminProducts()">بحث</button>
      <span style="color:var(--text-muted);align-self:center;">${total} منتج</span>
    </div>
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr>
            <th>صورة</th>
            <th>الاسم (تركي)</th>
            <th>الاسم (عربي)</th>
            <th>الفئة</th>
            <th>الموديل</th>
            <th>السعر</th>
            <th>الكمية</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr></thead>
          <tbody id="productsTable">${products.map(p => renderXmlProductRow(p)).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="pagination" style="display:flex;gap:10px;justify-content:center;align-items:center;margin-top:15px;">
      <button class="btn-secondary" onclick="productsPage--;renderProducts()" ${productsPage <= 1 ? 'disabled' : ''}>السابق</button>
      <span>صفحة ${productsPage} من ${Math.ceil(total/20)}</span>
      <button class="btn-secondary" onclick="productsPage++;renderProducts()" ${productsPage >= Math.ceil(total/20) ? 'disabled' : ''}>التالي</button>
    </div>
  `;
}

function renderXmlProductRow(p) {
  const category = p.topCategory?.tr || p.categories?.tr?.[0]?.split(' > ')[0] || '-';
  return `
    <tr>
      <td><img src="${p.images?.[0] || ''}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'"></td>
      <td>${p.name?.tr || ''}</td>
      <td>${p.name?.ar || ''}</td>
      <td><span class="badge" style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:4px;font-size:12px;">${category}</span></td>
      <td>${p.model || ''}</td>
      <td>${p.price ? p.price + ' TL' : '-'}</td>
      <td>${p.quantity || 0}</td>
      <td>${p.hidden ? '<span class="status status-cancelled">مخفي</span>' : '<span class="status status-completed">ظاهر</span>'}</td>
      <td style="white-space:nowrap;">
        <button class="btn-secondary btn-sm" onclick="editProduct('${p.id}')">تعديل</button>
        <button class="btn-sm" style="background:var(--warning);color:#fff;" onclick="changeCategoryModal('${p.id}','${p.model}','${category}')">نقل</button>
        <button class="btn-sm ${p.hidden ? 'btn-success' : 'btn-danger'}" onclick="toggleProduct('${p.model || p.id}', ${!p.hidden})">${p.hidden ? 'إظهار' : 'إخفاء'}</button>
      </td>
    </tr>`;
}

async function renderLocalProducts() {
  const data = await api(`/api/admin/local-products?page=${localProductsPage}&limit=20`);
  const products = data?.products || [];
  const total = data?.total || 0;

  document.getElementById('productsContent').innerHTML = `
    <div class="filters-bar" style="display:flex;gap:10px;margin-bottom:15px;">
      <input type="text" placeholder="بحث..." id="localProductSearch" style="flex:1;">
      <button class="btn-primary" onclick="searchLocalProducts()">بحث</button>
      <span style="color:var(--text-muted);align-self:center;">${total} منتج</span>
    </div>
    ${products.length === 0 ? '<div class="card" style="text-align:center;padding:40px;"><p style="color:var(--text-muted);">لا توجد منتجات مضافة يدوياً بعد</p><button class="btn-primary" onclick="showAddProductModal()">إضافة أول منتج</button></div>' : `
    <div class="card">
      <div class="table-responsive">
        <table>
          <thead><tr>
            <th>صورة</th>
            <th>الاسم (تركي)</th>
            <th>الاسم (عربي)</th>
            <th>الفئة</th>
            <th>السعر</th>
            <th>الحالة</th>
            <th>إجراءات</th>
          </tr></thead>
          <tbody>${products.map(p => `
            <tr>
              <td><img src="${p.images?.[0] || ''}" style="width:40px;height:40px;object-fit:cover;border-radius:6px;" onerror="this.style.display='none'"></td>
              <td>${p.name_tr || ''}</td>
              <td>${p.name_ar || ''}</td>
              <td><span class="badge" style="background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:4px;font-size:12px;">${p.category_tr || '-'}</span></td>
              <td>${p.price ? p.price + ' TL' : '-'}</td>
              <td>${p.hidden ? '<span class="status status-cancelled">مخفي</span>' : '<span class="status status-completed">ظاهر</span>'}</td>
              <td style="white-space:nowrap;">
                <button class="btn-secondary btn-sm" onclick="editLocalProduct(${p.id})">تعديل</button>
                <button class="btn-sm ${p.hidden ? 'btn-success' : 'btn-danger'}" onclick="toggleLocalProduct(${p.id}, ${!p.hidden})">${p.hidden ? 'إظهار' : 'إخفاء'}</button>
                <button class="btn-sm btn-danger" onclick="deleteLocalProduct(${p.id})">حذف</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="pagination" style="display:flex;gap:10px;justify-content:center;align-items:center;margin-top:15px;">
      <button class="btn-secondary" onclick="localProductsPage--;renderProducts()" ${localProductsPage <= 1 ? 'disabled' : ''}>السابق</button>
      <span>صفحة ${localProductsPage} من ${Math.ceil(total/20)}</span>
      <button class="btn-secondary" onclick="localProductsPage++;renderProducts()" ${localProductsPage >= Math.ceil(total/20) ? 'disabled' : ''}>التالي</button>
    </div>`}
  `;
}

// ========== ADD PRODUCT MODAL ==========
window.showAddProductModal = async function() {
  const categories = await api('/api/admin/categories');
  const catList = categories?.categories || [];

  showModal('إضافة منتج جديد', `
    <form id="addProductForm" enctype="multipart/form-data">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
        <div class="form-group"><label>الاسم (تركي) *</label><input id="apNameTr" required></div>
        <div class="form-group"><label>الاسم (عربي)</label><input id="apNameAr"></div>
        <div class="form-group"><label>الاسم (إنجليزي)</label><input id="apNameEn"></div>
        <div class="form-group"><label>الموديل</label><input id="apModel"></div>
        <div class="form-group"><label>السعر (TL)</label><input type="number" step="0.01" id="apPrice" value="0"></div>
        <div class="form-group"><label>الكمية</label><input type="number" id="apQuantity" value="0"></div>
        <div class="form-group">
          <label>الفئة *</label>
          <select id="apCategory">
            <option value="">اختر فئة...</option>
            ${catList.map(c => `<option value="${c.tr}" data-ar="${c.ar || ''}" data-en="${c.en || ''}">${c.tr} (${c.ar || c.tr})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>فئة جديدة (إذا غير موجودة)</label><input id="apNewCategory" placeholder="اسم الفئة بالتركي"></div>
      </div>
      <div class="form-group"><label>الوصف</label><textarea id="apDescription" rows="3" style="width:100%;"></textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
        <div class="form-group"><label>الألوان (مفصولة بفاصلة)</label><input id="apColors" placeholder="أحمر, أزرق, أخضر"></div>
        <div class="form-group"><label>المقاسات (مفصولة بفاصلة)</label><input id="apSizes" placeholder="S, M, L, XL"></div>
      </div>
      <div class="form-group">
        <label>الصور</label>
        <input type="file" id="apImages" multiple accept="image/*">
        <small style="color:var(--text-muted);">يمكنك اختيار عدة صور (حتى 10)</small>
      </div>
      <button type="submit" class="btn-primary" style="width:100%;margin-top:15px;">إضافة المنتج</button>
    </form>
  `);

  document.getElementById('addProductForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name_tr', document.getElementById('apNameTr').value);
    formData.append('name_ar', document.getElementById('apNameAr').value);
    formData.append('name_en', document.getElementById('apNameEn').value);
    formData.append('model', document.getElementById('apModel').value);
    formData.append('price', document.getElementById('apPrice').value);
    formData.append('quantity', document.getElementById('apQuantity').value);
    formData.append('description', document.getElementById('apDescription').value);

    // Category
    const catSelect = document.getElementById('apCategory');
    const newCat = document.getElementById('apNewCategory').value.trim();
    if (newCat) {
      formData.append('category_tr', newCat);
    } else if (catSelect.value) {
      formData.append('category_tr', catSelect.value);
      formData.append('category_ar', catSelect.selectedOptions[0]?.dataset.ar || '');
      formData.append('category_en', catSelect.selectedOptions[0]?.dataset.en || '');
    }

    // Colors & Sizes
    const colors = document.getElementById('apColors').value.split(',').map(s => s.trim()).filter(Boolean);
    const sizes = document.getElementById('apSizes').value.split(',').map(s => s.trim()).filter(Boolean);
    formData.append('colors', JSON.stringify(colors));
    formData.append('sizes', JSON.stringify(sizes));

    // Images
    const files = document.getElementById('apImages').files;
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const resp = await fetch('/api/admin/local-products', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      const result = await resp.json();
      if (result.success) {
        toast('تم إضافة المنتج بنجاح');
        closeModal();
        currentProductsTab = 'local';
        renderProducts();
      } else {
        toast('خطأ: ' + (result.error || 'فشل الإضافة'), 'error');
      }
    } catch(e) { toast('خطأ في الاتصال', 'error'); }
  };
};

// ========== EDIT LOCAL PRODUCT ==========
window.editLocalProduct = async function(id) {
  const data = await api(`/api/admin/local-products/${id}`);
  if (!data) return;
  const p = data.product;
  const categories = await api('/api/admin/categories');
  const catList = categories?.categories || [];

  showModal('تعديل المنتج', `
    <form id="editLocalProductForm" enctype="multipart/form-data">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
        <div class="form-group"><label>الاسم (تركي) *</label><input id="elpNameTr" value="${p.name_tr || ''}"></div>
        <div class="form-group"><label>الاسم (عربي)</label><input id="elpNameAr" value="${p.name_ar || ''}"></div>
        <div class="form-group"><label>الاسم (إنجليزي)</label><input id="elpNameEn" value="${p.name_en || ''}"></div>
        <div class="form-group"><label>الموديل</label><input id="elpModel" value="${p.model || ''}"></div>
        <div class="form-group"><label>السعر (TL)</label><input type="number" step="0.01" id="elpPrice" value="${p.price || 0}"></div>
        <div class="form-group"><label>الكمية</label><input type="number" id="elpQuantity" value="${p.quantity || 0}"></div>
        <div class="form-group">
          <label>الفئة</label>
          <select id="elpCategory">
            <option value="">اختر فئة...</option>
            ${catList.map(c => `<option value="${c.tr}" data-ar="${c.ar || ''}" data-en="${c.en || ''}" ${c.tr === p.category_tr ? 'selected' : ''}>${c.tr} (${c.ar || c.tr})</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>فئة جديدة</label><input id="elpNewCategory" placeholder="اسم الفئة بالتركي"></div>
      </div>
      <div class="form-group"><label>الوصف</label><textarea id="elpDescription" rows="3" style="width:100%;">${p.description || ''}</textarea></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
        <div class="form-group"><label>الألوان (مفصولة بفاصلة)</label><input id="elpColors" value="${(p.colors || []).join(', ')}"></div>
        <div class="form-group"><label>المقاسات (مفصولة بفاصلة)</label><input id="elpSizes" value="${(p.sizes || []).join(', ')}"></div>
      </div>
      ${p.images && p.images.length > 0 ? `
      <div class="form-group">
        <label>الصور الحالية</label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;" id="existingImages">
          ${p.images.map((img, i) => `
            <div style="position:relative;" id="img_${i}">
              <img src="${img}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;">
              <button type="button" onclick="document.getElementById('img_${i}').remove()" style="position:absolute;top:-5px;right:-5px;background:red;color:#fff;border:none;border-radius:50%;width:18px;height:18px;font-size:11px;cursor:pointer;">×</button>
            </div>`).join('')}
        </div>
      </div>` : ''}
      <div class="form-group">
        <label>إضافة صور جديدة</label>
        <input type="file" id="elpImages" multiple accept="image/*">
      </div>
      <button type="submit" class="btn-primary" style="width:100%;margin-top:15px;">حفظ التعديلات</button>
    </form>
  `);

  document.getElementById('editLocalProductForm').onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('name_tr', document.getElementById('elpNameTr').value);
    formData.append('name_ar', document.getElementById('elpNameAr').value);
    formData.append('name_en', document.getElementById('elpNameEn').value);
    formData.append('model', document.getElementById('elpModel').value);
    formData.append('price', document.getElementById('elpPrice').value);
    formData.append('quantity', document.getElementById('elpQuantity').value);
    formData.append('description', document.getElementById('elpDescription').value);

    const catSelect = document.getElementById('elpCategory');
    const newCat = document.getElementById('elpNewCategory').value.trim();
    if (newCat) {
      formData.append('category_tr', newCat);
    } else if (catSelect.value) {
      formData.append('category_tr', catSelect.value);
      formData.append('category_ar', catSelect.selectedOptions[0]?.dataset.ar || '');
      formData.append('category_en', catSelect.selectedOptions[0]?.dataset.en || '');
    }

    const colors = document.getElementById('elpColors').value.split(',').map(s => s.trim()).filter(Boolean);
    const sizes = document.getElementById('elpSizes').value.split(',').map(s => s.trim()).filter(Boolean);
    formData.append('colors', JSON.stringify(colors));
    formData.append('sizes', JSON.stringify(sizes));

    // Keep existing images that weren't removed
    const remaining = document.querySelectorAll('#existingImages img');
    const keepImages = Array.from(remaining).map(img => img.src.replace(window.location.origin, ''));
    formData.append('existing_images', JSON.stringify(keepImages));

    const files = document.getElementById('elpImages').files;
    for (let i = 0; i < files.length; i++) {
      formData.append('images', files[i]);
    }

    try {
      const resp = await fetch(`/api/admin/local-products/${id}`, {
        method: 'PUT',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      const result = await resp.json();
      if (result.success) {
        toast('تم حفظ التعديلات');
        closeModal();
        renderProducts();
      } else {
        toast('خطأ: ' + (result.error || 'فشل الحفظ'), 'error');
      }
    } catch(e) { toast('خطأ في الاتصال', 'error'); }
  };
};

// ========== CHANGE CATEGORY MODAL ==========
window.changeCategoryModal = async function(productId, model, currentCategory) {
  const categories = await api('/api/admin/categories');
  const catList = categories?.categories || [];

  showModal('نقل المنتج إلى فئة أخرى', `
    <div style="margin-bottom:15px;">
      <p>الفئة الحالية: <strong>${currentCategory}</strong></p>
    </div>
    <form id="changeCategoryForm">
      <div class="form-group">
        <label>الفئة الجديدة</label>
        <select id="ccNewCategory" style="width:100%;">
          ${catList.map(c => `<option value="${c.tr}" data-ar="${c.ar || ''}" data-en="${c.en || ''}" ${c.tr === currentCategory ? 'selected' : ''}>${c.tr} (${c.ar || c.tr})</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>أو أدخل فئة جديدة</label><input id="ccCustomCategory" placeholder="اسم الفئة بالتركي"></div>
      <div style="display:flex;gap:10px;margin-top:15px;">
        <button type="submit" class="btn-primary" style="flex:1;">نقل المنتج</button>
        <button type="button" class="btn-secondary" onclick="revertCategory('${productId}')">إرجاع للأصل</button>
      </div>
    </form>
  `);

  document.getElementById('changeCategoryForm').onsubmit = async (e) => {
    e.preventDefault();
    const custom = document.getElementById('ccCustomCategory').value.trim();
    const select = document.getElementById('ccNewCategory');
    const newCatTr = custom || select.value;
    const newCatAr = custom ? '' : (select.selectedOptions[0]?.dataset.ar || '');
    const newCatEn = custom ? '' : (select.selectedOptions[0]?.dataset.en || '');

    const result = await api(`/api/admin/products/${productId}/category`, {
      method: 'POST',
      body: { new_category_tr: newCatTr, new_category_ar: newCatAr, new_category_en: newCatEn }
    });
    if (result?.success) {
      toast('تم نقل المنتج إلى: ' + newCatTr);
      closeModal();
      renderProducts();
    } else {
      toast('خطأ في نقل المنتج', 'error');
    }
  };
};

window.revertCategory = async function(productId) {
  const result = await api(`/api/admin/products/${productId}/category`, { method: 'DELETE' });
  if (result?.success) {
    toast('تم إرجاع المنتج للفئة الأصلية');
    closeModal();
    renderProducts();
  }
};

// ========== TOGGLE & DELETE LOCAL PRODUCTS ==========
window.toggleLocalProduct = async function(id, hide) {
  await api(`/api/admin/local-products/${id}/visibility`, { method: 'PUT', body: { hidden: hide } });
  toast(hide ? 'تم إخفاء المنتج' : 'تم إظهار المنتج');
  renderProducts();
};

window.deleteLocalProduct = async function(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المنتج نهائياً؟')) return;
  await api(`/api/admin/local-products/${id}`, { method: 'DELETE' });
  toast('تم حذف المنتج');
  renderProducts();
};

// ========== SEARCH ==========
window.searchAdminProducts = async function() {
  const q = document.getElementById('productSearch')?.value || '';
  const cat = document.getElementById('categoryFilter')?.value || '';
  let url = `/api/admin/products?search=${encodeURIComponent(q)}&limit=${cat ? 200 : 50}`;
  if (cat) url += `&category=${encodeURIComponent(cat)}`;
  const data = await api(url);
  const products = data?.products || [];
  document.getElementById('productsTable').innerHTML = products.map(p => renderXmlProductRow(p)).join('');
};

window.searchLocalProducts = async function() {
  const q = document.getElementById('localProductSearch')?.value || '';
  const data = await api(`/api/admin/local-products?search=${encodeURIComponent(q)}&limit=50`);
  const products = data?.products || [];
  // Re-render the local products table
  currentProductsTab = 'local';
  renderProducts();
};

// ========== EDIT XML PRODUCT (enhanced) ==========
window.editProduct = async function(id) {
  const data = await api(`/api/admin/products/${id}`);
  if (!data) return;
  const p = data.product;
  const categories = await api('/api/admin/categories');
  const catList = categories?.categories || [];
  const currentCat = p.topCategory?.tr || p.categories?.tr?.[0]?.split(' > ')[0] || '';

  showModal('تعديل المنتج', `
    <form id="editProductForm">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;">
        <div class="form-group"><label>الاسم (تركي)</label><input id="epNameTr" value="${p.name?.tr || ''}"></div>
        <div class="form-group"><label>الاسم (عربي)</label><input id="epNameAr" value="${p.name?.ar || ''}"></div>
        <div class="form-group"><label>الاسم (إنجليزي)</label><input id="epNameEn" value="${p.name?.en || ''}"></div>
        <div class="form-group"><label>السعر (TL)</label><input type="number" step="0.01" id="epPrice" value="${p.price || 0}"></div>
      </div>
      <div class="form-group">
        <label>الفئة الحالية: <strong>${currentCat}</strong></label>
        <select id="epCategory" style="width:100%;margin-top:5px;">
          <option value="">بدون تغيير</option>
          ${catList.map(c => `<option value="${c.tr}" data-ar="${c.ar || ''}" data-en="${c.en || ''}">${c.tr} (${c.ar || c.tr})</option>`).join('')}
        </select>
      </div>
      <button type="submit" class="btn-primary" style="width:100%;margin-top:15px;">حفظ التعديلات</button>
    </form>
  `);

  document.getElementById('editProductForm').onsubmit = async (e) => {
    e.preventDefault();
    // Save name/price overrides
    await api(`/api/admin/products/${id}`, { method: 'PUT', body: {
      name_tr: document.getElementById('epNameTr').value,
      name_ar: document.getElementById('epNameAr').value,
      name_en: document.getElementById('epNameEn').value,
      price: parseFloat(document.getElementById('epPrice').value)
    }});

    // Change category if selected
    const catSelect = document.getElementById('epCategory');
    if (catSelect.value) {
      await api(`/api/admin/products/${id}/category`, {
        method: 'POST',
        body: {
          new_category_tr: catSelect.value,
          new_category_ar: catSelect.selectedOptions[0]?.dataset.ar || '',
          new_category_en: catSelect.selectedOptions[0]?.dataset.en || ''
        }
      });
    }

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
