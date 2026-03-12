# FlowHR - Vision

## 목표
FlowHR 와이어프레임(28+ 스크린)을 프로덕션급 멀티테넌트 HR SaaS 플랫폼으로 구현

## 대상 사용자
- **Platform Operator**: SaaS 운영 (테넌트/빌링/모니터링)
- **Tenant Admin**: HR 관리자 (인사/근태/휴가/급여/성과/채용)
- **Tenant Employee**: 직원 셀프서비스 (출퇴근/신청/문서/프로필)

## 성공 기준
- 와이어프레임 28+ 스크린 전체 프로덕션 구현
- 멀티테넌트 데이터 격리
- 페이지 로드 < 2초, API 응답 < 500ms

## 기술 스택
- Next.js 14 (App Router) + TypeScript + PostgreSQL + Prisma + Tailwind CSS

## 아키텍처
```
경계 분리(Boundary) → 모듈화(Module) → 캡슐화(Encapsulation)
module/index.ts (Public API) + module/internal/ (Private)
```
