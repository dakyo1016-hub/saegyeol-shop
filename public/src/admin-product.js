import { products } from "./products.js";

const CATALOG_KEY = "saegyeol_admin_catalog_v1";
const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const money = (value) => `₩${Number(value || 0).toLocaleString("ko-KR")}`;
const parseMoney = (value) => Number(String(value ?? "").replace(/[^0-9]/g, ""));
const params = new URLSearchParams(location.search);
const requestedId = Number(params.get("id"));
let currentProduct = products.find((product) => product.id === requestedId) || null;
let currentId = currentProduct?.id || Math.max(...products.map((product) => Number(product.id)), 0) + 1;
let catalog = read(CATALOG_KEY, {});
let toastTimer;
const form = document.querySelector("#fullProductEditor");
const optionList = document.querySelector("#optionEditorList");
const galleryList = document.querySelector("#galleryEditorList");

const defaults = {
  id: currentId, category: "fashion", brand: "", name: "", badge: "NEW", color: "", brandMood: "",
  price: "₩59,000", original: "", discount: "", stock: 10, active: false, options: ["S", "M", "L"],
  image: "./assets/products/quiet-white-tee.jpg", modelImage: "./assets/campaign/quiet-layer-white-tee.png",
  gallery: ["./assets/products/quiet-white-tee.jpg", "./assets/campaign/quiet-layer-white-tee.png"],
  summary: "", detail: "", material: "", brandDescription: "", keywords: "", slug: "", pointRate: 5
};
const data = { ...defaults, ...(currentProduct || {}) };

function showToast(message) {
  const toast = document.querySelector(".admin-toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

function markDirty() {
  const state = document.querySelector(".save-state");
  state.querySelector("i").style.background = "#df9f21";
  state.querySelector("b").textContent = "저장하지 않은 변경사항";
}
function markSaved() {
  const state = document.querySelector(".save-state");
  state.querySelector("i").style.background = "#8caf1f";
  state.querySelector("b").textContent = "모든 변경사항 저장됨";
}

function fillBaseFields() {
  const mapping = {
    active: String(data.active !== false), category: data.category, brand: data.brand, badge: data.badge, name: data.name,
    color: data.color, brandMood: data.brandMood, priceNumber: parseMoney(data.price), originalNumber: parseMoney(data.original),
    discount: parseMoney(data.discount), pointRate: data.pointRate ?? 5, image: data.image, modelImage: data.modelImage,
    summary: data.summary, detail: data.detail, material: data.material, brandDescription: data.brandDescription,
    keywords: data.keywords || "", slug: data.slug || "", measureColumns: data.sizeGuide?.columns?.join(", ") || (data.category === "fashion" ? "총장, 어깨, 가슴 단면, 소매장, 밑단" : "")
  };
  Object.entries(mapping).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value ?? ""; });
}

function addOptionRow(option = "", stock = 0, measurements = "") {
  const row = document.createElement("div");
  row.className = "option-row";
  row.innerHTML = `<input data-option-name value="${option}" placeholder="S / 01 CORAL" required /><input data-option-sku value="SG-${currentId}-${String(option || "NEW").replace(/[^A-Z0-9]/gi, "").toUpperCase()}" placeholder="SKU" /><input data-option-stock type="number" min="0" value="${stock}" required /><input data-measure value="${measurements}" placeholder="62, 48, 56, 57, 50" /><button data-remove-option type="button" aria-label="옵션 삭제">×</button>`;
  optionList.appendChild(row);
}

function renderOptions() {
  optionList.innerHTML = "";
  const options = data.options?.length ? data.options : ["FREE"];
  options.forEach((option, index) => {
    const distributed = data.optionStocks?.[option] ?? Math.max(0, Math.floor(Number(data.stock || 0) / options.length) + (index < Number(data.stock || 0) % options.length ? 1 : 0));
    const measurements = data.sizeGuide?.rows?.[option]?.join(", ") || "";
    addOptionRow(option, distributed, measurements);
  });
  updateStock();
}

function addGalleryRow(path = "") {
  const row = document.createElement("div");
  row.className = "gallery-row";
  row.innerHTML = `<img src="${path}" alt="" /><input data-gallery-path value="${path}" placeholder="./assets/products/detail.jpg" /><button data-remove-gallery type="button" aria-label="이미지 삭제">×</button>`;
  galleryList.appendChild(row);
}
function renderGallery() {
  galleryList.innerHTML = "";
  const secondary = (data.gallery || []).filter((path) => path && path !== data.image && path !== data.modelImage);
  (secondary.length ? secondary : [""]).forEach(addGalleryRow);
}

