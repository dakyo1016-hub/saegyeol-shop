import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";
import { products } from "./products.js";
import { addCartItem, getCart, getProfile, getUser, getWishlist, initCommerceUI, isWished, toggleWishlist } from "./store.js";

const productGrid = document.querySelector("#productGrid");
const toast = document.querySelector(".toast");
let toastTimer;

const RECENT_KEY = "saegyeol_recent_views_v1";
const INTEREST_KEY = "saegyeol_interest_v1";
const readLocal = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; } };

function personalizedProducts(items = products) {
  const wishes = getWishlist();
  const cart = getCart();
  const recent = readLocal(RECENT_KEY, []);
  const interest = readLocal(INTEREST_KEY, { fashion: 0, beauty: 0 });
  const profile = getProfile();
  const recentProducts = recent.map((id) => products.find((product) => product.id === Number(id))).filter(Boolean);
  return [...items].map((product, index) => {
    let score = (items.length - index) * .001;
    const reasons = [];
    if (wishes.includes(product.id)) { score += 5; reasons.push("찜한 상품"); }
    if (cart.some((item) => item.id === product.id)) { score += 4; reasons.push("장바구니 관심"); }
    const recentIndex = recent.indexOf(product.id);
    if (recentIndex >= 0) { score += Math.max(1, 3 - recentIndex * .3); reasons.push("최근 본 상품"); }
    if (recentProducts.some((item) => item.brand === product.brand && item.id !== product.id)) { score += 1.5; reasons.push("관심 브랜드"); }
    score += Number(interest[product.category] || 0) * .35;
    if (product.category === "beauty" && ["웜톤", "쿨톤", "뉴트럴"].includes(profile.personalTone)) {
      const key = profile.personalTone === "웜톤" ? "warm" : profile.personalTone === "쿨톤" ? "cool" : "neutral";
      if (product.tone === "all" || Object.values(product.optionTones || {}).includes(key)) { score += 2; reasons.push(`${profile.personalTone} 추천`); }
    }
    return { product, score, reason: reasons[0] || (product.badge === "NEW" ? "새결 신규 셀렉트" : "지금 주목받는 상품") };
  }).sort((a, b) => b.score - a.score);
}

function productCardHTML(item, reason = "") {
  const soldOut = Number(item.stock) === 0;
  return `
    <article class="product-card" data-category="${item.category}">
      <div class="product-media">
        <a class="product-link product-link--media" href="./product.html?id=${item.id}" aria-label="${item.name} 상세보기">
          <img class="product-primary-image" src="${item.image}" alt="${item.name} 제품 단독 이미지" loading="lazy" />
          <img class="product-model-image" src="${item.modelImage}" alt="${item.name} 착용 및 사용 이미지" loading="lazy" />
          <span class="product-badge">${soldOut ? "SOLD OUT" : item.badge}</span>${reason ? `<span class="recommend-reason">FOR YOU · ${reason}</span>` : ""}${item.category === "beauty" ? `<span class="tone-card-badge">${item.tone === "all" ? "ALL TONE" : "WARM · COOL"}</span>` : ""}
        </a>
        <button class="wish-btn ${isWished(item.id) ? "active" : ""}" data-product-id="${item.id}" type="button" aria-label="${item.name} 찜하기">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 5.6c-2.1-2.1-5.6-1.8-7.5.5l-1 1.2-1-1.2c-1.9-2.3-5.4-2.6-7.5-.5-2.3 2.3-2.1 6 .3 8.1L12 21l8.2-7.3c2.4-2.1 2.6-5.8.3-8.1Z"/></svg>
        </button>
        <button class="card-add" type="button" data-add="${item.id}" ${soldOut ? "disabled" : ""}>${soldOut ? "SOLD OUT" : "QUICK ADD +"}</button>
      </div>
      <a class="product-info product-link" href="./product.html?id=${item.id}">
        <p class="product-info__brand">${item.brand}</p>
        <p class="product-info__name">${item.name}</p>
        <p class="product-price">${item.discount ? `<em>${item.discount}</em>` : ""}<strong>${item.price}</strong>${item.original ? `<del>${item.original}</del>` : ""}</p>
      </a>
    </article>`;
}

