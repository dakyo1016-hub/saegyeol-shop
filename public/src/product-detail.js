import { products, getProduct } from "./products.js";
import { addCartItem, getProfile, initCommerceUI, isWished, toggleWishlist } from "./store.js";

const params = new URLSearchParams(window.location.search);
const product = getProduct(params.get("id"));
const recentViews = (() => { try { return JSON.parse(localStorage.getItem("saegyeol_recent_views_v1")) || []; } catch { return []; } })();
localStorage.setItem("saegyeol_recent_views_v1", JSON.stringify([product.id, ...recentViews.filter((id) => Number(id) !== product.id)].slice(0, 12)));
let selectedOption = "";
let toastTimer;
const commerce = initCommerceUI(products);

document.title = `${product.name} — 새결`;
document.querySelector("#breadcrumbCategory").textContent = product.category.toUpperCase();
document.querySelector("#breadcrumbCategory").href = `./index.html#${product.category}`;
document.querySelector("#breadcrumbBrand").textContent = product.brand;
document.querySelector("#productBrand").textContent = `${product.brand} +`;
document.querySelector("#brandInitial").textContent = product.brand.charAt(0);
document.querySelector("#brandInfoName").textContent = product.brand;
document.querySelector("#brandMood").textContent = product.brandMood;
document.querySelector("#brandDescription").textContent = product.brandDescription;
document.querySelector("#productTitle").textContent = product.name;
document.querySelector("#productSummary").textContent = product.summary;
document.querySelector("#productMaterial").textContent = product.material;
document.querySelector("#productDetail").textContent = product.detail;
document.querySelector("#productColor").textContent = `${product.category === "fashion" ? "COLOR" : "OPTION"} · ${product.color}`;
document.querySelector("#productMaterialShort").textContent = product.material;
document.querySelector("#optionLabel").textContent = product.category === "fashion" ? "SIZE / COLOR" : "COLOR / CAPACITY";
document.querySelector("#guideButton").textContent = product.category === "fashion" ? "사이즈 가이드 ↗" : "전성분 보기 ↗";

