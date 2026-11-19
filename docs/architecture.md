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
    rss.ts                RSS/XML 태그 파싱 공용 함수 (fetchFeed/parseFeed/extractTag/decodeEntities) — news, trends에서 사용
  auth/
    login.ts logout.ts me.ts
  posts/
    index.ts             GET(목록)/POST(작성)
    [id].ts               GET(상세)/PUT(수정)/DELETE(삭제)
  blob/
    upload.ts             클라이언트 업로드용 토큰 발급 (@vercel/blob handleUpload)
  attachments/
    [id].ts               로그인한 사용자에게만 첨부파일을 스트리밍하는 프록시
  stocks/
    index.ts              관심종목 시세(네이버 폴링 API)+환율+코인 반환, ?q= 종목 검색, POST/DELETE로 관심종목 추가·삭제 (로그인 필요)
  personal/
    index.ts              할 일/메모/D-day CRUD (?kind=todos|memos|ddays, 본인 데이터만, 로그인 필요)
  translate/
    index.ts              MyMemory 번역 API 프록시 (키/가입 불필요, 로그인은 필요)
  news/
    index.ts              스포츠 RSS 피드 3개를 서버에서 가져와 파싱·병합·정렬해 반환 (로그인 필요)
  weather/
    index.ts              Open-Meteo 예보+대기질 API로 도시별(?city=) 현재/시간별/주간 날씨와 미세먼지 반환 (로그인 필요, 날씨 페이지·홈 위젯 공용)
  trends/
    index.ts              구글 트렌드 대한민국 실시간 검색어 RSS를 가져와 순위·관련 뉴스로 정리해 반환 (로그인 필요)

src/
  pages/                  Home, Login, BoardList, PostDetail, PostEditor, NotFound,
                          MapPage(/map), StockPage(/stock), TranslatePage(/translate), NewsPage(/news),
                          TrendsPage(/trends), FortunePage(/fortune), NotesPage(/notes), WeatherPage(/weather)
  components/             Navbar, ProtectedRoute, ThemeToggle
  context/AuthContext.tsx 로그인 상태 전역 관리
  lib/
    api.ts                백엔드 API 호출 래퍼 + 첨부파일 업로드
    attachments.ts        첨부파일 허용 타입/용량/개수 상수 (프론트 쪽, api/_lib와 별도 사본)
    fortune.ts            띠별 오늘의 운세 생성 로직 (날짜+띠 시드 해시, 외부 API 없음)
    dday.ts               D-day 계산 (D-n / D-Day / D+n)
    theme.ts              다크 모드 설정 읽기/적용 (html의 data-theme 속성)
    storage.ts            localStorage 안전 래퍼 + 키 상수 (날씨 도시, 테마)
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
watchlist (user_id → users, code, name, created_at)   -- PK (user_id, code)
todos (id, user_id → users, text, done, created_at)
memos (id, user_id → users, content, created_at, updated_at)
ddays (id, user_id → users, title, target_date date, created_at)
```

- `posts.user_id`, `attachments.post_id` 모두 `on delete cascade` — 사용자/게시글 삭제 시 하위 데이터 자동 정리 (단, Blob 파일 자체는 별도로 지워야 함, 아래 참고)
- 스키마 변경은 `schema.sql`을 고치고 `node --env-file=.env scripts/_apply-schema.mjs`로 반영 (전부 `if not exists`라 재실행해도 안전)

## 인증 흐름

1. `POST /api/auth/login` → 비밀번호 검증 후 JWT 발급 → `Set-Cookie: kyg_home_token=...`(HttpOnly, SameSite=Lax). 회원가입 기능은 없음 — 계정은 DB에 직접 추가해야 함
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

## 지도 / 시세 / 번역 / 스포츠 뉴스 / 급상승검색어 / 운세 (독립 유틸리티 페이지)

게시판과 별개의 6개 메뉴. 전부 DB를 쓰지 않고, 외부 서비스를 그대로 노출하지 않기 위해 "서버(Vercel 함수)가 외부 API를 대신 호출해서 정리된 형태로 내려준다"는 동일한 패턴을 씁니다 (지도·운세는 예외 — 아래 참고).

게시판과 동일하게 **로그인해야 접근 가능** — 프론트는 `/map`, `/stock`, `/translate`, `/news`, `/trends`, `/fortune`을 `ProtectedRoute`로 감싸고, `api/stocks`, `api/translate`, `api/news`, `api/trends`도 각각 `requireAuth`로 401을 반환해 서버 쪽에서 최종 방어함 (지도·운세는 백엔드 호출 자체가 없어 프론트 라우트 가드만 적용).

### 지도 (`/map`, `MapPage.tsx`)
- 카카오맵 JavaScript SDK를 클라이언트에서 동적으로 `<script>` 삽입해 로드 (`VITE_KAKAO_MAP_KEY` 필요, 빌드 타임에 번들에 박힘)
- 카카오 디벨로퍼스 콘솔의 **플랫폼(Web) 도메인 등록**이 안 되어 있으면 `domain mismatched` 에러가 나므로, 로컬(`http://localhost:5173`)과 배포 도메인 둘 다 등록해야 함
- 서버 프록시 없이 브라우저가 카카오 SDK를 직접 호출하는 유일한 페이지 (지도 SDK 특성상 서버 프록시가 의미 없음)

