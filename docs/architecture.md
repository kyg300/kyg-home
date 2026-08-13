# 아키텍처

## 기술 스택

| 영역 | 사용 기술 |
|---|---|
| 프론트엔드 | React 19 + Vite + react-router-dom |
| 백엔드 | Vercel Serverless Functions (TypeScript, `api/` 폴더 기반 파일 라우팅) |
| DB | Neon Postgres (`@neondatabase/serverless`의 HTTP 드라이버) |
| 인증 | JWT를 HttpOnly 쿠키(`kyg_home_token`)에 저장, `bcryptjs`로 비밀번호 해시 |
| 파일 저장소 | Vercel Blob (private 스토어) |
| 타입체크 | TypeScript (`tsc -b` 프론트, `tsc -p tsconfig.api.json` API) |

## 폴더 구조

```
api/                     Vercel Serverless Functions (파일 경로 = URL 경로)
  _lib/
    auth.ts              JWT 발급/검증, 쿠키 생성, requireAuth()
    db.ts                Neon sql 클라이언트
    attachments.ts       첨부파일 허용 타입/용량/개수 상수 + 검증 함수
  auth/
    signup.ts login.ts logout.ts me.ts
  posts/
    index.ts             GET(목록)/POST(작성)
    [id].ts               GET(상세)/PUT(수정)/DELETE(삭제)
  blob/
    upload.ts             클라이언트 업로드용 토큰 발급 (@vercel/blob handleUpload)
  attachments/
    [id].ts               로그인한 사용자에게만 첨부파일을 스트리밍하는 프록시
  stocks/
    index.ts              네이버 시세 폴링 API를 서버에서 대신 호출해 정리된 형태로 반환 (인증 불필요)
  translate/
    index.ts              MyMemory 번역 API 프록시 (인증 불필요, 키/가입 불필요)
  news/
    index.ts              스포츠 RSS 피드 3개를 서버에서 가져와 파싱·병합·정렬해 반환 (인증 불필요)

src/
  pages/                  Home, Login, Signup, BoardList, PostDetail, PostEditor, NotFound,
                          MapPage(/map), StockPage(/stock), TranslatePage(/translate), NewsPage(/news)
  components/             Navbar, ProtectedRoute
  context/AuthContext.tsx 로그인 상태 전역 관리
  lib/
    api.ts                백엔드 API 호출 래퍼 + 첨부파일 업로드
    attachments.ts        첨부파일 허용 타입/용량/개수 상수 (프론트 쪽, api/_lib와 별도 사본)
  styles/index.css        전역 스타일 (디자인 토큰은 :root 변수)
  vite-env.d.ts           `import.meta.env`에 커스텀 환경변수(`VITE_KAKAO_MAP_KEY`) 타입 추가

scripts/
  dev-api-server.mjs      vite dev와 별개로 api/*.ts를 로컬 Node http 서버로 실행
  ts-extension-loader.mjs 로컬 실행 시 .js import를 실제 .ts 파일로 매핑하는 Node 모듈 훅
  _apply-schema.mjs       schema.sql을 DATABASE_URL에 적용 (idempotent)
  _db-check.mjs           최근 게시글 1건 확인용 점검 스크립트

schema.sql                DB 스키마 원본
vercel.json               SPA 라우팅용 rewrite 설정
```

## DB 스키마

```sql
users (id, email, username, password_hash, created_at)
posts (id, user_id → users, title, content, created_at, updated_at)
attachments (id, post_id → posts, filename, url, content_type, size, created_at)
```

- `posts.user_id`, `attachments.post_id` 모두 `on delete cascade` — 사용자/게시글 삭제 시 하위 데이터 자동 정리 (단, Blob 파일 자체는 별도로 지워야 함, 아래 참고)
- 스키마 변경은 `schema.sql`을 고치고 `node --env-file=.env scripts/_apply-schema.mjs`로 반영 (전부 `if not exists`라 재실행해도 안전)

## 인증 흐름

