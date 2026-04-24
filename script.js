/* =========================================================
   Mariel Store
   - Injects shared header & footer
   - Cart (localStorage)
   - Mobile menu, toasts, reveal-on-scroll
   - Product search/filter, wishlist
   - Supabase for auth
   ========================================================= */

const SUPABASE_URL = "https://iqkjkteojcgnzivhhwqx.supabase.co";
const SUPABASE_KEY = "sb_publishable_YbDZQCCV_1Yk8KQPJuuQ1w_TkXhkLbC";
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

/* ---------- helpers ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const onPagesPath = () => location.pathname.includes("/pages/");
const base = onPagesPath() ? "../" : "";
const pagePath = (file) => onPagesPath() ? file : `pages/${file}`;
const home = () => onPagesPath() ? "../index.html" : "index.html";
const peso = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* =========================================================
   PAGE & NAV
   ========================================================= */
const PAGE_KEY = document.body.dataset.page || "home";

const NAV_ITEMS = [
  { key: "home",     label: "Home",     href: home() },
  { key: "products", label: "Products", href: pagePath("products.html") },
  { key: "services", label: "Services", href: pagePath("services.html") },
  { key: "about",    label: "About",    href: pagePath("about.html") },
  { key: "contact",  label: "Contact",  href: pagePath("contact.html") },
];

function buildHeader() {
  const slot = $("#site-header");
  if (!slot) return;
  const links = NAV_ITEMS.map(i =>
    `<a href="${i.href}" class="${i.key === PAGE_KEY ? "active" : ""}">${i.label}</a>`
  ).join("");

  slot.innerHTML = `
    <header class="site-header">
      <div class="container nav">
        <button class="menu-toggle" id="menu-open" aria-label="Open menu">☰</button>
        <a class="brand" href="${home()}">
          <img src="${base}images/logo.png" alt="Mariel Store">
          <span>Mariel Store</span>
        </a>
        <nav class="nav-links">${links}</nav>
        <div class="nav-actions">
          <button class="btn-icon" id="open-cart" aria-label="Cart">
            🛒<span class="badge" id="cart-badge">0</span>
          </button>
          <span class="auth-text" id="auth-text">
            <a href="${pagePath("login.html")}">Login</a> &nbsp;/&nbsp;
            <a href="${pagePath("register.html")}">Register</a>
          </span>
          <div class="user-menu hidden" id="user-menu">
            <button class="user-trigger">
              <span class="avatar" id="user-avatar">A</span>
              <span id="user-name">Account</span>
              <span style="font-size:.7rem">▾</span>
            </button>
            <div class="user-dropdown">
              <a href="${pagePath("account.html")}">My Account</a>
              <a href="${pagePath("admin.html")}" id="admin-link" class="hidden">Admin Dashboard</a>
              <button id="logout-btn">Logout</button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <aside class="mobile-nav" id="mobile-nav">
      <div class="top">
        <a class="brand" href="${home()}">
          <img src="${base}images/logo.png" alt="" style="height:34px">
          <span style="font-weight:800">Mariel Store</span>
        </a>
        <button class="btn-icon" id="menu-close" aria-label="Close">✕</button>
      </div>
      ${NAV_ITEMS.map(i => `<a href="${i.href}" class="${i.key===PAGE_KEY?"active":""}">${i.label}</a>`).join("")}
      <hr style="border:0;border-top:1px solid var(--line);margin:12px 0">
      <a href="${pagePath("login.html")}">Login</a>
      <a href="${pagePath("register.html")}">Register</a>
    </aside>
  `;
}

function buildFooter() {
  const slot = $("#site-footer");
  if (!slot) return;
  slot.innerHTML = `
    <footer class="site-footer">
      <div class="container">
        <div class="footer-grid">
          <div>
            <a class="brand" href="${home()}">
              <img src="${base}images/logo.png" alt="">
              <span>Mariel Store</span>
            </a>
            <p>Your trusted online shop for quality appliances, gadgets and home essentials — delivered nationwide.</p>
          </div>
          <div class="footer-col">
            <h4>Shop</h4>
            <ul>
              <li><a href="${pagePath("products.html")}">All Products</a></li>
              <li><a href="${pagePath("products.html")}?cat=gadgets">Gadgets</a></li>
              <li><a href="${pagePath("products.html")}?cat=furnitures">Furnitures</a></li>
              <li><a href="${pagePath("products.html")}?cat=foods">Foods</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Company</h4>
            <ul>
              <li><a href="${pagePath("about.html")}">About Us</a></li>
              <li><a href="${pagePath("services.html")}">Services</a></li>
              <li><a href="${pagePath("contact.html")}">Contact</a></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>Contact</h4>
            <p><strong>Location:</strong> Philippines</p>
            <p><strong>Delivery:</strong> Nationwide</p>
            <p><strong>Payment:</strong> COD · Online · Installment</p>
          </div>
        </div>
        <div class="footer-bottom">© 2026 Mariel Store. All rights reserved.</div>
      </div>
    </footer>
  `;
}