const sizeGuides = {
  1: { columns: ["총장", "어깨", "가슴 단면", "소매장", "밑단"], rows: { S: [62, 48, 56, 57, 50], M: [64, 50, 58, 58, 52], L: [66, 52, 60, 59, 54] }, fit: "여유 있는 세미 오버핏 · 밑단 스트링 조절 가능", model: "모델 168cm / 49kg · S 착용" },
  3: { columns: ["앞 총장", "뒤 총장", "가슴 단면", "밑단"], rows: { FREE: [58, 67, 54, 62] }, fit: "비대칭 드레이프 실루엣 · 44–66 권장", model: "모델 167cm / 48kg · FREE 착용" },
  5: { columns: ["가로", "세로", "폭", "스트랩 높이"], rows: { ONE: [27, 18, 8, "42–58"] }, fit: "휴대폰·반지갑·미니 파우치 수납 가능", model: "스트랩 길이 조절 가능" },
  7: { columns: ["총장", "어깨", "가슴 단면", "소매장", "밑단"], rows: { S: [69, 43, 53, 28, 56], M: [71, 45, 55, 29, 58] }, fit: "린넨 혼방의 여유로운 레귤러핏", model: "모델 170cm / 50kg · S 착용" },
  9: { columns: ["총장", "허리 단면", "힙 단면", "밑단"], rows: { S: [79, 33, 47, 78], M: [80, 35, 49, 80], L: [81, 37, 51, 82] }, fit: "허리 안쪽 밴드 · 정사이즈 권장", model: "모델 166cm / 50kg · S 착용" },
  11: { columns: ["총장", "어깨", "가슴 단면", "암홀", "밑단"], rows: { S: [53, 29, 35, 19, 36], M: [55, 30, 37, 20, 38] }, fit: "몸에 부드럽게 밀착되는 슬림핏", model: "모델 165cm / 48kg · S 착용" },
  13: { columns: ["총장", "어깨", "가슴 단면", "소매장", "밑단"], rows: { S: [56, 36, 43, 62, 40], M: [58, 38, 45, 63, 42], L: [60, 40, 47, 64, 44] }, fit: "신축성 있는 골지 · 정사이즈 또는 여유 있게 한 사이즈 업", model: "모델 167cm / 49kg · S 착용" },
  14: { columns: ["총장", "어깨", "가슴 단면", "소매장", "밑단"], rows: { S: [66, 50, 54, 22, 54], M: [68, 52, 57, 23, 57], L: [70, 54, 60, 24, 60] }, fit: "자연스럽게 떨어지는 오버핏", model: "모델 168cm / 50kg · M 착용" },
  15: { columns: ["총장", "어깨", "가슴 단면", "소매장", "밑단"], rows: { S: [67, 57, 60, 55, 48], M: [69, 59, 63, 56, 51], L: [71, 61, 66, 57, 54] }, fit: "힙을 살짝 덮는 오버사이즈 핏", model: "모델 168cm / 50kg · M 착용" },
  16: { columns: ["총장", "어깨", "가슴 단면", "소매장", "밑단"], rows: { FREE: [73, 54, 61, 57, 62] }, fit: "가벼운 시어 소재 · 44–77 권장", model: "모델 168cm / 50kg · FREE 착용" },
  17: { columns: ["총장", "어깨", "가슴 단면", "소매장", "밑단"], rows: { S: [63, 47, 51, 21, 51], M: [65, 49, 54, 22, 54], L: [67, 51, 57, 23, 57] }, fit: "적당한 여유의 데일리 레귤러핏", model: "모델 167cm / 49kg · M 착용" },
  18: { columns: ["총장", "가슴 단면", "암홀", "밑단"], rows: { S: [53, 34, 19, 36], M: [55, 36, 20, 38] }, fit: "모달 혼방의 슬림 레이어 핏", model: "모델 166cm / 48kg · S 착용" }
};

document.body.insertAdjacentHTML("beforeend", `
  <div class="size-guide-layer" aria-hidden="true">
    <button class="size-guide-overlay" type="button" aria-label="가이드 닫기"></button>
    <section class="size-guide-modal" role="dialog" aria-modal="true" aria-labelledby="sizeGuideTitle">
      <header><div><small>PRODUCT GUIDE · CM</small><h2 id="sizeGuideTitle">사이즈 실측</h2></div><button class="size-guide-close" type="button">CLOSE ×</button></header>
      <div class="size-guide-body"></div>
    </section>
  </div>`);

const sizeGuideLayer = document.querySelector(".size-guide-layer");
function closeSizeGuide() {
  sizeGuideLayer.classList.remove("is-open");
  sizeGuideLayer.setAttribute("aria-hidden", "true");
  document.body.classList.remove("panel-open");
}

