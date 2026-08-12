import { products } from "./products.js";

const CATALOG_KEY = "saegyeol_admin_catalog_v1";
const ORDER_KEY = "saegyeol_orders_v1";
const COUPON_KEY = "saegyeol_admin_coupons_v1";
const GENERAL_QA_KEY = "saegyeol_general_inquiries_v1";
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const parseMoney = (value) => Number(String(value ?? "").replace(/[^0-9]/g, ""));
const money = (value) => `₩${Number(value || 0).toLocaleString("ko-KR")}`;
const escapeHTML = (value) => String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
let catalog = read(CATALOG_KEY, {});
let toastTimer;

const sampleOrders = [
  { orderNumber: "SG260811-10428", createdAt: "2026-08-11T09:42:00+09:00", customer: "김새봄", items: [{ id: 4, option: "01 MELLOW CORAL", quantity: 1 }], totals: { total: 22000 }, status: "결제 완료", sample: true },
  { orderNumber: "SG260811-09831", createdAt: "2026-08-11T08:31:00+09:00", customer: "이유진", items: [{ id: 13, option: "M", quantity: 1 }, { id: 18, option: "S", quantity: 1 }], totals: { total: 108000 }, status: "상품 준비", sample: true },
  { orderNumber: "SG260810-87302", createdAt: "2026-08-10T17:02:00+09:00", customer: "박서연", items: [{ id: 15, option: "S", quantity: 1 }], totals: { total: 69000 }, status: "배송 중", sample: true },
  { orderNumber: "SG260810-72114", createdAt: "2026-08-10T13:14:00+09:00", customer: "정하늘", items: [{ id: 2, option: "30ML", quantity: 2 }], totals: { total: 57800 }, status: "배송 완료", sample: true }
];
let orders = read(ORDER_KEY, []);
if (!orders.length) orders = sampleOrders;

let coupons = read(COUPON_KEY, [
  { code: "WELCOME10", rate: 10, max: 20000, active: true, used: 128 },
  { code: "STYLE15", rate: 15, max: 30000, active: true, used: 46 },
  { code: "BEAUTYDAY", rate: 12, max: 25000, active: false, used: 91 }
]);

function showToast(message) {
  const toast = document.querySelector(".admin-toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function setTab(name) {
  const safe = document.querySelector(`[data-admin-panel="${name}"]`) ? name : "dashboard";
  document.querySelectorAll("[data-admin-tab]").forEach((button) => button.classList.toggle("active", button.dataset.adminTab === safe));
  document.querySelectorAll("[data-admin-panel]").forEach((panel) => { const active = panel.dataset.adminPanel === safe; panel.hidden = !active; panel.classList.toggle("active", active); });
  history.replaceState(null, "", safe === "dashboard" ? location.pathname : `#${safe}`);
  document.body.classList.remove("sidebar-open");
}

document.querySelectorAll("[data-admin-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.adminTab)));
document.querySelectorAll("[data-go-tab]").forEach((button) => button.addEventListener("click", () => setTab(button.dataset.goTab)));
document.querySelector(".admin-menu").addEventListener("click", () => document.body.classList.toggle("sidebar-open"));
setTab(location.hash.slice(1) || "dashboard");

const now = new Date();
document.querySelector("#adminDate").textContent = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" }).format(now);
document.querySelector("#syncTime").textContent = new Intl.DateTimeFormat("ko-KR", { hour: "2-digit", minute: "2-digit" }).format(now);

function orderTotal(order) { return Number(order.totals?.total ?? order.totals?.discountedTotal ?? parseMoney(order.total)); }
function orderItems(order) { return order.items || order.cart || []; }
function firstOrderProduct(order) { return products.find((product) => product.id === Number(orderItems(order)[0]?.id)); }

function collectInquiries() {
  const collected = read(GENERAL_QA_KEY, []).map((item) => ({ ...item, storageKey: GENERAL_QA_KEY, source: "1:1 문의" }));
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith("saegyeol_qa_")) continue;
    const productId = Number(key.replace("saegyeol_qa_", ""));
    const product = products.find((item) => item.id === productId);
    read(key, []).forEach((item) => collected.push({ ...item, storageKey: key, source: product?.name || "상품 문의" }));
  }
  return collected.sort((a, b) => Number(a.status === "waiting") - Number(b.status === "waiting") || Number(b.id || 0) - Number(a.id || 0)).reverse();
}

