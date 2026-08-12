import { products } from "./products.js";
import { clearCart, getCart, getCoupon, parsePrice, saveOrder } from "./store.js";
import { openKakaoPostcode, setAddressFieldsReadonly } from "./postcode.js";

const form = document.querySelector("#checkoutForm");
const cart = getCart();
const money = (value) => `₩${Math.max(0, value).toLocaleString("ko-KR")}`;

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
    return { subtotal, coupon, couponDiscount, points, shipping, total };
  }

  form.querySelectorAll('[name="coupon"]').forEach((input) => input.addEventListener("change", calculate));
  form.elements.points.addEventListener("input", calculate);
  document.querySelector(".use-all-points").addEventListener("click", () => { form.elements.points.value = 5000; calculate(); });
  const addressButton = document.querySelector(".address-search");
  const addressStatus = document.querySelector(".address-search-status");
  try {
    const savedShipping = JSON.parse(localStorage.getItem("saegyeol_shipping_v1")) || {};
    const shippingFields = {
      recipient: savedShipping.recipient,
      phone: savedShipping.phone,
      postcode: savedShipping.postcode,
      address: savedShipping.address1,
      addressDetail: savedShipping.address2,
      deliveryMemo: savedShipping.memo
    };
    Object.entries(shippingFields).forEach(([name, value]) => {
      if (value && form.elements[name]) form.elements[name].value = value;
    });
    if (savedShipping.postcode && savedShipping.address1) addressStatus.textContent = "마이페이지의 기본 배송지를 불러왔습니다.";
  } catch {}
  setAddressFieldsReadonly(form, ["postcode", "address"]);
  addressButton.addEventListener("click", async () => {
    addressButton.disabled = true;
    try {
      await openKakaoPostcode({
        postcode: form.elements.postcode,
        address: form.elements.address,
        detail: form.elements.addressDetail,
        status: addressStatus,
        trigger: addressButton
      });
    } catch (error) {
      addressStatus.textContent = error.message;
      document.querySelector(".toast").textContent = error.message;
      document.querySelector(".toast").classList.add("show");
      setTimeout(() => document.querySelector(".toast").classList.remove("show"), 2400);
    } finally {
      addressButton.disabled = false;
    }
  });

  calculate();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const totals = calculate();
    const data = new FormData(form);
    const orderNumber = `SG${new Date().toISOString().slice(2,10).replaceAll("-","")}-${String(Date.now()).slice(-5)}`;
    saveOrder({
      orderNumber,
      createdAt: new Date().toISOString(),
      items: cart,
      recipient: data.get("recipient"),
      phone: data.get("phone"),
      postcode: data.get("postcode"),
      address: data.get("address"),
      addressDetail: data.get("addressDetail"),
      deliveryMemo: data.get("deliveryMemo"),
      payment: data.get("payment"),
      totals
    });
    clearCart();
    document.querySelector(".order-number").textContent = orderNumber;
    const success = document.querySelector(".order-success");
    success.classList.add("is-open");
    success.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  });
}
