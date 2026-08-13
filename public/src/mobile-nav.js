const CART_KEY = "saegyeol_cart_v1";
const WISH_KEY = "saegyeol_wishlist_v1";

function readCount(key, quantity = false) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    if (!Array.isArray(value)) return 0;
    return quantity ? value.reduce((sum, item) => sum + Math.max(1, Number(item.quantity) || 1), 0) : value.length;
  } catch {
    return 0;
  }
}

function createMobileNav() {
  if (document.querySelector(".mobile-bottom-nav")) return;

  const path = location.pathname.toLowerCase();
  const hash = location.hash.toLowerCase();
  const isHome = path.endsWith("/") || path.endsWith("index.html") || !path.split("/").pop();
  const active = path.includes("mypage") ? "my"
    : path.includes("checkout") ? "cart"
    : path.includes("magazine") ? "discover"
    : isHome && ["#new", "#fashion", "#beauty", "#ranking", "#sale"].includes(hash) ? "discover"
    : "home";

  const nav = document.createElement("nav");
  nav.className = "mobile-bottom-nav";
  nav.setAttribute("aria-label", "모바일 주요 메뉴");
  nav.innerHTML = `
    <a href="./index.html" data-mobile-nav="home" aria-label="홈">
      <span class="mobile-nav-icon mobile-nav-icon--home" aria-hidden="true"></span><b>홈</b>
    </a>
    <a href="./index.html#new" data-mobile-nav="discover" aria-label="상품 탐색">
      <span class="mobile-nav-icon mobile-nav-icon--discover" aria-hidden="true"></span><b>탐색</b>
    </a>
    <button type="button" data-mobile-nav="wish" aria-label="찜 목록 열기">
      <span class="mobile-nav-icon mobile-nav-icon--wish" aria-hidden="true">♡</span><b>찜</b><em class="mobile-nav-wish-count">0</em>
    </button>
    <button type="button" data-mobile-nav="cart" aria-label="장바구니 열기">
      <span class="mobile-nav-icon mobile-nav-icon--cart" aria-hidden="true"></span><b>장바구니</b><em class="mobile-nav-cart-count">0</em>
    </button>
    <a href="./mypage.html" data-mobile-nav="my" aria-label="마이페이지">
      <span class="mobile-nav-icon mobile-nav-icon--my" aria-hidden="true"></span><b>MY</b>
    </a>`;
  document.body.appendChild(nav);
  document.body.classList.add("has-mobile-bottom-nav");
  nav.querySelector(`[data-mobile-nav="${active}"]`)?.classList.add("is-active");

  function updateCounts() {
    const cartCount = readCount(CART_KEY, true);
    const wishCount = readCount(WISH_KEY);
    const cartBadge = nav.querySelector(".mobile-nav-cart-count");
    const wishBadge = nav.querySelector(".mobile-nav-wish-count");
    cartBadge.textContent = cartCount > 99 ? "99+" : String(cartCount);
    wishBadge.textContent = wishCount > 99 ? "99+" : String(wishCount);
    cartBadge.hidden = cartCount === 0;
    wishBadge.hidden = wishCount === 0;
  }

  nav.querySelector('[data-mobile-nav="wish"]').addEventListener("click", () => {
    const trigger = document.querySelector(".wishlist-toggle");
    if (trigger) trigger.click();
    else location.href = "./mypage.html#wishlist";
  });
  nav.querySelector('[data-mobile-nav="cart"]').addEventListener("click", () => {
    if (path.includes("checkout")) return;
    const trigger = document.querySelector(".cart-btn");
    if (trigger) trigger.click();
    else location.href = "./checkout.html";
  });

  updateCounts();
  window.addEventListener("saegyeol:store", updateCounts);
  window.addEventListener("storage", updateCounts);
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createMobileNav, { once: true });
else createMobileNav();
