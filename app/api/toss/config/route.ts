export async function GET() {
  const clientKey = process.env.TOSS_TEST_CLIENT_KEY;
  if (!clientKey) return Response.json({ message: "토스페이먼츠 테스트 클라이언트 키가 설정되지 않았습니다." }, { status: 503 });
  return Response.json({ clientKey });
}
