import { signInWithGoogle, signOutFromSupabase, syncAuthSession } from "./supabase-client.js";

const CART_KEY = "saegyeol_cart_v1";
const WISH_KEY = "saegyeol_wishlist_v1";
const USER_KEY = "saegyeol_user_v1";
const PROFILE_KEY = "saegyeol_profile_v1";
const COUPON_KEY = "saegyeol_coupon_v1";
const ORDER_KEY = "saegyeol_orders_v1";

const read = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
};
const write = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent("saegyeol:store", { detail: { key } }));
};

export const getCart = () => read(CART_KEY, []);
export const getWishlist = () => read(WISH_KEY, []);
export const getUser = () => read(USER_KEY, null);
export const getProfile = () => read(PROFILE_KEY, { height: "", weight: "", topSize: "M", bottomSize: "28", skinType: "중성", personalTone: "미정" });
export const getCoupon = () => read(COUPON_KEY, "");
export const parsePrice = (price) => Number(String(price).replace(/[^0-9]/g, ""));

export function addCartItem(productId, option, quantity = 1) {
  const cart = getCart();
  const safeOption = option || "기본 옵션";
  const found = cart.find((item) => item.id === Number(productId) && item.option === safeOption);
  if (found) found.quantity += quantity;
  else cart.push({ id: Number(productId), option: safeOption, quantity });
  write(CART_KEY, cart);
  return cart;
}

export function updateCartItem(productId, option, quantity) {
  const cart = getCart();
  const found = cart.find((item) => item.id === Number(productId) && item.option === option);
  if (found) found.quantity = Math.max(1, quantity);
  write(CART_KEY, cart);
}

export function removeCartItem(productId, option) {
  write(CART_KEY, getCart().filter((item) => !(item.id === Number(productId) && item.option === option)));
}

export function clearCart() { write(CART_KEY, []); }
export function saveOrder(order) { const orders = read(ORDER_KEY, []); orders.unshift(order); write(ORDER_KEY, orders); }

export function toggleWishlist(productId) {
  const id = Number(productId);
  const wishes = getWishlist();
  const next = wishes.includes(id) ? wishes.filter((item) => item !== id) : [...wishes, id];
  write(WISH_KEY, next);
  return next.includes(id);
}

export const isWished = (productId) => getWishlist().includes(Number(productId));

