import {
  calculateCartTotals,
  formatWon,
  normalizeCartItems,
} from "./src/lib/commerce.mjs";

const app = document.querySelector("#app");
const cartCount = document.querySelector("#cart-count");

const state = {
  products: [],
  cart: readCart(),
  collection: "all",
  loading: true,
};

init();

async function init() {
  bindNavigation();
  await loadProducts();
  render();
}

function bindNavigation() {
  document.addEventListener("click", (event) => {
    const link = event.target.closest("[data-route]");
    if (!link) return;

    const url = new URL(link.href);
    if (url.origin !== location.origin) return;

    event.preventDefault();
    history.pushState({}, "", url.pathname + url.search);
    render();
  });

  window.addEventListener("popstate", render);
}

async function loadProducts() {
  try {
    const response = await fetch("/api/products");
    const data = await response.json();
    state.products = data.products || [];
  } catch {
    state.products = [];
  } finally {
    state.loading = false;
  }
}

function render() {
  syncCartCount();
  setActiveNav();

  if (state.loading) {
    app.innerHTML = `<section class="screen-placeholder"><p>NOIR FRAME 불러오는 중</p></section>`;
    return;
  }

  const path = location.pathname;
  if (path.startsWith("/product/")) return renderProduct(path.split("/").pop());
  if (path === "/shop") return renderShop();
  if (path === "/cart") return renderCart();
  if (path === "/checkout") return renderCheckout();
  if (path === "/success") return renderSuccess();
  if (path === "/fail") return renderFail();
  if (path === "/orders") return renderOrderLookup();
  renderHome();
}

function renderHome() {
  const featured = state.products.slice(0, 6);
  app.innerHTML = `
    <section class="hero">
      <div>
        <p class="eyebrow">Mobile First Eyewear Store</p>
        <h1>FRAME THE NIGHT</h1>
        <p>선글라스, 안경테, 실버 링과 목걸이를 한 손으로 빠르게 탐색하고 결제하는 NOIR FRAME 컬렉션.</p>
        <div class="hero-actions">
          <a class="button" href="/shop" data-route>Shop now</a>
          <a class="button secondary" href="/product/axis-shield-black" data-route>대표 상품</a>
        </div>
      </div>
    </section>
    ${renderCollectionTabs()}
    <section class="section">
      <div class="section-header">
        <div>
          <p class="eyebrow">New Arrivals</p>
          <h2>모바일에서 먼저 보는 컬렉션</h2>
        </div>
        <a class="topbar-link" href="/shop" data-route>전체보기</a>
      </div>
      <div class="product-grid">${featured.map(renderProductCard).join("")}</div>
    </section>
  `;
}

function renderShop() {
  const products = filterProducts();
  app.innerHTML = `
    <section class="section" style="margin-top: 6px">
      <p class="eyebrow">Shop</p>
      <h1 style="font-size: 2.2rem; max-width: none">Trend / Classic</h1>
      <p class="muted">랩어라운드부터 클래식 블랙 프레임, 실버 액세서리까지.</p>
      ${renderFilterRow()}
    </section>
    <section class="section">
      <div class="product-grid">
        ${products.length ? products.map(renderProductCard).join("") : renderEmpty("조건에 맞는 상품이 없습니다.")}
      </div>
    </section>
  `;
}

function renderProduct(slug) {
  const product = state.products.find((item) => item.slug === slug);
  if (!product) {
    app.innerHTML = renderEmpty("상품을 찾을 수 없습니다.");
    return;
  }

  app.innerHTML = `
    <section class="product-detail">
      <div class="detail-media">
        <img src="${product.image}" alt="${escapeHtml(product.name)}" />
      </div>
      <div class="detail-panel">
        <span class="badge">${product.badge || product.line}</span>
        <h1 style="font-size: 2.4rem; max-width: none; margin-top: 12px">${product.name}</h1>
        <p class="muted">${product.description}</p>
        <p class="price" style="font-size: 1.25rem">${formatWon(product.price)}</p>
        <div class="spec-list">
          <div><span>라인</span><strong>${product.line}</strong></div>
          <div><span>소재</span><strong>${product.material}</strong></div>
          <div><span>핏</span><strong>${product.fit}</strong></div>
          <div><span>재고</span><strong>${product.stock}개</strong></div>
        </div>
      </div>
    </section>
    <div class="sticky-actions">
      <button class="button secondary" data-add-cart="${product.id}">장바구니</button>
      <button class="button" data-buy-now="${product.id}">바로 구매</button>
    </div>
  `;
  bindProductActions();
}

