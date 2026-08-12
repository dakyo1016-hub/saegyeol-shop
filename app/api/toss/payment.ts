const catalog: Record<number, { name: string; price: number }> = {
  1: { name: "Sheer Layered Blouson · Ash", price: 126000 }, 2: { name: "Barrier Glow Serum 30ml", price: 28900 },
  3: { name: "Unbalanced Draped Top · Ivory", price: 78400 }, 4: { name: "Dewy Glow Lip Tint · Over Dew", price: 22000 },
  5: { name: "Nella Shoulder Bag · Black", price: 189000 }, 6: { name: "Gentle Night Eau de Parfum 30ml", price: 65000 },
  7: { name: "Summer Half Jacket · Cream", price: 133200 }, 8: { name: "Shell Perfume Hand · Chamo", price: 32000 },
  9: { name: "Knife Pleats Midi Skirt · Graphite", price: 109000 }, 10: { name: "Soft Blur Blush Duo · Veil", price: 29000 },
  11: { name: "Fine Rib Sleeveless Knit · Oat", price: 59000 }, 12: { name: "Cooling Veil Sun Cushion SPF50+", price: 32000 },
  13: { name: "Soft Rib Boatneck Knit · Milk", price: 79000 }, 14: { name: "Air Cotton Drop Tee · Light Gray", price: 39000 },
  15: { name: "Quiet Oversized Sweat · Ink Navy", price: 69000 }, 16: { name: "Window Light Crinkle Shirt · Navy", price: 82000 },
  17: { name: "Soft Texture Tee · Clean White", price: 42000 }, 18: { name: "Soft Scoop Layer Tank · White", price: 29000 }
};

export type CartLine = { id?: number; quantity?: number; option?: string };

export function calculateOrder(cart: CartLine[], coupon: string, requestedPoints: number) {
  if (!Array.isArray(cart) || !cart.length) throw new Error("주문할 상품이 없습니다.");
  const subtotal = cart.reduce((sum, item) => {
    const product = catalog[Number(item.id)];
    const quantity = Math.floor(Number(item.quantity));
    if (!product || !Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw new Error("상품 정보가 올바르지 않습니다.");
    return sum + product.price * quantity;
  }, 0);
  const couponDiscount = coupon === "WELCOME10" ? Math.min(Math.floor(subtotal * .1), 20000) : coupon === "STYLE15" ? Math.min(Math.floor(subtotal * .15), 30000) : 0;
  const points = Math.min(5000, Math.max(0, Math.floor(Number(requestedPoints) || 0)), subtotal - couponDiscount);
  const shipping = subtotal - couponDiscount - points >= 50000 ? 0 : 3000;
  return { subtotal, couponDiscount, points, shipping, total: subtotal - couponDiscount - points + shipping };
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export async function signPayment(payload: object) {
  const secret = process.env.TOSS_ORDER_SIGNING_SECRET;
  if (!secret) throw new Error("주문 검증 설정이 없습니다.");
  const body = bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return `${body}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyPayment(token: string) {
  const [body, signature] = String(token || "").split(".");
  if (!body || !signature) throw new Error("주문 검증 정보가 없습니다.");
  const secret = process.env.TOSS_ORDER_SIGNING_SECRET;
  if (!secret) throw new Error("주문 검증 설정이 없습니다.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  const padded = signature.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((signature.length + 3) % 4);
  const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
  const valid = await crypto.subtle.verify("HMAC", key, bytes, new TextEncoder().encode(body));
  if (!valid) throw new Error("주문 검증에 실패했습니다.");
  const decoded = body.replaceAll("-", "+").replaceAll("_", "/") + "===".slice((body.length + 3) % 4);
  const payload = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(decoded), (char) => char.charCodeAt(0))));
  if (Date.now() - Number(payload.issuedAt) > 10 * 60 * 1000) throw new Error("결제 유효 시간이 지났습니다. 다시 주문해주세요.");
  return payload as { orderId: string; amount: number; issuedAt: number };
}
