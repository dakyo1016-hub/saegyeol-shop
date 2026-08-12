import { clearCart, saveOrder } from "./store.js";

const view = document.querySelector(".payment-result");
const params = new URLSearchParams(location.search);
const paymentKey = params.get("paymentKey");
const orderId = params.get("orderId");
const amount = Number(params.get("amount"));
const token = params.get("token");

function renderFailure(message) {
  view.querySelector(".eyebrow").textContent = "PAYMENT CHECK FAILED";
  view.querySelector(".payment-result__mark").textContent = "×";
  view.querySelector("h1").innerHTML = "결제를<br />확인하지 못했어요.";
  view.querySelector(".payment-result__copy").textContent = message;
  view.insertAdjacentHTML("beforeend", '<a class="payment-result__action" href="./checkout.html">주문서로 돌아가기 <span>↗</span></a>');
}

try {
  if (!paymentKey || !orderId || !amount || !token) throw new Error("결제 인증 정보가 올바르지 않습니다.");
  const response = await fetch("/api/toss/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ paymentKey, orderId, amount, token })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "결제 승인에 실패했습니다.");

  const pending = JSON.parse(sessionStorage.getItem("saegyeol_pending_order_v1") || "null");
  if (pending && pending.orderNumber === orderId) {
    saveOrder({
      ...pending,
      status: "결제 완료",
      payment: "토스페이먼츠 테스트",
      paymentKey: result.paymentKey,
      approvedAt: result.approvedAt,
      receiptUrl: result.receiptUrl || ""
    });
  }
  clearCart();
  sessionStorage.removeItem("saegyeol_pending_order_v1");
  view.querySelector(".eyebrow").textContent = "ORDER COMPLETE · TEST";
  view.querySelector(".payment-result__mark").textContent = "✓";
  view.querySelector("h1").innerHTML = "주문이<br />완료되었습니다.";
  view.querySelector(".payment-result__copy").innerHTML = `주문번호 <strong>${orderId}</strong><br />테스트 결제가 안전하게 승인되었습니다.`;
  view.insertAdjacentHTML("beforeend", '<a class="payment-result__action" href="./mypage.html#orders">주문 내역 확인 <span>↗</span></a><a class="payment-result__secondary" href="./index.html">쇼핑 계속하기</a>');
} catch (error) {
  renderFailure(error.message || "결제 확인 중 문제가 발생했습니다.");
}