function renderProducts(filter = "all") {
  const availableProducts = products.filter((item) => item.active !== false);
  const source = filter === "all" ? availableProducts : availableProducts.filter((item) => item.category === filter);
  const ranked = personalizedProducts(source);
  productGrid.innerHTML = ranked.map(({ product, reason }) => productCardHTML(product, reason)).join("");
  const hasSignals = getWishlist().length || getCart().length || readLocal(RECENT_KEY, []).length || getProfile().personalTone !== "미정";
  const title = document.querySelector("#personalizedTitle");
  if (title) title.textContent = filter === "all" && hasSignals ? `${getUser()?.name || "당신"}을 위한 셀렉트` : filter === "all" ? "TRENDING NOW" : `${filter.toUpperCase()} FOR YOU`;
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

const commerce = initCommerceUI(products);

function addToCart(productId, message = "장바구니에 담았습니다.", option = "") {
  const product = products.find((item) => item.id === Number(productId));
  if (!product) return;
  addCartItem(product.id, option || product.options[0]);
  commerce.refresh();
  document.querySelector(".cart-count")?.animate([{ transform: "scale(.65)" }, { transform: "scale(1.18)" }, { transform: "scale(1)" }], { duration: 350 });
  showToast(message);
}

document.body.insertAdjacentHTML("beforeend", `
  <div class="quick-option-layer" aria-hidden="true">
    <button class="quick-option-overlay" type="button" aria-label="옵션 선택 닫기"></button>
    <section class="quick-option-sheet" role="dialog" aria-modal="true" aria-labelledby="quickOptionTitle">
      <header><div><small>QUICK SELECTION</small><h2 id="quickOptionTitle">옵션 선택</h2></div><button class="quick-option-close" type="button" aria-label="닫기">CLOSE ×</button></header>
      <div class="quick-option-product"><img src="" alt="" /><div><small></small><strong></strong><span></span></div></div>
      <div class="quick-option-select"><div><b>SIZE / OPTION</b><span>옵션을 선택해주세요.</span></div><div class="quick-option-buttons"></div></div>
      <button class="quick-option-confirm" type="button" disabled><span>옵션을 먼저 선택해주세요</span><b>+</b></button>
    </section>
  </div>`);

const quickOptionLayer = document.querySelector(".quick-option-layer");
let quickOptionProduct = null;
let quickSelectedOption = "";

function closeQuickOption() {
  quickOptionLayer.classList.remove("is-open");
  quickOptionLayer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
}

function openQuickOption(productId) {
  const product = products.find((item) => item.id === Number(productId));
  if (!product) return;
  quickOptionProduct = product;
  quickSelectedOption = "";
  const optionLabel = product.category === "fashion" ? "SIZE / OPTION" : "COLOR / CAPACITY";
  quickOptionLayer.querySelector("#quickOptionTitle").textContent = product.category === "fashion" ? "사이즈 선택" : "컬러 · 용량 선택";
  quickOptionLayer.querySelector(".quick-option-product img").src = product.image;
  quickOptionLayer.querySelector(".quick-option-product img").alt = `${product.name} 제품 이미지`;
  quickOptionLayer.querySelector(".quick-option-product small").textContent = product.brand;
  quickOptionLayer.querySelector(".quick-option-product strong").textContent = product.name;
  quickOptionLayer.querySelector(".quick-option-product span").textContent = product.price;
  quickOptionLayer.querySelector(".quick-option-select b").textContent = optionLabel;
  quickOptionLayer.querySelector(".quick-option-select span").textContent = "옵션을 선택해주세요.";
  quickOptionLayer.querySelector(".quick-option-buttons").innerHTML = product.options.map((option) => {
    const tone = product.optionTones?.[option];
    return `<button type="button" data-quick-option="${option}"><strong>${option}</strong>${tone ? `<small>${tone.toUpperCase()} TONE</small>` : ""}</button>`;
  }).join("");
  const confirm = quickOptionLayer.querySelector(".quick-option-confirm");
  confirm.disabled = true;
  confirm.querySelector("span").textContent = "옵션을 먼저 선택해주세요";
  quickOptionLayer.classList.add("is-open");
  quickOptionLayer.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  setTimeout(() => quickOptionLayer.querySelector("[data-quick-option]")?.focus(), 120);
}

quickOptionLayer.addEventListener("click", (event) => {
  if (event.target.closest(".quick-option-overlay, .quick-option-close")) closeQuickOption();
  const optionButton = event.target.closest("[data-quick-option]");
  if (optionButton) {
    quickSelectedOption = optionButton.dataset.quickOption;
    quickOptionLayer.querySelectorAll("[data-quick-option]").forEach((button) => button.classList.toggle("active", button === optionButton));
    quickOptionLayer.querySelector(".quick-option-select span").textContent = `${quickSelectedOption} 선택됨`;
    const confirm = quickOptionLayer.querySelector(".quick-option-confirm");
    confirm.disabled = false;
    confirm.querySelector("span").textContent = `${quickSelectedOption} 장바구니 담기`;
  }
  if (event.target.closest(".quick-option-confirm") && quickOptionProduct && quickSelectedOption) {
    addToCart(quickOptionProduct.id, `${quickSelectedOption} 옵션을 장바구니에 담았습니다.`, quickSelectedOption);
    closeQuickOption();
  }
});

renderProducts();
const saleProducts = products.filter((product) => product.active !== false && product.discount);
document.querySelector("#saleGrid").innerHTML = saleProducts.map((product) => productCardHTML(product, `${product.discount} PRICE DROP`)).join("");

document.querySelectorAll(".product-tabs button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".product-tabs button").forEach((tab) => {
      tab.classList.remove("active");
      tab.setAttribute("aria-selected", "false");
    });
    button.classList.add("active");
    button.setAttribute("aria-selected", "true");
    renderProducts(button.dataset.filter);
    commerce.refresh();
  });
});