function renderCart() {
  const cartItems = getCartLines();
  const totals = calculateCartTotals(cartItems);

  if (!cartItems.length) {
    app.innerHTML = `
      ${renderEmpty("장바구니가 비어 있습니다.")}
      <a class="button" href="/shop" data-route>상품 보러가기</a>
    `;
    return;
  }

  app.innerHTML = `
    <section class="section" style="margin-top: 6px">
      <p class="eyebrow">Cart</p>
      <h1 style="font-size: 2.2rem; max-width: none">장바구니</h1>
    </section>
    <section class="cart-list">
      ${cartItems.map(renderCartItem).join("")}
    </section>
    <section class="section summary-box">
      ${renderTotals(totals)}
      <a class="button" href="/checkout" data-route>주문서 작성</a>
    </section>
  `;
  bindCartActions();
}

function renderCheckout() {
  const cartItems = getCartLines();
  if (!cartItems.length) {
    app.innerHTML = renderEmpty("결제할 상품이 없습니다.");
    return;
  }
  const totals = calculateCartTotals(cartItems);

  app.innerHTML = `
    <section class="section" style="margin-top: 6px">
      <p class="eyebrow">Checkout</p>
      <h1 style="font-size: 2.2rem; max-width: none">주문서</h1>
    </section>
    <form id="checkout-form" class="form-stack">
      <label>이름<input name="name" required autocomplete="name" /></label>
      <label>연락처<input name="phone" required inputmode="tel" placeholder="01012345678" /></label>
      <label>이메일<input name="email" type="email" autocomplete="email" /></label>
      <label>우편번호<input name="postalCode" inputmode="numeric" /></label>
      <label>주소<input name="address1" required autocomplete="street-address" /></label>
      <label>상세주소<input name="address2" /></label>
      <label>배송메모<textarea name="memo" placeholder="공동현관 비밀번호, 부재 시 요청사항"></textarea></label>
      <div class="summary-box">${renderTotals(totals)}</div>
      <p class="notice">Toss 키가 설정되지 않은 로컬 환경에서는 데모 결제로 주문 완료 흐름을 확인합니다.</p>
      <button class="button" type="submit">Toss 결제하기</button>
    </form>
  `;

  document.querySelector("#checkout-form").addEventListener("submit", submitCheckout);
}

async function renderSuccess() {
  const params = new URLSearchParams(location.search);
  const paymentKey = params.get("paymentKey");
  const orderId = params.get("orderId");
  const amount = params.get("amount");

  app.innerHTML = `
    <section class="status-box">
      <p class="eyebrow">Payment</p>
      <h1 style="font-size: 2.2rem; max-width: none">결제 확인 중</h1>
      <p class="muted">주문번호 ${escapeHtml(orderId || "")}</p>
    </section>
  `;

  if (!paymentKey || !orderId || !amount) {
    app.innerHTML = renderEmpty("결제 정보가 없습니다.");
    return;
  }

  try {
    const response = await fetch("/api/payments/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "결제 확인 실패");

    localStorage.setItem("nf_last_order", orderId);
    state.cart = [];
    writeCart();
    syncCartCount();

    app.innerHTML = `
      <section class="status-box">
        <p class="eyebrow">Confirmed</p>
        <h1 style="font-size: 2.2rem; max-width: none">주문이 완료되었습니다</h1>
        <p class="muted">주문번호 ${data.order.id}</p>
        <div class="summary-box">${renderTotals(data.order)}</div>
        <a class="button" href="/orders?orderId=${data.order.id}" data-route>주문 확인</a>
      </section>
    `;
  } catch (error) {
    app.innerHTML = `
      <section class="status-box">
        <p class="eyebrow">Payment Error</p>
        <h1 style="font-size: 2.2rem; max-width: none">결제 확인 실패</h1>
        <p class="muted">${escapeHtml(error.message)}</p>
        <a class="button secondary" href="/cart" data-route>장바구니로 돌아가기</a>
      </section>
    `;
  }
}

function renderFail() {
  const params = new URLSearchParams(location.search);
  app.innerHTML = `
    <section class="status-box">
      <p class="eyebrow">Payment Failed</p>
      <h1 style="font-size: 2.2rem; max-width: none">결제가 취소되었습니다</h1>
      <p class="muted">${escapeHtml(params.get("message") || "결제 실패 또는 사용자의 취소로 주문이 완료되지 않았습니다.")}</p>
      <a class="button" href="/cart" data-route>다시 결제하기</a>
    </section>
  `;
}

async function renderOrderLookup() {
  const params = new URLSearchParams(location.search);
  const orderId = params.get("orderId") || localStorage.getItem("nf_last_order") || "";

  app.innerHTML = `
    <section class="section" style="margin-top: 6px">
      <p class="eyebrow">Order</p>
      <h1 style="font-size: 2.2rem; max-width: none">주문조회</h1>
    </section>
    <form id="order-form" class="form-stack">
      <label>주문번호<input name="orderId" value="${escapeHtml(orderId)}" required /></label>
      <button class="button" type="submit">조회하기</button>
    </form>
    <section id="order-result" class="section"></section>
  `;

  document.querySelector("#order-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await loadOrder(new FormData(event.currentTarget).get("orderId"));
  });

  if (orderId) await loadOrder(orderId);
}