### 시세 (`/stock`, `StockPage.tsx` + `api/stocks/index.ts`)
- `api/stocks/index.ts`가 네이버 금융이 내부적으로 쓰는 실시간 시세 JSON(`polling.finance.naver.com`)을 서버에서 호출해 **로그인한 사용자의 관심종목**(`watchlist` 테이블) 시세를 반환. 관심종목이 없으면 주식은 빈 목록
- 관심종목 추가용 종목 검색은 `GET /api/stocks?q=`로, 네이버 증권 자동완성 API(`ac.stock.naver.com/ac`)를 프록시해 국내 종목 최대 10개 반환. 추가는 `POST /api/stocks {code, name}`(최대 30개), 삭제는 `DELETE /api/stocks?code=`
- 응답이 사용자마다 달라서 `Cache-Control: private, no-store` (예전엔 고정 종목이라 CDN 캐시를 썼음)
- `finance.naver.com`의 HTML 페이지 자체는 `robots.txt`가 일반 크롤러를 막고 있어 직접 파싱하지 않음 — `polling.finance.naver.com`은 별도 서브도메인이라 그 제한을 받지 않고, 페이지가 실제로 쓰는 API라 HTML 파싱보다 안정적
- 비공식/무서화되지 않은 API라 네이버가 구조를 바꾸면 깨질 수 있음
- 같은 엔드포인트가 **환율**(네이버페이 증권의 `m.stock.naver.com/front-api/marketIndex/prices?category=exchange&reutersCode=FX_USDKRW` 등, 통화당 개별 호출이라 `Promise.all`로 4개 병렬 호출 — USD/EUR/JPY(100엔 기준)/CNY)과 **코인**(업비트 공개 API `api.upbit.com/v1/ticker`, 키 불필요, BTC/ETH/XRP)도 함께 반환 (`{ stocks, exchanges, coins }`)
- 세 그룹을 `Promise.allSettled`로 병렬 호출해서 한쪽이 실패해도 나머지는 정상 반환, 셋 다 비어있을 때만 502
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

