# ralph_FlowHR - Project Rules

## 프로젝트 정보
- **이름**: ralph_FlowHR
- **타입**: TypeScript (Node.js)
- **규칙 상속**: 글로벌 규칙 (`~/.claude/rules/wi-*.md`) 자동 적용

## 프로젝트별 규칙
- TypeScript strict mode 사용
- ESLint + Prettier 코드 스타일 준수
- 모든 함수에 타입 명시 (no implicit any)
- import 경로는 상대경로 사용

## 빌드/테스트 명령
- lint: `npm run lint`
- build: `npm run build`
- test: `npm test`

## 디렉토리 구조
```
src/           → 소스 코드
dist/          → 빌드 출력
docs/          → 문서 계층구조 (L0~L4)
.ralph/        → Ralph Loop 설정
.github/       → CI/CD 워크플로우
```