1. `POST /api/auth/signup` 또는 `/login` → 비밀번호 검증 후 JWT 발급 → `Set-Cookie: kyg_home_token=...`(HttpOnly, SameSite=Lax)
2. 이후 모든 요청은 브라우저가 쿠키를 자동으로 실어 보냄 (`fetch`에는 `credentials: 'include'` 필요, `src/lib/api.ts`에 이미 적용됨)
3. API 핸들러는 `requireAuth(req)`로 쿠키의 JWT를 검증하고 `{ userId, username }`을 얻음
4. `GET /api/posts`, `GET /api/posts/:id`도 `requireAuth` 필수 — **비로그인 상태에서는 게시글을 아예 읽을 수 없음**
5. 프론트에서도 `/board`, `/board/:id`, `/board/new`, `/board/:id/edit`를 `ProtectedRoute`로 감싸 비로그인 시 `/login`으로 리다이렉트 (서버 쪽 401이 최종 방어선, 프론트 라우트 가드는 UX용)

## 게시판 CRUD

- 목록/상세 조회는 로그인만 하면 누구나 가능
- 수정/삭제는 `posts.user_id === 로그인한 유저`일 때만 허용 (403으로 차단)
- 홈 화면 검색바 → `/board?q=검색어` → `BoardList`가 이미 받아온 목록을 클라이언트에서 제목/내용 기준으로 필터링 (서버 쪽 검색 API는 없음)

## 첨부파일 흐름

Vercel 서버리스 함수는 요청 본문 크기 제한이 있고, 사용 중인 Blob 스토어가 **private**로 설정되어 있어 URL만으로는 접근이 안 되기 때문에 아래처럼 3단계로 구성했습니다.

**업로드 (글쓰기/수정 시)**
1. 브라우저가 `api.uploadAttachment(file)` 호출 → `@vercel/blob/client`의 `upload()`가 먼저 `POST /api/blob/upload`를 호출해 짧은 시간만 유효한 업로드 토큰을 발급받음 (`api/blob/upload.ts`가 `handleUpload()`로 처리, 로그인 필요, 허용 타입/용량은 `api/_lib/attachments.ts`의 상수로 제한)
2. 발급받은 토큰으로 브라우저가 **파일을 서버를 거치지 않고 Blob 스토리지에 직접 업로드** (그래서 서버리스 함수의 요청 크기 제한에 안 걸림)
3. 업로드 결과(`url`, `filename`, `contentType`, `size`)를 글쓰기 폼이 들고 있다가, `POST /api/posts` 또는 `PUT /api/posts/:id` 호출 시 함께 보내서 `attachments` 테이블에 저장

**조회/다운로드**
- API 응답(`GET /api/posts/:id` 등)에는 첨부파일의 실제 Blob URL을 **절대 내려주지 않음** — `id`만 내려주고, 프론트는 `/api/attachments/:id`로 접근
- `api/attachments/[id].ts`가 로그인 여부를 확인한 뒤, 서버가 가진 `BLOB_READ_WRITE_TOKEN`으로 Blob 스토리지에서 파일을 대신 받아와 그대로 스트리밍
- 이미지는 `Content-Disposition: inline`(새 탭 미리보기), 그 외 파일은 `?download=1` 쿼리를 붙여 `Content-Disposition: attachment`(강제 다운로드)로 응답

**삭제**
- 글 수정 시 기존 첨부파일 목록과 새로 제출된 목록을 비교해서, 빠진 것은 DB row 삭제 + `del()`로 Blob 파일도 삭제
- 글 삭제 시에도 연결된 첨부파일의 Blob 파일을 먼저 지운 뒤 게시글을 삭제 (DB row는 `on delete cascade`로 자동 정리되지만 Blob 파일은 별도 API 호출로 지워야 함)

## 지도 / 시세 / 번역 / 스포츠 뉴스 (독립 유틸리티 페이지)

게시판과 무관하게 로그인 없이 누구나 쓸 수 있는 4개 메뉴. 전부 DB를 쓰지 않고, 외부 서비스를 그대로 노출하지 않기 위해 "서버(Vercel 함수)가 외부 API를 대신 호출해서 정리된 형태로 내려준다"는 동일한 패턴을 씁니다 (지도만 예외 — 아래 참고).