function renderSizeGuide() {
  const body = sizeGuideLayer.querySelector(".size-guide-body");
  if (product.category !== "fashion") {
    sizeGuideLayer.querySelector("#sizeGuideTitle").textContent = "성분 · 용량 정보";
    body.innerHTML = `<div class="ingredient-guide"><small>${product.brand}</small><h3>${product.name}</h3><dl><div><dt>주요 포뮬러</dt><dd>${product.material}</dd></div><div><dt>선택 옵션</dt><dd>${product.options.join(" · ")}</dd></div><div><dt>제품 설명</dt><dd>${product.detail}</dd></div></dl><p>피부 컨디션에 따라 사용 전 패치 테스트를 권장합니다.</p></div>`;
  } else {
    const guide = product.sizeGuide || sizeGuides[product.id] || sizeGuides[14];
    sizeGuideLayer.querySelector("#sizeGuideTitle").textContent = "사이즈 실측";
    const selectable = product.id !== 5;
    body.innerHTML = `<div class="size-guide-summary"><div><small>${product.brand}</small><h3>${product.name}</h3><p>${guide.fit}</p></div><span>${guide.model}</span></div><div class="size-table-wrap"><table><thead><tr><th>SIZE</th>${guide.columns.map((column) => `<th>${column}</th>`).join("")}${selectable ? "<th>선택</th>" : ""}</tr></thead><tbody>${Object.entries(guide.rows).map(([size, values]) => `<tr><th>${size}</th>${values.map((value) => `<td>${value}</td>`).join("")}${selectable ? `<td>${product.options.includes(size) ? `<button type="button" data-guide-size="${size}">${size} 선택</button>` : "—"}</td>` : ""}</tr>`).join("")}</tbody></table></div><div class="measure-help"><strong>측정 방법</strong><ol><li><b>총장</b> 어깨점부터 밑단까지 수직으로 측정</li><li><b>가슴</b> 암홀 아래를 수평으로 측정한 단면</li><li><b>어깨</b> 양쪽 어깨 봉제선 사이를 측정</li><li><b>소매</b> 어깨점부터 소매 끝까지 측정</li></ol><p>단위는 cm이며 측정 위치와 소재 특성에 따라 1–2cm 오차가 발생할 수 있습니다.</p></div>`;
  }
  sizeGuideLayer.classList.add("is-open");
  sizeGuideLayer.setAttribute("aria-hidden", "false");
  document.body.classList.add("panel-open");
  setTimeout(() => sizeGuideLayer.querySelector(".size-guide-close")?.focus(), 100);
}

document.querySelector("#guideButton").addEventListener("click", renderSizeGuide);
sizeGuideLayer.addEventListener("click", (event) => {
  if (event.target.closest(".size-guide-overlay, .size-guide-close")) closeSizeGuide();
  const sizeButton = event.target.closest("[data-guide-size]");
  if (!sizeButton) return;
  selectedOption = sizeButton.dataset.guideSize;
  options.querySelectorAll("button").forEach((button) => button.classList.toggle("active", button.dataset.option === selectedOption));
  document.querySelector("#optionHint").textContent = `${selectedOption} 옵션이 실측표에서 선택되었습니다.`;
  closeSizeGuide();
});
document.addEventListener("keydown", (event) => { if (event.key === "Escape" && sizeGuideLayer.classList.contains("is-open")) closeSizeGuide(); });

document.querySelector("#productPrice").innerHTML = `
  ${product.discount ? `<strong class="discount">${product.discount}</strong>` : ""}
  <strong>${product.price}</strong>
  ${product.original ? `<del>${product.original}</del>` : ""}
`;

const galleryKind = (image, index) => index === 0 ? "product" : /detail|neckline|cuff/i.test(image) ? "detail" : /worn|look|korean|campaign/i.test(image) ? "look" : "product";
document.querySelector("#productGallery").innerHTML = product.gallery.map((image, index) => {
  const kind = galleryKind(image, index);
  return `
  <figure class="gallery-item ${index === 0 ? "gallery-item--main" : ""} gallery-item--${kind}">
    <img src="${image}" alt="${product.name} ${index + 1}번째 ${kind === "look" ? "착용" : kind === "detail" ? "제품 디테일" : "상품 단독"} 이미지" ${index ? 'loading="lazy"' : ""} />
    ${index === 0 ? `<span>${product.badge}</span>` : ""}
  </figure>
`; }).join("");

const options = document.querySelector("#productOptions");
const savedTone = getProfile().personalTone;
const toneLabels = { warm: "WARM", cool: "COOL", neutral: "NEUTRAL" };
options.innerHTML = product.options.map((option) => {
  const optionTone = product.optionTones?.[option];
  const recommended = (savedTone === "웜톤" && optionTone === "warm") || (savedTone === "쿨톤" && optionTone === "cool") || (savedTone === "뉴트럴" && optionTone === "neutral");
  return `<button class="${recommended ? "tone-recommended" : ""}" type="button" data-option="${option}">${option}${optionTone ? `<small>${toneLabels[optionTone]}${recommended ? " · FOR YOU" : ""}</small>` : ""}</button>`;
}).join("");
if (Number(product.stock) === 0) {
  options.querySelectorAll("button").forEach((button) => { button.disabled = true; });
  document.querySelector("#optionHint").textContent = "현재 모든 옵션이 품절되었습니다.";
  document.querySelectorAll(".pdp-cart, .pdp-buy-now, .mobile-cart, .mobile-buy").forEach((button) => { button.disabled = true; button.textContent = "SOLD OUT"; });
}

