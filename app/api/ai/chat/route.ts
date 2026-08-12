type ChatMessage = {
  role?: "user" | "assistant";
  content?: string;
};

const CATALOG = `
1 | FASHION | Sheer Layered Blouson · Ash | 126,000원 | S/M/L
2 | BEAUTY | Barrier Glow Serum 30ml | 28,900원 | 전 피부톤
3 | FASHION | Unbalanced Draped Top · Ivory | 78,400원 | FREE
4 | BEAUTY | Dewy Glow Lip Tint · Over Dew | 22,000원 | 01 Mellow Coral(웜), 02 Deep Rouge(뉴트럴), 03 Dust Rose(쿨), 04 Plum Air(쿨)
5 | FASHION | Nella Shoulder Bag · Black | 189,000원 | Black/Brown/Silver
6 | BEAUTY | Gentle Night Eau de Parfum 30ml | 65,000원
7 | FASHION | Summer Half Jacket · Cream | 133,200원 | S/M
8 | BEAUTY | Shell Perfume Hand · Chamo | 32,000원
9 | FASHION | Knife Pleats Midi Skirt · Graphite | 109,000원 | S/M/L
10 | BEAUTY | Soft Blur Blush Duo · Veil | 29,000원 | Apricot Veil(웜), Mauve Haze(쿨)
11 | FASHION | Fine Rib Sleeveless Knit · Oat | 59,000원 | S/M
12 | BEAUTY | Cooling Veil Sun Cushion SPF50+ | 32,000원 | 전 피부톤
13 | FASHION | Soft Rib Boatneck Knit · Milk | 79,000원 | S/M/L
14 | FASHION | Air Cotton Drop Tee · Light Gray | 39,000원 | S/M/L
15 | FASHION | Quiet Oversized Sweat · Ink Navy | 69,000원 | S/M/L
16 | FASHION | Window Light Crinkle Shirt · Navy | 82,000원 | FREE
17 | FASHION | Soft Texture Tee · Clean White | 42,000원 | S/M/L
18 | FASHION | Soft Scoop Layer Tank · White | 29,000원 | S/M
`;

const SYSTEM_PROMPT = `당신은 한국 패션·뷰티 커머스 '새결'의 AI 쇼핑 가이드 '결이'입니다.
말투는 감각적이지만 과장하지 않고, 한국어로 짧고 명확하게 답하세요. 보통 2~5문장, 비교는 최대 3개까지만 제안합니다.

규칙:
- 아래 카탈로그에 실제로 있는 상품만 추천하고 상품명·가격·옵션을 지어내지 않습니다.
- 상품 추천에는 반드시 마지막에 '/product.html?id=상품번호' 형식의 경로를 붙입니다.
- 체형·취향 정보가 부족하면 한 번에 질문 하나만 합니다. 실측표 확인을 권하고 사이즈 적합을 확정적으로 보장하지 않습니다.
- 퍼스널 컬러는 손목 혈관, 흰 종이 대비, 실버/골드 액세서리 비교처럼 간단한 자가 점검법을 안내하되 전문 진단이라고 표현하지 않습니다.
- 피부 트러블·알레르기 등 의학적 판단은 하지 않고 성분 확인과 전문가 상담을 권합니다.
- 주문·배송·결제·문의처럼 개인 계정 정보가 필요한 질문은 마이페이지(/mypage.html)에서 확인하도록 안내하며 실제 상태를 아는 척하지 않습니다.
- 비밀번호, 카드번호, 주민등록번호 등 민감정보를 요청하지 않습니다.
- 새결의 현재 혜택은 신규 회원 10% 쿠폰, 5만원 이상 무료배송입니다.

새결 상품 카탈로그:
${CATALOG}`;

function trimMessages(input: unknown): Array<{ role: "user" | "assistant"; content: string }> {
  if (!Array.isArray(input)) return [];
  return input
    .slice(-8)
    .filter((message): message is ChatMessage => Boolean(message && (message.role === "user" || message.role === "assistant")))
    .map((message) => ({ role: message.role!, content: String(message.content || "").trim().slice(0, 800) }))
    .filter((message) => message.content.length > 0);
}

export async function POST(request: Request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ message: "AI 상담이 아직 준비되지 않았습니다." }, { status: 503 });
  }

  try {
    const body = await request.json() as { messages?: unknown; pageContext?: unknown };
    const messages = trimMessages(body.messages);
    if (!messages.length || messages[messages.length - 1].role !== "user") {
      return Response.json({ message: "질문을 한 문장 이상 입력해주세요." }, { status: 400 });
    }

    const pageContext = String(body.pageContext || "").slice(0, 240);
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [
          { role: "system", content: `${SYSTEM_PROMPT}\n현재 고객 화면: ${pageContext || "알 수 없음"}` },
          ...messages
        ],
        temperature: 0.35,
        max_completion_tokens: 450
      })
    });

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      const message = response.status === 429
        ? "지금은 무료 AI 상담 요청이 많아요. 잠시 후 다시 질문해주세요."
        : "AI 상담 연결이 잠시 불안정합니다. 조금 뒤 다시 시도해주세요.";
      return Response.json({ message }, { status });
    }

    const reply = payload.choices?.[0]?.message?.content?.trim();
    if (!reply) return Response.json({ message: "답변을 만들지 못했습니다. 질문을 조금 다르게 적어주세요." }, { status: 502 });
    return Response.json({ reply, model: "Groq · GPT-OSS 20B" });
  } catch {
    return Response.json({ message: "AI 상담 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