function renderDashboard() {
  const sales = orders.reduce((sum, order) => sum + orderTotal(order), 0);
  const wishes = read("saegyeol_wishlist_v1", []).length;
  const inquiries = collectInquiries();
  const lowStock = products.filter((product) => product.active !== false && Number(product.stock) <= 5);
  const kpis = [
    ["오늘 매출", money(sales), "+12.8%", "결제 완료 기준"],
    ["신규 주문", `${orders.length}건`, "+8.2%", "처리 대기 포함"],
    ["찜 저장", `${wishes}건`, "+4.1%", "고객 관심 신호"],
    ["답변 대기", `${inquiries.filter((item) => item.status !== "answered").length}건`, "ACTION", "24시간 내 답변 권장"]
  ];
  document.querySelector("#adminKpis").innerHTML = kpis.map(([label, value, rate, note]) => `<article class="admin-kpi"><div><small>${label}</small><em>${rate}</em></div><strong>${value}</strong><p>${note}</p></article>`).join("");
  const chart = [38, 54, 42, 69, 63, 82, 74];
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  document.querySelector("#salesChart").innerHTML = chart.map((value, index) => `<div class="sales-bar" style="--height:${value}%"><b>${money(value * 13400)}</b><span>${days[index]}</span></div>`).join("");
  document.querySelector("#weeklySales").textContent = money(chart.reduce((sum, value) => sum + value * 13400, 0));
  const fashion = products.filter((product) => product.category === "fashion" && product.active !== false).length;
  const beauty = products.filter((product) => product.category === "beauty" && product.active !== false).length;
  const total = Math.max(1, fashion + beauty);
  document.querySelector("#categoryMix").innerHTML = [["FASHION", fashion], ["BEAUTY", beauty]].map(([name, count]) => `<div class="mix-row"><div><span>${name}</span><b>${Math.round(count / total * 100)}%</b></div><i><b style="--width:${count / total * 100}%"></b></i></div>`).join("");
  const low = lowStock.length ? lowStock : [...products].sort((a, b) => a.stock - b.stock).slice(0, 4);
  document.querySelector("#lowStockList").innerHTML = low.slice(0, 4).map((product) => `<div class="mini-row"><img src="${product.image}" alt="" /><div><strong>${escapeHTML(product.name)}</strong><small>${product.brand}</small></div><span>${product.stock}개</span></div>`).join("");
  document.querySelector("#recentOrderList").innerHTML = orders.slice(0, 4).map((order) => { const product = firstOrderProduct(order); return `<div class="mini-row">${product ? `<img src="${product.image}" alt="" />` : "<span></span>"}<div><strong>${escapeHTML(order.orderNumber || order.id || "ORDER")}</strong><small>${escapeHTML(product?.name || "새결 주문")}</small></div><span>${money(orderTotal(order))}</span></div>`; }).join("");
}

function productStatus(product) {
  if (product.active === false) return ["숨김", "hidden"];
  if (Number(product.stock) === 0) return ["품절", "soldout"];
  if (Number(product.stock) <= 5) return ["재고 주의", "low"];
  return ["판매 중", ""];
}

function filteredProducts() {
  const term = document.querySelector("#productSearch").value.trim().toLowerCase();
  const category = document.querySelector("#productCategory").value;
  const status = document.querySelector("#productStatus").value;
  return products.filter((product) => (!term || `${product.name} ${product.brand}`.toLowerCase().includes(term)) && (category === "all" || product.category === category) && (status === "all" || (status === "active" ? product.active !== false : product.active === false)));
}