### 급상승 검색어 (`/trends`, `TrendsPage.tsx` + `api/trends/index.ts`)
- 네이버·다음이 2021년에 "실시간 검색어"를 폐지한 뒤로 대체할 공식 국내 서비스가 없어서, [구글 트렌드의 대한민국 일일 검색 트렌드 RSS](https://trends.google.com/trending/rss?geo=KR)를 대신 사용 (키/가입 불필요)
- 이 피드는 일반 RSS 2.0이 아니라 `ht:` 네임스페이스로 확장된 구조라 `approx_traffic`(대략적인 검색량), 연관 뉴스 기사(`ht:news_item` 블록, 키워드당 여러 개 중 첫 번째만 사용)가 추가로 들어있음 — `api/_lib/rss.ts`의 `extractTag`를 그대로 재사용해서 커스텀 태그를 뽑아냄
- 상위 10개 키워드를 순위·검색량·연관 뉴스 제목/링크와 함께 반환

### 오늘의 운세 (`/fortune`, `FortunePage.tsx` + `src/lib/fortune.ts`)
- 실제 점성술 데이터나 외부 API가 아니라, **`날짜+띠` 문자열을 시드로 한 결정론적 해시**로 미리 준비된 문구 풀(총운/금전운/애정운/건강운 각 7~10개)에서 하나씩 골라 보여주는 방식 — 같은 날 같은 띠는 몇 번을 새로고침해도 같은 결과, 날짜가 바뀌면 자동으로 바뀜
- 외부 호출이 없어서 지도와 마찬가지로 백엔드 없이 프론트에서만 계산 (`getDailyFortune()`)
- 선택한 띠는 `localStorage`에 저장해서 다음 방문 때도 유지 (브라우저 로컬 저장소라 기기별로 따로 기억됨)
- 운세 점수(50~100)도 같은 해시 방식으로 생성

## 날씨 (`/weather`, `WeatherPage.tsx` + 홈 위젯, `api/weather/index.ts`)
- `WeatherPage`(상세)와 `Home.tsx` hero 영역의 위젯이 같은 API를 씀 — 로그인했을 때만 호출/표시 (`requireAuth`로 서버에서도 401 방어)
- [Open-Meteo](https://open-meteo.com) 무료 API를 키/가입 없이 호출. 도시는 서버의 `CITIES` 표(16개 도시 좌표)에서 `?city=키`로 고르고, 모르는 키면 서울
- 예보 API에서 `current`(기온/체감/습도/풍속/날씨 코드), `hourly`(24시간 기온/날씨/강수확률), `daily`(7일 최고·최저/강수확률/일출·일몰)를, 대기질 API(`air-quality-api.open-meteo.com`)에서 PM10/PM2.5를 병렬로 요청. 대기질만 실패하면 미세먼지는 `null`로 내려주고 나머지는 정상 반환
- 미세먼지 등급은 환경부 기준(PM10 30/80/150, PM2.5 15/35/75 ㎍/㎥)으로 서버에서 계산
- 고른 도시는 `localStorage`(`kyg_home_weather_city`)에 저장돼서 홈 위젯도 같은 도시를 보여줌
- WMO 날씨 코드(0, 1, 2, 3, 45...)를 한글 설명 + 이모지로 매핑하는 테이블을 직접 유지 (`WEATHER_CODE_MAP`) — API가 코드만 주고 텍스트를 안 줌

## 기록 (`/notes`, `NotesPage.tsx` + `api/personal/index.ts`)
- 할 일(`todos`), 메모(`memos`), D-day(`ddays`) 세 가지를 **하나의 서버리스 함수**에서 `?kind=`로 나눠 처리 (함수 개수를 늘리지 않기 위해)
  - `GET/POST /api/personal?kind=todos`, `PUT/DELETE ...&id=` — 할 일은 `{ text?, done? }`로 수정
  - 메모는 GET/POST/PUT/DELETE, D-day는 GET/POST/DELETE (D-day 수정은 지우고 다시 추가)
- 모든 쿼리에 `user_id = 로그인한 유저` 조건이 붙어서 다른 사람 데이터는 읽거나 고칠 수 없음. `id`가 UUID 형식이 아니면 DB까지 가지 않고 404
- D-day 날짜는 `date` 타입으로 저장하고 응답에서는 `to_char(..., 'YYYY-MM-DD')` 문자열로 내려줌 (시간대 때문에 날짜가 하루 밀리는 문제 방지). D-n 계산은 브라우저 기준 오늘 날짜로 `src/lib/dday.ts`에서 함
- 홈 화면 "오늘" 패널은 같은 API로 미완료 할 일 수와 앞으로 올 D-day 3개를 보여줌

## 다크 모드 (`src/lib/theme.ts`, `ThemeToggle.tsx`)
- 색은 전부 `index.css`의 `:root` CSS 변수로 관리하고, 다크 팔레트는 같은 변수를 덮어쓰는 방식
  - `<html data-theme="dark">` → 다크, `data-theme="light"` → 라이트, 속성 없음 → OS 설정(`prefers-color-scheme`)
- 상단 메뉴 버튼이 시스템 → 라이트 → 다크 순으로 바꾸고 `localStorage`(`kyg_home_theme`)에 저장
- `index.html`의 작은 인라인 스크립트가 React보다 먼저 저장값을 적용해서 새로고침할 때 밝은 화면이 잠깐 보이는 문제를 막음
- 새 스타일을 추가할 때 색을 직접 쓰지 말고 `var(--color-...)` 변수를 써야 다크 모드에서도 맞게 보임
