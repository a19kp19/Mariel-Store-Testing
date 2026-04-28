/* =========================================================
   Mariel Store — main script (runs on every page)
   ---------------------------------------------------------
   This is a STATIC website. There is NO server and NO database.
   Everything (users, cart, orders, etc.) is saved inside the
   browser using localStorage. Closing the tab keeps the data,
   but clearing browser data wipes it.

   Map of this file (use Find / Ctrl+F on the headers below):

     1.  HELPERS              tiny shortcut functions used everywhere
     2.  LOCAL STORAGE STORE  read / write data in the browser
     3.  AUTH HELPERS         who is logged in right now?
     4.  PAGE & NAV           the header, footer, mobile menu
     5.  TOAST                pop-up message in the corner
     6.  CART                 add / remove / change quantity
     7.  WISHLIST             save items the user "♥"-ed
     8.  PRODUCTS             the list of items shown in the shop
     9.  PRODUCT DETAIL       single product page (product.html?id=...)
     10. REVEAL ON SCROLL     fade-in effect when you scroll down
     11. AUTH FORMS           register / login / change password
     12. ACCOUNT              show + edit profile
     13. GLOBAL EVENT WIRING  one click listener that handles buttons
     14. ADDRESSES            up to 3 saved delivery addresses
     15. CHECKOUT             checkout page + region/province/city menus
     16. ORDERS               list of past orders + single order page
     17. INIT                 runs once when the page is loaded

   Things to remember:
   - Always read/write data with LS.* + readJSON / writeJSON
     (don't call localStorage directly — it keeps things tidy).
   - Always look up elements with $("#id") or $$(".class")
     (no need to type document.querySelector every time).
   - Anything the user types (name, address, etc.) must go
     through escapeHtml() before it touches innerHTML, otherwise
     a "<" can break the page.
   - Passwords here are stored in plain localStorage. That's
     OKAY for a school project, but NOT safe for a real shop.
   ========================================================= */

/* =========================================================
   1. HELPERS — tiny shortcut functions
   ========================================================= */

// $ ("dollar") = quick way to write document.querySelector.
//   $("#cart") → first element with id="cart"
//   $(".btn") → first element with class="btn"
// $$ returns ALL matches as a real Array (so .map / .forEach work).
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

// Pages live in /pages/ but index.html lives at the root.
// These helpers build links that work from BOTH locations.
const onPagesPath = () => location.pathname.includes("/pages/");
const base        = onPagesPath() ? "../" : "";                    // "../" or ""
const pagePath    = (file) => onPagesPath() ? file : `pages/${file}`;
const home        = () => onPagesPath() ? "../index.html" : "index.html";

// Format a number as Philippine peso, e.g. peso(1500) → "₱1,500.00"
const peso = (n) => "₱" + Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Make a random id string. Used for new users, orders, addresses.
const uid  = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

// Show ONE element from a group and hide the others.
// Used by checkout and orders to switch between
// "loading…", "empty cart", and the real content.
//   map    : { name: elementOrId, ... }
//   active : the name to show
function setVisibleState(map, active) {
  for (const [name, target] of Object.entries(map)) {
    const el = typeof target === "string" ? document.getElementById(target) : target;
    el?.classList.toggle("hidden", name !== active);
  }
}

// Build the HTML for an "empty" / "not found" message card.
//   icon  : an emoji like "🛒"
//   title : big heading (pass "" to skip)
//   text  : the message under the icon
//   btn   : optional [label, href] for a button at the bottom
//   attr  : optional extra attributes on the wrapper div
const emptyState = (icon, title, text, btn, attr = "") => `
    <div class="empty"${attr}>
      <div class="icon">${icon}</div>
      ${title ? `<h2>${title}</h2>` : ""}
      ${text ? `<p${title ? ` class="muted"` : ""}>${text}</p>` : ""}
      ${btn ? `<a class="btn" href="${btn[1]}">${btn[0]}</a>` : ""}
    </div>`;

// Replace dangerous characters (< > & " ') so user text can be
// safely placed inside innerHTML without breaking the page.
function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
const escapeAttr = escapeHtml; // same function, friendlier name when used inside attributes

/* =========================================================
   2. LOCAL STORAGE STORE — saves data in the browser
   ========================================================= */

// Every piece of data is stored under a unique "key".
// Keeping the keys in one object makes typos impossible.
const LS = {
  USERS:    "mariel.users",                          // every registered user
  SESSION:  "mariel.session",                        // who is currently logged in
  ADDR:     (uid) => `mariel.addresses.${uid}`,      // saved delivery addresses (per user)
  ORDERS:   (uid) => `mariel.orders.${uid}`,         // past orders (per user)
  PRODUCTS: "mariel.products",                       // updated stock counts
  CART:     "mariel.cart",                           // current cart contents
  WISH:     "mariel.wish",                           // wishlisted product ids
};

// Read a value from localStorage. If anything goes wrong
// (no value yet, or bad JSON), give back the fallback `fb`.
const readJSON  = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } };
// Save a value (we always save as JSON so we can read objects/arrays).
const writeJSON = (k, v)  => localStorage.setItem(k, JSON.stringify(v));

/* =========================================================
   3. AUTH HELPERS — who is logged in right now?
   ========================================================= */
const getUsers   = () => readJSON(LS.USERS, []);   // every account
const setUsers   = (a) => writeJSON(LS.USERS, a);  // overwrite the list of accounts

// Returns the id stored in the session, or null if nobody is signed in.
const currentUserId = () => readJSON(LS.SESSION, null)?.userId || null;
// Returns the FULL user object for whoever is signed in (or null).
const currentUser   = () => {
  const id = currentUserId();
  if (!id) return null;
  return getUsers().find(u => u.id === id) || null;
};
const signOut = () => localStorage.removeItem(LS.SESSION);  // forget the session
const signIn  = (id) => writeJSON(LS.SESSION, { userId: id }); // remember this user

/* =========================================================
   4. PAGE & NAV — header, footer, mobile menu
   ========================================================= */

// Each HTML page sets <body data-page="..."> so we know which
// nav link should be highlighted as "active".
const PAGE_KEY = document.body.dataset.page || "home";

// One source of truth for the navigation links.
// Add or remove an item here to update header AND mobile menu.
const NAV_ITEMS = [
  { key: "home",     label: "Home",     href: home() },
  { key: "products", label: "Products", href: pagePath("products.html") },
  { key: "services", label: "Services", href: pagePath("services.html") },
  { key: "about",    label: "About",    href: pagePath("about.html") },
  { key: "contact",  label: "Contact",  href: pagePath("contact.html") },
];

// Build the top header (logo + nav links + cart + login/account menu).
// The page only needs an empty <div id="site-header"></div>; we fill it.
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
          <button class="btn-icon" id="open-cart" aria-label="Open cart">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 12.3a2 2 0 0 0 2 1.7h7.6a2 2 0 0 0 2-1.5L21 8H6"/><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/></svg>
            <span class="badge" id="cart-count">0</span>
          </button>

          <span class="auth-text" id="auth-text">
            <a href="${pagePath("login.html")}">Login</a> /
            <a href="${pagePath("register.html")}">Register</a>
          </span>

          <div class="user-menu hidden" id="user-menu">
            <button class="user-trigger" id="user-toggle" aria-label="Account menu">
              <span class="avatar" id="user-avatar">A</span>
              <span id="user-name">Account</span>
            </button>
            <div class="user-dropdown" id="user-dropdown">
              <a href="${pagePath("account.html")}">My Account</a>
              <a href="${pagePath("orders.html")}">My Orders</a>
              <button id="logout-btn">Sign out</button>
            </div>
          </div>
        </div>
      </div>
    </header>
  `;
  $("#user-toggle")?.addEventListener("click", () => $("#user-dropdown")?.classList.toggle("open"));
  document.addEventListener("click", (e) => {
    if (!e.target.closest("#user-menu")) $("#user-dropdown")?.classList.remove("open");
  });
}

// Build the dark footer at the bottom of every page.
// Same idea as buildHeader — fills in <div id="site-footer">.
function buildFooter() {
  const year = new Date().getFullYear();
  if (document.querySelector(".site-footer")) return; // already built? skip.
  const f = document.createElement("footer");
  f.className = "site-footer";
  f.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-col">
        <a class="brand" href="${home()}">
          <img src="${base}images/logo.png" alt="Mariel Store">
          <span>Mariel Store</span>
        </a>
        <p style="margin-top:10px">Affordable, reliable shopping across the Philippines.</p>
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
          <li><a href="${pagePath("about.html")}">About</a></li>
          <li><a href="${pagePath("services.html")}">Services</a></li>
          <li><a href="${pagePath("contact.html")}">Contact</a></li>
        </ul>
      </div>
      <div class="footer-col">
        <h4>Help</h4>
        <ul>
          <li><a href="${pagePath("orders.html")}">My Orders</a></li>
          <li><a href="${pagePath("account.html")}">My Account</a></li>
        </ul>
      </div>
    </div>
    <div class="footer-bottom container">
      <span>© ${year} Mariel Store. All rights reserved.</span>
    </div>
  `;
  const slot = document.getElementById("site-footer");
  if (slot) slot.replaceWith(f);
  else document.body.appendChild(f);
}