async function loadOrder(orderId) {
  const target = document.querySelector("#order-result");
  target.innerHTML = `<div class="screen-placeholder"><p>주문을 확인하는 중</p></div>`;
  const response = await fetch(`/api/orders?orderId=${encodeURIComponent(orderId)}`);
  const data = await response.json();

  if (!response.ok) {
    target.innerHTML = `<div class="empty-state"><p>${escapeHtml(data.error || "주문을 찾을 수 없습니다.")}</p></div>`;
    return;
  }

  target.innerHTML = renderOrderDetail(data);
}

async function submitCheckout(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const button = form.querySelector("button[type=submit]");
  button.disabled = true;
  button.textContent = "주문 생성 중";

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: state.cart,
        customer: Object.fromEntries(formData.entries()),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "주문 생성 실패");

    const config = await fetch("/api/payments/config").then((res) => res.json());
    localStorage.setItem("nf_last_order", data.order.id);

    if (config.enabled && window.TossPayments) {
      const toss = window.TossPayments(config.clientKey);
      await toss.requestPayment(data.checkout.method, data.checkout);
      return;
    }

    location.href = `/success?paymentKey=local-demo&orderId=${encodeURIComponent(data.order.id)}&amount=${data.order.total}`;
  } catch (error) {
    button.disabled = false;
    button.textContent = "Toss 결제하기";
    alert(error.message);
  }
}

function renderCollectionTabs() {
  setTimeout(bindCollectionTabs, 0);
  const tabs = [
    ["all", "All"],
    ["trend", "Trend"],
    ["classic", "Classic"],
    ["statement", "Statement"],
    ["metal-rimless", "Metal"],
    ["accessories", "Accessories"],
  ];

  return `
    <div class="tabs">
      ${tabs
        .map(
          ([id, label]) =>
            `<button class="tab ${state.collection === id ? "is-active" : ""}" data-collection="${id}">${label}</button>`,
        )
        .join("")}
    </div>
  `;
}

function renderFilterRow() {
  return renderCollectionTabs();
}

function filterProducts() {
  if (state.collection === "all") return state.products;
  return state.products.filter((product) => product.collection === state.collection);
}

function renderProductCard(product) {
  return `
    <a class="product-card" href="/product/${product.slug}" data-route>
      <img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy" />
      <div class="product-info">
        <div>
          <span class="badge">${product.badge || product.line}</span>
          <h3 class="product-title">${product.name}</h3>
          <p class="price-sub">${product.line} / ${product.category}</p>
        </div>
        <div>
          <p class="price">${formatWon(product.price)}</p>
          <p class="muted">재고 ${product.stock}개</p>
        </div>
      </div>
    </a>
  `;
}

function renderCartItem(item) {
  return `
    <article class="cart-item">
      <img src="${item.image}" alt="${escapeHtml(item.name)}" />
      <div style="flex: 1; min-width: 0">
        <h3>${item.name}</h3>
        <p class="muted">${formatWon(item.price)}</p>
        <div class="qty-controls" data-product-id="${item.productId}">
          <button type="button" data-qty="-1">-</button>
          <span>${item.quantity}</span>
          <button type="button" data-qty="1">+</button>
        </div>
      </div>
    </article>
  `;
}

