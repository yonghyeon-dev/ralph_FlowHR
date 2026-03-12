# L1: Auth (인증)

## 범위
멀티테넌트 인증, SSO, RBAC

## L2 모듈
- **DB 스키마**: Tenant, User, Role, Session
- **인증 플로우**: Email/Password + Google/Microsoft SSO, NextAuth
- **RBAC**: 역할 기반 라우트 가드 (middleware.ts)

## WI
- WI-005: Auth DB 스키마
- WI-006: 로그인 페이지 + NextAuth 설정
- WI-007: RBAC 미들웨어
