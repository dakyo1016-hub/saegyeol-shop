# 새결 (SAEGYEOL)

새로운 취향의 결을 발견하도록 돕는 패션·뷰티 큐레이션 커머스입니다. 상품 탐색부터 상세 정보, 리뷰, 장바구니, 결제, 마이페이지, 관리자 화면까지 하나의 프로토타입으로 구성되어 있습니다.

- 라이브 사이트: https://saegyeol-shop.dakyo1016.chatgpt.site/
- 브랜드 문구: 새로운 취향의 결
- 기술 구성: React 19, vinext, TypeScript, 정적 HTML/CSS/JavaScript, Supabase Auth, Toss Payments 테스트 결제, Groq 기반 AI 쇼핑 가이드

## 주요 기능

- 패션·뷰티·신상품·랭킹·세일 상품 탐색
- 개인화 추천, 퍼스널 컬러 추천, 매거진 콘텐츠
- 상품 상세 이미지, 실측표, 리뷰, Q&A, 연관 상품 슬라이드
- 찜, 장면 보관, 장바구니, 쿠폰 예상가, 체크아웃
- Google 로그인, 배송지와 체형 정보, 문의 내역을 포함한 마이페이지
- 카카오 우편번호 검색 및 지도 연동
- Toss Payments 테스트 결제 승인 흐름
- Groq API를 사용하는 AI 쇼핑 가이드 `결이`
- 상품 등록·수정을 위한 관리자 화면
- 모바일 하단 내비게이션과 선택형 다크 모드

## 로컬 실행

Node.js 22.13 이상이 필요합니다.

```bash
npm install
npm run dev
```

브라우저에서 터미널에 표시되는 로컬 주소를 열면 됩니다. 빌드 확인은 다음 명령으로 실행합니다.

```bash
npm run build
```

## 환경변수

서버 기능을 사용하려면 프로젝트 루트에 `.env.local`을 만들고 아래 변수들을 설정합니다. 실제 키는 Git에 커밋하지 않습니다.

```dotenv
GROQ_API_KEY=
TOSS_TEST_CLIENT_KEY=
TOSS_TEST_SECRET_KEY=
TOSS_ORDER_SIGNING_SECRET=
```

Supabase URL과 브라우저용 anon key, 카카오 JavaScript 키는 클라이언트 설정 파일을 확인하세요. 운영 전에는 허용 도메인과 Redirect URI를 실제 배포 도메인 기준으로 다시 검토해야 합니다.

## 프로젝트 구조

- `app/`: 서버 진입점과 AI/Toss API 라우트
- `public/`: 쇼핑몰 화면, 클라이언트 스크립트, 상품 이미지
- `public/src/`: 상품 데이터, 장바구니, 마이페이지, 결제, 관리자 기능
- `tests/`: 렌더링 검증
- `.openai/`: Sites 배포 설정
- `docs/PROJECT_HISTORY.md`: 기능 확장 이력과 인수인계 메모

## 보안 메모

- `.env*` 파일은 `.gitignore`에 포함되어 있습니다.
- Groq 및 Toss의 비밀키는 서버 환경변수로만 사용합니다.
- 공개 저장소로 전환하기 전 키 노출 여부와 외부 서비스의 도메인 제한을 다시 점검하세요.
