import { products } from "./products.js";
import { addCartItem, getCart, getProfile, getUser, getWishlist, initCommerceUI } from "./store.js";
import { signInWithGoogle, syncAuthSession } from "./supabase-client.js";
import { openKakaoPostcode, setAddressFieldsReadonly } from "./postcode.js";

const SHIPPING_KEY = "saegyeol_shipping_v1";
const ORDER_KEY = "saegyeol_orders_v1";
const PROFILE_KEY = "saegyeol_profile_v1";
const GENERAL_QA_KEY = "saegyeol_general_inquiries_v1";
const SCENE_KEY = "saegyeol_scenes_v1";
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => { localStorage.setItem(key, JSON.stringify(value)); window.dispatchEvent(new CustomEvent("saegyeol:store", { detail: { key } })); };
const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
const commerce = initCommerceUI(products);

function setTab(name) {
  const safeName = document.querySelector(`[data-my-panel="${name}"]`) ? name : "overview";
  document.querySelectorAll("[data-my-tab]").forEach((button) => button.classList.toggle("active", button.dataset.myTab === safeName));
  document.querySelectorAll("[data-my-panel]").forEach((panel) => {
    const active = panel.dataset.myPanel === safeName;
    panel.hidden = !active;
    panel.classList.toggle("active", active);
  });
  history.replaceState(null, "", safeName === "overview" ? location.pathname : `#${safeName}`);
}

document.querySelectorAll("[data-my-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.myTab)));
setTab(location.hash.slice(1) || "overview");

function renderMember() {
  const user = getUser();
  const member = document.querySelector("#myMember");
  member.innerHTML = user
    ? `${user.avatar ? `<img src="${escapeHTML(user.avatar)}" alt="${escapeHTML(user.name)} 프로필" referrerpolicy="no-referrer" />` : `<span>${escapeHTML(user.name).slice(0, 1)}</span>`}<div><small>GOOGLE MEMBER</small><strong>${escapeHTML(user.name)}님</strong><p>${escapeHTML(user.email)}</p></div>`
    : `<div><small>GUEST MODE</small><strong>로그인하고 취향을 이어가세요.</strong><p>주문과 배송 내역이 계정에 안전하게 연결됩니다.</p></div><button class="my-google-login" type="button">Google로 계속하기 ↗</button>`;
}

function renderOverview() {
  const orders = read(ORDER_KEY, []);
  const inquiries = collectInquiries();
  const wishes = getWishlist();
  const profile = getProfile();
  document.querySelector("#myStats").innerHTML = [
    ["진행 중 주문", orders.filter((order) => !["배송 완료", "취소"].includes(order.status)).length, "orders"],
    ["찜한 상품", wishes.length, "wishlist"],
    ["답변 대기", inquiries.filter((item) => item.status === "waiting").length, "inquiries"],
    ["나의 퍼스널 톤", profile.personalTone || "미정", "profile"]
  ].map(([label, value, target]) => `<button type="button" data-stat-target="${target}"><small>${label}</small><strong>${value}</strong><span>확인하기 ↗</span></button>`).join("");
  const wishProducts = wishes.map((id) => products.find((product) => product.id === Number(id))).filter(Boolean).slice(0, 4);
  document.querySelector("#myWishlist").innerHTML = wishProducts.length ? wishProducts.map((product) => `<a href="./product.html?id=${product.id}"><img src="${product.image}" alt="${escapeHTML(product.name)}" /><small>${escapeHTML(product.brand)}</small><strong>${escapeHTML(product.name)}</strong><span>${product.price}</span></a>`).join("") : `<div class="my-empty"><strong>아직 찜한 상품이 없어요.</strong><p>마음에 드는 상품의 하트를 눌러 나만의 셀렉션을 만들어보세요.</p><a href="./index.html#new">상품 둘러보기 ↗</a></div>`;
}

function renderOrders() {
  const orders = read(ORDER_KEY, []);
  document.querySelector("#myOrders").innerHTML = orders.length ? orders.map((order) => {
    const items = order.items || order.cart || [];
    const first = products.find((product) => product.id === Number(items[0]?.id));
    return `<article class="my-order"><div><small>${escapeHTML(order.date || order.createdAt || "최근 주문")} · ${escapeHTML(order.id || "ORDER")}</small><span>${escapeHTML(order.status || "결제 완료")}</span></div><section>${first ? `<img src="${first.image}" alt="" />` : ""}<p><strong>${escapeHTML(first?.name || "새결 주문 상품")}</strong><span>${items.length > 1 ? `외 ${items.length - 1}개 상품` : items[0]?.option || "옵션 확인 중"}</span></p><b>${escapeHTML(order.total || order.totalPrice || "결제 금액 확인")}</b></section><button type="button">배송 조회 ↗</button></article>`;
  }).join("") : `<div class="my-empty"><strong>아직 주문 내역이 없어요.</strong><p>취향에 맞는 새로운 패션과 뷰티를 만나보세요.</p><a href="./index.html#new">쇼핑 시작하기 ↗</a></div>`;
}

function renderScenes() {
  const scenes = read(SCENE_KEY, []);
  document.querySelector("#myScenes").innerHTML = scenes.length ? scenes.map((scene) => {
    const sceneProducts = (scene.itemIds || []).map((id) => products.find((product) => product.id === Number(id))).filter(Boolean);
    const total = sceneProducts.reduce((sum, product) => sum + Number(product.price.replace(/[^0-9]/g, "")), 0);
    return `<article class="my-scene" data-scene-id="${escapeHTML(scene.id)}"><div class="my-scene__visual"><img src="${escapeHTML(scene.image)}" alt="${escapeHTML(scene.title)} 장면" /><span>SAVED MOOD · ${sceneProducts.length} ITEMS</span></div><div class="my-scene__content"><small>MY CURATION</small><h3>${escapeHTML(scene.title)}</h3><p>${escapeHTML(scene.subtitle)}</p><div class="my-scene__products">${sceneProducts.map((product) => `<a href="./product.html?id=${product.id}" title="${escapeHTML(product.name)}"><img src="${product.image}" alt="" /></a>`).join("")}</div><div class="my-scene__bottom"><strong>예상 합계 ${total.toLocaleString("ko-KR")}원</strong><button type="button" data-scene-cart>세트 장바구니 담기 +</button></div></div></article>`;
  }).join("") : `<div class="my-empty"><strong>아직 담은 장면이 없어요.</strong><p>메인의 에디토리얼 룩에서 ‘이 장면 그대로 담기’를 눌러보세요.</p><a href="./index.html#fashion">장면 둘러보기 ↗</a></div>`;
}

function collectInquiries() {
  const general = read(GENERAL_QA_KEY, []);
  const productQuestions = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("saegyeol_qa_")) continue;
    const productId = Number(key.replace("saegyeol_qa_", ""));
    const product = products.find((item) => item.id === productId);
    read(key, []).forEach((item) => productQuestions.push({ ...item, source: product?.name || "상품 문의", productId }));
  }
  return [...general, ...productQuestions].sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
}

