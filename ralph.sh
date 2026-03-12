#!/bin/bash
# Ralph Loop - ralph_FlowHR
# Usage: bash ralph.sh

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export PYTHONUTF8=1
export PYTHONIOENCODING=utf-8

# Windows(Git Bash/MSYS2) 감지 시 UTF-8 코드페이지 설정
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "mingw"* ]]; then
  chcp.com 65001 > /dev/null 2>&1
fi

# 설정 로드
if [ -f .ralphrc ]; then
  source .ralphrc
fi

echo "🔄 Ralph Loop 시작 - $PROJECT_NAME ($PROJECT_TYPE)"
echo "fix_plan.md의 WI를 순서대로 처리합니다."
echo ""
echo "Claude에게 다음 프롬프트를 전달하세요:"
echo "---"
cat .ralph/PROMPT.md
echo "---"