// Build the things that "float" on top of the page:
//   - the dark backdrop (.scrim)
//   - the slide-out cart drawer
//   - the mobile hamburger menu
//   - the toast notification stack
// They start hidden until something opens them.
function buildOverlays() {
  if ($("#scrim")) return; // already built? skip.
  const div = document.createElement("div");
  div.innerHTML = `
    <div id="scrim" class="scrim"></div>
    <aside id="cart-drawer" class="drawer" aria-label="Cart">
      <div class="drawer-head">
        <h3>Your Cart</h3>
        <button id="close-cart" class="close" aria-label="Close">✕</button>
      </div>
      <div id="cart-items" class="drawer-body"></div>
      <div class="drawer-foot">
        <div class="total"><span>Total</span><strong id="cart-total" class="amt">₱0.00</strong></div>
        <button class="btn btn-block" id="checkout-btn">Checkout</button>
      </div>
    </aside>
    <nav id="mobile-nav" class="mobile-nav" aria-label="Mobile">
      <div class="top">
        <span class="brand-mini">Menu</span>
        <button id="menu-close" class="close" aria-label="Close menu">✕</button>
      </div>
      ${NAV_ITEMS.map(i => `<a href="${i.href}"${i.key === PAGE_KEY ? ' class="active"' : ""}>${i.label}</a>`).join("")}
      <div class="mobile-nav-auth">
        <div id="mobile-auth-text">
          <a href="${pagePath("login.html")}" class="btn btn-block">Login</a>
          <a href="${pagePath("register.html")}" class="btn btn-outline btn-block">Register</a>
        </div>
        <div id="mobile-user-menu" class="hidden">
          <a href="${pagePath("account.html")}">My Account</a>
          <a href="${pagePath("orders.html")}">My Orders</a>
          <button type="button" id="mobile-logout-btn" class="link-btn">Sign out</button>
        </div>
      </div>
    </nav>
    <div id="toast-stack" class="toast-stack"></div>
  `;
  document.body.appendChild(div);
}

/* =========================================================
   5. TOAST — small pop-up message in the corner
   ========================================================= */