function buildOverlays() {
  if ($("#scrim")) return;
  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <div class="scrim" id="scrim"></div>
    <aside class="drawer" id="cart-drawer" aria-label="Cart">
      <div class="drawer-head">
        <h3>Your Cart</h3>
        <button class="close" id="close-cart" aria-label="Close">✕</button>
      </div>
      <div class="drawer-body" id="cart-body"></div>
      <div class="drawer-foot">
        <div class="total"><span>Total</span><span class="amt" id="cart-total">₱0.00</span></div>
        <button class="btn btn-block" id="checkout-btn">Checkout</button>
      </div>
    </aside>
    <div class="toast-stack" id="toast-stack"></div>
  `;
  document.body.append(...wrap.children);
}

/* =========================================================
   TOAST
   ========================================================= */
function toast(msg, type = "") {
  const stack = $("#toast-stack");
  if (!stack) return;
  const t = document.createElement("div");
  t.className = "toast " + type;
  t.textContent = msg;
  stack.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

/* =========================================================
   CART
   ========================================================= */
const CART_KEY = "mariel_cart";
const getCart = () => { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch { return []; } };
const setCart = (c) => { localStorage.setItem(CART_KEY, JSON.stringify(c)); renderCart(); if (typeof renderProductDetail === "function") renderProductDetail(); };

function addToCart(item) {
  const cart = getCart();
  const found = cart.find(i => i.id === item.id);
  const prod = (typeof PRODUCTS !== "undefined") ? PRODUCTS.find(p => p.id === item.id) : null;
  const cap = prod && typeof prod.stock === "number" ? prod.stock : Infinity;
  const current = found ? found.qty : 0;
  if (current >= cap) { toast(`Only ${cap} ${item.name} available`, "bad"); return false; }
  if (found) found.qty += 1;
  else cart.push({ ...item, qty: 1 });
  setCart(cart);
  toast(`${item.name} added to cart`, "ok");
  return true;
}
function changeQty(id, delta) {
  const cart = getCart();
  const it = cart.find(i => i.id === id);
  if (!it) return;
  if (delta > 0) {
    const prod = (typeof PRODUCTS !== "undefined") ? PRODUCTS.find(p => p.id === id) : null;
    const cap = prod && typeof prod.stock === "number" ? prod.stock : Infinity;
    if (it.qty >= cap) { toast(`Only ${cap} available`, "bad"); return; }
  }
  it.qty += delta;
  if (it.qty <= 0) return setCart(cart.filter(i => i.id !== id));
  setCart(cart);
}
function removeFromCart(id) { setCart(getCart().filter(i => i.id !== id)); }

function renderCart() {
  const cart = getCart();
  const badge = $("#cart-badge");
  if (badge) {
    const total = cart.reduce((s, i) => s + i.qty, 0);
    badge.textContent = total;
    badge.style.display = total ? "grid" : "none";
  }
  const body = $("#cart-body");
  if (!body) return;
  if (cart.length === 0) {
    body.innerHTML = `<div class="empty"><div class="icon">🛍️</div><p>Your cart is empty</p></div>`;
  } else {
    body.innerHTML = cart.map(i => `
      <div class="cart-item">
        <img src="${i.img}" alt="${i.name}">
        <div>
          <div class="name">${i.name}</div>
          <div class="price">${peso(i.price)}</div>
          <div class="qty">
            <button data-act="dec" data-id="${i.id}">−</button>
            <span>${i.qty}</span>
            <button data-act="inc" data-id="${i.id}">+</button>
          </div>
        </div>
        <button class="remove" data-act="rm" data-id="${i.id}">Remove</button>
      </div>
    `).join("");
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalEl = $("#cart-total");
  if (totalEl) totalEl.textContent = peso(total);
}

function openCart() { $("#scrim")?.classList.add("open"); $("#cart-drawer")?.classList.add("open"); }
function closeCart() { $("#scrim")?.classList.remove("open"); $("#cart-drawer")?.classList.remove("open"); closeMenu(); }
function openMenu() { $("#scrim")?.classList.add("open"); $("#mobile-nav")?.classList.add("open"); }
function closeMenu() { $("#mobile-nav")?.classList.remove("open"); }

/* =========================================================
   WISHLIST
   ========================================================= */
const WISH_KEY = "mariel_wish";
const getWish = () => { try { return JSON.parse(localStorage.getItem(WISH_KEY)) || []; } catch { return []; } };
const setWish = (w) => localStorage.setItem(WISH_KEY, JSON.stringify(w));
function toggleWish(id) {
  const w = getWish();
  const idx = w.indexOf(id);
  const nowOn = idx < 0;
  if (nowOn) { w.push(id); toast("Saved to wishlist", "ok"); }
  else { w.splice(idx, 1); toast("Removed from wishlist"); }
  setWish(w);
  $$(`.wish[data-id="${id}"]`).forEach(b => {
    b.classList.toggle("on", nowOn);
    if (b.classList.contains("btn")) b.textContent = nowOn ? "♥ Wishlisted" : "♡ Wishlist";
    else b.textContent = nowOn ? "♥" : "♡";
  });
}

/* =========================================================
   PRODUCTS DATA
   - Loaded from Supabase (table: public.products) when available.
   - Falls back to this local seed list so the site keeps working
     even before the SQL schema has been applied.
   ========================================================= */
function resolveImg(src) {
  if (!src) return base + "images/logo.png";
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("/")) return src;
  return base + src.replace(/^\.?\//, "");
}

let PRODUCTS = [
  { id: "iphone14", name: "iPhone 14 Pro",             price: 50000, cat: "Gadgets",     img: resolveImg("images/products/Iphone14.jpg"),   tag: "Bestseller", desc: "128GB, factory unlocked, 1-year warranty.",                details: "6.1\" Super Retina XDR display, A16 Bionic chip, 48MP main camera, Face ID, 5G.",      stock: 3 },
  { id: "iphone12", name: "iPhone 12",                 price: 28000, cat: "Gadgets",     img: resolveImg("images/products/Iphone12.jpg"),   tag: "",           desc: "256GB, factory unlocked, 1-year warranty.",                details: "6.1\" OLED display, A14 Bionic chip, dual 12MP cameras, 5G capable.",                  stock: 7 },
  { id: "ipad",     name: "Apple iPad",                price: 22000, cat: "Gadgets",     img: resolveImg("images/products/Ipad.jpg"),       tag: "New",        desc: "128GB, 11th Gen(A16 Bionic) with Apple Pencil support.",   details: "10.9\" Liquid Retina display, A16 Bionic chip, Apple Pencil (2nd generation) support.", stock: 5 },
  { id: "clock",    name: "Wall Clock",                price: 200,   cat: "Accessories", img: resolveImg("images/products/Clock.jpg"),      tag: "",           desc: "Affordable, modern, durable for any room.",                 details: "30cm diameter, silent quartz movement, AA battery powered.",                            stock: 1 },
  { id: "snickers", name: "Mixed Chocolates Box",      price: 500,   cat: "Foods",       img: resolveImg("images/products/Snickers.jpg"),   tag: "Hot",        desc: "A Box of Mixed Chocolates, gift ready.",                    details: "A box with different kind of chocolates inside. All-time favorite!",                    stock: 13 },
  { id: "choco",    name: "Snickers, Dairy Milk Bars", price: 350,   cat: "Foods",       img: resolveImg("images/products/Chocolates.jpg"), tag: "",           desc: "Snickers and Dairy Milk Bars selling per box.",             details: "Classic combination, irresistible taste.",                                              stock: 22 },
  { id: "chair1",   name: "Set of Lounge Chairs",      price: 3000,  cat: "Furnitures",  img: resolveImg("images/products/chair1.jpg"),     tag: "New",        desc: "Comfortable, stylish, perfect for any living room.",        details: "3-seater, high-density foam cushions, durable fabric upholstery.",                      stock: 1 },
];

async function loadProducts() {
  if (!sb) return;
  try {
    const { data, error } = await sb
      .from("products")
      .select("id,name,price,cat,img,tag,description,details,stock,sort_order")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      console.warn("Using local product fallback —", error.message);
      return;
    }
    if (!data || !data.length) return;
    PRODUCTS = data.map(r => ({
      id: r.id,
      name: r.name,
      price: Number(r.price),
      cat: r.cat,
      img: resolveImg(r.img),
      tag: r.tag || "",
      desc: r.description || "",
      details: r.details || "",
      stock: Number(r.stock) || 0,
    }));
    renderFeatured();
    renderProducts();
    renderProductDetail();
    renderCart();
  } catch (e) {
    console.warn("loadProducts failed", e);
  }
}

async function isCurrentUserAdmin() {
  if (!sb) return false;
  try {
    const { data: sess } = await sb.auth.getSession();
    if (!sess?.session) return false;
    const { data, error } = await sb
      .from("admins")
      .select("user_id")
      .eq("user_id", sess.session.user.id)
      .maybeSingle();
    if (error) return false;
    return !!data;
  } catch { return false; }
}

const CATEGORIES = [
  { key: "all",         label: "All" },
  { key: "gadgets",     label: "Gadgets" },
  { key: "furnitures",  label: "Furnitures" },
  { key: "accessories", label: "Accessories" },
  { key: "foods",       label: "Foods" },
];

function productCard(p) {
  const wished = getWish().includes(p.id);
  const link = `${pagePath("product.html")}?id=${p.id}`;
  return `
    <article class="product">
      <a class="media" href="${link}">
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
        <img src="${p.img}" alt="${p.name}" loading="lazy">
      </a>
      <button class="wish ${wished?"on":""}" data-id="${p.id}" aria-label="Wishlist">${wished?"♥":"♡"}</button>
      <div class="info">
        <span class="cat-label">${p.cat}</span>
        <h3><a href="${link}">${p.name}</a></h3>
        <p class="muted" style="font-size:.85rem">${p.desc}</p>
        <div class="price">${peso(p.price)}</div>
      </div>
      <div class="actions">
        <a class="btn btn-outline" href="${link}">View</a>
      </div>
    </article>
  `;
}

function renderProducts() {
  const grid = $("#products-grid");
  if (!grid) return;

  // Build chips & search if not done
  const toolbar = $("#products-toolbar");
  if (toolbar && !toolbar.dataset.ready) {
    toolbar.dataset.ready = "1";
    toolbar.innerHTML = `
      <div class="search"><input type="search" id="product-search" placeholder="Search products..."></div>
      <div class="chips" id="cat-chips">
        ${CATEGORIES.map(c => `<button class="chip" data-cat="${c.key}">${c.label}</button>`).join("")}
      </div>
    `;
  }

  const params = new URLSearchParams(location.search);
  const initialCat = params.get("cat") || "all";
  if (!grid.dataset.cat) grid.dataset.cat = initialCat;
  const search = ($("#product-search")?.value || "").toLowerCase().trim();
  const cat = grid.dataset.cat;

  $$(".chip", $("#cat-chips")).forEach(b => b.classList.toggle("active", b.dataset.cat === cat));

  const list = PRODUCTS.filter(p =>
    (cat === "all" || p.cat.toLowerCase() === cat) &&
    (!search || p.name.toLowerCase().includes(search) || p.desc.toLowerCase().includes(search))
  );

  grid.innerHTML = list.length
    ? list.map(productCard).join("")
    : `<div class="empty" style="grid-column:1/-1"><div class="icon">🔍</div><p>No products match your search.</p></div>`;
}

function renderFeatured() {
  const grid = $("#featured-grid");
  if (!grid) return;
  grid.innerHTML = PRODUCTS.slice(0, 4).map(productCard).join("");
}

/* =========================================================
   PRODUCT DETAIL PAGE
   ========================================================= */
function renderProductDetail() {
  const host = $("#product-detail");
  if (!host) return;

  const id = new URLSearchParams(location.search).get("id");
  const p = PRODUCTS.find(x => x.id === id);

  if (!p) {
    host.innerHTML = `
      <div class="empty">
        <div class="icon">😕</div>
        <h2>Product not found</h2>
        <p class="muted">The item you're looking for doesn't exist.</p>
        <a class="btn" href="${pagePath("products.html")}">Back to Products</a>
      </div>`;
    const r = $("#related-grid"); if (r) r.innerHTML = "";
    return;
  }

  document.title = `${p.name} | Mariel Store`;
  const wished = getWish().includes(p.id);

  host.innerHTML = `
    <nav class="crumbs">
      <a href="${home()}">Home</a> / 
      <a href="${pagePath("products.html")}">Products</a> / 
      <a href="${pagePath("products.html")}?cat=${p.cat}">${p.cat}</a> / 
      <span>${p.name}</span>
    </nav>
    <div class="product-detail">
      <div class="pd-media">
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
        <img src="${p.img}" alt="${p.name}">
      </div>
      <div class="pd-info">
        <span class="cat-label">${p.cat}</span>
        <h1>${p.name}</h1>
        <div class="pd-price">${peso(p.price)}</div>
        <p class="pd-desc">${p.desc}</p>
        ${(() => {
          const inCart = (getCart().find(c => c.id === p.id)?.qty) || 0;
          const left = Math.max(0, (p.stock ?? 0) - inCart);
          const out = left <= 0;
          const dis = out ? "disabled" : "";
          return `
        <ul class="pd-meta">
          <li><strong>Availability:</strong> ${out ? `Out of stock (0 / ${p.stock})` : `${left} / ${p.stock} in stock`}</li>
          <li><strong>Category:</strong> ${p.cat}</li>
          <li><strong>Details:</strong> ${p.details || "—"}</li>
        </ul>
        <div class="pd-qty">
          <label>Quantity</label>
          <div class="qty-box">
            <button data-pd="dec" aria-label="Decrease" ${dis}>−</button>
            <input id="pd-qty-input" type="number" min="1" max="${Math.max(1, left)}" value="1" ${dis}>
            <button data-pd="inc" aria-label="Increase" ${dis}>+</button>
          </div>
        </div>
        <div class="pd-actions">
          <button class="btn add-cart" data-id="${p.id}" data-qty-from="#pd-qty-input" ${dis}>${out ? "Out of Stock" : "Add to Cart"}</button>
          <button class="wish btn btn-outline ${wished?"on":""}" data-id="${p.id}">${wished?"♥ Wishlisted":"♡ Wishlist"}</button>
        </div>`;
        })()}
      </div>
    </div>
  `;

  const related = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
  const r = $("#related-grid");
  if (r) r.innerHTML = (related.length ? related : PRODUCTS.filter(x => x.id !== p.id).slice(0, 4))
    .map(productCard).join("");
}

/* =========================================================
   REVEAL ON SCROLL
   ========================================================= */
function setupReveal() {
  const els = $$(".reveal");
  if (!els.length || !("IntersectionObserver" in window)) {
    els.forEach(e => e.classList.add("in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  els.forEach(e => io.observe(e));
}

/* =========================================================
   AUTH (Supabase) — kept from original, condensed
   ========================================================= */
const isStrong = (p) => /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
const setMsg = (id, msg, ok = false) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.toggle("ok", ok);
};
const getDisplayName = (u) => {
  const m = u?.user_metadata || {};
  return m.username || m.full_name || (u?.email ? u.email.split("@")[0] : "Account");
};

function bindPasswordHint(inputId, hintId) {
  const pw = $("#" + inputId);
  if (!pw) return;
  pw.addEventListener("input", () => {
    const v = pw.value;
    const hint = $("#" + hintId);
    if (!hint) return;
    if (!v) { hint.className = "hint"; hint.textContent = "Use uppercase, lowercase, number, and a special character."; return; }
    if (isStrong(v)) { hint.className = "hint ok"; hint.textContent = "Strong password ✓"; }
    else { hint.className = "hint bad"; hint.textContent = "Add uppercase, lowercase, number, and special character."; }
  });
}

function wireGoogleOAuth(btnId, msgId) {
  $("#" + btnId)?.addEventListener("click", async () => {
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: location.origin + "/pages/login.html" }
    });
    if (error) setMsg(msgId, error.message);
  });
}

async function updateAuthUI() {
  if (!sb) return;
  const { data } = await sb.auth.getSession();
  const userMenu = $("#user-menu");
  const authText = $("#auth-text");
  if (!data.session) {
    userMenu?.classList.add("hidden");
    authText?.classList.remove("hidden");
    return;
  }
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return;
  authText?.classList.add("hidden");
  userMenu?.classList.remove("hidden");
  const name = getDisplayName(u.user);
  $("#user-name").textContent = name;
  $("#user-avatar").textContent = (name[0] || "A").toUpperCase();
  $("#logout-btn").onclick = async () => {
    await sb.auth.signOut();
    location.href = home();
  };

  // Reveal the Admin link only for admin users
  isCurrentUserAdmin().then(isAdmin => {
    const link = $("#admin-link");
    if (link) link.classList.toggle("hidden", !isAdmin);
  });

  // redirect away from login/register if logged in
  if ((PAGE_KEY === "login" || PAGE_KEY === "register") && !location.hash.includes("type=recovery")) location.href = home();
}

function bindRegister() {
  const f = $("#register-form"); if (!f || !sb) return;
  bindPasswordHint("password", "password-hint");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = $("#username").value.trim();
    const fullName = $("#full-name").value.trim();
    const email = $("#email").value.trim();
    const password = $("#password").value;
    const confirm = $("#confirm-password").value;
    setMsg("form-message", "");
    if (!isStrong(password)) return setMsg("form-message", "Password is too weak.");
    if (password !== confirm) return setMsg("form-message", "Passwords do not match.");
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { username, full_name: fullName } }
    });
    if (error) return setMsg("form-message", error.message);
    setMsg("form-message", data.session ? "Registered. Redirecting..." : "Check your email to verify.", true);
    if (data.session) setTimeout(() => location.href = home(), 1200);
  });

  wireGoogleOAuth("google-register", "form-message");
}

function bindLogin() {
  const f = $("#login-form"); if (!f || !sb) return;
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = $("#login-email").value.trim();
    const password = $("#login-password").value;
    setMsg("login-message", "");
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return setMsg("login-message", error.message);
    setMsg("login-message", "Login successful. Redirecting...", true);
    setTimeout(() => location.href = home(), 900);
  });
  wireGoogleOAuth("google-login", "login-message");

  // Forgot password flow
  const forgotLink = $("#forgot-password-link");
  const forgotForm = $("#forgot-form");
  const cancelForgot = $("#cancel-forgot-btn");
  if (forgotLink && forgotForm) {
    forgotLink.addEventListener("click", () => {
      $("#forgot-email").value = $("#login-email").value.trim();
      forgotForm.classList.remove("hidden");
      f.classList.add("hidden");
      setMsg("forgot-message", "");
    });
    cancelForgot?.addEventListener("click", () => {
      forgotForm.classList.add("hidden");
      f.classList.remove("hidden");
    });
    forgotForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("#forgot-email").value.trim();
      if (!email) return setMsg("forgot-message", "Please enter your email.");
      setMsg("forgot-message", "Sending reset link...");
      const redirectTo = location.origin + "/pages/reset-password.html";
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return setMsg("forgot-message", error.message);
      setMsg("forgot-message", "Reset link sent. Check your email inbox (and spam).", true);
    });
  }
}

function bindResetPassword() {
  const f = $("#reset-form"); if (!f || !sb) return;
  bindPasswordHint("reset-password", "reset-password-hint");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = $("#reset-password").value;
    const confirm = $("#reset-confirm").value;
    setMsg("reset-message", "");
    if (!isStrong(password)) return setMsg("reset-message", "Password is too weak.");
    if (password !== confirm) return setMsg("reset-message", "Passwords do not match.");
    const { error } = await sb.auth.updateUser({ password });
    if (error) return setMsg("reset-message", error.message);
    setMsg("reset-message", "Password updated. Redirecting to login...", true);
    setTimeout(async () => {
      await sb.auth.signOut();
      location.href = pagePath("login.html");
    }, 1200);
  });
}

function bindChangePassword() {
  const f = $("#password-form"); if (!f || !sb) return;
  bindPasswordHint("new-password", "new-password-hint");
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const password = $("#new-password").value;
    const confirm = $("#confirm-new-password").value;
    setMsg("password-message", "");
    if (!isStrong(password)) return setMsg("password-message", "Password is too weak.");
    if (password !== confirm) return setMsg("password-message", "Passwords do not match.");
    const { error } = await sb.auth.updateUser({ password });
    if (error) return setMsg("password-message", error.message);
    setMsg("password-message", "Password updated successfully.", true);
    f.reset();
    const hint = $("#new-password-hint");
    if (hint) { hint.className = "hint"; hint.textContent = "Use uppercase, lowercase, number, and a special character."; }
  });
}

async function loadAccount() {
  const u1 = $("#account-username"); if (!u1 || !sb) return;
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) { location.href = pagePath("login.html"); return; }
  const u = data.user, m = u.user_metadata || {};
  const username = m.username || u.email?.split("@")[0] || "—";
  const fullName = m.full_name || "—";
  const phone = m.phone || u.phone || "—";
  u1.textContent = username;
  $("#account-full-name").textContent = fullName;
  $("#account-email").textContent = u.email || "—";
  $("#account-phone").textContent = phone;
  bindAccountEdit(u, m);
}

function bindAccountEdit(u, m) {
  const editBtn = $("#edit-profile-btn");
  const cancelBtn = $("#cancel-edit-btn");
  const form = $("#account-edit");
  const view = $("#account-view");
  if (!editBtn || !form || !view) return;
  if (form.dataset.bound) return;
  form.dataset.bound = "1";

  const openEdit = () => {
    $("#edit-username").value = m.username || (u.email?.split("@")[0] || "");
    $("#edit-full-name").value = m.full_name || "";
    $("#edit-email").value = u.email || "";
    $("#edit-phone").value = m.phone || u.phone || "";
    setMsg("edit-message", "");
    view.classList.add("hidden");
    form.classList.remove("hidden");
    editBtn.classList.add("hidden");
  };
  const closeEdit = () => {
    form.classList.add("hidden");
    view.classList.remove("hidden");
    editBtn.classList.remove("hidden");
  };

  editBtn.onclick = openEdit;
  cancelBtn.onclick = closeEdit;

  form.onsubmit = async (e) => {
    e.preventDefault();
    const username = $("#edit-username").value.trim();
    const full_name = $("#edit-full-name").value.trim();
    const phone = $("#edit-phone").value.trim();
    if (!username) return setMsg("edit-message", "Username is required.");
    if (!full_name) return setMsg("edit-message", "Full name is required.");
    setMsg("edit-message", "Saving...");
    const { data, error } = await sb.auth.updateUser({
      data: { ...m, username, full_name, phone }
    });
    if (error) return setMsg("edit-message", error.message);
    const newMeta = data?.user?.user_metadata || { username, full_name, phone };
    $("#account-username").textContent = newMeta.username || "—";
    $("#account-full-name").textContent = newMeta.full_name || "—";
    $("#account-phone").textContent = newMeta.phone || "—";
    setMsg("edit-message", "Profile updated.", true);
    Object.assign(m, newMeta);
    if (typeof updateAuthUI === "function") updateAuthUI();
    setTimeout(closeEdit, 700);
  };
}

/* =========================================================
   ADMIN PAGE
   ========================================================= */
async function bindAdmin() {
  const app = $("#admin-app");
  if (!app || !sb) return;

  const loading = $("#admin-loading");
  const denied = $("#admin-denied");
  const showState = (state) => {
    loading?.classList.toggle("hidden", state !== "loading");
    denied?.classList.toggle("hidden", state !== "denied");
    app.classList.toggle("hidden", state !== "ok");
  };

  // Require login + admin
  const { data: sess } = await sb.auth.getSession();
  if (!sess?.session) { location.href = pagePath("login.html"); return; }
  const isAdmin = await isCurrentUserAdmin();
  if (!isAdmin) { showState("denied"); return; }
  showState("ok");

  const form = $("#admin-product-form");
  const titleEl = $("#admin-form-title");
  const cancelBtn = $("#admin-cancel-edit-btn");
  const idInput = $("#p-id");

  const fillForm = (p) => {
    $("#p-original-id").value = p?.id || "";
    idInput.value = p?.id || "";
    idInput.disabled = !!p;
    $("#p-name").value = p?.name || "";
    $("#p-price").value = p?.price ?? "";
    $("#p-stock").value = p?.stock ?? 0;
    $("#p-cat").value = p?.cat || "Gadgets";
    $("#p-tag").value = p?.tag || "";
    $("#p-img").value = p?.img || "";
    $("#p-desc").value = p?.description || "";
    $("#p-details").value = p?.details || "";
    $("#p-sort").value = p?.sort_order ?? 0;
    titleEl.innerHTML = p ? `Edit <em>Product</em>` : `Add <em>Product</em>`;
    cancelBtn.classList.toggle("hidden", !p);
    setMsg("admin-form-message", "");
  };

  fillForm(null);

  $("#admin-reset-btn").onclick = () => fillForm(null);
  cancelBtn.onclick = () => fillForm(null);

  async function refreshTable() {
    const tbody = $("#admin-product-rows");
    tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:18px">Loading…</td></tr>`;
    const { data, error } = await sb
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:18px">Error loading: ${error.message}</td></tr>`;
      return;
    }
    $("#admin-count").textContent = `${data.length} item${data.length === 1 ? "" : "s"}`;
    if (!data.length) {
      tbody.innerHTML = `<tr><td colspan="7" class="muted" style="text-align:center;padding:18px">No products yet — add your first one above.</td></tr>`;
      return;
    }
    tbody.innerHTML = data.map(p => `
      <tr>
        <td><img src="${resolveImg(p.img)}" alt="" class="admin-thumb" onerror="this.style.opacity='.3'"></td>
        <td>
          <div style="font-weight:600">${escapeHtml(p.name)}</div>
          <div class="muted" style="font-size:.78rem">${escapeHtml(p.id)}</div>
        </td>
        <td>${escapeHtml(p.cat)}</td>
        <td>${peso(p.price)}</td>
        <td>${p.stock}</td>
        <td>${p.tag ? `<span class="tag-pill">${escapeHtml(p.tag)}</span>` : "—"}</td>
        <td class="admin-actions">
          <button class="btn btn-outline btn-sm" data-admin="edit" data-id="${escapeAttr(p.id)}">Edit</button>
          <button class="btn btn-sm btn-danger" data-admin="del" data-id="${escapeAttr(p.id)}">Delete</button>
        </td>
      </tr>
    `).join("");

    // Wire row buttons
    tbody.querySelectorAll('[data-admin="edit"]').forEach(b => {
      b.onclick = () => {
        const row = data.find(r => r.id === b.dataset.id);
        if (!row) return;
        fillForm(row);
        form.scrollIntoView({ behavior: "smooth", block: "start" });
      };
    });
    tbody.querySelectorAll('[data-admin="del"]').forEach(b => {
      b.onclick = async () => {
        if (!confirm(`Delete "${b.dataset.id}"? This cannot be undone.`)) return;
        const { error } = await sb.from("products").delete().eq("id", b.dataset.id);
        if (error) return toast(error.message, "bad");
        toast("Product deleted", "ok");
        await refreshTable();
        await loadProducts();
      };
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();
    setMsg("admin-form-message", "Saving...");
    const originalId = $("#p-original-id").value;
    const editing = !!originalId;
    const payload = {
      id: idInput.value.trim(),
      name: $("#p-name").value.trim(),
      price: Number($("#p-price").value),
      stock: parseInt($("#p-stock").value, 10) || 0,
      cat: $("#p-cat").value,
      tag: $("#p-tag").value.trim() || null,
      img: $("#p-img").value.trim() || null,
      description: $("#p-desc").value.trim() || null,
      details: $("#p-details").value.trim() || null,
      sort_order: parseInt($("#p-sort").value, 10) || 0,
    };
    if (!payload.id || !/^[a-z0-9_\-]+$/.test(payload.id))
      return setMsg("admin-form-message", "Product ID must be lowercase letters, numbers, hyphens or underscores.");
    if (!payload.name) return setMsg("admin-form-message", "Name is required.");
    if (!(payload.price >= 0)) return setMsg("admin-form-message", "Price must be a non-negative number.");

    const q = editing
      ? sb.from("products").update(payload).eq("id", originalId)
      : sb.from("products").insert(payload);
    const { error } = await q;
    if (error) return setMsg("admin-form-message", error.message);

    setMsg("admin-form-message", editing ? "Product updated." : "Product added.", true);
    fillForm(null);
    await refreshTable();
    await loadProducts();
  };

  await refreshTable();
}