function renderInquiries() {
  const items = collectInquiries();
  document.querySelector("#myInquiries").innerHTML = items.length ? items.map((item) => `<article class="my-inquiry"><span class="${item.status === "answered" ? "answered" : "waiting"}">${item.status === "answered" ? "답변 완료" : "답변 대기"}</span><small>${escapeHTML(item.type)} · ${escapeHTML(item.date)}</small><strong>${escapeHTML(item.title || item.question)}</strong><p>${escapeHTML(item.source || "1:1 문의")}${item.productId ? ` · <a href="./product.html?id=${item.productId}#qa">상품으로 이동 ↗</a>` : ""}</p></article>`).join("") : `<div class="my-empty"><strong>등록한 문의가 없어요.</strong><p>상품 상세 Q&amp;A 또는 위 입력창에서 문의를 남길 수 있습니다.</p></div>`;
}

function fillForm(form, values) {
  Object.entries(values || {}).forEach(([key, value]) => { if (form.elements[key]) form.elements[key].value = value; });
}

const shippingForm = document.querySelector("#shippingForm");
fillForm(shippingForm, read(SHIPPING_KEY, {}));
setAddressFieldsReadonly(shippingForm, ["postcode", "address1"]);
shippingForm.addEventListener("submit", (event) => {
  event.preventDefault();
  write(SHIPPING_KEY, Object.fromEntries(new FormData(shippingForm).entries()));
  shippingForm.querySelector(".my-form-status").textContent = "기본 배송지를 저장했습니다.";
});
document.querySelector("#postcodeButton").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const status = shippingForm.querySelector(".my-form-status");
  button.disabled = true;
  try {
    await openKakaoPostcode({
      postcode: shippingForm.elements.postcode,
      address: shippingForm.elements.address1,
      detail: shippingForm.elements.address2,
      status,
      trigger: button
    });
  } catch (error) {
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

const profileForm = document.querySelector("#profileForm");
fillForm(profileForm, getProfile());
profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  write(PROFILE_KEY, Object.fromEntries(new FormData(profileForm).entries()));
  profileForm.querySelector(".my-form-status").textContent = "프로필을 저장했습니다. 리뷰와 상품 추천에 반영됩니다.";
  renderOverview();
});

document.querySelector("#inquiryForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const today = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()).replaceAll(". ", ".").replace(".", "").trim();
  const inquiries = read(GENERAL_QA_KEY, []);
  inquiries.unshift({ id: Date.now(), type: data.get("type"), question: data.get("question"), date: today, status: "waiting", source: "1:1 문의" });
  write(GENERAL_QA_KEY, inquiries);
  event.currentTarget.reset();
  renderInquiries();
  renderOverview();
});

document.querySelector("#myScenes").addEventListener("click", (event) => {
  const button = event.target.closest("[data-scene-cart]");
  if (!button) return;
  const sceneId = button.closest("[data-scene-id]").dataset.sceneId;
  const scene = read(SCENE_KEY, []).find((item) => item.id === sceneId);
  (scene?.itemIds || []).forEach((id) => {
    const product = products.find((item) => item.id === Number(id));
    if (product) addCartItem(product.id, product.options[0]);
  });
  commerce.refresh();
  button.textContent = "장바구니에 담았습니다 ✓";
  document.querySelector(".cart-btn")?.click();
});

document.querySelector("#myStats").addEventListener("click", (event) => {
  const button = event.target.closest("[data-stat-target]");
  if (!button) return;
  if (button.dataset.statTarget === "wishlist") document.querySelector(".wishlist-toggle")?.click();
  else setTab(button.dataset.statTarget);
});
document.querySelector("[data-open-wishes]").addEventListener("click", () => document.querySelector(".wishlist-toggle")?.click());
document.querySelector("#myMember").addEventListener("click", async (event) => {
  const button = event.target.closest(".my-google-login");
  if (!button) return;
  button.disabled = true;
  button.textContent = "Google 로그인으로 이동 중…";
  try { await signInWithGoogle(); } catch (error) { button.disabled = false; button.textContent = `다시 시도 · ${error.message}`; }
});

renderMember();
renderOverview();
renderOrders();
renderScenes();
renderInquiries();
syncAuthSession().then(() => { renderMember(); renderOverview(); }).catch(() => {});
window.addEventListener("saegyeol:auth", () => { renderMember(); renderOverview(); });
window.addEventListener("saegyeol:store", () => { commerce.refresh(); renderOverview(); });
