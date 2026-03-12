# Guardrails

> 프로젝트별 실패 방지 규칙입니다. Ralph Loop 실행 중 발견된 패턴이 누적됩니다.

## 규칙 목록
<!-- Ralph Loop 실행 중 자동으로 추가됨 -->
- main 브랜치에 직접 push 불가 (GitHub repo rule). fix_plan 업데이트도 반드시 PR 통해서 머지해야 함.
- squash merge 후 로컬 main이 diverge될 수 있음. `git reset --hard origin/main`으로 동기화 필요.
- create-next-app은 기존 파일이 있으면 실패함. 수동 설정 필요.