function renderProducts() {
  const visible = filteredProducts();
  document.querySelector("#productCount").textContent = `총 ${visible.length}개`;
  document.querySelector("#productTable").innerHTML = visible.map((product) => { const [label, status] = productStatus(product); return `<tr data-product-id="${product.id}"><td><div class="table-product"><img src="${product.image}" alt="" /><div><small>${escapeHTML(product.brand)} · #${product.id}</small><strong>${escapeHTML(product.name)}</strong></div></div></td><td>${product.category.toUpperCase()}</td><td><strong>${product.price}</strong>${product.original ? `<small><br /><del>${product.original}</del></small>` : ""}</td><td><strong>${product.stock}</strong>개</td><td><span class="status-pill ${status}">${label}</span></td><td><div class="table-actions"><button data-edit-product type="button">수정</button><button data-toggle-product type="button">${product.active === false ? "노출" : "숨김"}</button></div></td></tr>`; }).join("");
}

function saveProductOverride(product) {
  catalog[product.id] = { ...(catalog[product.id] || {}), ...product };
  write(CATALOG_KEY, catalog);
}

const editorLayer = document.querySelector(".admin-drawer-layer");
const editor = document.querySelector("#productEditor");
function openEditor(product = null) {
  const isNew = !product;
  const id = isNew ? Math.max(...products.map((item) => Number(item.id)), 0) + 1 : product.id;
  const values = product || { id, brand: "", name: "", category: "fashion", badge: "NEW", price: "₩59,000", original: "", discount: "", stock: 10, active: true, options: ["S", "M", "L"], color: "", image: "./assets/products/quiet-white-tee.jpg" };
  document.querySelector("#editorTitle").textContent = isNew ? "새 상품 등록" : "상품 수정";
  [...editor.elements].forEach((field) => { if (!field.name) return; const value = field.name === "options" ? (values.options || []).join(", ") : values[field.name]; field.value = field.name === "active" ? String(value !== false) : (value ?? ""); });
  document.querySelector("#editorPreview").src = values.image;
  editor.dataset.isNew = String(isNew);
  editorLayer.classList.add("open");
  editorLayer.setAttribute("aria-hidden", "false");
}
function closeEditor() { editorLayer.classList.remove("open"); editorLayer.setAttribute("aria-hidden", "true"); }
document.querySelector("#addProduct").addEventListener("click", () => { window.location.href = "./admin-product.html"; });
document.querySelector(".editor-close").addEventListener("click", closeEditor);
document.querySelector(".admin-drawer-overlay").addEventListener("click", closeEditor);
editor.elements.image.addEventListener("input", () => { document.querySelector("#editorPreview").src = editor.elements.image.value; });

editor.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(editor).entries());
  const id = Number(data.id);
  const isNew = editor.dataset.isNew === "true";
  const base = products.find((product) => product.id === id);
  const update = { ...data, id, stock: Number(data.stock), active: data.active === "true", options: data.options.split(",").map((option) => option.trim()).filter(Boolean), _isNew: isNew || base?._isNew || false };
  if (isNew) Object.assign(update, { modelImage: update.image, gallery: [update.image], brandDescription: `${update.brand}의 새로운 셀렉션입니다.`, brandMood: "NEW · CURATED · SEOUL", summary: `${update.name}의 새로운 상품입니다.`, material: "상세 소재 정보 업데이트 예정", detail: "상품 상세 설명을 준비하고 있습니다.", original: update.original || "", discount: update.discount || "" });
  if (base) Object.assign(base, update); else products.push(update);
  saveProductOverride(update);
  closeEditor();
  renderAll();
  showToast(isNew ? "새 상품을 등록했습니다." : "상품 정보를 저장했습니다.");
});

