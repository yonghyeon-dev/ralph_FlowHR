# Ralph Loop Prompt

> 이 파일은 Ralph Loop 반복 시 Claude에게 전달되는 프롬프트입니다.
> 규칙은 `~/.claude/rules/wi-*.md`와 `.claude/rules/project.md`를 따릅니다.

## 반복 절차

1. **fix_plan.md 읽기**: 미완료 WI 중 첫 번째를 선택
2. **구현**: AGENT.md의 명령으로 lint → build → test 검증
3. **커밋**: `WI-[type] 한글 작업명` 형식
4. **fix_plan.md 업데이트**: 완료한 WI를 `[x]`로 변경
5. **상태 출력**: RALPH_STATUS 블록 출력
6. **반복 또는 종료**: 미완료 WI가 있으면 1로, 없으면 EXIT_SIGNAL: true