const requestedOption = new URLSearchParams(window.location.search).get("option");
if (requestedOption && product.options.includes(requestedOption)) {
  selectedOption = requestedOption;
  const requestedButton = [...options.querySelectorAll("button")].find((button) => button.dataset.option === requestedOption);
  requestedButton?.classList.add("active");
  document.querySelector("#optionHint").textContent = `${selectedOption} 옵션이 선택되었습니다.`;
} else if (product.category === "beauty" && savedTone !== "미정") {
  document.querySelector("#optionHint").textContent = `${savedTone} 프로필을 반영한 FOR YOU 옵션을 확인해보세요.`;
}
options.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  options.querySelectorAll("button").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  selectedOption = button.dataset.option;
  document.querySelector("#optionHint").textContent = `${selectedOption} 옵션이 선택되었습니다.`;
});

const related = products.filter((item) => item.id !== product.id && item.active !== false);
document.querySelector("#relatedGrid").innerHTML = related.map((item) => `
  <article class="related-card">
    <a href="./product.html?id=${item.id}" class="related-image"><img src="${item.image}" alt="${item.name}" loading="lazy" /><span>${item.badge}</span></a>
    <a href="./product.html?id=${item.id}" class="related-info"><small>${item.brand}</small><strong>${item.name}</strong><p>${item.discount ? `<em>${item.discount}</em>` : ""} ${item.price}</p></a>
  </article>
`).join("");

const toast = document.querySelector(".toast");
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function validateOption() {
  if (!selectedOption) {
    document.querySelector("#optionHint").textContent = "먼저 옵션을 선택해주세요.";
    options.animate([{ transform: "translateX(-5px)" }, { transform: "translateX(5px)" }, { transform: "translateX(0)" }], { duration: 240 });
    options.scrollIntoView({ behavior: "smooth", block: "center" });
    return false;
  }
  return true;
}

function addToCart() {
  if (!validateOption()) return;
  addCartItem(product.id, selectedOption);
  commerce.refresh();
  showToast(`${selectedOption} 옵션을 장바구니에 담았습니다.`);
}

function buyNow() {
  if (!validateOption()) return;
  addCartItem(product.id, selectedOption);
  window.location.href = "./checkout.html";
}

document.querySelector(".pdp-cart").addEventListener("click", addToCart);
document.querySelector(".mobile-cart").addEventListener("click", addToCart);
document.querySelector(".pdp-buy-now").addEventListener("click", buyNow);
document.querySelector(".mobile-buy").addEventListener("click", buyNow);

const wishButtons = document.querySelectorAll(".pdp-wish, .mobile-wish");
wishButtons.forEach((button) => button.classList.toggle("active", isWished(product.id)));
wishButtons.forEach((button) => button.addEventListener("click", () => {
  const active = toggleWishlist(product.id);
  wishButtons.forEach((item) => item.classList.toggle("active", active));
  commerce.refresh();
  showToast(active ? "찜 목록에 저장했습니다." : "찜 목록에서 삭제했습니다.");
}));