document.addEventListener("click", (event) => {
  const wish = event.target.closest(".wish-btn");
  const add = event.target.closest(".card-add");
  if (wish) {
    const active = toggleWishlist(wish.dataset.productId);
    document.querySelectorAll(`.wish-btn[data-product-id="${wish.dataset.productId}"]`).forEach((button) => {
      button.classList.toggle("active", active);
      button.setAttribute("aria-label", active ? "찜 해제하기" : "찜하기");
    });
    commerce.refresh();
    showToast(active ? "찜 목록에 저장했습니다." : "찜 목록에서 삭제했습니다.");
  }
  if (add) {
    event.preventDefault();
    openQuickOption(add.dataset.add);
  }
});

document.addEventListener("click", (event) => {
  const card = event.target.closest(".product-card");
  if (!card) return;
  const category = card.dataset.category;
  if (!category) return;
  const interest = readLocal(INTEREST_KEY, { fashion: 0, beauty: 0 });
  interest[category] = Math.min(20, Number(interest[category] || 0) + 1);
  localStorage.setItem(INTEREST_KEY, JSON.stringify(interest));
});

document.querySelector(".quick-add").addEventListener("click", () => openQuickOption(5));
document.querySelector(".beauty-add").addEventListener("click", () => openQuickOption(4));
document.querySelector(".add-look").addEventListener("click", (event) => {
  const button = event.currentTarget;
  if (button.dataset.saved === "true") {
    window.location.href = "./mypage.html#scenes";
    return;
  }
  const scenes = readLocal("saegyeol_scenes_v1", []);
  const scene = {
    id: "soft-chrome",
    title: "SOFT CHROME",
    subtitle: "부드러운 실루엣과 차가운 실버 포인트",
    image: "./assets/products/summer-half-jacket.webp",
    itemIds: [7, 5, 3, 4, 6, 8],
    savedAt: new Date().toISOString()
  };
  if (!scenes.some((item) => item.id === scene.id)) scenes.unshift(scene);
  localStorage.setItem("saegyeol_scenes_v1", JSON.stringify(scenes));
  button.dataset.saved = "true";
  button.innerHTML = `장면 보관함에서 보기 <span>↗</span>`;
  showToast("SOFT CHROME 장면을 보관했습니다.");
});
document.querySelectorAll(".ranking-list li[data-product-id]").forEach((row) => {
  row.setAttribute("tabindex", "0");
  row.setAttribute("role", "link");
  const go = () => { window.location.href = `./product.html?id=${row.dataset.productId}`; };
  row.addEventListener("click", go);
  row.addEventListener("keydown", (event) => { if (event.key === "Enter") go(); });
});