### 지도 (`/map`, `MapPage.tsx`)
- 카카오맵 JavaScript SDK를 클라이언트에서 동적으로 `<script>` 삽입해 로드 (`VITE_KAKAO_MAP_KEY` 필요, 빌드 타임에 번들에 박힘)
- 카카오 디벨로퍼스 콘솔의 **플랫폼(Web) 도메인 등록**이 안 되어 있으면 `domain mismatched` 에러가 나므로, 로컬(`http://localhost:5173`)과 배포 도메인 둘 다 등록해야 함
- 서버 프록시 없이 브라우저가 카카오 SDK를 직접 호출하는 유일한 페이지 (지도 SDK 특성상 서버 프록시가 의미 없음)

### 시세 (`/stock`, `StockPage.tsx` + `api/stocks/index.ts`)
- `api/stocks/index.ts`가 네이버 금융이 내부적으로 쓰는 실시간 시세 JSON(`polling.finance.naver.com`)을 서버에서 호출해 4개 고정 종목(삼성전자 005930, SK하이닉스 000660, 카카오 035720, 두산에너빌리티 034020)만 추려서 반환
- `finance.naver.com`의 HTML 페이지 자체는 `robots.txt`가 일반 크롤러를 막고 있어 직접 파싱하지 않음 — `polling.finance.naver.com`은 별도 서브도메인이라 그 제한을 받지 않고, 페이지가 실제로 쓰는 API라 HTML 파싱보다 안정적
- 비공식/무서화되지 않은 API라 네이버가 구조를 바꾸면 깨질 수 있음
- 프론트는 10초마다 자동 재요청 + 수동 "새로고침" 버튼 + 다음 갱신까지 남은 초를 보여주는 카운트다운(1초 간격 별도 타이머)을 가짐, 페이지를 벗어나면(`useEffect` cleanup) 두 타이머 모두 정리됨

### 번역 (`/translate`, `TranslatePage.tsx` + `api/translate/index.ts`)
- [MyMemory Translation API](https://mymemory.translated.net/doc/spec.php)를 서버에서 프록시 — 가입/API 키 없이 쓸 수 있는 몇 안 되는 무료 번역 API라서 선택 (DeepL은 2026-07부로 신규 무료 API 발급 중단, 파파고는 유료 전용, Google/Azure는 카드 등록이 필요한 유료 크레딧 기반 무료 티어)
- 무료 한도: 요청당 최대 500 byte, 익명 기준 하루 5,000자 (개인 프로젝트 트래픽엔 충분)
- 프론트에서 UTF-8 byte 수를 계산해 480byte를 넘으면 번역 버튼을 막고 안내 문구를 보여줌 (`TranslatePage.tsx`의 `byteLength()`)
- 언어 스왑 버튼은 소스/타깃 언어와 입력/결과 텍스트를 함께 교체

### 스포츠 뉴스 (`/news`, `NewsPage.tsx` + `api/news/index.ts`)
- 고정된 RSS 피드 3개(연합뉴스 `yna.co.kr/rss/sports.xml`, SBS `news.sbs.co.kr/news/SectionRssFeed.do?sectionId=09`, 동아일보 `rss.donga.com/sports.xml`)를 서버에서 병렬로 가져와 하나로 합침
- XML 파싱에 별도 라이브러리를 쓰지 않고, RSS 2.0의 `<item>` 블록에서 `<title>`/`<link>`/`<pubDate>`만 정규식으로 뽑아내는 가벼운 파서를 직접 구현 (`api/news/index.ts`의 `parseFeed`/`extractTag`) — CDATA로 감싼 값과 안 감싼 값 둘 다 처리하고 HTML 엔티티(`&amp;` 등)도 디코딩함
- 한 피드가 실패해도 전체가 죽지 않도록 `Promise.allSettled`로 가져오고, 성공한 피드만 합쳐서 `pubDate` 기준 최신순 정렬 후 상위 30개만 반환
- 네이버는 뉴스 RSS를 2022년에 완전히 종료해서 후보에서 제외함 (실제로 예전 RSS 주소가 XML 대신 302 리다이렉트만 반환하는 것을 확인)
- 프론트는 목록만 보여주고, 각 제목은 `target="_blank" rel="noopener noreferrer"`로 원문을 새 탭에 염