export function initCommerceUI(products) {
  if (!document.querySelector(".commerce-layer")) {
    document.body.insertAdjacentHTML("beforeend", `
      <div class="commerce-layer">
        <button class="drawer-overlay" type="button" aria-label="패널 닫기"></button>
        <aside class="commerce-drawer cart-drawer" aria-hidden="true">
          <div class="drawer-head"><div><small>YOUR SELECTION</small><h2>장바구니 <span class="drawer-cart-count">0</span></h2></div><button class="drawer-close" type="button" aria-label="장바구니 닫기">CLOSE ×</button></div>
          <div class="drawer-body cart-items"></div>
          <div class="drawer-foot cart-summary">
            <div class="shipping-progress"><p><span>무료배송까지</span><strong class="shipping-left">₩0</strong></p><i><b></b></i></div>
            <label class="drawer-coupon-label"><span>할인 쿠폰</span><select class="drawer-coupon"><option value="">쿠폰 선택</option><option value="WELCOME10">신규 회원 10%</option><option value="STYLE15">첫 스타일 15%</option></select></label>
            <p><span>상품 금액</span><strong class="cart-subtotal">₩0</strong></p>
            <p class="cart-discount-row"><span>쿠폰 할인</span><strong class="cart-discount">−₩0</strong></p>
            <p><span>배송비</span><strong class="cart-shipping">₩0</strong></p>
            <p class="cart-total"><span>결제 예정 금액</span><strong>₩0</strong></p>
            <a class="drawer-checkout" href="./checkout.html">주문하기 <span>↗</span></a>
          </div>
        </aside>
        <aside class="commerce-drawer wish-drawer" aria-hidden="true">
          <div class="drawer-head"><div><small>SAVED MOOD</small><h2>찜한 상품 <span class="drawer-wish-count">0</span></h2></div><button class="drawer-close" type="button" aria-label="찜 목록 닫기">CLOSE ×</button></div>
          <div class="drawer-body wish-items"></div>
        </aside>
        <aside class="commerce-drawer account-drawer" aria-hidden="true">
          <div class="drawer-head"><div><small>MY 새결</small><h2>마이페이지</h2></div><button class="drawer-close" type="button" aria-label="마이페이지 닫기">CLOSE ×</button></div>
          <div class="drawer-body account-content"></div>
        </aside>
      </div>`);
  }

  const overlay = document.querySelector(".drawer-overlay");
  const drawers = document.querySelectorAll(".commerce-drawer");
  const money = (value) => `₩${value.toLocaleString("ko-KR")}`;

  function closeDrawers() {
    drawers.forEach((drawer) => { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); });
    overlay.classList.remove("is-open");
    document.body.classList.remove("drawer-open");
  }

  function openDrawer(selector) {
    closeDrawers();
    const drawer = document.querySelector(selector);
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    overlay.classList.add("is-open");
    document.body.classList.add("drawer-open");
  }

  function renderCart() {
    const cart = getCart();
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.querySelectorAll(".cart-count, .drawer-cart-count").forEach((node) => { node.textContent = count; });
    const container = document.querySelector(".cart-items");
    if (!container) return;
    if (!cart.length) {
      container.innerHTML = `<div class="drawer-empty"><span>0</span><h3>아직 고른 상품이 없어요.</h3><p>오늘의 결을 완성할 아이템을 찾아보세요.</p><a href="./index.html#new">신상품 보러가기 ↗</a></div>`;
    } else {
      container.innerHTML = cart.map((item) => {
        const product = products.find((entry) => entry.id === item.id);
        if (!product) return "";
        return `<article class="drawer-product" data-id="${item.id}" data-option="${item.option}">
          <a href="./product.html?id=${product.id}"><img src="${product.image}" alt="${product.name}" /></a>
          <div class="drawer-product__info"><small>${product.brand}</small><a href="./product.html?id=${product.id}"><strong>${product.name}</strong></a><span>${item.option}</span><div class="drawer-quantity"><button data-qty="minus" type="button">−</button><b>${item.quantity}</b><button data-qty="plus" type="button">+</button></div></div>
          <div class="drawer-product__price"><button data-remove type="button" aria-label="삭제">×</button><strong>${money(parsePrice(product.price) * item.quantity)}</strong></div>
        </article>`;
      }).join("");
    }
    const subtotal = cart.reduce((sum, item) => {
      const product = products.find((entry) => entry.id === item.id);
      return sum + (product ? parsePrice(product.price) * item.quantity : 0);
    }, 0);
    const coupon = getCoupon();
    const discount = coupon === "WELCOME10" ? Math.min(Math.floor(subtotal * .1), 20000) : coupon === "STYLE15" ? Math.min(Math.floor(subtotal * .15), 30000) : 0;
    const discountedSubtotal = subtotal - discount;
    const shipping = subtotal === 0 || discountedSubtotal >= 50000 ? 0 : 3000;
    const left = Math.max(0, 50000 - subtotal);
    document.querySelector(".cart-subtotal").textContent = money(subtotal);
    document.querySelector(".cart-discount").textContent = `−${money(discount)}`;
    document.querySelector(".cart-shipping").textContent = shipping ? money(shipping) : "무료";
    document.querySelector(".cart-total strong").textContent = money(discountedSubtotal + shipping);
    document.querySelector(".drawer-coupon").value = coupon;
    document.querySelector(".shipping-left").textContent = left ? money(left) : "무료배송 적용";
    document.querySelector(".shipping-progress b").style.width = `${Math.min(100, subtotal / 50000 * 100)}%`;
    document.querySelector(".drawer-checkout").classList.toggle("disabled", !cart.length);
  }

  function renderWishes() {
    const wishes = getWishlist();
    document.querySelector(".drawer-wish-count").textContent = wishes.length;
    document.querySelectorAll(".wishlist-toggle").forEach((button) => {
      let badge = button.querySelector(".header-wish-count");
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "header-wish-count";
        button.appendChild(badge);
      }
      badge.textContent = wishes.length;
      badge.hidden = wishes.length === 0;
      button.setAttribute("aria-label", `찜한 상품 보관함 · ${wishes.length}개`);
    });
    document.querySelectorAll(".wish-btn[data-product-id]").forEach((button) => button.classList.toggle("active", wishes.includes(Number(button.dataset.productId))));
    const container = document.querySelector(".wish-items");
    if (!wishes.length) {
      container.innerHTML = `<div class="drawer-empty"><span>♡</span><h3>마음에 둔 상품을 모아보세요.</h3><p>하트 버튼을 누르면 이곳에 저장됩니다.</p></div>`;
      return;
    }
    container.innerHTML = wishes.map((id) => {
      const product = products.find((entry) => entry.id === id);
      if (!product) return "";
      return `<article class="wish-product" data-id="${id}"><a href="./product.html?id=${id}"><img src="${product.image}" alt="${product.name}" /></a><div><small>${product.brand}</small><a href="./product.html?id=${id}"><strong>${product.name}</strong></a><p>${product.price}</p><label class="wish-option-label"><span>${product.category === "fashion" ? "사이즈" : "컬러 · 용량"}</span><select data-wish-option>${product.options.map((option) => `<option value="${option}">${option}</option>`).join("")}</select></label><button data-wish-cart type="button">선택 옵션 장바구니 담기 +</button></div><button data-wish-remove type="button" aria-label="찜 삭제">×</button></article>`;
    }).join("");
  }

  function renderAccount() {
    const user = getUser();
    const profile = getProfile();
    const container = document.querySelector(".account-content");
    if (user) {
      container.innerHTML = `<div class="account-hello">${user.avatar ? `<img class="account-avatar" src="${user.avatar}" alt="${user.name} 프로필" referrerpolicy="no-referrer" />` : ""}<div><small>WELCOME BACK · GOOGLE</small><h3>${user.name}님,<br />오늘은 어떤 결인가요?</h3><p>${user.email}</p></div></div><a class="account-page-link" href="./mypage.html">배송지 · 주문 · 문의 전체 보기 <span>↗</span></a><div class="account-stats"><a href="./mypage.html#orders"><strong>0</strong><span>진행 중 주문</span></a><button class="account-wishes" type="button"><strong>${getWishlist().length}</strong><span>찜한 상품</span></button><a href="./index.html#new"><strong>8</strong><span>최근 본 상품</span></a></div>${profileForm(profile)}<button class="logout-btn" type="button">Google 계정 로그아웃</button>`;
    } else {
      container.innerHTML = `<div class="account-login"><p class="eyebrow">LOGIN / JOIN</p><h3>취향을 저장하고<br />더 정확한 추천을 받아보세요.</h3><button class="google-login-btn" type="button"><svg viewBox="0 0 18 18" aria-hidden="true"><path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.61Z"/><path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.8.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"/><path fill="#FBBC05" d="M3.96 10.7A5.42 5.42 0 0 1 3.68 9c0-.59.1-1.16.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.03l3-2.33Z"/><path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.65 8.65 0 0 0 9 0 9 9 0 0 0 .96 4.97l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"/></svg><span>Google로 계속하기</span><i>↗</i></button><p class="auth-status" role="status" aria-live="polite">Google 계정으로 안전하게 로그인합니다.</p><a class="account-page-link" href="./mypage.html">마이페이지 미리 보기 <span>↗</span></a></div>${profileForm(profile)}`;
    }
  }

  function profileForm(profile) {
    return `<section class="body-profile"><div class="body-profile__head"><div><small>MY BODY PROFILE</small><h3>나의 체형·피부 정보</h3></div><span>리뷰·뷰티 추천에 사용</span></div><form class="profile-form"><div class="profile-grid"><label>키 (cm)<input type="number" name="height" min="130" max="210" placeholder="165" value="${profile.height}" /></label><label>몸무게 (kg)<input type="number" name="weight" min="30" max="150" placeholder="55" value="${profile.weight}" /></label><label>평소 상의<select name="topSize">${["XS","S","M","L","XL"].map((v)=>`<option ${profile.topSize===v?"selected":""}>${v}</option>`).join("")}</select></label><label>평소 하의<select name="bottomSize">${["24","26","28","30","32","34"].map((v)=>`<option ${profile.bottomSize===v?"selected":""}>${v}</option>`).join("")}</select></label><label>피부 타입<select name="skinType">${["건성","중성","지성","복합성","민감성"].map((v)=>`<option ${profile.skinType===v?"selected":""}>${v}</option>`).join("")}</select></label><label>퍼스널 톤<select name="personalTone">${["미정","웜톤","쿨톤","뉴트럴"].map((v)=>`<option ${profile.personalTone===v?"selected":""}>${v}</option>`).join("")}</select></label></div><button type="submit">프로필 저장 <span>↗</span></button><p class="profile-status" aria-live="polite"></p></form></section>`;
  }

  document.querySelectorAll(".cart-btn").forEach((button) => button.addEventListener("click", () => { renderCart(); openDrawer(".cart-drawer"); }));
  document.querySelectorAll(".wishlist-toggle").forEach((button) => button.addEventListener("click", () => { renderWishes(); openDrawer(".wish-drawer"); }));
  document.querySelectorAll(".account-toggle").forEach((button) => button.addEventListener("click", () => { renderAccount(); openDrawer(".account-drawer"); }));
  document.querySelectorAll(".drawer-close").forEach((button) => button.addEventListener("click", closeDrawers));
  overlay.addEventListener("click", closeDrawers);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeDrawers(); });

  document.querySelector(".cart-items").addEventListener("click", (event) => {
    const row = event.target.closest(".drawer-product");
    if (!row) return;
    const item = getCart().find((entry) => entry.id === Number(row.dataset.id) && entry.option === row.dataset.option);
    if (event.target.closest("[data-remove]")) removeCartItem(row.dataset.id, row.dataset.option);
    if (event.target.closest('[data-qty="minus"]') && item) updateCartItem(item.id, item.option, item.quantity - 1);
    if (event.target.closest('[data-qty="plus"]') && item) updateCartItem(item.id, item.option, item.quantity + 1);
    renderCart();
  });
  document.querySelector(".drawer-coupon").addEventListener("change", (event) => {
    localStorage.setItem(COUPON_KEY, JSON.stringify(event.target.value));
    renderCart();
  });

  document.querySelector(".wish-items").addEventListener("click", (event) => {
    const row = event.target.closest(".wish-product");
    if (!row) return;
    if (event.target.closest("[data-wish-remove]")) { toggleWishlist(row.dataset.id); renderWishes(); }
    if (event.target.closest("[data-wish-cart]")) { const p = products.find((entry) => entry.id === Number(row.dataset.id)); const option = row.querySelector("[data-wish-option]")?.value || p.options[0]; addCartItem(p.id, option); renderCart(); renderWishes(); openDrawer(".cart-drawer"); }
  });

  document.querySelector(".account-content").addEventListener("submit", (event) => {
    if (event.target.matches(".profile-form")) {
      event.preventDefault();
      const data = new FormData(event.target);
      const profile = Object.fromEntries(data.entries());
      write(PROFILE_KEY, profile);
      event.target.querySelector(".profile-status").textContent = "저장되었습니다. 상세 리뷰 정렬에 반영됩니다.";
    }
  });
  document.querySelector(".account-content").addEventListener("click", async (event) => {
    if (event.target.closest(".google-login-btn")) {
      const button = event.target.closest(".google-login-btn");
      const status = document.querySelector(".auth-status");
      button.disabled = true;
      status.textContent = "Google 로그인 화면으로 이동 중입니다…";
      try { await signInWithGoogle(); }
      catch (error) { button.disabled = false; status.textContent = `로그인 연결에 실패했습니다: ${error.message}`; }
    }
    if (event.target.closest(".logout-btn")) {
      const button = event.target.closest(".logout-btn");
      button.disabled = true;
      try { await signOutFromSupabase(); }
      catch (error) { button.disabled = false; button.textContent = `로그아웃 실패 · ${error.message}`; }
    }
    if (event.target.closest(".account-wishes")) { renderWishes(); openDrawer(".wish-drawer"); }
  });

  window.addEventListener("saegyeol:store", () => { renderCart(); renderWishes(); });
  window.addEventListener("saegyeol:auth", renderAccount);
  renderCart();
  renderWishes();
  renderAccount();
  syncAuthSession().catch((error) => {
    const status = document.querySelector(".auth-status");
    if (status) status.textContent = `인증 서버 확인에 실패했습니다: ${error.message}`;
  });
  return { openCart: () => { renderCart(); openDrawer(".cart-drawer"); }, openWishlist: () => { renderWishes(); openDrawer(".wish-drawer"); }, refresh: () => { renderCart(); renderWishes(); }, closeDrawers };
}