function renderTotals(totals) {
  return `
    <div class="summary-row"><span>상품금액</span><strong>${formatWon(totals.subtotal)}</strong></div>
    <div class="summary-row"><span>배송비</span><strong>${formatWon(totals.shipping)}</strong></div>
    <div class="summary-row total"><span>총 결제금액</span><strong>${formatWon(totals.total)}</strong></div>
  `;
}

function renderOrderDetail(detail) {
  const { order, items } = detail;
  return `
    <div class="status-box">
      <p class="eyebrow">${order.status}</p>
      <h2>주문번호 ${order.id}</h2>
      <p class="muted">${order.customerName} / ${order.customerPhone}</p>
      <div class="cart-list">
        ${items.map(renderOrderItem).join("")}
      </div>
      <div class="summary-box">${renderTotals(order)}</div>
      ${order.trackingNumber ? `<p class="notice">송장번호 ${escapeHtml(order.trackingNumber)}</p>` : ""}
    </div>
  `;
}

function renderOrderItem(item) {
  return `
    <article class="cart-item">
      <img src="${item.image}" alt="${escapeHtml(item.name)}" />
      <div style="flex: 1; min-width: 0">
        <h3>${item.name}</h3>
        <p class="muted">${formatWon(item.price)} · ${item.quantity}개</p>
      </div>
    </article>
  `;
}

function renderEmpty(message) {
  return `<section class="empty-state"><p>${escapeHtml(message)}</p></section>`;
}

function bindCollectionTabs() {
  document.querySelectorAll("[data-collection]").forEach((button) => {
    button.addEventListener("click", () => {
      state.collection = button.dataset.collection;
      if (location.pathname !== "/shop") history.pushState({}, "", "/shop");
      renderShop();
    });
  });
}

function bindProductActions() {
  document.querySelector("[data-add-cart]")?.addEventListener("click", (event) => {
    addToCart(event.currentTarget.dataset.addCart);
  });
  document.querySelector("[data-buy-now]")?.addEventListener("click", (event) => {
    addToCart(event.currentTarget.dataset.buyNow);
    history.pushState({}, "", "/checkout");
    render();
  });
}

function bindCartActions() {
  document.querySelectorAll("[data-qty]").forEach((button) => {
    button.addEventListener("click", () => {
      const productId = button.closest("[data-product-id]").dataset.productId;
      changeQuantity(productId, Number(button.dataset.qty));
    });
  });
}

function addToCart(productId) {
  const product = state.products.find((item) => item.id === productId);
  if (!product || product.stock < 1) return;

  const existing = state.cart.find((item) => item.productId === productId);
  if (existing) existing.quantity += 1;
  else state.cart.push({ productId, quantity: 1 });
  state.cart = normalizeCartItems(state.cart);
  writeCart();
  syncCartCount();
}

function changeQuantity(productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  if (!item) return;

  item.quantity += delta;
  if (item.quantity <= 0) state.cart = state.cart.filter((entry) => entry.productId !== productId);
  state.cart = normalizeCartItems(state.cart);
  writeCart();
  renderCart();
}

function getCartLines() {
  const products = new Map(state.products.map((product) => [product.id, product]));
  return normalizeCartItems(state.cart)
    .map((item) => {
      const product = products.get(item.productId);
      if (!product) return null;
      return {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        image: product.image,
        price: product.price,
        quantity: Math.min(item.quantity, product.stock),
      };
    })
    .filter(Boolean);
}

function readCart() {
  try {
    return normalizeCartItems(JSON.parse(localStorage.getItem("nf_cart") || "[]"));
  } catch {
    return [];
  }
}

function writeCart() {
  localStorage.setItem("nf_cart", JSON.stringify(state.cart));
}

function syncCartCount() {
  cartCount.textContent = String(state.cart.reduce((sum, item) => sum + item.quantity, 0));
}

function setActiveNav() {
  const path = location.pathname;
  document.querySelectorAll("[data-nav]").forEach((link) => link.classList.remove("is-active"));
  const key = path === "/" ? "home" : path.startsWith("/shop") || path.startsWith("/product") ? "shop" : path.slice(1);
  document.querySelector(`[data-nav="${key}"]`)?.classList.add("is-active");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