// Show a small message that disappears after 3 seconds.
//   type: "" (default), "ok" (green), or "bad" (red).
function toast(msg, type = "") {
  const stack = $("#toast-stack"); if (!stack) return alert(msg);
  const el = document.createElement("div");
  el.className = "toast " + type;
  el.textContent = msg;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* =========================================================
   6. CART — items the user wants to buy
   ========================================================= */

// The cart is just an Array of { id, name, price, img, qty } objects.
const getCart = () => readJSON(LS.CART, []);
// setCart saves AND re-draws the cart UI in one step.
const setCart = (c) => { writeJSON(LS.CART, c); renderCart(); };

// Add one of `item` to the cart, but never go over the product's stock.
// Returns true if it was added, false if the limit was hit.
function addToCart(item) {
  const cart = getCart();
  const found = cart.find(i => i.id === item.id);   // already in cart?
  const product = PRODUCTS.find(p => p.id === item.id);
  const max = product?.stock ?? Infinity;           // how many we can add at most
  const have = found?.qty || 0;                     // how many are already in the cart
  if (have + 1 > max) { toast(`Only ${max} available`, "bad"); return false; }
  if (found) found.qty += 1;                        // bump the quantity
  else cart.push({ ...item, qty: 1 });              // brand new line
  setCart(cart);
  toast("Added to cart", "ok");
  return true;
}

// Increase / decrease a line. delta is +1 or -1. Stays between 1 and stock.
function changeQty(id, delta) {
  const cart = getCart();
  const i = cart.find(x => x.id === id); if (!i) return;
  const product = PRODUCTS.find(p => p.id === id);
  const max = product?.stock ?? Infinity;
  i.qty = Math.max(1, Math.min(max, i.qty + delta));
  setCart(cart);
}
// Remove a line completely.
function removeFromCart(id) { setCart(getCart().filter(i => i.id !== id)); }

// Re-draw the cart drawer and the little number badge on the cart icon.
function renderCart() {
  const list = $("#cart-items");
  const count = $("#cart-count");
  const total = $("#cart-total");
  const cart = getCart();
  if (count) count.textContent = cart.reduce((s, i) => s + i.qty, 0);
  if (!list || !total) return;
  if (!cart.length) {
    list.innerHTML = emptyState("🛒", "", "Your cart is empty.");
    total.textContent = peso(0);
    return;
  }
  list.innerHTML = cart.map(i => `
    <div class="cart-item">
      <img src="${i.img}" alt="">
      <div>
        <div class="name">${escapeHtml(i.name)}</div>
        <div class="price">${peso(i.price)}</div>
        <div class="qty">
          <button data-act="dec" data-id="${i.id}">−</button>
          <span>${i.qty}</span>
          <button data-act="inc" data-id="${i.id}">+</button>
        </div>
        <button class="remove" data-act="rm" data-id="${i.id}">Remove</button>
      </div>
      <div class="line-total">${peso(i.price * i.qty)}</div>
    </div>
  `).join("");
  total.textContent = peso(cart.reduce((s, i) => s + i.price * i.qty, 0));
}

// Slide-out cart and mobile menu open/close.
// They share the same dark backdrop (#scrim) so we toggle it here too.
function openCart()  { $("#scrim")?.classList.add("open");    $("#cart-drawer")?.classList.add("open"); }
function closeCart() { $("#scrim")?.classList.remove("open"); $("#cart-drawer")?.classList.remove("open"); closeMenu(); }
function openMenu()  { $("#scrim")?.classList.add("open");    $("#mobile-nav")?.classList.add("open"); }
function closeMenu() { $("#mobile-nav")?.classList.remove("open"); }

/* =========================================================
   7. WISHLIST — items the user has "♥"-ed
   ========================================================= */

// The wishlist is just an Array of product ids (strings).
const getWish = () => readJSON(LS.WISH, []);

// Click the heart on a product → if it's in the list, remove it. Otherwise add it.
// Then refresh anywhere a product card might be showing the heart.
function toggleWish(id) {
  const list = getWish();
  const idx = list.indexOf(id);
  if (idx >= 0) { list.splice(idx, 1); toast("Removed from wishlist"); }
  else { list.push(id); toast("Added to wishlist", "ok"); }
  writeJSON(LS.WISH, list);
  renderProducts();
  renderFeatured();
  renderProductDetail();
}

/* =========================================================
   8. PRODUCTS — the items shown in the shop
   ========================================================= */

// Turn a product image into a real URL that works from any page.
// Accepts:  "images/x.jpg"  →  prefixes with "../" if we're inside /pages/
//           "https://..."   →  returned as-is (external image)
//           ""              →  uses the logo as a fallback
function resolveImg(src) {
  if (!src) return base + "images/logo.png";
  if (/^(https?:)?\/\//i.test(src) || src.startsWith("/")) return src;
  return base + src.replace(/^\.?\//, "");
}

// The starting catalog. localStorage may later overwrite stock numbers
// after orders are placed, but the names/prices/images live here.
const DEFAULT_PRODUCTS = [
  { id: "iphone14", name: "iPhone 14 Pro",             price: 50000, cat: "Gadgets",     img: "images/products/Iphone14.jpg",   tag: "Bestseller", desc: "128GB, factory unlocked, 1-year warranty.",                details: "6.1\" Super Retina XDR display, A16 Bionic chip, 48MP main camera, Face ID, 5G.",      stock: 3,  sort_order: 1 },
  { id: "iphone12", name: "iPhone 12",                 price: 28000, cat: "Gadgets",     img: "images/products/Iphone12.jpg",   tag: "",           desc: "256GB, factory unlocked, 1-year warranty.",                details: "6.1\" OLED display, A14 Bionic chip, dual 12MP cameras, 5G capable.",                  stock: 7,  sort_order: 2 },
  { id: "ipad",     name: "Apple iPad",                price: 22000, cat: "Gadgets",     img: "images/products/Ipad.jpg",       tag: "New",        desc: "128GB, 11th Gen(A16 Bionic) with Apple Pencil support.",   details: "10.9\" Liquid Retina display, A16 Bionic chip, Apple Pencil (2nd generation) support.", stock: 5,  sort_order: 3 },
  { id: "clock",    name: "Wall Clock",                price: 200,   cat: "Accessories", img: "images/products/Clock.jpg",      tag: "",           desc: "Affordable, modern, durable for any room.",                 details: "30cm diameter, silent quartz movement, AA battery powered.",                            stock: 1,  sort_order: 4 },
  { id: "snickers", name: "Mixed Chocolates Box",      price: 500,   cat: "Foods",       img: "images/products/Snickers.jpg",   tag: "Hot",        desc: "A Box of Mixed Chocolates, gift ready.",                    details: "A box with different kind of chocolates inside. All-time favorite!",                    stock: 13, sort_order: 5 },
  { id: "choco",    name: "Snickers, Dairy Milk Bars", price: 350,   cat: "Foods",       img: "images/products/Chocolates.jpg", tag: "",           desc: "Snickers and Dairy Milk Bars selling per box.",             details: "Classic combination, irresistible taste.",                                              stock: 22, sort_order: 6 },
  { id: "chair1",   name: "Set of Lounge Chairs",      price: 3000,  cat: "Furnitures",  img: "images/products/chair1.jpg",     tag: "New",        desc: "Comfortable, stylish, perfect for any living room.",        details: "3-seater, high-density foam cushions, durable fabric upholstery.",                      stock: 1,  sort_order: 7 },
];

// PRODUCTS = the live list used everywhere on the page.
// We load it from localStorage if available, otherwise from DEFAULT_PRODUCTS.
let PRODUCTS = loadProductsFromStore();

// Build the live PRODUCTS list: pick the source, sort by sort_order,
// and turn each image path into a real URL.
function loadProductsFromStore() {
  const stored = readJSON(LS.PRODUCTS, null);
  const src = stored && Array.isArray(stored) && stored.length ? stored : DEFAULT_PRODUCTS;
  return src
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(p => ({ ...p, img: resolveImg(p.img) }));
}

// Save a new product list (e.g. after stock decreased) and refresh PRODUCTS.
// We strip "../" from images before saving so other pages can re-resolve them.
function persistProducts(list) {
  writeJSON(LS.PRODUCTS, list.map(p => ({ ...p, img: stripBase(p.img) })));
  PRODUCTS = loadProductsFromStore();
}
// Undo what resolveImg() added — gives back "images/x.jpg".
function stripBase(src) {
  if (!src) return src;
  if (base && src.startsWith(base)) return src.slice(base.length);
  return src;
}

// Categories used by the filter chips on the products page.
const CATEGORIES = [
  { key: "all",         label: "All" },
  { key: "gadgets",     label: "Gadgets" },
  { key: "furnitures",  label: "Furnitures" },
  { key: "accessories", label: "Accessories" },
  { key: "foods",       label: "Foods" },
];

// Build the HTML for ONE product card (used in featured + products grid).
function productCard(p) {
  const wished = getWish().includes(p.id);
  const link = `${pagePath("product.html")}?id=${p.id}`;
  return `
    <article class="product">
      <a class="media" href="${link}">
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
        <img src="${p.img}" alt="${escapeHtml(p.name)}" loading="lazy">
      </a>
      <button class="wish ${wished?"on":""}" data-id="${p.id}" aria-label="Wishlist">${wished?"♥":"♡"}</button>
      <div class="info">
        <span class="cat-label">${escapeHtml(p.cat)}</span>
        <h3><a href="${link}">${escapeHtml(p.name)}</a></h3>
        <p class="muted" style="font-size:.85rem">${escapeHtml(p.desc)}</p>
        <div class="price">${peso(p.price)}</div>
      </div>
      <div class="actions">
        <a class="btn btn-outline" href="${link}">View</a>
      </div>
    </article>
  `;
}

// Re-draw the full products page: search box, category chips, and the grid.
// Filters by the active chip + the search input every time.
function renderProducts() {
  const grid = $("#products-grid");
  if (!grid) return;  // not on the products page → do nothing

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
    (!search || p.name.toLowerCase().includes(search) || (p.desc || "").toLowerCase().includes(search))
  );

  grid.innerHTML = list.length
    ? list.map(productCard).join("")
    : emptyState("🔍", "", "No products match your search.", null, ' style="grid-column:1/-1"');
}

// Show the first 4 products on the home page.
function renderFeatured() {
  const grid = $("#featured-grid");
  if (!grid) return;  // not on the home page → do nothing
  grid.innerHTML = PRODUCTS.slice(0, 4).map(productCard).join("");
}

/* =========================================================
   9. PRODUCT DETAIL — single product page
   ========================================================= */

// Fills #product-detail with the product chosen by ?id=... in the URL.
function renderProductDetail() {
  const host = $("#product-detail");
  if (!host) return;

  const id = new URLSearchParams(location.search).get("id");
  const p = PRODUCTS.find(x => x.id === id);

  if (!p) {
    host.innerHTML = emptyState("😕", "Product not found",
      "It may have been removed or the link is invalid.",
      ["Back to Products", "products.html"]);
    return;
  }

  const wished = getWish().includes(p.id);
  const stockText = p.stock > 0 ? `${p.stock} in stock` : "Out of stock";
  const stockClass = p.stock > 0 ? "stock-pill in" : "stock-pill out";
  const stockLine = `<span class="${stockClass}">${stockText}</span>`;

  host.innerHTML = `
    <p class="crumbs"><a href="${pagePath("products.html")}">Products</a> / <span>${escapeHtml(p.name)}</span></p>
    <div class="product-detail">
      <div class="pd-media">
        ${p.tag ? `<span class="tag">${p.tag}</span>` : ""}
        <img src="${p.img}" alt="${escapeHtml(p.name)}">
      </div>
      <div class="pd-info">
        <span class="eyebrow">${escapeHtml(p.cat)}</span>
        <h1>${escapeHtml(p.name)}</h1>
        <div class="pd-price">${peso(p.price)}${stockLine}</div>
        <p class="pd-desc">${escapeHtml(p.desc)}</p>
        ${p.details ? `<ul class="pd-meta"><li><strong>Details:</strong> ${escapeHtml(p.details)}</li></ul>` : ""}
        <div class="pd-qty">
          <label for="pd-qty-input">Quantity</label>
          <div class="qty-box">
            <button type="button" data-pd="dec" aria-label="Decrease">−</button>
            <input id="pd-qty-input" type="number" value="1" min="1" max="${p.stock || 1}">
            <button type="button" data-pd="inc" aria-label="Increase">+</button>
          </div>
        </div>
        <div class="pd-actions">
          <button class="btn add-cart" data-id="${p.id}" data-qty-from="#pd-qty-input" ${p.stock <= 0 ? "disabled" : ""}>
            ${p.stock <= 0 ? "Out of Stock" : "Add to Cart"}
          </button>
          <button class="btn btn-outline wish ${wished?"on":""}" data-id="${p.id}">${wished ? "♥ Wishlisted" : "♡ Wishlist"}</button>
        </div>
      </div>
    </div>
  `;

  const relatedHost = $("#related-grid");
  if (relatedHost) {
    const related = PRODUCTS.filter(x => x.cat === p.cat && x.id !== p.id).slice(0, 4);
    if (related.length) relatedHost.innerHTML = related.map(productCard).join("");
    else relatedHost.closest("section")?.classList.add("hidden");
  }
}

/* =========================================================
   10. REVEAL ON SCROLL — fade things in as you scroll
   ========================================================= */

// Anything with class "reveal" starts invisible. When it scrolls
// into view we add the class "in" (the CSS does the fade-in).
function setupReveal() {
  const els = $$(".reveal");
  // Old browsers? Just show everything immediately.
  if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("in")); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);  // we only need to reveal once
      }
    });
  }, { threshold: 0.12 }); // trigger when ~12% of the element is visible
  els.forEach(e => io.observe(e));
}