const suppliedReviewPhotos = product.reviewPhotos || [];
const reviewData = [
  { id: 1, user: "soo***", stars: "★★★★★", title: "화면보다 실제 질감이 더 좋아요.", body: "과하게 튀지 않으면서도 전체가 정돈되는 느낌이에요. 디테일을 확인하고 구매하길 잘했습니다.", helpful: 24, height: 164, weight: 53, size: "S", skin: "중성", photo: suppliedReviewPhotos[0] || product.gallery[1] || product.image },
  { id: 2, user: "min***", stars: "★★★★★", title: "마감이 정말 섬세합니다.", body: "실제 색과 재질이 상세 사진 그대로예요. 포장도 간결하고 기분 좋게 도착했습니다.", helpful: 17, height: 168, weight: 57, size: "M", skin: "복합성", photo: suppliedReviewPhotos[1] || product.image },
  { id: 3, user: "jiw***", stars: "★★★★★", title: "옵션 추천이 잘 맞았어요.", body: "평소 사이즈와 체형 정보를 넣고 골랐는데 편안하게 잘 맞습니다. 다른 컬러도 궁금해요.", helpful: 31, height: 160, weight: 49, size: "S", skin: "건성", photo: null },
  { id: 4, user: "hae***", stars: "★★★★☆", title: "고민하다 샀는데 만족해요.", body: "첫인상보다 활용도가 높고 손이 자주 가요. 배송도 예상보다 빨랐습니다.", helpful: 9, height: 172, weight: 62, size: "M", skin: "민감성", photo: null },
  { id: 5, user: "yun***", stars: "★★★★★", title: "선물용으로도 좋을 것 같아요.", body: "제품이 명확하게 보이는 사진 덕분에 고르기 쉬웠고 실제 상품도 기대한 그대로입니다.", helpful: 12, height: 158, weight: 46, size: "XS", skin: "지성", photo: null }
];

function reviewDistance(review, profile) {
  const height = Number(profile.height);
  const weight = Number(profile.weight);
  if (!height || !weight) return 999;
  return Math.abs(review.height - height) + Math.abs(review.weight - weight) * 1.5;
}

function renderReviews(mode = "smart") {
  const profile = getProfile();
  const sorted = [...reviewData];
  if (mode === "smart") sorted.sort((a, b) => Number(Boolean(b.photo)) - Number(Boolean(a.photo)) || reviewDistance(a, profile) - reviewDistance(b, profile));
  if (mode === "similar") sorted.sort((a, b) => reviewDistance(a, profile) - reviewDistance(b, profile) || Number(Boolean(b.photo)) - Number(Boolean(a.photo)));
  const hasProfile = Number(profile.height) && Number(profile.weight);
  document.querySelector(".review-match-note").textContent = hasProfile ? `${profile.height}cm · ${profile.weight}kg · 평소 ${profile.topSize} 기준으로 정렬했어요.` : "마이페이지에 체형을 입력하면 비슷한 리뷰를 먼저 보여드려요.";
  document.querySelector("#reviewCards").innerHTML = sorted.map((review, index) => `
    <article class="${review.photo ? "photo-review" : ""}">
      ${review.photo ? `<a class="review-photo" href="${review.photo}" target="_blank" aria-label="${review.user} 사진 리뷰 크게 보기"><img src="${review.photo}" alt="${product.name} 구매자 사진 리뷰" loading="lazy" /><span>PHOTO REVIEW</span></a>` : ""}
      <div class="review-card-top"><span>${review.stars}</span><small>구매 인증 · ${review.user}</small></div>
      <div class="review-spec"><b>${product.category === "fashion" ? `${review.height}cm · ${review.weight}kg · ${review.size} 구매` : `${review.skin} 피부 · ${product.color} 구매`}</b>${hasProfile && reviewDistance(review, profile) < 12 ? "<em>나와 비슷해요</em>" : ""}</div>
      <strong>${review.title}</strong><p>${review.body}</p><button class="review-tag" type="button">도움돼요 ${review.helpful}</button>
    </article>`).join("");
}
document.querySelectorAll("[data-review-sort]").forEach((button) => button.addEventListener("click", () => {
  document.querySelectorAll("[data-review-sort]").forEach((item) => item.classList.remove("active"));
  button.classList.add("active");
  renderReviews(button.dataset.reviewSort);
}));
renderReviews();
document.querySelector("#reviewCards").addEventListener("click", (event) => {
  const button = event.target.closest(".review-tag");
  if (!button) return;
  const match = button.textContent.match(/(\d+)/);
  const count = match ? Number(match[1]) + 1 : 1;
  button.textContent = `도움됐어요 ${count}`;
  button.classList.add("active");
  button.disabled = true;
});
window.addEventListener("saegyeol:store", (event) => {
  if (event.detail?.key === "saegyeol_profile_v1") renderReviews(document.querySelector("[data-review-sort].active")?.dataset.reviewSort || "smart");
});