document.querySelector("#productTable").addEventListener("click", (event) => {
  const row = event.target.closest("[data-product-id]");
  if (!row) return;
  const product = products.find((item) => item.id === Number(row.dataset.productId));
  if (event.target.closest("[data-edit-product]")) window.location.href = `./admin-product.html?id=${product.id}`;
  if (event.target.closest("[data-toggle-product]")) { product.active = product.active === false; saveProductOverride({ id: product.id, active: product.active }); renderAll(); showToast(product.active ? "스토어에 상품을 노출했습니다." : "상품을 스토어에서 숨겼습니다."); }
});
["productSearch", "productCategory", "productStatus"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", renderProducts));

function inventoryProducts() {
  const term = document.querySelector("#stockSearch").value.trim().toLowerCase();
  const filter = document.querySelector("#stockFilter").value;
  return products.filter((product) => (!term || `${product.name} ${product.brand}`.toLowerCase().includes(term)) && (filter === "all" || (filter === "low" ? product.stock > 0 && product.stock <= 5 : product.stock === 0)));
}
function renderInventory() {
  document.querySelector("#inventoryGrid").innerHTML = inventoryProducts().map((product) => `<article class="stock-card" data-stock-id="${product.id}"><img src="${product.image}" alt="" /><div class="stock-card__info"><small>${escapeHTML(product.brand)} · ${product.category.toUpperCase()}</small><strong>${escapeHTML(product.name)}</strong><div class="stock-card__control"><span>${product.stock}</span><div><button data-stock-step="-1" type="button">−</button><button data-stock-step="1" type="button">+</button></div></div></div></article>`).join("");
}
document.querySelector("#inventoryGrid").addEventListener("click", (event) => { const button = event.target.closest("[data-stock-step]"); if (!button) return; const card = button.closest("[data-stock-id]"); const product = products.find((item) => item.id === Number(card.dataset.stockId)); product.stock = Math.max(0, Number(product.stock) + Number(button.dataset.stockStep)); saveProductOverride({ id: product.id, stock: product.stock }); renderAll(); });
["stockSearch", "stockFilter"].forEach((id) => document.querySelector(`#${id}`).addEventListener("input", renderInventory));

const orderStatuses = ["결제 완료", "상품 준비", "배송 중", "배송 완료", "취소"];
function renderOrders() {
  document.querySelector("#orderStatusStrip").innerHTML = orderStatuses.map((status) => `<div><small>${status}</small><strong>${orders.filter((order) => (order.status || "결제 완료") === status).length}</strong></div>`).join("");
  document.querySelector("#orderTable").innerHTML = orders.map((order, index) => { const first = firstOrderProduct(order); const items = orderItems(order); const date = new Date(order.createdAt || Date.now()); return `<tr data-order-index="${index}"><td><strong>${escapeHTML(order.orderNumber || order.id || `ORDER-${index + 1}`)}</strong></td><td><div class="table-product">${first ? `<img src="${first.image}" alt="" />` : ""}<div><strong>${escapeHTML(first?.name || "새결 주문")}</strong><small>${items.length > 1 ? `외 ${items.length - 1}건` : items[0]?.option || "옵션 확인"}</small></div></div></td><td>${escapeHTML(order.customer || order.recipient || "온라인 고객")}</td><td><strong>${money(orderTotal(order))}</strong></td><td>${new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date)}</td><td><select class="order-status-select">${orderStatuses.map((status) => `<option ${status === (order.status || "결제 완료") ? "selected" : ""}>${status}</option>`).join("")}</select></td></tr>`; }).join("");
}
document.querySelector("#orderTable").addEventListener("change", (event) => { if (!event.target.matches(".order-status-select")) return; const row = event.target.closest("[data-order-index]"); orders[Number(row.dataset.orderIndex)].status = event.target.value; write(ORDER_KEY, orders); renderAll(); showToast("주문 상태를 변경했습니다."); });
document.querySelector("#resetSampleOrders").addEventListener("click", () => { if (!orders.some((order) => order.sample)) { showToast("초기화할 샘플 주문이 없습니다."); return; } orders = orders.filter((order) => !order.sample); write(ORDER_KEY, orders); renderAll(); showToast("샘플 주문 데이터를 초기화했습니다."); });
document.querySelector("#exportOrders").addEventListener("click", () => { const rows = [["주문번호", "상품", "금액", "상태"], ...orders.map((order) => [order.orderNumber || order.id, firstOrderProduct(order)?.name || "상품", orderTotal(order), order.status || "결제 완료"])]; const blob = new Blob(["\ufeff" + rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `saegyeol-orders-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(link.href); showToast("주문 CSV를 만들었습니다."); });

function renderInquiries() {
  const inquiries = collectInquiries();
  document.querySelector("#adminInquiryList").innerHTML = inquiries.length ? inquiries.map((item) => `<article class="admin-inquiry" data-inquiry-id="${item.id}" data-storage-key="${item.storageKey}"><span class="${item.status === "answered" ? "answered" : ""}">${item.status === "answered" ? "답변 완료" : "답변 대기"}</span><small>${escapeHTML(item.type)} · ${escapeHTML(item.date)}</small><strong>${escapeHTML(item.title || item.question)}</strong><button data-answer-inquiry type="button">${item.status === "answered" ? "답변 확인" : "답변 완료 처리"}</button></article>`).join("") : `<div class="admin-card">등록된 고객 문의가 없습니다.</div>`;
}
document.querySelector("#adminInquiryList").addEventListener("click", (event) => { const button = event.target.closest("[data-answer-inquiry]"); if (!button) return; const row = button.closest("[data-inquiry-id]"); const key = row.dataset.storageKey; const list = read(key, []); const item = list.find((entry) => String(entry.id) === row.dataset.inquiryId); if (item) { item.status = "answered"; item.answer ||= "문의 내용을 확인해 안내를 완료했습니다."; write(key, list); renderAll(); showToast("답변 완료로 변경했습니다."); } });

function renderCoupons() {
  document.querySelector("#couponGrid").innerHTML = coupons.map((coupon, index) => `<article class="coupon-card ${coupon.active ? "" : "off"}" data-coupon-index="${index}"><div><small>SAEGYEOL BENEFIT</small><em>${coupon.active ? "ACTIVE" : "PAUSED"}</em></div><h3>${escapeHTML(coupon.code)}</h3><p>${coupon.rate}% 할인 · 최대 ${money(coupon.max)}</p><footer><span>사용 ${coupon.used || 0}회</span><div><button data-toggle-coupon type="button">${coupon.active ? "일시 중지" : "다시 활성화"}</button> · <button data-delete-coupon type="button">삭제</button></div></footer></article>`).join("");
}
document.querySelector("#addCoupon").addEventListener("click", () => { document.querySelector("#couponForm").hidden = !document.querySelector("#couponForm").hidden; });
document.querySelector("#couponForm").addEventListener("submit", (event) => { event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget).entries()); coupons.unshift({ code: data.code.toUpperCase(), rate: Number(data.rate), max: Number(data.max), active: data.active === "true", used: 0 }); write(COUPON_KEY, coupons); event.currentTarget.reset(); event.currentTarget.hidden = true; renderCoupons(); showToast("새 쿠폰을 만들었습니다."); });
document.querySelector("#couponGrid").addEventListener("click", (event) => { const card = event.target.closest("[data-coupon-index]"); if (!card) return; const index = Number(card.dataset.couponIndex); if (event.target.closest("[data-toggle-coupon]")) coupons[index].active = !coupons[index].active; else if (event.target.closest("[data-delete-coupon]")) coupons.splice(index, 1); else return; write(COUPON_KEY, coupons); renderCoupons(); });

function renderAll() { renderDashboard(); renderProducts(); renderInventory(); renderOrders(); renderInquiries(); renderCoupons(); }
renderAll();