/* =========================================================
   11. AUTH FORMS — register / login / change password
   (this is a school-project demo: passwords live in
   localStorage, NOT a real database.)
   ========================================================= */

// Password rule: at least 6 chars, with upper, lower, digit, and a symbol.
const isStrong = (p) => p.length >= 6 && /[A-Z]/.test(p) && /[a-z]/.test(p) && /[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p);
// Username rule: only letters (a–z, A–Z).
const isLettersOnly = (s) => /^[A-Za-z]+$/.test(s);
// Full-name rule: letters and spaces only.
const isLettersAndSpaces = (s) => /^[A-Za-z\s]+$/.test(s);

// Show a small message under a form (id = the message element).
// `ok=true` paints it green ("success"); otherwise it stays red ("error").
const setMsg = (id, msg, ok = false) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg; el.classList.toggle("ok", ok);
};

// Pick the nicest name we can show for a user (username > full name > email handle).
const getDisplayName = (u) => u?.username || u?.full_name || (u?.email ? u.email.split("@")[0] : "Account");

// Make the "Show / Hide password" buttons work on a form.
// Buttons have data-toggle="<input id>". Optional data-group makes
// several toggles flip together (used on register: password + confirm).
function bindPasswordToggles(root) {
  const scope = root || document;
  const applyToggle = (btn, show) => {
    const input = document.getElementById(btn.dataset.toggle);
    if (!input) return;
    input.type = show ? "text" : "password";
    btn.textContent = show ? "Hide" : "Show";
    btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
  };
  scope.querySelectorAll(".password-toggle").forEach((btn) => {
    if (btn.dataset.bound === "1") return;
    btn.dataset.bound = "1";
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.toggle);
      if (!input) return;
      const show = input.type !== "text";
      const group = btn.dataset.group;
      if (group) {
        document.querySelectorAll(`.password-toggle[data-group="${group}"]`)
          .forEach((sibling) => applyToggle(sibling, show));
      } else {
        applyToggle(btn, show);
      }
    });
  });
}

// Live "is this password strong?" hint shown under a password field.
function bindPasswordHint(inputId, hintId) {
  const pw = $("#" + inputId);
  if (!pw) return;
  pw.addEventListener("input", () => {
    const v = pw.value;
    const hint = $("#" + hintId);
    if (!hint) return;
    if (!v) { hint.className = "hint"; hint.textContent = "Min. 6 characters with uppercase, lowercase, number, and special character."; return; }
    if (isStrong(v)) { hint.className = "hint ok"; hint.textContent = "Strong password ✓"; }
    else { hint.className = "hint bad"; hint.textContent = "Add uppercase, lowercase, number, special character (min. 6 chars)."; }
  });
}

// "Sign in with Google" needs a real server, so we just hide it
// and show a friendly message if someone clicks the button.
function hideGoogleButton(id, msgId) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener("click", () => setMsg(msgId, "Google sign-in is not available in the static demo."));
  // Hide the row that contains the Google button (or the button itself)
  const wrap = btn.closest(".social-row, .social-buttons, .social-login, .social, .form-row, .auth-social");
  if (wrap) wrap.style.display = "none";
  else btn.style.display = "none";
  // Also hide the "or" divider that sat next to it.
  const divider = document.querySelector(".or-divider, .divider, .auth-divider");
  if (divider) divider.style.display = "none";
}

// Switch the header between "Login | Register" (logged out) and
// the user-menu pill with avatar + dropdown (logged in).
// Also kicks signed-in users off the login/register pages.
function updateAuthUI() {
  const u = currentUser();
  const userMenu = $("#user-menu");
  const authText = $("#auth-text");
  const mAuthText = $("#mobile-auth-text");
  const mUserMenu = $("#mobile-user-menu");
  if (!u) {
    userMenu?.classList.add("hidden");
    authText?.classList.remove("hidden");
    mUserMenu?.classList.add("hidden");
    mAuthText?.classList.remove("hidden");
    return;
  }
  authText?.classList.add("hidden");
  userMenu?.classList.remove("hidden");
  mAuthText?.classList.add("hidden");
  mUserMenu?.classList.remove("hidden");
  const name = getDisplayName(u);
  $("#user-name").textContent = name;
  $("#user-avatar").textContent = (name[0] || "A").toUpperCase();
  const signOutAndGoHome = () => { signOut(); location.href = home(); };
  $("#logout-btn").onclick = signOutAndGoHome;
  const mLogout = $("#mobile-logout-btn");
  if (mLogout) mLogout.onclick = signOutAndGoHome;

  if ((PAGE_KEY === "login" || PAGE_KEY === "register")) location.href = home();
}

// Wire up the register page: live input filters, validation, account creation.
function bindRegister() {
  const f = $("#register-form"); if (!f) return; // not on the register page → skip
  bindPasswordHint("password", "password-hint");
  hideGoogleButton("google-register", "form-message");

  // While the user types, throw away anything that isn't a letter.
  const usernameInput = $("#username");
  if (usernameInput) {
    usernameInput.addEventListener("input", () => {
      usernameInput.value = usernameInput.value.replace(/[^A-Za-z]/g, "");
    });
  }

  // Same idea for full name, but spaces are allowed.
  const fullNameInput = $("#full-name");
  if (fullNameInput) {
    fullNameInput.addEventListener("input", () => {
      fullNameInput.value = fullNameInput.value.replace(/[^A-Za-z ]/g, "");
    });
  }

  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const username = $("#username").value.trim();
    const fullName = $("#full-name").value.trim();
    const email    = $("#email").value.trim().toLowerCase();
    const password = $("#password").value;
    const confirm  = $("#confirm-password").value;
    setMsg("form-message", "");
    if (!username || !fullName || !email) return setMsg("form-message", "Please fill in all required fields.");
    if (!isLettersOnly(username)) return setMsg("form-message", "Username must contain letters only.");
    if (!isLettersAndSpaces(fullName)) return setMsg("form-message", "Full name must contain letters only.");
    if (!isStrong(password)) return setMsg("form-message", "Password must be at least 6 characters.");
    if (password !== confirm) return setMsg("form-message", "Passwords do not match.");

    const users = getUsers();
    if (users.some(u => u.email === email))    return setMsg("form-message", "An account with that email already exists.");
    if (users.some(u => u.username === username)) return setMsg("form-message", "That username is already taken.");

    const user = {
      id: uid(),
      username, full_name: fullName, email, phone: "", password,
      created_at: new Date().toISOString(),
    };
    users.push(user);
    setUsers(users);
    signIn(user.id);
    setMsg("form-message", "Account created. Redirecting...", true);
    setTimeout(() => location.href = home(), 900);
  });
}

// Wire up the login page.
function bindLogin() {
  const f = $("#login-form"); if (!f) return; // not on the login page → skip
  hideGoogleButton("google-login", "login-message");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const email    = $("#login-email").value.trim().toLowerCase();
    const password = $("#login-password").value;
    setMsg("login-message", "");
    const u = getUsers().find(x => x.email === email);
    if (!u || u.password !== password) return setMsg("login-message", "Invalid email or password.");
    signIn(u.id);
    setMsg("login-message", "Login successful. Redirecting...", true);
    setTimeout(() => location.href = home(), 700);
  });
}

