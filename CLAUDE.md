# ralph_FlowHR

## 프로젝트 정보
- **이름**: ralph_FlowHR
- **타입**: TypeScript (Node.js 20)
- **설명**: ralph_FlowHR 프로젝트

## 빌드/테스트
```bash
npm ci          # 의존성 설치
npm run lint    # 린트
npm run build   # 빌드
npm test        # 테스트
```

## 구조
```
src/              → 소스 코드
dist/             → 빌드 출력
docs/             → 문서 계층구조 (L0~L4)
.ralph/           → Ralph Loop 설정
.github/          → CI/CD 워크플로우
.claude/rules/    → 프로젝트 규칙
```

## 규칙
- 글로벌 규칙: `~/.claude/rules/wi-*.md` 자동 적용
- 프로젝트 규칙: `.claude/rules/project.md`
- 커밋: `WI-[type] 한글 작업명` 형식
- main 직접 push 금지 → PR 필수
