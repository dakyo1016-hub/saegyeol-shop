import { calculateOrder, signPayment, type CartLine } from "../payment";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { cart?: CartLine[]; coupon?: string; points?: number };
    const totals = calculateOrder(body.cart || [], body.coupon || "", Number(body.points));
    const orderId = `SG${Date.now()}${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 64);
    const payload = { orderId, amount: totals.total, issuedAt: Date.now() };
    return Response.json({ orderId, amount: totals.total, token: await signPayment(payload) });
  } catch (error) {
    return Response.json({ message: error instanceof Error ? error.message : "결제를 준비하지 못했습니다." }, { status: 400 });
  }
}
