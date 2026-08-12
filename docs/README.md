# kyg-home 문서

개인 홈페이지 프로젝트 문서입니다. 목적에 따라 아래 문서를 참고하세요.

- [architecture.md](./architecture.md) — 기술 스택, 폴더 구조, DB 스키마, 인증/게시판/첨부파일 동작 방식
- [local-development.md](./local-development.md) — 로컬에서 프론트/API 서버 띄우는 방법, 환경변수, 알아두면 좋은 이슈들
- [deployment.md](./deployment.md) — Vercel 배포 설정, 환경변수, Blob 스토어 연결 방법

## 한눈에 보기

- **프론트엔드**: React + Vite (`src/`)
- **백엔드**: Vercel Serverless Functions (`api/`)
- **DB**: Neon Postgres (서버리스 HTTP 드라이버)
- **파일 저장소**: Vercel Blob (private 스토어)
- **배포**: Vercel, GitHub(`kyg300/kyg-home`) 연동 시 `main` 브랜치 push마다 자동 배포

## 현재 기능

- 회원가입 / 로그인 / 로그아웃 (JWT 쿠키 기반)
- 게시판 글쓰기 / 목록 / 상세 / 수정 / 삭제 (본인 글만 수정·삭제 가능)
- **로그인하지 않으면 게시글을 볼 수 없음** (목록·상세 API 모두 인증 필요)
- 홈 화면: 검색바 + 바로가기 + 로그인 시 최근 게시글 카드
- 게시판 검색 (`/board?q=검색어`, 제목·내용 클라이언트 필터)
- 게시글 첨부파일: 이미지/문서 최대 5개, 개당 10MB, 업로드·미리보기·다운로드·삭제
