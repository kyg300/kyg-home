# 배포 (Vercel)

## 배포 방식

GitHub 저장소(`kyg300/kyg-home`)와 Vercel 프로젝트가 연동되어 있어서, **`main` 브랜치에 push하면 자동으로 재배포**됩니다. 별도로 `vercel` CLI를 쓰거나 대시보드에서 수동 배포할 필요는 없습니다.

- 프론트엔드 빌드: `npm run build` (`tsc -b && vite build`)
- API 함수(`api/*.ts`)는 Vercel이 자체적으로 각각 독립된 서버리스 함수로 빌드 — `moduleResolution: nodenext` 기준으로 타입체크하므로 로컬 `tsconfig.api.json`과 설정을 맞춰뒀습니다 (자세한 내용은 [local-development.md](./local-development.md) 참고)

## 필요한 환경변수

Vercel 프로젝트 → **Settings → Environment Variables**에 아래 세 개가 있어야 합니다. **Production 환경에 체크되어 있는지 꼭 확인하세요** — Preview에만 체크돼 있으면 실제 배포 도메인에는 적용되지 않습니다.

| 변수 | 설명 |
|---|---|
| `DATABASE_URL` | Neon Postgres 연결 문자열 |
| `JWT_SECRET` | JWT 서명용 비밀 값 |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob 스토어 읽기/쓰기 토큰 |
| `VITE_KAKAO_MAP_KEY` | 카카오맵 JavaScript 키 (`/map` 페이지용) |

환경변수를 새로 추가하거나 값을 바꾼 뒤에는 **이미 만들어진 배포에는 반영되지 않습니다.** Deployments 탭에서 최신 배포의 "..." 메뉴 → **Redeploy**를 눌러야 새 값이 적용됩니다. `VITE_` 변수는 특히 주의: Vite가 빌드 타임에 값을 번들에 박아 넣기 때문에, 로컬 `.env`에만 넣고 Vercel 쪽에 등록하지 않으면 배포본에서는 값이 아예 비어 있는 상태로 빌드됩니다.

`VITE_KAKAO_MAP_KEY`를 설정한 뒤에는 카카오 디벨로퍼스 콘솔(내 애플리케이션 → 앱 설정 → 플랫폼)에 **실제 배포 도메인**(예: `https://kyg-home.vercel.app`, 커스텀 도메인을 쓰면 그것도 추가)을 Web 플랫폼으로 등록해야 합니다. 등록하지 않으면 `domain mismatched` 에러가 나며 지도가 뜨지 않습니다.

`/api/stocks`, `/api/translate`, `/api/news`는 외부 API(네이버 시세, MyMemory 번역, 스포츠 RSS)를 서버에서 그대로 호출하는 구조라 별도 환경변수가 필요 없습니다.

## Blob 스토어 설정

1. 프로젝트 → **Storage** 탭 → **Create Database** → **Blob** 선택
2. 만든 스토어를 프로젝트에 연결(Connect Project)하면 `BLOB_READ_WRITE_TOKEN`이 자동으로 환경변수에 등록됨
3. 이 프로젝트의 스토어는 **private**로 설정되어 있음 — 그래서 첨부파일은 URL로 바로 접근할 수 없고, 항상 `/api/attachments/:id` 프록시를 거쳐야 합니다 (자세한 흐름은 [architecture.md](./architecture.md)의 "첨부파일 흐름" 참고)
4. 로컬에서도 첨부파일을 테스트하려면 스토어 페이지의 `.env.local` 탭에서 토큰 값을 복사해 로컬 `.env`에도 추가해야 합니다

## DB 마이그레이션

스키마 변경은 자동 배포 파이프라인에 포함되어 있지 않습니다. `schema.sql`을 고친 뒤 수동으로 한 번 적용해야 합니다.

```bash
node --env-file=.env scripts/_apply-schema.mjs
```

로컬 `.env`의 `DATABASE_URL`이 프로덕션과 같은 Neon DB를 가리키고 있다면, 이 명령이 곧 프로덕션 DB에 스키마를 반영하는 것입니다.

## 배포 후 확인 체크리스트

- `GET /` → 200 (프론트 정적 파일)
- `GET /api/posts` → 로그인 없이 401, 로그인 쿠키와 함께면 200
- 새 글 작성 후 `/board/:id`에서 정상 조회되는지
- 첨부파일이 있는 글이라면 이미지 미리보기 / 파일 다운로드가 되는지
- `/map` → 지도가 실제로 뜨는지 (안 뜨면 `VITE_KAKAO_MAP_KEY` 미설정 또는 배포 도메인 미등록 확인)
- `/stock` → 4개 종목 시세가 나오는지
- `/translate` → 텍스트 입력 후 번역 결과가 나오는지
- `/news` → 스포츠 기사 목록이 나오고, 제목 클릭 시 새 탭에서 원문이 열리는지