function updateStock() {
  const total = [...optionList.querySelectorAll("[data-option-stock]")].reduce((sum, input) => sum + Number(input.value || 0), 0);
  document.querySelector("#totalStock").textContent = total;
}

function calculateDiscount() {
  const price = Number(form.elements.priceNumber.value || 0);
  const original = Number(form.elements.originalNumber.value || 0);
  form.elements.discount.value = original > price && price > 0 ? Math.round((original - price) / original * 100) : "";
}

function updatePreview() {
  const image = form.elements.image.value || defaults.image;
  const modelImage = form.elements.modelImage.value || image;
  document.querySelector("#mainImagePreview").src = image;
  document.querySelector("#modelImagePreview").src = modelImage;
  document.querySelector("#catalogPreviewImage").src = image;
  document.querySelector("#catalogPreviewBadge").textContent = form.elements.badge.value || "NEW";
  document.querySelector("#catalogPreviewBrand").textContent = form.elements.brand.value || "BRAND";
  document.querySelector("#catalogPreviewName").textContent = form.elements.name.value || "상품명을 입력해주세요.";
  document.querySelector("#catalogPreviewPrice").textContent = money(form.elements.priceNumber.value);
  document.querySelector("#catalogPreviewOriginal").textContent = form.elements.originalNumber.value ? money(form.elements.originalNumber.value) : "";
  document.querySelector("#catalogPreviewDiscount").textContent = form.elements.discount.value ? `${form.elements.discount.value}%` : "";
  const checks = {
    basic: Boolean(form.elements.brand.value && form.elements.name.value),
    price: Number(form.elements.priceNumber.value) > 0,
    option: optionList.querySelectorAll(".option-row").length > 0,
    image: Boolean(form.elements.image.value),
    content: Boolean(form.elements.summary.value && form.elements.detail.value && form.elements.material.value)
  };
  Object.entries(checks).forEach(([name, done]) => document.querySelector(`[data-check="${name}"]`)?.classList.toggle("done", done));
  document.querySelectorAll("[data-count-for]").forEach((counter) => { counter.textContent = form.elements[counter.dataset.countFor]?.value.length || 0; });
}

function collectProduct(activeOverride = null) {
  const optionRows = [...optionList.querySelectorAll(".option-row")];
  const options = optionRows.map((row) => row.querySelector("[data-option-name]").value.trim()).filter(Boolean);
  const optionStocks = {};
  const measurementRows = {};
  optionRows.forEach((row) => {
    const option = row.querySelector("[data-option-name]").value.trim();
    if (!option) return;
    optionStocks[option] = Number(row.querySelector("[data-option-stock]").value || 0);
    const measurements = row.querySelector("[data-measure]").value.split(",").map((value) => value.trim()).filter(Boolean).map((value) => Number.isNaN(Number(value)) ? value : Number(value));
    if (measurements.length) measurementRows[option] = measurements;
  });
  const price = Number(form.elements.priceNumber.value || 0);
  const original = Number(form.elements.originalNumber.value || 0);
  const image = form.elements.image.value.trim();
  const modelImage = form.elements.modelImage.value.trim() || image;
  const extraGallery = [...galleryList.querySelectorAll("[data-gallery-path]")].map((input) => input.value.trim()).filter(Boolean);
  const gallery = [...new Set([image, modelImage, ...extraGallery].filter(Boolean))];
  const columns = form.elements.measureColumns.value.split(",").map((value) => value.trim()).filter(Boolean);
  const base = currentProduct || {};
  return {
    ...base,
    id: currentId,
    _isNew: !currentProduct || currentProduct._isNew || false,
    active: activeOverride ?? form.elements.active.value === "true",
    category: form.elements.category.value,
    brand: form.elements.brand.value.trim(),
    name: form.elements.name.value.trim(),
    badge: form.elements.badge.value.trim() || "NEW",
    color: form.elements.color.value.trim(),
    brandMood: form.elements.brandMood.value.trim() || "CURATED · SEOUL",
    price: money(price),
    original: original ? money(original) : "",
    discount: original > price ? `${Math.round((original - price) / original * 100)}%` : "",
    pointRate: Number(form.elements.pointRate.value || 0),
    stock: Object.values(optionStocks).reduce((sum, value) => sum + value, 0),
    options,
    optionStocks,
    image,
    modelImage,
    gallery,
    summary: form.elements.summary.value.trim(),
    detail: form.elements.detail.value.trim(),
    material: form.elements.material.value.trim(),
    brandDescription: form.elements.brandDescription.value.trim() || `${form.elements.brand.value.trim()}의 새로운 셀렉션입니다.`,
    keywords: form.elements.keywords.value.trim(),
    slug: form.elements.slug.value.trim(),
    ...(form.elements.category.value === "fashion" && columns.length && Object.keys(measurementRows).length ? { sizeGuide: { columns, rows: measurementRows, fit: base.sizeGuide?.fit || "상품 실측을 확인한 뒤 평소 착용 사이즈와 비교해주세요.", model: base.sizeGuide?.model || "모델 착용 정보 업데이트 예정" } } : {})
  };
}

