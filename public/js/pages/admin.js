import { apiFetch, getUser, formatVND, formatDate, showToast, ORDER_STATUS_LABEL } from '../api.js';
import { renderLayout, escapeHtml } from '../layout.js';

renderLayout({});

const user = getUser();
const guardEl = document.getElementById('admin-guard');
const appEl = document.getElementById('admin-app');

if (!user) {
  guardEl.innerHTML = `<div class="empty-state"><p>Bạn cần đăng nhập để truy cập trang quản trị.</p><p style="margin-top:14px;"><a class="btn btn-primary" href="/login.html?next=/admin.html">Đăng nhập</a></p></div>`;
} else if (user.role !== 'admin') {
  guardEl.innerHTML = `<div class="empty-state"><p>Tài khoản của bạn không có quyền quản trị.</p></div>`;
} else {
  appEl.hidden = false;
  initTabs();
  loadCategories();
  loadProducts();
  loadOrders();
  wireForms();
}

function initTabs() {
  const buttons = document.querySelectorAll('.tabs button');
  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      buttons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      ['categories', 'products', 'orders'].forEach((name) => {
        document.getElementById(`tab-${name}`).hidden = name !== btn.dataset.tab;
      });
    });
  });
}

let categoriesCache = [];

async function loadCategories() {
  const table = document.getElementById('category-table');
  const select = document.getElementById('p-category');
  try {
    const { data } = await apiFetch('/categories');
    categoriesCache = data;

    select.innerHTML = data.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>ID</th><th>Tên</th><th>Slug</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                (c) => `
              <tr>
                <td>${c.id}</td>
                <td>${escapeHtml(c.name)}</td>
                <td>${escapeHtml(c.slug)}</td>
                <td><button class="btn btn-ghost btn-sm" data-del-cat="${c.id}">Xoá</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p style="color:var(--muted)">Chưa có danh mục nào.</p>';

    table.querySelectorAll('[data-del-cat]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá danh mục này?')) return;
        try {
          await apiFetch(`/categories/${btn.dataset.delCat}`, { method: 'DELETE' });
          showToast('Đã xoá danh mục');
          loadCategories();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p style="color:var(--danger)">${escapeHtml(err.message)}</p>`;
  }
}

async function loadProducts() {
  const table = document.getElementById('product-table');
  try {
    const { data } = await apiFetch('/products?limit=100');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>ID</th><th>Tên</th><th>Danh mục</th><th>Giá</th><th>Tồn kho</th><th></th></tr></thead>
          <tbody>
            ${data
              .map(
                (p) => `
              <tr>
                <td>${p.id}</td>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.category?.name || '—')}</td>
                <td>${formatVND(p.salePrice || p.price)}</td>
                <td>${p.stockQuantity}</td>
                <td><button class="btn btn-ghost btn-sm" data-del-prod="${p.id}">Xoá</button></td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p style="color:var(--muted)">Chưa có sản phẩm nào.</p>';

    table.querySelectorAll('[data-del-prod]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Xoá sản phẩm này?')) return;
        try {
          await apiFetch(`/products/${btn.dataset.delProd}`, { method: 'DELETE' });
          showToast('Đã xoá sản phẩm');
          loadProducts();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p style="color:var(--danger)">${escapeHtml(err.message)}</p>`;
  }
}

async function loadOrders() {
  const table = document.getElementById('order-table');
  try {
    const { data } = await apiFetch('/orders');

    table.innerHTML = data.length
      ? `<table class="admin-table">
          <thead><tr><th>Mã đơn</th><th>Ngày</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead>
          <tbody>
            ${data
              .map(
                (o) => `
              <tr>
                <td>#${o.id}</td>
                <td>${formatDate(o.createdAt)}</td>
                <td>${formatVND(o.totalAmount)}</td>
                <td>
                  <select data-order="${o.id}">
                    ${Object.entries(ORDER_STATUS_LABEL)
                      .map(([value, label]) => `<option value="${value}" ${value === o.status ? 'selected' : ''}>${label}</option>`)
                      .join('')}
                  </select>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`
      : '<p style="color:var(--muted)">Chưa có đơn hàng nào.</p>';

    table.querySelectorAll('[data-order]').forEach((select) => {
      select.addEventListener('change', async () => {
        try {
          await apiFetch(`/orders/${select.dataset.order}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: select.value }),
          });
          showToast(`Đã cập nhật đơn #${select.dataset.order}`);
        } catch (err) {
          showToast(err.message, true);
          loadOrders();
        }
      });
    });
  } catch (err) {
    table.innerHTML = `<p style="color:var(--danger)">${escapeHtml(err.message)}</p>`;
  }
}

function wireForms() {
  const catForm = document.getElementById('category-form');
  const catError = document.getElementById('category-error');
  catForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    catError.classList.remove('show');
    const fd = new FormData(catForm);
    try {
      await apiFetch('/categories', {
        method: 'POST',
        body: JSON.stringify({ name: fd.get('name'), imageUrl: fd.get('imageUrl') || undefined }),
      });
      catForm.reset();
      showToast('Đã thêm danh mục');
      loadCategories();
    } catch (err) {
      catError.textContent = err.message;
      catError.classList.add('show');
    }
  });

  const prodForm = document.getElementById('product-form');
  const prodError = document.getElementById('product-error');
  prodForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    prodError.classList.remove('show');
    const fd = new FormData(prodForm);
    try {
      await apiFetch('/products', {
        method: 'POST',
        body: JSON.stringify({
          name: fd.get('name'),
          categoryId: Number(fd.get('categoryId')),
          price: Number(fd.get('price')),
          salePrice: fd.get('salePrice') ? Number(fd.get('salePrice')) : undefined,
          stockQuantity: Number(fd.get('stockQuantity')),
          sku: fd.get('sku') || undefined,
          description: fd.get('description') || undefined,
        }),
      });
      prodForm.reset();
      showToast('Đã thêm sản phẩm');
      loadProducts();
    } catch (err) {
      prodError.textContent = err.message;
      prodError.classList.add('show');
    }
  });
}
