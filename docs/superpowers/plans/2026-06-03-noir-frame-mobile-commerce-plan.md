# NOIR FRAME Mobile Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first Korean commerce site for NOIR FRAME that sells sunglasses, optical frames, rings, and necklaces with real payment, order, admin, and deployment readiness.

**Architecture:** Use Next.js App Router as the production target, with mobile-first storefront routes, protected admin routes, server-side order/payment actions, Neon Postgres for relational data, and Toss Payments as the first payment provider. Keep commerce, payment, and persistence boundaries separate so the payment provider can later expand to PortOne without rewriting the storefront.

**Tech Stack:** Next.js App Router, TypeScript, Tailwind/shadcn-style UI primitives, Neon Postgres, Drizzle ORM, Toss Payments Widget/API, Vercel, GitHub, Playwright, Node test runner or Vitest.

---

## 1. Product And Brand Decisions

- Brand name: `NOIR FRAME`.
- Primary market: Korea.
- Primary device: mobile web, optimized first for 360-430px phone screens.
- Visual direction: dark gallery commerce, black/silver/chrome surfaces, restrained burgundy accents, high-contrast product imagery.
- Inspiration boundary: reference the attitude of experimental eyewear and gothic silver accessories, but do not copy any Gentle Monster or Chrome Hearts logos, layouts, motifs, or protected brand assets.
- Core categories:
  - Sunglasses
  - Optical frames
  - Rings
  - Necklaces
- Collections:
  - `Trend`: wraparound, shield, tinted lenses, oversized/low-profile frames.
  - `Classic`: black square, tortoise, aviator/round metal, everyday optical frames.
  - `Statement`: bold silhouettes, sharp cat-eye, jewelry-like details.
  - `Metal/Rimless`: thin metal, rimless, clear lens, light-frame styles.
  - `Accessories`: sculptural silver rings, signet rings, pendants, chains.
- First catalog: 16-24 products, enough to make filters and collection tabs feel real.
- Product images: v1 uses static images in the repository or curated generated product renders. Admin image upload is not included in v1.

## 2. Mobile Storefront

- Home:
  - Sticky top bar with brand and order lookup.
  - Strong product-led hero, not a marketing-only landing page.
  - Horizontal collection tabs.
  - Vertical product cards with image, badge, line, price, stock hint.
  - Fixed bottom nav: `Home`, `Shop`, `Cart`, `Order`.
- Shop:
  - Collection filter tabs.
  - Category chips for sunglasses, optical, rings, necklaces.
  - Sort options: featured, new, price low, price high.
  - Empty state if filters return no products.
- Product detail:
  - Large square/portrait image.
  - Product name, line, price, description, material, fit/size, stock.
  - Sticky mobile CTA above bottom nav: `장바구니`, `바로 구매`.
  - Prevent purchase if hidden or out of stock.
- Cart:
  - Quantity stepper with large touch targets.
  - Item removal by reducing quantity to zero.
  - Summary: subtotal, shipping, total.
  - CTA to checkout.
- Checkout:
  - Guest checkout only.
  - Required fields: name, phone, address1.
  - Optional fields: email, postal code, address2, delivery memo.
  - Toss payment widget or payment request.
  - Server must create the order and calculate final amount before payment.
- Success/fail:
  - Success confirms Toss result server-side before showing completion.
  - Fail shows Toss error/cancel message and offers return to cart.
- Order lookup:
  - Lookup by order ID.
  - Show status, items, total, address summary, tracking number if shipped.

## 3. Commerce Rules

- Currency: KRW only.
- Shipping: domestic Korea only.
- Shipping fee: 3,000 KRW.
- Free shipping threshold: 100,000 KRW.
- Order statuses:
  - `pending`
  - `paid`
  - `preparing`
  - `shipped`
  - `delivered`
  - `canceled`
  - `refunded`
- Valid status transitions:
  - `pending -> paid | canceled`
  - `paid -> preparing | canceled | refunded`
  - `preparing -> shipped | canceled | refunded`
  - `shipped -> delivered`
  - terminal: `delivered`, `canceled`, `refunded`
- Stock is decremented only after payment is confirmed.
- Server must reject amount mismatch between local order total and Toss return amount.
- Partial refund is out of v1 scope. Admin refund means full payment cancel only.

## 4. Payment Plan

- Use Toss Payments for v1 because the first market is Korea.
- Prefer Toss Payments Widget for the final UX because it can expose card and Korean 간편결제 options from the checkout UI.
- Payment flow:
  - Client submits checkout form and cart.
  - Server validates items, stock, price, shipping, and customer fields.
  - Server creates `pending` order.
  - Client starts Toss payment with `orderId`, `orderName`, and server-calculated `amount`.
  - Toss redirects to `/success` or `/fail`.
  - `/success` posts `paymentKey`, `orderId`, and `amount` to the server.
  - Server fetches order, verifies amount, calls Toss `/v1/payments/confirm`, stores payment, marks order `paid`, decrements stock.
  - Admin full cancel calls Toss cancel API, records refund, marks order `refunded`.
- Payment boundary:
  - Define a `PaymentProvider` interface with `createCheckoutPayload`, `confirmPayment`, and `cancelPayment`.
  - Implement `TossPaymentProvider` first.
  - Keep `PortOnePaymentProvider` as future-compatible, not implemented in v1.
- Required environment variables:
  - `DATABASE_URL`
  - `TOSS_CLIENT_KEY`
  - `TOSS_SECRET_KEY`
  - `ADMIN_USERNAME`
  - `ADMIN_PASSWORD`
  - `ADMIN_SESSION_SECRET`
  - `NEXT_PUBLIC_APP_URL`

## 5. Database Plan