const header = document.querySelector("#siteHeader");
window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 30), { passive: true });

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
menuToggle.addEventListener("click", () => {
  const open = !mobileMenu.classList.contains("is-open");
  mobileMenu.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  mobileMenu.setAttribute("aria-hidden", String(!open));
  menuToggle.setAttribute("aria-expanded", String(open));
});
mobileMenu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
  mobileMenu.classList.remove("is-open");
  document.body.classList.remove("menu-open");
  mobileMenu.setAttribute("aria-hidden", "true");
  menuToggle.setAttribute("aria-expanded", "false");
}));

const searchPanel = document.querySelector(".search-panel");
const searchInput = document.querySelector("#searchInput");
function setSearch(open) {
  searchPanel.classList.toggle("is-open", open);
  document.body.classList.toggle("panel-open", open);
  searchPanel.setAttribute("aria-hidden", String(!open));
  if (open) setTimeout(() => searchInput.focus(), 450);
}
document.querySelector(".search-toggle").addEventListener("click", () => setSearch(true));
document.querySelector(".search-close").addEventListener("click", () => setSearch(false));
document.addEventListener("keydown", (event) => { if (event.key === "Escape") setSearch(false); });
document.querySelector(".search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const term = searchInput.value.trim();
  if (term) {
    const first = searchProducts(term)[0];
    if (first) window.location.href = `./product.html?id=${first.id}`;
    else showToast(`“${term}” 검색 결과가 없습니다.`);
  }
});
document.querySelectorAll(".popular-searches button").forEach((button) => button.addEventListener("click", () => {
  searchInput.value = button.textContent;
  searchInput.focus();
}));

const searchResults = document.createElement("div");
searchResults.className = "search-results";
document.querySelector(".search-form").appendChild(searchResults);
function searchProducts(term) {
  const query = term.trim().toLowerCase();
  return products.filter((product) => `${product.brand} ${product.name} ${product.category}`.toLowerCase().includes(query));
}
function renderSearchResults(term) {
  const results = term ? searchProducts(term) : [];
  searchResults.innerHTML = results.length ? results.map((product) => `<a href="./product.html?id=${product.id}"><img src="${product.image}" alt="" /><span><small>${product.brand}</small><strong>${product.name}</strong><b>${product.price}</b></span><i>↗</i></a>`).join("") : (term ? `<p>“${term}”과 일치하는 상품이 없습니다.</p>` : "");
}
searchInput.addEventListener("input", () => renderSearchResults(searchInput.value));

const beautySection = document.querySelector(".beauty-section");
const swatchName = document.querySelector(".swatch-name");
document.querySelectorAll(".swatches button").forEach((button, index) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".swatches button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    beautySection.style.background = button.dataset.color;
    swatchName.textContent = `${String(index + 1).padStart(2, "0")} · ${button.dataset.name.toUpperCase()}`;
  });
});

const campaign = document.querySelector(".campaign-slider");
const campaignSlides = [...document.querySelectorAll("[data-campaign-slide]")];
const campaignDots = [...document.querySelectorAll("[data-campaign-dot]")];
const campaignCurrent = document.querySelector(".campaign-current");
let campaignIndex = 0;
let campaignTimer;

function showCampaign(index) {
  campaignIndex = (index + campaignSlides.length) % campaignSlides.length;
  campaignSlides.forEach((slide, slideIndex) => {
    const active = slideIndex === campaignIndex;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
  });
  campaignDots.forEach((dot, dotIndex) => dot.classList.toggle("active", dotIndex === campaignIndex));
  if (campaignCurrent) campaignCurrent.textContent = String(campaignIndex + 1).padStart(2, "0");
}