function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

/* =========================================================
   GLOBAL EVENT WIRING
   ========================================================= */
function wireEvents() {
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act], [data-id], [data-pd], #open-cart, #close-cart, #scrim, #menu-open, #menu-close, .add-cart, .wish, .chip, #checkout-btn");
    if (!t) return;

    if (t.id === "open-cart") return openCart();
    if (t.id === "close-cart" || t.id === "scrim") return closeCart();
    if (t.id === "menu-open") return openMenu();
    if (t.id === "menu-close") return closeMenu();

    if (t.classList.contains("add-cart")) {
      const p = PRODUCTS.find(x => x.id === t.dataset.id);
      if (!p) return;
      let qty = 1;
      if (t.dataset.qtyFrom) {
        const inp = document.querySelector(t.dataset.qtyFrom);
        qty = Math.max(1, parseInt(inp?.value, 10) || 1);
      }
      for (let i = 0; i < qty; i++) {
        if (!addToCart({ id: p.id, name: p.name, price: p.price, img: p.img })) break;
      }
      return;
    }
    if (t.dataset.pd === "inc" || t.dataset.pd === "dec") {
      const inp = $("#pd-qty-input");
      if (!inp) return;
      const max = parseInt(inp.max, 10) || Infinity;
      let v = (parseInt(inp.value, 10) || 1) + (t.dataset.pd === "inc" ? 1 : -1);
      v = Math.max(1, Math.min(max, v));
      if (t.dataset.pd === "inc" && v === parseInt(inp.value, 10)) toast(`Only ${max} available`, "bad");
      inp.value = v;
      return;
    }
    if (t.classList.contains("wish")) return toggleWish(t.dataset.id);
    if (t.classList.contains("chip")) {
      const grid = $("#products-grid");
      if (grid) { grid.dataset.cat = t.dataset.cat; renderProducts(); }
      return;
    }
    if (t.id === "checkout-btn") {
      if (getCart().length === 0) return toast("Your cart is empty", "bad");
      (async () => {
        let loggedIn = false;
        if (sb) {
          const { data } = await sb.auth.getSession();
          loggedIn = !!data.session;
        }
        if (!loggedIn) {
          toast("Please create an account to checkout", "bad");
          closeCart();
          setTimeout(() => location.href = pagePath("register.html"), 800);
          return;
        }
        setCart([]);
        closeCart();
        toast("Order placed! We'll contact you soon.", "ok");
      })();
      return;
    }

    // cart drawer item buttons
    if (t.dataset.act === "inc") changeQty(t.dataset.id, +1);
    if (t.dataset.act === "dec") changeQty(t.dataset.id, -1);
    if (t.dataset.act === "rm") removeFromCart(t.dataset.id);
  });

  document.addEventListener("input", (e) => {
    if (e.target.id === "product-search") renderProducts();
  });
}

/* =========================================================
   INIT
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  buildHeader();
  buildFooter();
  buildOverlays();
  renderCart();
  renderFeatured();
  renderProducts();
  renderProductDetail();
  setupReveal();
  wireEvents();
  bindRegister();
  bindLogin();
  bindResetPassword();
  bindChangePassword();
  loadAccount();
  if (sb) updateAuthUI();
  loadProducts();
  bindAdmin();
});