// Wire up the "Change password" form on the account page.
function bindChangePassword() {
  const f = $("#password-form"); if (!f) return; // form not on this page → skip
  bindPasswordHint("new-password", "new-password-hint");
  f.addEventListener("submit", (e) => {
    e.preventDefault();
    const password = $("#new-password").value;
    const confirm  = $("#confirm-new-password").value;
    setMsg("password-message", "");
    if (!isStrong(password)) return setMsg("password-message", "Password must be at least 6 characters.");
    if (password !== confirm) return setMsg("password-message", "Passwords do not match.");
    const u = currentUser();
    if (!u) return setMsg("password-message", "Please log in first.");
    const users = getUsers();
    const target = users.find(x => x.id === u.id);
    target.password = password;
    setUsers(users);
    setMsg("password-message", "Password updated successfully.", true);
    f.reset();
    const hint = $("#new-password-hint");
    if (hint) { hint.className = "hint"; hint.textContent = "Use uppercase, lowercase, number, and a special character."; }
  });
}

/* =========================================================
   12. ACCOUNT — show + edit profile
   ========================================================= */

// Fill in the account info card (username, full name, email, phone).
// Sends the user to login if they aren't signed in.
function loadAccount() {
  const u1 = $("#account-username"); if (!u1) return; // not on the account page
  const u = currentUser();
  if (!u) { location.href = pagePath("login.html"); return; }
  u1.textContent = u.username || "—";
  $("#account-full-name").textContent = u.full_name || "—";
  $("#account-email").textContent = u.email || "—";
  $("#account-phone").textContent = u.phone || "—";
  bindAccountEdit(u);
}