function startCampaignTimer() {
  clearInterval(campaignTimer);
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    campaignTimer = setInterval(() => showCampaign(campaignIndex + 1), 6500);
  }
}

document.querySelector(".campaign-prev")?.addEventListener("click", () => { showCampaign(campaignIndex - 1); startCampaignTimer(); });
document.querySelector(".campaign-next")?.addEventListener("click", () => { showCampaign(campaignIndex + 1); startCampaignTimer(); });
campaignDots.forEach((dot) => dot.addEventListener("click", () => { showCampaign(Number(dot.dataset.campaignDot)); startCampaignTimer(); }));
campaign?.addEventListener("mouseenter", () => clearInterval(campaignTimer));
campaign?.addEventListener("mouseleave", startCampaignTimer);
campaign?.addEventListener("focusin", () => clearInterval(campaignTimer));
campaign?.addEventListener("focusout", startCampaignTimer);
showCampaign(0);
startCampaignTimer();

const toneAnswers = {};
const toneSection = document.querySelector(".tone-finder");
const toneResult = toneSection?.querySelector(".tone-result");
const toneProgress = toneSection?.querySelector(".tone-progress i");
const toneCopy = {
  웜톤: { title: "WARM · 맑은 온기를 가진 톤", body: "멜로 코랄과 딥 루즈처럼 노란 기가 살짝 감도는 컬러부터 만나보세요.", option: "01 MELLOW CORAL" },
  쿨톤: { title: "COOL · 투명한 대비가 사는 톤", body: "더스트 로즈와 플럼 에어처럼 푸른 기가 감도는 컬러를 추천해요.", option: "03 DUST ROSE" }
};

function renderToneResult(tone) {
  const recommendation = toneCopy[tone];
  if (!recommendation || !toneResult) return;
  toneResult.classList.add("is-complete");
  toneResult.querySelector("h3").textContent = recommendation.title;
  toneResult.querySelector("span").textContent = recommendation.body;
  toneResult.querySelector("a").href = `./product.html?id=4&option=${encodeURIComponent(recommendation.option)}`;
  const profile = getProfile();
  localStorage.setItem("saegyeol_profile_v1", JSON.stringify({ ...profile, personalTone: tone }));
  window.dispatchEvent(new CustomEvent("saegyeol:store", { detail: { key: "saegyeol_profile_v1" } }));
}

toneSection?.querySelectorAll("fieldset button").forEach((button) => {
  button.addEventListener("click", () => {
    const fieldset = button.closest("fieldset");
    fieldset.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    toneAnswers[fieldset.dataset.toneQuestion] = button.dataset.tone;
    const count = Object.keys(toneAnswers).length;
    toneProgress.style.width = `${count / 3 * 100}%`;
    if (count === 3) {
      const warmCount = Object.values(toneAnswers).filter((tone) => tone === "warm").length;
      renderToneResult(warmCount >= 2 ? "웜톤" : "쿨톤");
    }
  });
});

const savedTone = getProfile().personalTone;
if (savedTone === "웜톤" || savedTone === "쿨톤") renderToneResult(savedTone);

document.querySelector(".newsletter-form").addEventListener("submit", (event) => {
  event.preventDefault();
  document.querySelector(".form-status").textContent = "구독이 완료되었습니다. 다음 목요일에 만나요.";
  event.currentTarget.reset();
});

