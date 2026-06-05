export const SHIPPING_FEE = 3000;
export const FREE_SHIPPING_THRESHOLD = 100000;

const ORDER_TRANSITIONS = {
  pending: new Set(["paid", "canceled"]),
  paid: new Set(["preparing", "canceled", "refunded"]),
  preparing: new Set(["shipped", "canceled", "refunded"]),
  shipped: new Set(["delivered"]),
  delivered: new Set([]),
  canceled: new Set([]),
  refunded: new Set([]),
};

export function normalizeCartItems(items) {
  const byProduct = new Map();

  for (const item of Array.isArray(items) ? items : []) {
    const productId = String(item.productId || "").trim();
    const quantity = Math.floor(Number(item.quantity));

    if (!productId || quantity <= 0) continue;
    byProduct.set(productId, (byProduct.get(productId) || 0) + quantity);
  }

  return [...byProduct.entries()].map(([productId, quantity]) => ({ productId, quantity }));
}

export function calculateCartTotals(items) {
  const subtotal = normalizeCartLineItems(items).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const shipping = subtotal > 0 && subtotal < FREE_SHIPPING_THRESHOLD ? SHIPPING_FEE : 0;

  return {
    subtotal,
    shipping,
    total: subtotal + shipping,
  };
}

export function normalizeCartLineItems(items) {
  return (Array.isArray(items) ? items : [])
    .map((item) => ({
      productId: String(item.productId || "").trim(),
      price: Math.max(0, Math.floor(Number(item.price) || 0)),
      quantity: Math.max(0, Math.floor(Number(item.quantity) || 0)),
    }))
    .filter((item) => item.productId && item.price >= 0 && item.quantity > 0);
}

export function decrementStock(stock, items) {
  const nextStock = new Map(stock);

  for (const item of normalizeCartItems(items)) {
    const current = Number(nextStock.get(item.productId) || 0);

    if (current < item.quantity) {
      throw new Error(`Insufficient stock for ${item.productId}`);
    }

    nextStock.set(item.productId, current - item.quantity);
  }

  return nextStock;
}

export function canTransitionOrder(from, to) {
  return ORDER_TRANSITIONS[from]?.has(to) || false;
}

export function formatWon(amount) {
  return `${Math.floor(Number(amount) || 0).toLocaleString("ko-KR")}원`;
}

export function createOrderId(prefix = "nf") {
  const stamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${stamp}_${random}`;
}

export function buildOrderLineItems(cartItems, products) {
  const productById = new Map(products.map((product) => [product.id, product]));

  return normalizeCartItems(cartItems).map((item) => {
    const product = productById.get(item.productId);
    if (!product || product.visible === false) {
      throw new Error(`Product not available: ${item.productId}`);
    }
    if (Number(product.stock) < item.quantity) {
      throw new Error(`Insufficient stock for ${item.productId}`);
    }

    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
      price: product.price,
      quantity: item.quantity,
    };
  });
}

export function getOrderName(items) {
  if (!items.length) return "NOIR FRAME order";
  if (items.length === 1) return items[0].name;
  return `${items[0].name} 외 ${items.length - 1}개`;
}