function persistProduct(activeOverride = null, redirect = true) {
  if (!form.reportValidity()) { showToast("필수 입력 항목을 확인해주세요."); return; }
  if (!optionList.querySelector("[data-option-name]")) { showToast("옵션을 한 개 이상 등록해주세요."); return; }
  const product = collectProduct(activeOverride);
  catalog[currentId] = product;
  write(CATALOG_KEY, catalog);
  currentProduct = product;
  document.querySelector("#openProductLink").hidden = false;
  document.querySelector("#openProductLink").href = `./product.html?id=${currentId}`;
  document.querySelector("#archiveProduct").hidden = false;
  document.querySelector("#editorModeLabel").textContent = "상품 수정";
  document.querySelector("#editorPageTitle").textContent = "상품 수정";
  history.replaceState(null, "", `./admin-product.html?id=${currentId}`);
  markSaved();
  showToast(product.active ? "상품을 저장하고 스토어에 반영했습니다." : "임시 저장했습니다. 스토어에는 노출되지 않습니다.");
  if (redirect) setTimeout(() => { window.location.href = "./admin.html#products"; }, 650);
}

document.querySelector("#addOption").addEventListener("click", () => { addOptionRow("", 0, ""); updatePreview(); optionList.lastElementChild.querySelector("[data-option-name]").focus(); });
optionList.addEventListener("click", (event) => { if (event.target.closest("[data-remove-option]")) { event.target.closest(".option-row").remove(); updateStock(); updatePreview(); markDirty(); } });
optionList.addEventListener("input", () => { updateStock(); updatePreview(); markDirty(); });
document.querySelector("#addGalleryImage").addEventListener("click", () => { addGalleryRow(""); galleryList.lastElementChild.querySelector("input").focus(); });
galleryList.addEventListener("click", (event) => { if (event.target.closest("[data-remove-gallery]")) event.target.closest(".gallery-row").remove(); });
galleryList.addEventListener("input", (event) => { const row = event.target.closest(".gallery-row"); if (row) row.querySelector("img").src = event.target.value; markDirty(); });
form.addEventListener("input", () => { calculateDiscount(); updatePreview(); markDirty(); });
form.addEventListener("change", () => { updatePreview(); markDirty(); });
form.addEventListener("submit", (event) => { event.preventDefault(); persistProduct(null, true); });
document.querySelector("#publishProduct").addEventListener("click", () => { form.elements.active.value = "true"; persistProduct(true, true); });
document.querySelector("#saveDraft").addEventListener("click", () => persistProduct(false, false));
document.querySelector("[data-save-draft]").addEventListener("click", () => persistProduct(false, false));
document.querySelector("#archiveProduct").addEventListener("click", () => {
  if (currentProduct?._isNew) {
    delete catalog[currentId];
    write(CATALOG_KEY, catalog);
    showToast("등록 상품을 완전히 삭제했습니다.");
    setTimeout(() => { window.location.href = "./admin.html#products"; }, 500);
    return;
  }
  persistProduct(false, true);
});

function init() {
  document.title = currentProduct ? `${currentProduct.name} 수정 · 새결 관리자` : "상품 등록 · 새결 관리자";
  document.querySelector("#editorModeLabel").textContent = currentProduct ? "상품 수정" : "새 상품 등록";
  document.querySelector("#editorPageTitle").textContent = currentProduct ? "상품 수정" : "새 상품 등록";
  document.querySelector("#productIdLabel").textContent = currentProduct ? `PRODUCT #${currentId}` : "NEW PRODUCT";
  document.querySelector("#publishProduct").innerHTML = `${currentProduct ? "변경사항 저장" : "상품 등록"} <span>↗</span>`;
  document.querySelector("#archiveProduct").hidden = !currentProduct;
  document.querySelector("#archiveProduct").textContent = currentProduct?._isNew ? "상품 완전 삭제" : "상품 숨김 처리";
  if (currentProduct) { document.querySelector("#openProductLink").hidden = false; document.querySelector("#openProductLink").href = `./product.html?id=${currentId}`; }
  fillBaseFields();
  renderOptions();
  renderGallery();
  calculateDiscount();
  updatePreview();
  markSaved();
}
init();