// THREE.JS — an organic object that shifts from soft fabric to glossy chrome.
const canvas = document.querySelector("#heroCanvas");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.35 : 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, window.innerWidth / window.innerHeight, .1, 100);
  camera.position.set(0, 0, 7.2);

  const geometry = new THREE.IcosahedronGeometry(1.68, window.innerWidth < 700 ? 4 : 5);
  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color("#d8d5cc"),
    roughness: .72,
    metalness: .05,
    transmission: 0,
    thickness: 1.4,
    clearcoat: .2,
    clearcoatRoughness: .5,
    envMapIntensity: 1.5,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uScroll = { value: 0 };
    material.userData.shader = shader;
    shader.vertexShader = shader.vertexShader.replace("#include <common>", `#include <common>
      uniform float uTime;
      uniform float uScroll;
      float hash(vec3 p){ p=fract(p*.3183099+.1); p*=17.; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
      float noise(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.-2.*f); return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z); }
    `).replace("#include <begin_vertex>", `
      vec3 transformed = vec3(position);
      float n1 = noise(normal * 2.25 + vec3(uTime * .12));
      float n2 = noise(normal * 5.2 - vec3(uTime * .08));
      float fabric = sin(position.y * 5.0 + uTime * .5) * .075 + (n1 - .5) * .34;
      float liquid = (n1 - .5) * .48 + (n2 - .5) * .11;
      float mode = smoothstep(.08, .84, uScroll);
      transformed += normal * mix(fabric, liquid, mode);
      transformed.x *= 1.0 + .17 * sin(position.y * 2.1 + uTime * .25);
      transformed.y *= 1.08;
    `);
  };

  const object = new THREE.Mesh(geometry, material);
  object.rotation.set(-.12, .45, -.16);
  scene.add(object);

  const key = new THREE.DirectionalLight("#fff6e9", 6.2);
  key.position.set(-3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight("#bcd6ff", 4.8);
  rim.position.set(4, -1, 3);
  scene.add(rim);
  const lime = new THREE.PointLight("#d9ff43", 24, 9, 2);
  lime.position.set(-2.8, -2.1, 3);
  scene.add(lime);
  scene.add(new THREE.HemisphereLight("#ffffff", "#9a9690", 2.2));

  const pointer = new THREE.Vector2();
  window.addEventListener("pointermove", (event) => {
    pointer.x = event.clientX / window.innerWidth - .5;
    pointer.y = event.clientY / window.innerHeight - .5;
  }, { passive: true });

  const materialLabel = document.querySelector(".hero-material");
  const clock = new THREE.Clock();
  let heroVisible = true;
  const observer = new IntersectionObserver(([entry]) => { heroVisible = entry.isIntersecting; }, { threshold: .01 });
  observer.observe(document.querySelector(".hero"));

  function resize() {
    const width = window.innerWidth;
    const height = Math.max(window.innerHeight, window.innerWidth < 680 ? 760 : window.innerHeight);
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    object.scale.setScalar(width < 680 ? .78 : width < 1000 ? .9 : 1);
    object.position.set(width < 680 ? .25 : .45, width < 680 ? .65 : .05, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  function animate() {
    requestAnimationFrame(animate);
    if (!heroVisible && window.scrollY > window.innerHeight * 1.2) return;
    const time = clock.getElapsedTime();
    const scrollProgress = Math.min(window.scrollY / Math.max(window.innerHeight, 1), 1);
    if (material.userData.shader) {
      material.userData.shader.uniforms.uTime.value = reducedMotion ? 1 : time;
      material.userData.shader.uniforms.uScroll.value += (scrollProgress - material.userData.shader.uniforms.uScroll.value) * .04;
    }
    const mode = scrollProgress;
    material.roughness += ((.72 - mode * .55) - material.roughness) * .035;
    material.metalness += ((.05 + mode * .78) - material.metalness) * .035;
    material.clearcoat += ((.2 + mode * .72) - material.clearcoat) * .035;
    object.rotation.y += reducedMotion ? 0 : .0018;
    object.rotation.x += ((pointer.y * .18 - .1) - object.rotation.x) * .025;
    object.rotation.z += ((pointer.x * -.16 - .12) - object.rotation.z) * .025;
    object.position.x += (((window.innerWidth < 680 ? .25 : .45) + pointer.x * .16) - object.position.x) * .025;
    materialLabel.lastChild.textContent = mode > .62 ? " LIQUID CHROME" : mode > .28 ? " DEW GEL" : " SOFT FABRIC";
    renderer.render(scene, camera);
  }
  animate();
} catch (error) {
  console.warn("WebGL hero fallback enabled", error);
  canvas.style.background = "radial-gradient(circle, rgba(217,255,67,.55), transparent 25%), radial-gradient(ellipse at 60% 50%, #aaa7a0 0, transparent 40%)";
}

window.addEventListener("load", () => setTimeout(() => document.querySelector(".loader").classList.add("is-hidden"), 1050));