- Use Neon Postgres through Vercel Marketplace.
- Use Drizzle ORM and migrations.
- Tables:
  - `products`: id, slug, name, category, collection, line, price, stock, visible, badge, image, description, material, fit, timestamps.
  - `product_images`: id, product_id, url, alt, sort_order.
  - `orders`: id, status, customer fields, address fields, subtotal, shipping, total, tracking_number, timestamps.
  - `order_items`: id, order_id, product snapshot fields, price, quantity.
  - `payments`: id, order_id, provider, payment_key, amount, status, raw_payload, timestamp.
  - `refunds`: id, order_id, payment_id, amount, reason, raw_payload, timestamp.
  - `admin_users`: id, username, password_hash, role, timestamps.
- Store product snapshots in `order_items` so old orders do not change when product data changes.
- Never store raw card details.
- Do not expose admin data through public APIs.

## 6. Admin Plan

- Route: `/admin`.
- Login:
  - v1 supports one or more admin users.
  - Passwords must be hashed, not stored in plain text.
  - Use signed HTTP-only session cookies.
- Product management:
  - Create, edit, hide/show products.
  - Edit price, stock, line, collection, category, image path, description, material, fit.
  - No drag-and-drop image upload in v1.
- Order management:
  - List orders by newest first.
  - Filter by status.
  - View customer shipping info and item snapshots.
  - Change status within valid transitions.
  - Add tracking number.
  - Full Toss cancel/refund for paid/preparing orders.
- Admin UX:
  - Usable on mobile.
  - More comfortable on tablet/desktop with two-column layout.

## 7. Implementation Tasks

### Task 1: Convert Prototype Into Production Next.js App

- [ ] Scaffold or migrate to Next.js App Router with TypeScript.
- [ ] Move storefront routes into `app/(store)`.
- [ ] Move admin routes into `app/admin`.
- [ ] Replace large plain JS files with focused React components.
- [ ] Use lazy initialization for DB and Toss clients so builds do not crash without env vars.

### Task 2: Build Domain Layer With Tests First

- [ ] Test shipping fee and free shipping threshold.
- [ ] Test cart normalization and duplicate merging.
- [ ] Test stock decrement and oversell rejection.
- [ ] Test valid/invalid order status transitions.
- [ ] Test payment amount mismatch rejection.
- [ ] Implement only the domain functions required to pass those tests.

### Task 3: Implement Database And Seed Data

- [ ] Add Drizzle schema and migrations.
- [ ] Add seed script for 16-24 products.
- [ ] Add product repository functions.
- [ ] Add order repository functions.
- [ ] Add payment/refund repository functions.
- [ ] Verify local and Vercel Neon env loading.

### Task 4: Implement Storefront

- [ ] Build mobile layout, top bar, bottom nav.
- [ ] Build home, shop, product detail, cart, checkout, success/fail, order lookup.
- [ ] Use responsive constraints for all cards, buttons, tabs, and sticky CTAs.
- [ ] Ensure text never overflows on 360px width.
- [ ] Use accessible labels and keyboard focus states.

### Task 5: Implement Toss Payment

- [ ] Add Toss widget/client integration.
- [ ] Add server payment confirm route/action.
- [ ] Store raw provider response in `payments.raw_payload`.
- [ ] Add admin cancel route/action.
- [ ] Add duplicate confirm protection.
- [ ] Add amount mismatch and missing order tests.

### Task 6: Implement Admin

- [ ] Add hashed admin password setup.
- [ ] Add protected admin layout.
- [ ] Add product CRUD.
- [ ] Add order list/detail/status update.
- [ ] Add tracking number update.
- [ ] Add full cancel/refund.

### Task 7: Deploy And Verify

- [ ] Push source to GitHub.
- [ ] Connect GitHub repository to Vercel.
- [ ] Add Neon integration and pull env vars locally.
- [ ] Add Toss test keys and admin secrets to Vercel.
- [ ] Run production build.
- [ ] Run Playwright mobile tests against preview deployment.
- [ ] Confirm Toss sandbox payment success/fail/cancel flows.

## 8. Test Plan

- Unit tests:
  - totals, shipping, cart normalization, order transitions, stock, payment verification.
- Integration tests:
  - create order, confirm payment, duplicate payment confirm, refund, product CRUD.
- E2E mobile tests:
  - home -> shop -> product -> cart -> checkout -> Toss sandbox -> success.
  - failed payment returns to cart.
  - order lookup after success.
  - admin login -> product edit -> order status update -> full refund.
- Responsive checks:
  - 360x740, 390x844, 430x932, tablet, desktop.
- Visual checks:
  - no overlapping text.
  - fixed CTAs do not cover critical content.
  - product images load.
  - bottom nav remains usable.

## 9. Launch Checklist

- Business info ready: company name, owner, business registration number, CS phone/email.
- Policy pages ready: terms, privacy, shipping, exchange/refund.
- Toss production account approved and production keys set.
- Neon production DB migrated and seeded.
- Admin password rotated from any local default.
- Vercel env vars marked sensitive where supported.
- Test purchase and refund completed in sandbox, then production small-amount test.
- GitHub main branch protected and Vercel production branch set.

## 10. v1 Exclusions

- Customer accounts.
- Reviews.
- Coupons.
- Wishlists.
- Overseas shipping.
- Partial refunds.
- Image upload from admin.
- Multi-admin roles beyond basic admin.
- Inventory reservation before payment.

## 11. Current Workspace Notes

- A static/serverless prototype already exists in the workspace.
- Before production, migrate it into a real Next.js App Router project rather than shipping the prototype structure as final.
- Existing generated assets and domain tests can be reused.
- Existing mobile smoke test revealed an admin-order tab verification issue that should be fixed during the admin task.

