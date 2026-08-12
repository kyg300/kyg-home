# 로컬 개발

## 필요한 환경변수 (`.env`)

`.env.example`을 복사해서 `.env`를 만들고 값을 채웁니다. `.env`는 `.gitignore`에 포함되어 커밋되지 않습니다.

```
DATABASE_URL=postgres://user:password@host/dbname?sslmode=require
JWT_SECRET=replace-with-a-long-random-secret
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxx
```

- `DATABASE_URL`, `JWT_SECRET`이 없으면 API 함수가 모듈 로드 시점에 즉시 에러를 던집니다.
- `BLOB_READ_WRITE_TOKEN`은 Vercel 프로젝트의 Blob 스토어(Storage 탭)에서 발급됩니다. 없으면 첨부파일 관련 기능만 실패하고 나머지는 정상 동작합니다.

## 서버 두 개를 같이 띄우기

이 프로젝트는 프론트(Vite)와 API(Vercel 함수)를 각각 다른 프로세스로 로컬 실행합니다.

```bash
npm run dev       # Vite dev 서버 (기본 5173 포트)
npm run dev:api   # api/*.ts를 실행하는 로컬 Node 서버 (기본 3001 포트)
```

Vite 설정(`vite.config.ts`)에서 `/api` 요청을 `dev:api` 서버(`localhost:3001`)로 프록시하므로, 브라우저에서는 그냥 `http://localhost:5173`만 열면 됩니다.

`API_DEV_PORT` 환경변수로 `dev:api`의 포트를 바꿀 수 있습니다 (여러 인스턴스를 동시에 띄워 테스트할 때 유용).

## 왜 `scripts/dev-api-server.mjs`가 따로 있나

Vercel 서버리스 함수(`api/*.ts`)는 원래 `vercel dev`로 실행하는 게 기본이지만, 이 프로젝트는 별도 계정 인증 없이 로컬에서 빠르게 돌리기 위해 `dev-api-server.mjs`라는 아주 작은 라우터를 직접 구현해서 씁니다. Node의 http 서버로 요청을 받아 `api/` 폴더의 핸들러를 그대로 `import()`해서 호출하는 방식입니다.

### `.js` import와 `ts-extension-loader.mjs`

`api/` 폴더의 TypeScript는 Vercel이 실제로 사용하는 `moduleResolution: nodenext` 규칙을 따르기 때문에, 상대 경로 import는 컴파일 결과물 기준으로 **`.js` 확장자**를 붙여야 합니다 (예: `import { sql } from '../_lib/db.js'`, 실제 파일은 `db.ts`). Node의 네이티브 ESM 로더는 이 "`.js`라고 썼지만 실제로는 `.ts`" 매핑을 모르기 때문에, `dev-api-server.mjs`가 시작할 때 `ts-extension-loader.mjs`라는 모듈 훅을 등록해서 `.js` import가 실패하면 `.ts`로 재시도하도록 만들어뒀습니다. **api 폴더의 소스 코드 자체는 항상 `.js` 확장자로 import를 써야 하고, 확장자 없이 쓰거나 `.ts`로 쓰면 로컬은 몰라도 Vercel 빌드가 깨집니다.**

## DB 스키마 적용

```bash
node --env-file=.env scripts/_apply-schema.mjs
```

`schema.sql`을 그대로 실행합니다. 전부 `create table if not exists` / `create index if not exists`라 여러 번 실행해도 안전합니다. 스키마를 바꿀 때는 `schema.sql`을 수정하고 이 명령을 다시 실행하면 됩니다.

## 첨부파일을 로컬에서 테스트할 때 주의할 점

- 업로드는 `@vercel/blob/client`의 `upload()`가 브라우저(또는 Node의 `fetch`/`File`)에서 직접 Blob 스토리지로 보내는 방식이라, `dev:api` 서버는 업로드 **토큰 발급**만 담당합니다. 즉 `BLOB_READ_WRITE_TOKEN`이 로컬 `.env`에 있으면 실제 프로덕션과 동일한 Blob 스토어에 업로드됩니다 (별도 로컬 스토리지가 없습니다) — 테스트 파일을 많이 올리면 실제 스토어 용량을 씁니다.
- 스토어가 private이므로 업로드 시 클라이언트 코드는 반드시 `access: 'private'`로 호출해야 합니다 (`src/lib/api.ts`의 `uploadAttachment`).
- 다운로드/미리보기는 `/api/attachments/:id`를 거치므로 로그인 쿠키가 필요합니다.

## 타입체크 / 빌드

```bash
npm run typecheck:api   # api/ 폴더만 (tsconfig.api.json, nodenext 기준)
npx tsc -b               # 프론트엔드 (tsconfig.app.json / tsconfig.node.json)
npm run build             # tsc -b && vite build (Vercel이 실행하는 것과 동일한 프론트 빌드 명령)
npm run lint               # oxlint
```

## 그 밖의 점검용 스크립트

- `node --env-file=.env scripts/_db-check.mjs` — 가장 최근 게시글 1건을 출력해 DB 연결/한글 인코딩이 정상인지 빠르게 확인