// Review / Q&A community tabs
const communityTabs = document.querySelectorAll("[data-community]");
function showCommunity(name) {
  communityTabs.forEach((button) => button.classList.toggle("active", button.dataset.community === name));
  document.querySelector("#reviews").hidden = name !== "reviews";
  document.querySelector("#qa").hidden = name !== "qa";
  history.replaceState(null, "", name === "qa" ? "#qa" : "#reviews");
}
communityTabs.forEach((button) => button.addEventListener("click", () => showCommunity(button.dataset.community)));

const qaSeed = [
  { id: 1, type: "사이즈·옵션", title: "평소 M을 입는데 이 상품도 M이 여유 있게 맞을까요?", user: "min***", date: "2026.08.10", status: "answered", answer: "고객님의 평소 사이즈가 M이라면 동일하게 M을 추천드립니다. 여유 있는 실루엣으로 제작되었습니다." },
  { id: 2, type: "상품 문의", title: "재입고 예정인 다른 컬러가 있을까요?", user: "seo***", date: "2026.08.09", status: "answered", answer: "현재 공개된 추가 컬러는 없으며, 입고 확정 시 재입고 알림을 통해 가장 먼저 안내드리겠습니다." },
  { id: 3, type: "배송 문의", title: "오늘 주문하면 금요일까지 받을 수 있나요?", user: "han***", date: "2026.08.08", status: "answered", answer: "오후 2시 이전 결제 완료 시 당일 출고되며, 일반적으로 출고 후 1–2일 이내 도착합니다." },
  { id: 4, type: "상품 문의", title: "실제 색상이 상세 사진과 비슷한가요?", user: "joy***", date: "2026.08.08", status: "waiting", answer: "" },
  { id: 5, type: "교환·반품", title: "비밀 문의입니다.", user: "lim***", date: "2026.08.07", status: "answered", secret: true, answer: "비밀글 답변입니다." },
  { id: 6, type: "상품 문의", title: "세탁 시 주의사항이 궁금합니다.", user: "ari***", date: "2026.08.06", status: "waiting", answer: "" }
];
const qaKey = `saegyeol_qa_${product.id}`;
let userQuestions = [];
try { userQuestions = JSON.parse(localStorage.getItem(qaKey)) || []; } catch { userQuestions = []; }
let qaFilter = "all";