// Wire up the "Edit profile" form: open / cancel / save.
function bindAccountEdit(u) {
  const editBtn = $("#edit-profile-btn");
  const cancelBtn = $("#cancel-edit-btn");
  const form = $("#account-edit");
  const view = $("#account-view");
  if (!editBtn || !form || !view) return;
  if (form.dataset.bound) return;     // we already wired this form
  form.dataset.bound = "1";

  const openEdit = () => {
    $("#edit-username").value  = u.username || "";
    $("#edit-full-name").value = u.full_name || "";
    $("#edit-email").value     = u.email || "";
    $("#edit-phone").value     = u.phone || "";
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

  form.onsubmit = (e) => {
    e.preventDefault();
    const username  = $("#edit-username").value.trim();
    const full_name = $("#edit-full-name").value.trim();
    const phone     = $("#edit-phone").value.trim();
    if (!username)  return setMsg("edit-message", "Username is required.");
    if (!full_name) return setMsg("edit-message", "Full name is required.");

    const users = getUsers();
    if (users.some(x => x.id !== u.id && x.username === username))
      return setMsg("edit-message", "That username is already taken.");

    const target = users.find(x => x.id === u.id);
    target.username = username;
    target.full_name = full_name;
    target.phone = phone;
    setUsers(users);

    Object.assign(u, { username, full_name, phone });
    $("#account-username").textContent = username;
    $("#account-full-name").textContent = full_name;
    $("#account-phone").textContent = phone || "—";
    setMsg("edit-message", "Profile updated.", true);
    updateAuthUI();
    setTimeout(closeEdit, 700);
  };
}

/* =========================================================
   13. GLOBAL EVENT WIRING — one big click listener
   ---------------------------------------------------------
   Instead of attaching click handlers to every button (which
   we'd have to redo every time we re-draw the page), we listen
   for ALL clicks here and decide what to do based on what was
   clicked. This is called "event delegation".
   ========================================================= */
function wireEvents() {
  document.addEventListener("click", (e) => {
    // Find the closest element we actually care about. If there
    // isn't one (the user clicked empty space), do nothing.
    const t = e.target.closest("[data-act], [data-id], [data-pd], #open-cart, #close-cart, #scrim, #menu-open, #menu-close, .add-cart, .wish, .chip, #checkout-btn");
    if (!t) return;

    // ---- Cart drawer + mobile menu open/close ----
    if (t.id === "open-cart") return openCart();
    if (t.id === "close-cart" || t.id === "scrim") return closeCart();
    if (t.id === "menu-open") return openMenu();
    if (t.id === "menu-close") return closeMenu();

    // ---- "Add to Cart" buttons (cards + product detail page) ----
    if (t.classList.contains("add-cart")) {
      const p = PRODUCTS.find(x => x.id === t.dataset.id);
      if (!p) return;
      // On the product page the button reads the quantity from a number input.
      let qty = 1;
      if (t.dataset.qtyFrom) {
        const inp = document.querySelector(t.dataset.qtyFrom);
        qty = Math.max(1, parseInt(inp?.value, 10) || 1);
      }
      // Add one at a time so addToCart's stock check works for each unit.
      for (let i = 0; i < qty; i++) {
        if (!addToCart({ id: p.id, name: p.name, price: p.price, img: p.img })) break;
      }
      return;
    }

    // ---- Plus / minus buttons on the product detail page ----
    if (t.dataset.pd === "inc" || t.dataset.pd === "dec") {
      const inp = $("#pd-qty-input");
      if (!inp) return;
      const max = parseInt(inp.max, 10) || Infinity;
      let v = (parseInt(inp.value, 10) || 1) + (t.dataset.pd === "inc" ? 1 : -1);
      v = Math.max(1, Math.min(max, v));
      // Show a warning if "+" was clicked but we hit the stock limit.
      if (t.dataset.pd === "inc" && v === parseInt(inp.value, 10)) toast(`Only ${max} available`, "bad");
      inp.value = v;
      return;
    }

    // ---- Heart / wishlist button ----
    if (t.classList.contains("wish")) return toggleWish(t.dataset.id);

    // ---- Category filter chips on the products page ----
    if (t.classList.contains("chip")) {
      const grid = $("#products-grid");
      if (grid) { grid.dataset.cat = t.dataset.cat; renderProducts(); }
      return;
    }

    // ---- "Checkout" button at the bottom of the cart drawer ----
    if (t.id === "checkout-btn") {
      if (getCart().length === 0) return toast("Your cart is empty", "bad");
      if (!currentUser()) {
        // Not logged in? Send them to the login page after a tiny delay.
        toast("Please log in to checkout", "bad");
        closeCart();
        setTimeout(() => location.href = pagePath("login.html"), 800);
        return;
      }
      closeCart();
      location.href = pagePath("checkout.html");
      return;
    }

    // ---- Cart line buttons: + / - / remove ----
    if (t.dataset.act === "inc") changeQty(t.dataset.id, +1);
    if (t.dataset.act === "dec") changeQty(t.dataset.id, -1);
    if (t.dataset.act === "rm")  removeFromCart(t.dataset.id);
  });

  // Live search: re-draw the products grid every time the user types.
  document.addEventListener("input", (e) => {
    if (e.target.id === "product-search") renderProducts();
  });
}

/* =========================================================
   14. SAVED ADDRESSES (Account page)
   Each user can save up to 3 delivery addresses, then pick
   one quickly at checkout.
   ========================================================= */

const ADDR_LIMIT = 3; // max addresses we let one user save

// Read this user's saved addresses (or [] if not signed in).
function fetchUserAddresses() {
  const u = currentUser();
  if (!u) return [];
  return readJSON(LS.ADDR(u.id), []);
}
// Save this user's addresses back to localStorage.
function saveUserAddresses(list) {
  const u = currentUser();
  if (!u) return;
  writeJSON(LS.ADDR(u.id), list);
}

// Wire up the whole "Saved Addresses" panel on the account page.
// Handles: list, add form, edit, delete, set as default.
function bindAddresses() {
  const list = $("#addresses-list");
  if (!list) return;

  const form = $("#address-form");
  const addBtn = $("#addr-add-btn");
  const cancelBtn = $("#addr-cancel-btn");
  const titleEl = $("#addr-form-title");

  function fill(a) {
    $("#addr-id").value = a?.id || "";
    $("#addr-label").value = a?.label || "Home";
    $("#addr-name").value = a?.full_name || "";
    $("#addr-phone").value = a?.phone || "";
    $("#addr-line").value = a?.address_line || "";
    $("#addr-city").value = a?.city || "";
    $("#addr-province").value = a?.province || "";
    $("#addr-region").value = a?.region || "";
    $("#addr-postal").value = a?.postal_code || "";
    $("#addr-default").checked = !!a?.is_default;
    titleEl.textContent = a ? "Edit Address" : "Add Address";
    setMsg("addr-message", "");
  }

  function showForm(a) {
    fill(a);
    form.classList.remove("hidden");
    addBtn.classList.add("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  function hideForm() {
    form.classList.add("hidden");
    addBtn.classList.remove("hidden");
  }

  function refresh() {
    const data = fetchUserAddresses().sort((a, b) => Number(b.is_default) - Number(a.is_default));
    addBtn.disabled = data.length >= ADDR_LIMIT;
    addBtn.title = data.length >= ADDR_LIMIT ? "You can save up to 3 addresses." : "";

    if (!data.length) {
      list.innerHTML = `<p class="muted" style="margin:0">No saved addresses yet — click <strong>+ Add Address</strong> to add one.</p>`;
      return;
    }

    list.innerHTML = `<div class="addr-grid">${data.map(a => `
      <div class="addr-card${a.is_default ? " is-default" : ""}">
        <div class="addr-card-head">
          <span class="addr-label-pill">${escapeHtml(a.label)}</span>
          ${a.is_default ? `<span class="addr-default-pill">Default</span>` : ""}
        </div>
        <div class="addr-card-body">
          <strong>${escapeHtml(a.full_name)}</strong>
          <div class="muted" style="font-size:.88rem">${escapeHtml(a.phone)}</div>
          <div style="margin-top:6px">${escapeHtml(a.address_line)}</div>
          <div class="muted" style="font-size:.88rem">${escapeHtml(a.city)}, ${escapeHtml(a.province)}${a.postal_code ? " · " + escapeHtml(a.postal_code) : ""}</div>
          <div class="muted" style="font-size:.85rem">${escapeHtml(getRegionLabel(a.region))}</div>
        </div>
        <div class="addr-card-actions">
          ${a.is_default ? "" : `<button class="btn btn-outline btn-sm" data-addr="default" data-id="${a.id}">Set Default</button>`}
          <button class="btn btn-outline btn-sm" data-addr="edit" data-id="${a.id}">Edit</button>
          <button class="btn btn-sm btn-danger" data-addr="del" data-id="${a.id}">Delete</button>
        </div>
      </div>
    `).join("")}</div>`;

    list.querySelectorAll('[data-addr="edit"]').forEach(b => {
      b.onclick = () => { const a = data.find(x => x.id === b.dataset.id); if (a) showForm(a); };
    });
    list.querySelectorAll('[data-addr="del"]').forEach(b => {
      b.onclick = () => {
        if (!confirm("Delete this address?")) return;
        saveUserAddresses(fetchUserAddresses().filter(x => x.id !== b.dataset.id));
        toast("Address deleted", "ok");
        refresh();
      };
    });
    list.querySelectorAll('[data-addr="default"]').forEach(b => {
      b.onclick = () => {
        const all = fetchUserAddresses().map(x => ({ ...x, is_default: x.id === b.dataset.id }));
        saveUserAddresses(all);
        toast("Default address updated", "ok");
        refresh();
      };
    });
  }

  addBtn.onclick = () => showForm(null);
  cancelBtn.onclick = hideForm;

  form.onsubmit = (e) => {
    e.preventDefault();
    setMsg("addr-message", "");
    const id = $("#addr-id").value;
    const payload = {
      id: id || uid(),
      label:        $("#addr-label").value,
      full_name:    $("#addr-name").value.trim(),
      phone:        $("#addr-phone").value.trim(),
      address_line: $("#addr-line").value.trim(),
      city:         $("#addr-city").value.trim(),
      province:     $("#addr-province").value.trim(),
      region:       $("#addr-region").value,
      postal_code:  $("#addr-postal").value.trim() || "",
      is_default:   $("#addr-default").checked,
      created_at:   new Date().toISOString(),
    };
    const required = ["full_name","phone","address_line","city","province","region"];
    for (const k of required) if (!payload[k]) return setMsg("addr-message", "Please fill in all required fields.");

    let all = fetchUserAddresses();
    if (id) {
      const idx = all.findIndex(x => x.id === id);
      if (idx < 0) return setMsg("addr-message", "Address not found.");
      all[idx] = { ...all[idx], ...payload };
    } else {
      if (all.length >= ADDR_LIMIT) return setMsg("addr-message", "You can save up to 3 addresses only.");
      all.push(payload);
    }
    if (payload.is_default) all = all.map(a => ({ ...a, is_default: a.id === payload.id }));
    saveUserAddresses(all);

    toast(id ? "Address updated" : "Address saved", "ok");
    hideForm();
    refresh();
  };

  refresh();
}

/* =========================================================
   15. CHECKOUT PAGE — region/province/city dropdowns + place order
   ========================================================= */

// Shipping fee in pesos for each "tier" of region.
const SHIPPING_FEES = { ncr: 100, luzon: 180, visayas: 220, mindanao: 250 };

// The big PH_REGIONS list lives in ph-address.js, which is only
// loaded on checkout.html. The account + orders pages also need
// to SHOW region names, so we keep this short backup list here.
const LEGACY_REGIONS = {
  ncr:      { label: "Metro Manila (NCR)",   shipping: "ncr" },
  luzon:    { label: "Luzon (outside NCR)",  shipping: "luzon" },
  visayas:  { label: "Visayas",              shipping: "visayas" },
  mindanao: { label: "Mindanao",             shipping: "mindanao" },
};

// Find a region by its key. Tries the full PH list first,
// then falls back to LEGACY_REGIONS. Returns null if nothing matches.
// Used by both getRegionLabel() and getShippingFee() so we only
// have ONE place that knows where regions come from.
function findRegion(key) {
  if (typeof PH_REGIONS !== "undefined") {
    const r = PH_REGIONS.find(x => x.key === key);
    if (r) return r;
  }
  return LEGACY_REGIONS[key] || null;
}

// "ncr" → "Metro Manila (NCR)" (shown on the orders page).
function getRegionLabel(key) {
  return findRegion(key)?.label || key;
}
// "ncr" → 100 (the peso amount).
function getShippingFee(regionKey) {
  const tier = findRegion(regionKey)?.shipping;
  return tier ? SHIPPING_FEES[tier] : null;
}

// Friendly names for the payment method radio buttons.
const PAYMENT_LABELS = { cod: "Cash on Delivery", online: "Online Payment", installment: "Installment" };

// Wire up the whole checkout page.
function bindCheckout() {
  const app = $("#checkout-app");
  if (!app) return;

  const checkoutStates = { loading: "checkout-loading", empty: "checkout-empty", ok: app };

  const u = currentUser();
  if (!u) { location.href = pagePath("login.html"); return; }

  const cart = getCart();
  if (!cart.length) { setVisibleState(checkoutStates, "empty"); return; }
  setVisibleState(checkoutStates, "ok");

  $("#co-name").value  = u.full_name || "";
  $("#co-phone").value = u.phone || "";
  $("#co-email").value = u.email || "";

  const savedAddresses = fetchUserAddresses();
  let activePickedAddrId = null; // which saved address (if any) is currently picked

  // ---- Region / Province / City dropdowns ----
  // Picking a region fills the provinces. Picking a province
  // fills the cities. Picking a city fills the postal code.

  // Fill the Region dropdown from the master PH_REGIONS list.
  function buildRegionDropdown() {
    const sel = $("#co-region");
    PH_REGIONS.forEach(r => {
      const opt = document.createElement("option");
      opt.value = r.key;
      opt.textContent = r.label;
      sel.appendChild(opt);
    });
  }

  // Refill the Province dropdown for a chosen region.
  // Also clears the city + postal because they no longer match.
  function buildProvinceDropdown(regionKey) {
    const sel = $("#co-province");
    sel.innerHTML = '<option value="">Select province…</option>';
    const provinces = PH_PROVINCES[regionKey] || [];
    provinces.forEach(p => {
      const opt = document.createElement("option");
      opt.value = p.key;
      opt.textContent = p.label;
      sel.appendChild(opt);
    });
    sel.disabled = !provinces.length;
    // Province changed → reset city + postal so old values don't stick around.
    const citySel = $("#co-city");
    citySel.innerHTML = '<option value="">Select city / municipality…</option>';
    citySel.disabled = true;
    $("#co-postal").value = "";
  }

  // Refill the City dropdown for a chosen province.
  function buildCityDropdown(provinceKey) {
    const sel = $("#co-city");
    sel.innerHTML = '<option value="">Select city / municipality…</option>';
    const cities = PH_CITIES[provinceKey] || [];
    cities.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.name;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
    sel.disabled = !cities.length;
    $("#co-postal").value = "";
  }

  buildRegionDropdown();

  // Fill the whole form from a saved address card.
  // We have to fill the dropdowns in order: region → province → city → postal.
  function fillFromAddress(a) {
    $("#co-name").value     = a.full_name;
    $("#co-phone").value    = a.phone;
    $("#co-address").value  = a.address_line;
    const regionKey   = a.region   || "";
    const provinceKey = a.province || "";
    const cityName    = a.city     || "";
    $("#co-region").value = regionKey;
    buildProvinceDropdown(regionKey);
    if (provinceKey) {
      $("#co-province").value = provinceKey;
      buildCityDropdown(provinceKey);
      if (cityName) {
        $("#co-city").value = cityName;
        const cities = PH_CITIES[provinceKey] || [];
        const cityData = cities.find(c => c.name === cityName);
        $("#co-postal").value = cityData ? cityData.postal : (a.postal_code || "");
      }
    }
    activePickedAddrId = a.id;
    recomputeTotals();
    refreshSaveCheckbox();
  }

  // Hide "Save this address" when:
  //   - a saved address is already picked (no point saving again), or
  //   - the user already has 3 saved addresses (the limit).
  function refreshSaveCheckbox() {
    const row = $("#save-addr-row");
    const cb = $("#co-save-address");
    const hide = !!activePickedAddrId || savedAddresses.length >= ADDR_LIMIT;
    row.classList.toggle("hidden", hide);
    if (hide) cb.checked = false;
  }

  if (savedAddresses.length) {
    const picker = $("#saved-addresses-picker");
    const cards = $("#saved-addresses-cards");
    picker.classList.remove("hidden");
    cards.innerHTML = savedAddresses.map(a => `
      <button type="button" class="addr-pick-card" data-id="${a.id}">
        <div class="addr-pick-head">
          <span class="addr-label-pill">${escapeHtml(a.label)}</span>
          ${a.is_default ? `<span class="addr-default-pill">Default</span>` : ""}
        </div>
        <strong>${escapeHtml(a.full_name)}</strong>
        <div class="muted" style="font-size:.85rem">${escapeHtml(a.address_line)}</div>
        <div class="muted" style="font-size:.85rem">${escapeHtml(a.city)}, ${escapeHtml(a.province)}</div>
      </button>
    `).join("") + `
      <button type="button" class="addr-pick-card addr-pick-new" data-new="1">
        <div style="font-size:1.6rem">+</div>
        <strong>Use a new address</strong>
      </button>
    `;
    cards.querySelectorAll(".addr-pick-card").forEach(c => {
      c.onclick = () => {
        cards.querySelectorAll(".addr-pick-card").forEach(x => x.classList.remove("active"));
        c.classList.add("active");
        if (c.dataset.new) {
          activePickedAddrId = null;
          ["co-address","co-region","co-postal"].forEach(id => $("#" + id).value = "");
          buildProvinceDropdown("");
          buildCityDropdown("");
          refreshSaveCheckbox();
          recomputeTotals();
          return;
        }
        const a = savedAddresses.find(x => x.id === c.dataset.id);
        if (a) fillFromAddress(a);
      };
    });
    const defaultAddr = savedAddresses.find(a => a.is_default) || savedAddresses[0];
    fillFromAddress(defaultAddr);
    cards.querySelector(`.addr-pick-card[data-id="${defaultAddr.id}"]`)?.classList.add("active");
  }
  refreshSaveCheckbox();

  function renderItems() {
    const list = getCart();
    $("#co-items").innerHTML = list.map(i => `
      <div class="co-item">
        <img src="${i.img}" alt="">
        <div class="co-item-body">
          <div class="co-item-name">${escapeHtml(i.name)}</div>
          <div class="muted" style="font-size:.83rem">${i.qty} × ${peso(i.price)}</div>
        </div>
        <div class="co-item-total">${peso(i.price * i.qty)}</div>
      </div>
    `).join("");
  }

  function recomputeTotals() {
    const list = getCart();
    const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
    const regionKey = $("#co-region").value;
    const shipping = getShippingFee(regionKey);
    $("#co-subtotal").textContent = peso(subtotal);
    $("#co-shipping").textContent = shipping == null ? "—" : peso(shipping);
    $("#co-total").textContent = peso(subtotal + (shipping || 0));
  }

  renderItems();
  recomputeTotals();

  // When the user picks a region, refill the province dropdown and
  // recompute shipping. Same idea down the chain (province → city → postal).
  $("#co-region").addEventListener("change", () => {
    buildProvinceDropdown($("#co-region").value);
    recomputeTotals();
  });
  $("#co-province").addEventListener("change", () => {
    buildCityDropdown($("#co-province").value);
  });
  $("#co-city").addEventListener("change", () => {
    const provinceKey = $("#co-province").value;
    const cityName = $("#co-city").value;
    const cities = PH_CITIES[provinceKey] || [];
    const cityData = cities.find(c => c.name === cityName);
    $("#co-postal").value = cityData ? cityData.postal : "";
  });

  $("#checkout-form").addEventListener("submit", (e) => {
    e.preventDefault();
    setMsg("checkout-message", "");

    const list = getCart();
    if (!list.length) return setMsg("checkout-message", "Your cart is empty.");

    const region = $("#co-region").value;
    if (!region) return setMsg("checkout-message", "Please select your region.");
    if (!$("#co-province").value) return setMsg("checkout-message", "Please select your province.");
    if (!$("#co-city").value) return setMsg("checkout-message", "Please select your city / municipality.");
    const shipping_fee = getShippingFee(region);
    const subtotal = list.reduce((s, i) => s + i.price * i.qty, 0);
    const total = subtotal + shipping_fee;
    const payment_method = document.querySelector('input[name="co-pay"]:checked')?.value || "cod";

    const required = ["co-name","co-phone","co-address"];
    for (const id of required) {
      if (!$("#" + id).value.trim()) {
        return setMsg("checkout-message", "Please fill in all required fields.");
      }
    }

    // Make sure every item still has enough stock.
    // (Someone could have changed it since the cart was last opened.)
    for (const it of list) {
      const p = PRODUCTS.find(x => x.id === it.id);
      if (!p || p.stock < it.qty) {
        return setMsg("checkout-message", "Sorry — one or more items just went out of stock. Please review your cart.");
      }
    }

    const order = {
      id: uid(),
      created_at: new Date().toISOString(),
      status: "pending",
      subtotal, shipping_fee, total, payment_method,
      full_name:    $("#co-name").value.trim(),
      phone:        $("#co-phone").value.trim(),
      email:        $("#co-email").value.trim(),
      address_line: $("#co-address").value.trim(),
      city:         $("#co-city").value.trim(),
      province:     (() => {
        const pKey = $("#co-province").value;
        const rKey = $("#co-region").value;
        const prov = (PH_PROVINCES[rKey] || []).find(p => p.key === pKey);
        return prov ? prov.label : pKey;
      })(),
      region,
      postal_code:  $("#co-postal").value.trim(),
      notes:        $("#co-notes").value.trim(),
      items: list.map(i => ({
        product_id: i.id, name: i.name, img: stripBase(i.img),
        unit_price: i.price, qty: i.qty, line_total: i.price * i.qty,
      })),
    };

    // Subtract the bought items from stock and save the catalog back.
    const updated = PRODUCTS.map(p => ({ ...p, img: stripBase(p.img) }));
    for (const it of list) {
      const p = updated.find(x => x.id === it.id);
      if (p) p.stock = Math.max(0, p.stock - it.qty);
    }
    persistProducts(updated);

    // Save the order. unshift() puts it at the top of the list.
    const orders = readJSON(LS.ORDERS(u.id), []);
    orders.unshift(order);
    writeJSON(LS.ORDERS(u.id), orders);

    // If the user ticked "Save this address", add it to their saved list.
    const wantsSave = $("#co-save-address")?.checked;
    if (wantsSave && !activePickedAddrId && savedAddresses.length < ADDR_LIMIT) {
      const all = fetchUserAddresses();
      all.push({
        id: uid(),
        label:        all.length === 0 ? "Home" : "Other",
        full_name:    order.full_name,
        phone:        order.phone,
        address_line: order.address_line,
        city:         order.city,
        province:     $("#co-province").value,
        region:       order.region,
        postal_code:  order.postal_code || "",
        is_default:   all.length === 0,
        created_at:   new Date().toISOString(),
      });
      saveUserAddresses(all);
    }

    setCart([]); // empty the cart now that the order is placed
    // Send the user to the new order page (?new=1 shows the "Thank you" banner).
    location.href = pagePath("orders.html") + `?id=${order.id}&new=1`;
  });
}

/* =========================================================
   16. ORDERS PAGE — list of past orders + single order page
   ========================================================= */

// Friendly labels for the order.status field.
const STATUS_LABELS = {
  pending: "Pending", packed: "Packed", shipped: "Shipped",
  delivered: "Delivered", cancelled: "Cancelled"
};
// Build the colored status pill (CSS classes do the colors).
function statusPill(status) {
  return `<span class="status-pill status-${status}">${STATUS_LABELS[status] || status}</span>`;
}

// Decide what to draw on the orders page.
// ?id=<orderId> in the URL → show one order. Otherwise → show the list.
function bindOrders() {
  const host = $("#orders-content");
  if (!host) return;

  const u = currentUser();
  if (!u) { location.href = pagePath("login.html"); return; } // must be signed in

  setVisibleState({ loading: "orders-loading", ok: host }, "ok");

  const params = new URLSearchParams(location.search);
  const orderId = params.get("id");
  const isNew = params.get("new") === "1"; // came from a fresh checkout?

  if (orderId) return renderOrderDetail(host, orderId, isNew, u);
  return renderOrderList(host, u);
}

// Build the "My Orders" list (one card per order).
function renderOrderList(host, u) {
  const data = readJSON(LS.ORDERS(u.id), []);
  if (!data.length) {
    host.innerHTML = emptyState("📦", "No orders yet",
      "When you place your first order, it'll show up here.",
      ["Start Shopping", "products.html"]);
    return;
  }
  host.innerHTML = `
    <div class="orders-list">
      ${data.map(o => {
        const itemCount = (o.items || []).reduce((s, x) => s + (x.qty || 0), 0);
        const date = new Date(o.created_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
        return `
          <a class="order-card" href="orders.html?id=${o.id}">
            <div class="order-card-head">
              <div>
                <div class="order-id">Order #${o.id.slice(0, 8)}</div>
                <div class="muted" style="font-size:.83rem">${date}</div>
              </div>
              ${statusPill(o.status)}
            </div>
            <div class="order-card-body">
              <span>${itemCount} item${itemCount === 1 ? "" : "s"} · ${PAYMENT_LABELS[o.payment_method] || o.payment_method}</span>
              <strong>${peso(o.total)}</strong>
            </div>
          </a>
        `;
      }).join("")}
    </div>`;
}

// Build the single-order page (header banner + items + delivery info).
function renderOrderDetail(host, orderId, isNew, u) {
  const order = readJSON(LS.ORDERS(u.id), []).find(o => o.id === orderId);
  if (!order) {
    host.innerHTML = emptyState("🔍", "Order not found",
      "We couldn't find that order on your account.",
      ["Back to My Orders", "orders.html"]);
    return;
  }
  const items = order.items || [];
  const date = new Date(order.created_at).toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" });
  const banner = isNew ? `
    <div class="thank-banner">
      <div class="icon">🎉</div>
      <div>
        <h2 style="margin:0">Thank you for your order!</h2>
        <p class="muted" style="margin:4px 0 0">We've received your order and will contact you shortly to confirm delivery.</p>
      </div>
    </div>` : "";

  host.innerHTML = `
    ${banner}
    <div class="order-detail">
      <div class="account-card">
        <div class="account-head">
          <div>
            <h2 style="margin:0">Order <em>#${order.id.slice(0,8)}</em></h2>
            <div class="muted" style="font-size:.88rem">Placed ${date}</div>
          </div>
          ${statusPill(order.status)}
        </div>

        <div class="order-items">
          ${items.map(it => `
            <div class="co-item">
              <img src="${resolveImg(it.img)}" alt="">
              <div class="co-item-body">
                <div class="co-item-name">${escapeHtml(it.name)}</div>
                <div class="muted" style="font-size:.83rem">${it.qty} × ${peso(it.unit_price)}</div>
              </div>
              <div class="co-item-total">${peso(it.line_total)}</div>
            </div>
          `).join("")}
        </div>

        <hr style="border:0;border-top:1px solid var(--line,#eee);margin:14px 0">
        <div class="co-row"><span>Subtotal</span><span>${peso(order.subtotal)}</span></div>
        <div class="co-row"><span>Shipping</span><span>${peso(order.shipping_fee)}</span></div>
        <div class="co-row co-total"><span>Total</span><span>${peso(order.total)}</span></div>
      </div>

      <aside class="account-card">
        <h2>Delivery <em>Details</em></h2>
        <p style="margin:0">
          <strong>${escapeHtml(order.full_name)}</strong><br>
          ${escapeHtml(order.phone)}${order.email ? `<br>${escapeHtml(order.email)}` : ""}
        </p>
        <p class="muted" style="margin:10px 0 0">
          ${escapeHtml(order.address_line)}<br>
          ${escapeHtml(order.city)}, ${escapeHtml(order.province)}<br>
          ${escapeHtml(getRegionLabel(order.region))}${order.postal_code ? ` · ${escapeHtml(order.postal_code)}` : ""}
        </p>
        ${order.notes ? `<p class="muted" style="margin-top:10px"><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}

        <h2 style="margin-top:18px">Payment</h2>
        <p style="margin:0">${escapeHtml(PAYMENT_LABELS[order.payment_method] || order.payment_method)}</p>

        <a href="orders.html" class="btn btn-outline btn-block" style="margin-top:18px">All My Orders</a>
        <a href="products.html" class="btn btn-block" style="margin-top:10px">Continue Shopping</a>
      </aside>
    </div>
  `;
}

/* =========================================================
   17. INIT — runs once when the page is loaded
   ---------------------------------------------------------
   We call EVERY binder here. Each one starts by checking
   whether the element it cares about exists on this page,
   and quietly returns if not. So this same list works for
   every page (home, products, login, checkout, orders, etc.).
   ========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  // 1. Build the shared header / footer / overlays on every page.
  buildHeader();
  buildFooter();
  buildOverlays();

  // 2. Draw the parts that depend on data (only fire on pages that have them).
  renderCart();
  renderFeatured();
  renderProducts();
  renderProductDetail();
  setupReveal();

  // 3. Wire up clicks (cart buttons, add-to-cart, chips, etc.).
  wireEvents();

  // 4. Wire up the auth + account forms (each one no-ops on the wrong page).
  bindRegister();
  bindLogin();
  bindChangePassword();
  bindPasswordToggles();
  loadAccount();
  updateAuthUI();

  // 5. Wire up the checkout, orders, and saved addresses pages.
  bindCheckout();
  bindOrders();
  bindAddresses();
});
