import { verifyPayment } from "../payment";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { paymentKey?: string; orderId?: string; amount?: number; token?: string };
    const intended = await verifyPayment(body.token || "");
    if (body.orderId !== intended.orderId || Number(body.amount) !== intended.amount) {
      return Response.json({ message: "결제 금액 또는 주문번호가 일치하지 않습니다." }, { status: 400 });
    }
    const secretKey = process.env.TOSS_TEST_SECRET_KEY;
    if (!secretKey) return Response.json({ message: "토스페이먼츠 테스트 시크릿 키가 설정되지 않았습니다." }, { status: 503 });
    const authorization = btoa(`${secretKey}:`);
    const response = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
      method: "POST",
      headers: { Authorization: `Basic ${authorization}`, "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ paymentKey: body.paymentKey, orderId: body.orderId, amount: intended.amount })
    });
    const payment = await response.json() as Record<string, any>;
    if (!response.ok) return Response.json({ message: payment.message || "결제 승인에 실패했습니다.", code: payment.code }, { status: response.status });
    return Response.json({ paymentKey: payment.paymentKey, approvedAt: payment.approvedAt, method: payment.method, receiptUrl: payment.receipt?.url || "" });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "결제 승인 중 문제가 발생했습니다." }, { status: 400 });
  }
}
