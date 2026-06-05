import { formatWon } from "./src/lib/commerce.mjs";

const root = document.querySelector("#admin-app");

const state = {
  authenticated: false,
  tab: "products",
  products: [],
  orders: [],
};

init();

async function init() {
  document.addEventListener("click", handleAdminNavigation);
  await checkSession();
  render();
}

async function checkSession() {
  try {
    const response = await fetch("/api/admin/login");
    const data = await response.json();
    state.authenticated = Boolean(data.authenticated);
    if (state.authenticated) await loadAdminData();
  } catch {
    state.authenticated = false;
  }
}

async function loadAdminData() {
  const [products, orders] = await Promise.all([
    fetch("/api/admin/products").then((res) => res.json()),
    fetch("/api/admin/orders").then((res) => res.json()),
  ]);
  state.products = products.products || [];
  state.orders = orders.orders || [];
}

function render() {
  if (!state.authenticated) return renderLogin();

  root.innerHTML = `
    <section class="admin-tabs">
      <button class="chip ${state.tab === "products" ? "is-active" : ""}" data-tab="products">상품</button>
      <button class="chip ${state.tab === "orders" ? "is-active" : ""}" data-tab="orders">주문</button>
      <button class="chip" data-logout>로그아웃</button>
    </section>
    ${state.tab === "products" ? renderProducts() : renderOrders()}
  `;

  bindAdminActions();
}

function renderLogin() {
  root.innerHTML = `
    <section class="admin-panel" style="max-width: 420px; margin: 16vh auto 0">
      <p class="eyebrow">Admin</p>
      <h1 style="font-size: 2rem; max-width: none">관리자 로그인</h1>
      <form id="login-form" class="form-stack">
        <label>아이디<input name="username" value="admin" autocomplete="username" required /></label>
        <label>비밀번호<input name="password" type="password" autocomplete="current-password" required /></label>
        <button class="button" type="submit">로그인</button>
      </form>
      <p class="muted" style="margin-top: 12px">로컬 기본 비밀번호는 noir-admin 입니다. 운영에서는 환경변수로 바꾸세요.</p>
    </section>
  `;

  document.querySelector("#login-form").addEventListener("submit", submitLogin);
}

function renderProducts() {
  return `
    <section class="admin-grid">
      <form id="product-form" class="admin-panel form-stack">
        <p class="eyebrow">Product Editor</p>
        <h2>상품 등록/수정</h2>
        <input name="id" type="hidden" />
        <label>상품명<input name="name" required /></label>
        <label>슬러그<input name="slug" required /></label>
        <label>카테고리
          <select name="category">
            <option value="sunglasses">sunglasses</option>
            <option value="glasses">glasses</option>
            <option value="ring">ring</option>
            <option value="necklace">necklace</option>
          </select>
        </label>
        <label>컬렉션
          <select name="collection">
            <option value="trend">trend</option>
            <option value="classic">classic</option>
            <option value="statement">statement</option>
            <option value="metal-rimless">metal-rimless</option>
            <option value="accessories">accessories</option>
          </select>
        </label>
        <label>라인<input name="line" required /></label>
        <label>가격<input name="price" inputmode="numeric" required /></label>
        <label>재고<input name="stock" inputmode="numeric" required /></label>
        <label>배지<input name="badge" /></label>
        <label>이미지 경로<input name="image" placeholder="/products/name.svg" required /></label>
        <label>설명<textarea name="description" required></textarea></label>
        <label>소재<input name="material" /></label>
        <label>핏/사이즈<input name="fit" /></label>
        <label>노출
          <select name="visible">
            <option value="true">노출</option>
            <option value="false">숨김</option>
          </select>
        </label>
        <button class="button" type="submit">상품 저장</button>
        <button class="button secondary" type="button" data-reset-form>새 상품</button>
      </form>
      <section class="admin-panel">
        <p class="eyebrow">Catalog</p>
        <h2>상품 ${state.products.length}개</h2>
        <div class="admin-list">
          ${state.products.map(renderAdminProduct).join("")}
        </div>
      </section>
    </section>
  `;
}

function renderAdminProduct(product) {
  return `
    <article class="admin-product">
      <img src="${product.image}" alt="${escapeHtml(product.name)}" />
      <div>
        <span class="badge">${product.visible ? "ON" : "HIDDEN"}</span>
        <h3>${product.name}</h3>
        <p class="muted">${product.collection} / ${product.category}</p>
        <p class="price">${formatWon(product.price)} · 재고 ${product.stock}</p>
      </div>
      <button class="button secondary" data-edit-product="${product.id}">수정</button>
    </article>
  `;
}