const escapeHTML = (value) => String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
function renderQuestions() {
  const allQuestions = [...userQuestions, ...qaSeed];
  const visible = qaFilter === "all" ? allQuestions : allQuestions.filter((item) => item.status === qaFilter);
  document.querySelector(".qa-count").textContent = allQuestions.length;
  document.querySelector('[data-community="qa"] span').textContent = allQuestions.length;
  document.querySelector("#qaList").innerHTML = visible.map((item) => `
    <details class="qa-item">
      <summary><span class="qa-status ${item.status}">${item.status === "answered" ? "답변 완료" : "답변 대기"}</span><small>${escapeHTML(item.type)}</small><strong>${item.secret ? "🔒 " : ""}${escapeHTML(item.title)}</strong><em>${escapeHTML(item.user)} · ${item.date}</em><i>+</i></summary>
      <div class="qa-content"><p><b>Q</b>${escapeHTML(item.secret && item.user !== "나" ? "비밀 문의입니다." : item.title)}</p>${item.answer ? `<p class="qa-answer"><b>A</b>${escapeHTML(item.answer)}</p>` : `<p class="qa-waiting"><b>·</b>담당자가 문의 내용을 확인하고 있습니다.</p>`}</div>
    </details>`).join("");
}
document.querySelectorAll("[data-qa-filter]").forEach((button) => button.addEventListener("click", () => {
  qaFilter = button.dataset.qaFilter;
  document.querySelectorAll("[data-qa-filter]").forEach((item) => item.classList.toggle("active", item === button));
  renderQuestions();
}));
const qaForm = document.querySelector(".qa-form");
document.querySelector(".qa-write-toggle").addEventListener("click", () => {
  qaForm.hidden = !qaForm.hidden;
  document.querySelector(".qa-write-toggle span").textContent = qaForm.hidden ? "+" : "−";
  if (!qaForm.hidden) qaForm.querySelector("textarea").focus();
});
qaForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(qaForm);
  userQuestions.unshift({ id: Date.now(), type: data.get("type"), title: data.get("question"), user: "나", date: new Intl.DateTimeFormat("ko-KR", {year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()).replaceAll(". ", ".").replace(".", "").trim(), status: "waiting", secret: data.get("secret") === "on", answer: "" });
  localStorage.setItem(qaKey, JSON.stringify(userQuestions));
  qaForm.reset();
  qaForm.hidden = true;
  document.querySelector(".qa-write-toggle span").textContent = "+";
  qaFilter = "all";
  document.querySelectorAll("[data-qa-filter]").forEach((item) => item.classList.toggle("active", item.dataset.qaFilter === "all"));
  renderQuestions();
  showToast("상품 문의가 등록되었습니다.");
});
renderQuestions();
if (window.location.hash === "#qa") showCommunity("qa");

// Similar product slider
const relatedViewport = document.querySelector(".related-viewport");
const relatedProgress = document.querySelector(".related-progress > span");
function moveRelated(direction) {
  const card = relatedViewport.querySelector(".related-card");
  const distance = card ? card.getBoundingClientRect().width + 12 : relatedViewport.clientWidth * .8;
  relatedViewport.scrollBy({ left: distance * direction, behavior: "smooth" });
}
document.querySelector(".related-prev").addEventListener("click", () => moveRelated(-1));
document.querySelector(".related-next").addEventListener("click", () => moveRelated(1));
relatedViewport.addEventListener("scroll", () => {
  const max = relatedViewport.scrollWidth - relatedViewport.clientWidth;
  relatedProgress.style.width = `${max > 0 ? 18 + relatedViewport.scrollLeft / max * 82 : 100}%`;
}, { passive: true });

document.querySelector(".share-btn").addEventListener("click", async () => {
  try {
    if (navigator.share) await navigator.share({ title: product.name, url: window.location.href });
    else {
      await navigator.clipboard.writeText(window.location.href);
      showToast("상품 링크를 복사했습니다.");
    }
  } catch (_) { /* cancelled by user */ }
});

document.querySelector("#guideButton").addEventListener("click", () => {
  document.querySelector("#productMaterial").closest("details").open = true;
  document.querySelector("#productMaterial").scrollIntoView({ behavior: "smooth", block: "center" });
});

const brandButton = document.querySelector("#productBrand");
const brandInfo = document.querySelector("#brandInfo");
brandButton.addEventListener("click", () => {
  const open = !brandInfo.classList.contains("is-open");
  brandInfo.classList.toggle("is-open", open);
  brandInfo.setAttribute("aria-hidden", String(!open));
  brandButton.setAttribute("aria-expanded", String(open));
  brandButton.textContent = `${product.brand} ${open ? "−" : "+"}`;
});

const menuToggle = document.querySelector(".menu-toggle");
const mobileMenu = document.querySelector(".mobile-menu");
menuToggle.addEventListener("click", () => {
  const open = !mobileMenu.classList.contains("is-open");
  mobileMenu.classList.toggle("is-open", open);
  document.body.classList.toggle("menu-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  mobileMenu.setAttribute("aria-hidden", String(!open));
});
