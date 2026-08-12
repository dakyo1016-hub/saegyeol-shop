import { products } from "./products.js";
import { getCart, getCoupon, parsePrice } from "./store.js";
import { openKakaoPostcode, setAddressFieldsReadonly } from "./postcode.js";

const form = document.querySelector("#checkoutForm");
const cart = getCart();
const money = (value) => `₩${Math.max(0, value).toLocaleString("ko-KR")}`;
const toast = document.querySelector(".toast");
const payButton = document.querySelector(".place-order");
let tossWidgets = null;
let lastTotal = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2600);
}

function buildServerCart() {
  return cart.map(({ id, option, quantity }) => ({ id, option, quantity }));
}

if (!cart.length) {
  document.querySelector(".checkout-form").innerHTML = `<div class="checkout-empty"><span>0</span><h2>주문할 상품이 없습니다.</h2><p>새결에서 오늘의 취향을 골라보세요.</p><a href="./index.html#new">상품 보러가기 ↗</a></div>`;
} else {
  document.querySelector(".order-count").textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelector(".order-items").innerHTML = cart.map((item) => {
    const product = products.find((entry) => entry.id === item.id);
    return `<article><img src="${product.image}" alt="${product.name}" /><div><small>${product.brand}</small><strong>${product.name}</strong><span>${item.option} · ${item.quantity}개</span></div><b>${money(parsePrice(product.price) * item.quantity)}</b></article>`;
  }).join("");

  const savedCoupon = getCoupon();
  const savedRadio = form.querySelector(`[name="coupon"][value="${savedCoupon}"]`) || form.querySelector('[name="coupon"][value=""]');
  savedRadio.checked = true;

  function calculate() {
    const subtotal = cart.reduce((sum, item) => {
      const product = products.find((entry) => entry.id === item.id);
      return sum + parsePrice(product.price) * item.quantity;
    }, 0);
    const coupon = form.elements.coupon.value;
    const couponDiscount = coupon === "WELCOME10" ? Math.min(Math.floor(subtotal * .1), 20000) : coupon === "STYLE15" ? Math.min(Math.floor(subtotal * .15), 30000) : 0;
    const requestedPoints = Math.min(5000, Math.max(0, Number(form.elements.points.value) || 0));
    const points = Math.min(requestedPoints, Math.max(0, subtotal - couponDiscount));
    const shipping = subtotal - couponDiscount - points >= 50000 ? 0 : 3000;
    const total = subtotal - couponDiscount - points + shipping;
    document.querySelector(".summary-subtotal").textContent = money(subtotal);
    document.querySelector(".summary-coupon").textContent = `−${money(couponDiscount)}`;
    document.querySelector(".summary-points").textContent = `−${money(points)}`;
    document.querySelector(".summary-shipping").textContent = shipping ? money(shipping) : "무료";
    document.querySelector(".summary-total").textContent = money(total);
    document.querySelector(".pay-button-price").textContent = money(total);
    document.querySelector(".discount-message").textContent = couponDiscount ? `쿠폰으로 ${money(couponDiscount)} 할인받았습니다.` : "쿠폰을 선택하면 예상 금액에 바로 반영됩니다.";
    localStorage.setItem("saegyeol_coupon_v1", JSON.stringify(coupon));
    if (tossWidgets && lastTotal !== total) {
      tossWidgets.setAmount({ currency: "KRW", value: total });
      lastTotal = total;
    }
    return { subtotal, coupon, couponDiscount, points, shipping, total };
  }

  form.querySelectorAll('[name="coupon"]').forEach((input) => input.addEventListener("change", calculate));
  form.elements.points.addEventListener("input", calculate);
  document.querySelector(".use-all-points").addEventListener("click", () => { form.elements.points.value = 5000; calculate(); });
  const addressButton = document.querySelector(".address-search");
  const addressStatus = document.querySelector(".address-search-status");
  try {
    const savedShipping = JSON.parse(localStorage.getItem("saegyeol_shipping_v1")) || {};
    const shippingFields = { recipient: savedShipping.recipient, phone: savedShipping.phone, postcode: savedShipping.postcode, address: savedShipping.address1, addressDetail: savedShipping.address2, deliveryMemo: savedShipping.memo };
    Object.entries(shippingFields).forEach(([name, value]) => { if (value && form.elements[name]) form.elements[name].value = value; });
    if (savedShipping.postcode && savedShipping.address1) addressStatus.textContent = "마이페이지의 기본 배송지를 불러왔습니다.";
  } catch {}
  setAddressFieldsReadonly(form, ["postcode", "address"]);
  addressButton.addEventListener("click", async () => {
    addressButton.disabled = true;
    try {
      await openKakaoPostcode({ postcode: form.elements.postcode, address: form.elements.address, detail: form.elements.addressDetail, status: addressStatus, trigger: addressButton });
    } catch (error) {
      addressStatus.textContent = error.message;
      showToast(error.message);
    } finally { addressButton.disabled = false; }
  });

  const initialTotals = calculate();
  payButton.disabled = true;
  try {
    const configResponse = await fetch("/api/toss/config");
    const config = await configResponse.json();
    if (!configResponse.ok || !config.clientKey) throw new Error(config.message || "결제 설정을 불러오지 못했습니다.");
    if (!window.TossPayments) throw new Error("토스페이먼츠 결제 모듈을 불러오지 못했습니다.");
    tossWidgets = window.TossPayments(config.clientKey).widgets({ customerKey: "ANONYMOUS" });
    await tossWidgets.setAmount({ currency: "KRW", value: initialTotals.total });
    lastTotal = initialTotals.total;
    await Promise.all([
      tossWidgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
      tossWidgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" })
    ]);
    document.querySelector(".toss-payment-shell").classList.add("is-ready");
    payButton.disabled = false;
  } catch (error) {
    document.querySelector(".toss-loading").textContent = `${error.message} 잠시 후 새로고침해주세요.`;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !tossWidgets) return;
    payButton.disabled = true;
    const totals = calculate();
    const data = new FormData(form);
    try {
      const prepareResponse = await fetch("/api/toss/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cart: buildServerCart(), coupon: totals.coupon, points: totals.points })
      });
      const prepared = await prepareResponse.json();
      if (!prepareResponse.ok) throw new Error(prepared.message || "결제를 준비하지 못했습니다.");
      if (prepared.amount !== totals.total) throw new Error("결제 금액이 변경되었습니다. 주문서를 다시 확인해주세요.");

      const firstProduct = products.find((product) => product.id === cart[0].id);
      const orderName = cart.length > 1 ? `${firstProduct.name} 외 ${cart.length - 1}건` : firstProduct.name;
      sessionStorage.setItem("saegyeol_pending_order_v1", JSON.stringify({
        orderNumber: prepared.orderId,
        createdAt: new Date().toISOString(),
        items: cart,
        recipient: data.get("recipient"), phone: data.get("phone"), postcode: data.get("postcode"), address: data.get("address"), addressDetail: data.get("addressDetail"), deliveryMemo: data.get("deliveryMemo"), totals
      }));
      const query = `token=${encodeURIComponent(prepared.token)}`;
      await tossWidgets.requestPayment({
        orderId: prepared.orderId,
        orderName,
        successUrl: `${location.origin}/payment-success.html?${query}`,
        failUrl: `${location.origin}/payment-fail.html?${query}`,
        customerName: String(data.get("recipient") || "새결 고객").slice(0, 100),
        customerMobilePhone: String(data.get("phone") || "").replace(/\D/g, "")
      });
    } catch (error) {
      if (error.code !== "USER_CANCEL") showToast(error.message || "결제를 시작하지 못했습니다.");
      payButton.disabled = false;
    }
  });
}