function renderOrders() {
  return `
    <section class="admin-panel">
      <p class="eyebrow">Orders</p>
      <h2>주문 ${state.orders.length}건</h2>
      <div class="admin-list">
        ${
          state.orders.length
            ? state.orders.map(renderAdminOrder).join("")
            : `<p class="muted">아직 주문이 없습니다.</p>`
        }
      </div>
    </section>
  `;
}

function renderAdminOrder(detail) {
  const { order, items, payment } = detail;
  return `
    <article class="admin-order">
      <div class="order-row">
        <div>
          <span class="badge">${order.status}</span>
          <h3>${order.id}</h3>
          <p class="muted">${order.customerName} / ${order.customerPhone}</p>
        </div>
        <strong>${formatWon(order.total)}</strong>
      </div>
      <p class="muted">${items.map((item) => `${item.name} x ${item.quantity}`).join(", ")}</p>
      <p>${order.address1} ${order.address2 || ""}</p>
      <form class="row-actions" data-order-form="${order.id}">
        <select name="status">
          ${["pending", "paid", "preparing", "shipped", "delivered", "canceled", "refunded"]
            .map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`)
            .join("")}
        </select>
        <input name="trackingNumber" placeholder="송장번호" value="${escapeHtml(order.trackingNumber || "")}" />
        <button class="button secondary" type="submit">저장</button>
      </form>
      <button class="button danger" data-cancel-order="${order.id}" ${payment ? "" : "disabled"}>Toss 전체 취소</button>
    </article>
  `;
}

async function submitLogin(event) {
  event.preventDefault();
  const body = Object.fromEntries(new FormData(event.currentTarget).entries());
  const response = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "로그인 실패");
    return;
  }
  state.authenticated = true;
  await loadAdminData();
  render();
}

function bindAdminActions() {
  document.querySelector("#product-form")?.addEventListener("submit", saveProduct);
  document.querySelector("[data-reset-form]")?.addEventListener("click", () => {
    document.querySelector("#product-form").reset();
    document.querySelector("#product-form [name=id]").value = "";
  });
  document.querySelectorAll("[data-edit-product]").forEach((button) => {
    button.addEventListener("click", () => fillProductForm(button.dataset.editProduct));
  });
  document.querySelectorAll("[data-order-form]").forEach((form) => {
    form.addEventListener("submit", saveOrder);
  });
  document.querySelectorAll("[data-cancel-order]").forEach((button) => {
    button.addEventListener("click", () => cancelOrder(button.dataset.cancelOrder));
  });
}

async function handleAdminNavigation(event) {
  const tab = event.target.closest("[data-tab]");
  if (tab) {
    state.tab = tab.dataset.tab;
    render();
    return;
  }

  const logout = event.target.closest("[data-logout]");
  if (logout) {
    await fetch("/api/admin/login", { method: "DELETE" });
    state.authenticated = false;
    render();
  }
}

function fillProductForm(productId) {
  const product = state.products.find((item) => item.id === productId);
  const form = document.querySelector("#product-form");
  if (!product || !form) return;

  for (const [key, value] of Object.entries(product)) {
    if (form.elements[key]) form.elements[key].value = String(value ?? "");
  }
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function saveProduct(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const product = Object.fromEntries(new FormData(form).entries());
  product.price = Number(product.price);
  product.stock = Number(product.stock);
  product.visible = product.visible === "true";

  const response = await fetch("/api/admin/products", {
    method: product.id ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product }),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "상품 저장 실패");
    return;
  }

  await loadAdminData();
  render();
}

async function saveOrder(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const response = await fetch("/api/admin/orders", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: form.dataset.orderForm,
      ...Object.fromEntries(new FormData(form).entries()),
    }),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "주문 저장 실패");
    return;
  }

  await loadAdminData();
  render();
}

async function cancelOrder(orderId) {
  const reason = prompt("취소 사유", "관리자 전체 취소");
  if (!reason) return;

  const response = await fetch("/api/payments/cancel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderId, reason }),
  });
  const data = await response.json();
  if (!response.ok) {
    alert(data.error || "결제 취소 실패");
    return;
  }

  await loadAdminData();
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
