# FlowHR PRD

## 프로젝트 개요
- **이름**: FlowHR
- **목표**: FlowHR 와이어프레임(28+ 스크린)을 프로덕션급 멀티테넌트 HR SaaS 플랫폼으로 구현
- **대상 사용자**: Platform Operator (SaaS 운영), Tenant Admin (HR 관리자), Tenant Employee (직원)
- **성공 기준**: 와이어프레임의 모든 스크린이 실제 데이터로 동작하는 프로덕션 수준 구현

## 기술 스택
- **언어**: TypeScript (strict mode)
- **프레임워크**: Next.js 14+ (App Router)
- **DB**: PostgreSQL + Prisma ORM
- **인증**: NextAuth.js (Email/Password + Google/Microsoft SSO)
- **스타일링**: Tailwind CSS (와이어프레임 디자인 토큰 기반)
- **테스트**: Vitest (유닛) + Playwright (E2E)
- **인프라**: Vercel
- **기타**: Zod (검증), React Hook Form, Recharts (차트), date-fns

## 아키텍처 원칙

### Architecture Flow
```
경계 분리(Boundary) → 모듈화(Module) → 캡슐화(Encapsulation)
```

### 모듈 구조
```
src/modules/{domain}/
  index.ts          # Public API (외부 노출)
  internal/         # Private (외부 import 금지)
    components/     # 도메인 전용 컴포넌트
    hooks/          # 도메인 전용 훅
    services/       # API 호출, 비즈니스 로직
    types.ts        # 도메인 타입
    constants.ts    # 도메인 상수
```

### 프로젝트 구조
```
src/
  app/                        # Next.js App Router
    (public)/                 # 공개 페이지
      login/
      landing/
    (admin)/                  # Tenant Admin 포탈
      admin/
        home/
        people/
        attendance/
        leave/
        workflow/
        documents/
        payroll/
        performance/
        recruiting/
        reports/
        settings/
    (employee)/               # Tenant Employee 포탈
      employee/
        home/
        schedule/
        requests/
        inbox/
        documents/
        profile/
    (platform)/               # Platform Console
      platform/
        console/
    api/                      # API Routes
  modules/                    # 도메인 모듈 (경계 분리)
    shared/                   # 공통 (디자인시스템, 레이아웃)
    auth/                     # 인증/권한
    people/                   # 인사관리
    attendance/               # 근태관리
    leave/                    # 휴가관리
    workflow/                 # 결재
    documents/                # 문서
    payroll/                  # 급여
    performance/              # 성과
    recruiting/               # 채용
    reports/                  # 리포트
    settings/                 # 설정
    employee/                 # 직원 셀프서비스
    platform/                 # 플랫폼 운영
  lib/                        # 유틸리티
  prisma/                     # DB 스키마
```

### 코드 품질 규칙
- **컴포넌트 재사용**: 같은 UI/로직 2회 이상 → 컴포넌트 분리, `shared/` 배치
- **하드코딩 금지**: 문자열/숫자/URL → `constants/` 또는 환경변수
- **UTF-8**: 모든 파일 UTF-8 (BOM 없음), `<meta charset="UTF-8">` 필수

---

## Phase 1: Foundation (기반)

### L1: Shared (공통)

#### L2: 프로젝트 초기 설정

##### L3: Next.js + TypeScript + Prisma 셋업
프로젝트 빌드 환경, 린터, 포매터, DB 연결 설정

###### 태스크 (L4)
1. **WI-001 Next.js 프로젝트 초기화**
   - Next.js 14 App Router + TypeScript strict + ESLint + Prettier 설정
   - Prisma 초기 설정 + PostgreSQL 연결
   - Tailwind CSS 설정 + 디자인 토큰 변수 정의
   - 수용 기준: `npm run lint && npm run build` 성공

#### L2: 디자인 시스템

##### L3: 디자인 토큰 및 기본 컴포넌트
와이어프레임의 design-system.css를 Tailwind 기반으로 이식

###### 태스크 (L4)
2. **WI-002 디자인 토큰 + 기본 UI 컴포넌트**
   - 컬러 토큰 (brand-primary teal, status colors, surfaces)
   - Typography 스케일 (text-xs ~ text-3xl)
   - Spacing 시스템 (sp-1 ~ sp-12)
   - Button, Badge, Card, Input, Select, Textarea 컴포넌트
   - 수용 기준: Storybook 또는 테스트 페이지에서 전 컴포넌트 렌더링 확인

3. **WI-003 데이터 디스플레이 컴포넌트**
   - DataTable (정렬, 페이지네이션, 필터)
   - KPICard (아이콘, 값, 변화율, 트렌드)
   - QueueList (우선순위 표시, 액션 버튼)
   - Chart 래퍼 (BarChart, LineChart - Recharts 기반)
   - StatusBadge, ProgressBar, Avatar
   - 수용 기준: 12+ 데이터 테이블, 40+ KPI 카드에 재사용 가능

#### L2: 레이아웃

##### L3: 앱 셸 (Header, Sidebar, Main)
3개 포탈(Admin, Employee, Platform) 공통 레이아웃

###### 태스크 (L4)
4. **WI-004 앱 셸 레이아웃**
   - AppShell: Header (로고, 검색 Ctrl+K, 알림, 도움말, 아바타) + Sidebar + Main
   - AdminSidebar: 11개 네비게이션 (Main/Talent/System 그룹)
   - EmployeeSidebar: 6개 네비게이션
   - PlatformSidebar: 7개 네비게이션
   - 반응형: 모바일 바텀 탭 바 (Employee)
   - Drawer, Modal, Toast 공통 컴포넌트
   - 수용 기준: 3개 포탈 레이아웃 전환, 모바일 반응형

---

## Phase 2: Auth & Multi-tenant (인증)

### L1: Auth (인증)

#### L2: DB 스키마

##### L3: 멀티테넌트 인증 모델
테넌트 격리, 사용자, 역할, 세션 모델

###### 태스크 (L4)
5. **WI-005 Auth DB 스키마**
   - Tenant (id, name, plan, status, settings)
   - User (id, tenantId, email, name, role, status)
   - Role (id, name, permissions JSONB)
   - Session, Account (NextAuth 호환)
   - 시드 데이터: 데모용 테넌트 + 3개 역할 사용자
   - 수용 기준: `prisma migrate dev` + `prisma db seed` 성공

#### L2: 인증 플로우

##### L3: 로그인 + SSO
이메일/비밀번호 로그인, Google/Microsoft SSO

###### 태스크 (L4)
6. **WI-006 로그인 페이지 + NextAuth 설정**
   - 로그인 UI (와이어프레임: 좌측 브랜드 패널 + 우측 폼)
   - NextAuth 설정 (Credentials + Google + Microsoft)
   - 데모 퀵 액세스 (Platform Operator / Admin / Employee 역할 전환)
   - 수용 기준: 3개 역할로 로그인 → 각 포탈 리다이렉트

7. **WI-007 RBAC 미들웨어**
   - 역할 기반 라우트 가드 (middleware.ts)
   - Platform: /platform/* → Operator 권한
   - Admin: /admin/* → Admin/HR Manager 권한
   - Employee: /employee/* → Employee 권한
   - 수용 기준: 권한 없는 접근 시 403 또는 리다이렉트

---

## Phase 3: People (인사관리)

### L1: People (인사)

#### L2: DB 스키마

##### L3: 인사 데이터 모델

###### 태스크 (L4)
8. **WI-008 People DB 스키마**
   - Employee (개인정보, 연락처, 고용정보, 직급, 부서)
   - Department (id, name, parentId, headId)
   - Position (id, name, grade)
   - EmployeeChange (인사 변동 이력)
   - 수용 기준: 마이그레이션 + 시드 데이터 (6명 이상)

#### L2: 직원 디렉토리

##### L3: 목록 + 필터 + 검색 (TA-101~102)

###### 태스크 (L4)
9. **WI-009 직원 디렉토리**
   - API: GET /api/people (검색, 상태 필터, 페이지네이션)
   - UI: 검색바 + 상태 칩 (전체/재직/퇴사예정/휴직)
   - DataTable: 이름, 부서, 직급, 상태, 시그널
   - 수용 기준: 필터 + 검색 + 페이지네이션 동작

#### L2: 직원 상세

##### L3: 프로필 드로어 (TA-103)

###### 태스크 (L4)
10. **WI-010 직원 상세 드로어**
    - 프로필 카드 (사진, 기본정보, 고용정보)
    - 최근 시그널 (야간근무 경고, 주간 근무시간 알림)
    - 관련 액션 버튼 (편집, 휴가, 근태, 문서)
    - 수용 기준: 디렉토리에서 행 클릭 → 드로어 오픈

#### L2: 조직도

##### L3: 트리 구조 (TA-104)

###### 태스크 (L4)
11. **WI-011 조직도**
    - API: GET /api/people/org-chart
    - 트리 구조: CEO → 부서별 인원수
    - 부서 클릭 시 구성원 목록
    - 수용 기준: 4개 부서 트리 렌더링

#### L2: 인사 변동

##### L3: 타임라인 (TA-105)

###### 태스크 (L4)
12. **WI-012 인사 변동 타임라인**
    - API: GET /api/people/changes
    - 타임라인 UI: 신규입사, 부서이동, 퇴사, 승진
    - 수용 기준: 5건 이상 이력 표시

---

## Phase 4: Attendance (근태관리)

### L1: Attendance (근태)

#### L2: DB 스키마

##### L3: 근태 데이터 모델

###### 태스크 (L4)
13. **WI-013 Attendance DB 스키마**
    - AttendanceRecord (userId, date, checkIn, checkOut, status)
    - Shift (id, name, startTime, endTime, type)
    - ShiftAssignment (userId, shiftId, date)
    - AttendanceException (type, status, resolvedAt)
    - AttendanceClosing (period, status, checklist)
    - 수용 기준: 마이그레이션 + 시드 데이터

#### L2: 대시보드

##### L3: KPI + 부서별 현황 (TA-201)

###### 태스크 (L4)
14. **WI-014 근태 대시보드**
    - API: GET /api/attendance/dashboard
    - 4 KPI 카드 (출근율, 재근무, 미출근, 예외건수)
    - 부서별 출근율 바 차트 + 주간 요약
    - 5개 탭 네비게이션 (대시보드/교대/기록/예외/마감)
    - 수용 기준: KPI 실시간 데이터 + 차트 렌더링

#### L2: 교대 보드

##### L3: 주간 교대표 (TA-202)

###### 태스크 (L4)
15. **WI-015 교대 보드**
    - API: GET /api/attendance/shifts (주간 단위)
    - 주간 테이블: 팀/사람별 교대 유형 뱃지
    - 교대 유형 관리 (주간, 야간, 유연)
    - 수용 기준: 주간 교대표 렌더링 + 교대 유형 뱃지

#### L2: 출결 기록

##### L3: 기록 테이블 (TA-203)

###### 태스크 (L4)
16. **WI-016 출결 기록 테이블**
    - API: GET /api/attendance/records (필터, 정렬, 페이지네이션)
    - DataTable: 이름, 날짜, 출근, 퇴근, 총시간, 상태
    - 상태 뱃지 (정상, 지각, 조퇴, 결근)
    - 수용 기준: 페이지네이션 + 상태 필터

#### L2: 예외 처리

##### L3: 예외 유형별 관리 (TA-204)

###### 태스크 (L4)
17. **WI-017 근태 예외 처리**
    - API: GET/PATCH /api/attendance/exceptions
    - 4개 예외 카드 (지각, 퇴근누락, 초과근무, 휴게위반)
    - 예외 상세 + 처리 액션 (승인, 반려, 보류)
    - 수용 기준: 예외 건수 표시 + 처리 플로우

#### L2: 마감

##### L3: 마감 체크리스트 (TA-205)

###### 태스크 (L4)
18. **WI-018 근태 마감**
    - API: GET/PATCH /api/attendance/closing
    - 체크리스트: 4개 마감 항목 (완료/대기/미처리)
    - 마감 상태 진행률
    - 수용 기준: 체크리스트 항목별 상태 변경

---

## Phase 5: Leave (휴가관리)

### L1: Leave (휴가)

#### L2: DB 스키마

##### L3: 휴가 데이터 모델

###### 태스크 (L4)
19. **WI-019 Leave DB 스키마**
    - LeavePolicy (type, annualDays, carryOver, paid)
    - LeaveBalance (userId, year, total, used, remaining)
    - LeaveRequest (userId, type, startDate, endDate, status, approverId)
    - 수용 기준: 마이그레이션 + 5개 휴가 유형 시드

#### L2: 대시보드

##### L3: KPI + 현황 (TA-301)

###### 태스크 (L4)
20. **WI-020 휴가 대시보드**
    - API: GET /api/leave/dashboard
    - 4 KPI 카드 (금일 부재 18, 대기 7, 평균 잔여 8.2, 이달 사용 142)
    - 수용 기준: KPI 실데이터 렌더링

#### L2: 캘린더

##### L3: 월간 캘린더 + 부재 목록 (TA-302)

###### 태스크 (L4)
21. **WI-021 휴가 캘린더**
    - API: GET /api/leave/calendar (월간)
    - 미니 캘린더: 휴가 하이라이팅
    - 오늘의 부재자 목록 (4건)
    - 수용 기준: 월간 캘린더 + 날짜 클릭 시 부재자 표시

#### L2: 정책 관리

##### L3: 휴가 유형별 정책 (TA-303)

###### 태스크 (L4)
22. **WI-022 휴가 정책 관리**
    - API: GET/PUT /api/leave/policies
    - 정책 테이블: 유형, 부여규칙, 연간일수, 이월, 유무급
    - 5개 유형 (연차/반차/병가/경조사/대체)
    - 수용 기준: 정책 조회 + 수정

#### L2: 신청 큐

##### L3: 승인/반려 처리 (TA-304)

###### 태스크 (L4)
23. **WI-023 휴가 신청 큐**
    - API: GET/PATCH /api/leave/requests
    - 신청 큐: 7건 표시 (승인 대기/완료/반려)
    - 승인/반려 버튼 + 사유 입력
    - 수용 기준: 승인/반려 플로우 동작

---

## Phase 6: Workflow (결재)

### L1: Workflow (결재)

#### L2: DB 스키마

##### L3: 결재 데이터 모델

###### 태스크 (L4)
24. **WI-024 Workflow DB 스키마**
    - Workflow (id, name, steps, trigger, conditions)
    - ApprovalRequest (id, workflowId, requesterId, status, data)
    - ApprovalStep (requestId, stepOrder, approverId, status, comment)
    - 수용 기준: 마이그레이션 + 기본 결재 라인 시드

#### L2: 결재 대시보드

##### L3: KPI + 수신함 + 처리 통계 (TA-401)

###### 태스크 (L4)
25. **WI-025 결재 대시보드**
    - API: GET /api/workflow/dashboard
    - 4 KPI (대기 17, SLA 초과 3, 에스컬레이션 4, 주간 완료 28)
    - 승인 수신함: 5건 대기 (우선순위 표시)
    - 처리 통계: 평균 처리시간, 금일 처리, 자동승인, 반려율
    - 수용 기준: KPI + 수신함 + 통계 렌더링

#### L2: 결재 상세

##### L3: 요청 상세 + 결재 체인 (TA-402)

###### 태스크 (L4)
26. **WI-026 결재 상세 드로어**
    - 요청 상세: 요청자, 유형, 내용, 첨부
    - 4단계 결재 체인: 요청 → 팀장 → HR → 최종
    - 승인/반려/에스컬레이션 액션
    - 수용 기준: 결재 체인 시각화 + 액션 동작

#### L2: 워크플로우 빌더

##### L3: 단계별 플로우 설계 (TA-403)

###### 태스크 (L4)
27. **WI-027 워크플로우 빌더**
    - 5단계 비주얼 워크플로우 (트리거 → 조건분기 → 1차 → 2차 → 알림)
    - 조건 설정 UI (금액, 유형, 부서별 분기)
    - 워크플로우 저장/수정/삭제
    - 수용 기준: 워크플로우 생성 → 저장 → 조건 분기 동작

#### L2: 결재 이력

##### L3: 완료된 결재 기록 (TA-404)

###### 태스크 (L4)
28. **WI-028 결재 이력**
    - API: GET /api/workflow/history
    - DataTable: 요청, 요청자, 유형, 신청일, 완료일, 결과, 처리시간
    - 필터: 유형, 기간, 결과
    - 수용 기준: 이력 조회 + 필터 + 페이지네이션

---

## Phase 7: Documents (문서)

### L1: Documents (문서)

#### L2: DB 스키마

##### L3: 문서 데이터 모델

###### 태스크 (L4)
29. **WI-029 Documents DB 스키마**
    - DocumentTemplate (id, name, content, version, usageCount)
    - Document (id, templateId, recipientId, senderId, status, deadline)
    - Signature (documentId, userId, signedAt, signatureData)
    - 수용 기준: 마이그레이션 + 4개 템플릿 시드

#### L2: 문서 대시보드

##### L3: KPI + 현황 (TA-501)

###### 태스크 (L4)
30. **WI-030 문서 대시보드**
    - 4 KPI (발송 156, 완료 132, 대기 12, 만료임박 5)
    - 수용 기준: KPI 실데이터

#### L2: 템플릿 관리

##### L3: 템플릿 카드 + CRUD (TA-502)

###### 태스크 (L4)
31. **WI-031 템플릿 매니저**
    - API: CRUD /api/documents/templates
    - 4개 템플릿 카드 (근로계약서, 연봉변경, NDA, 퇴사확인서)
    - 사용 횟수, 버전 표시
    - 수용 기준: 템플릿 CRUD

#### L2: 문서 발송

##### L3: 발송 폼 + 미리보기 (TA-503)

###### 태스크 (L4)
32. **WI-032 문서 발송 폼**
    - 2컬럼: 좌측 (수신자, 템플릿, 기한) + 우측 (미리보기)
    - 알림 토글
    - 수용 기준: 수신자 선택 → 템플릿 선택 → 미리보기 → 발송

#### L2: 문서 보관함

##### L3: 서명 완료 문서 목록 (TA-504)

###### 태스크 (L4)
33. **WI-033 문서 보관함**
    - API: GET /api/documents/vault
    - DataTable: 문서명, 수신자, 유형, 발송일, 서명일, 상태
    - 다운로드/재발송 액션
    - 수용 기준: 문서 목록 + 다운로드

---

## Phase 8: Payroll (급여)

### L1: Payroll (급여)

#### L2: DB 스키마

##### L3: 급여 데이터 모델

###### 태스크 (L4)
34. **WI-034 Payroll DB 스키마**
    - PayrollRule (type, name, formula, rate)
    - PayrollRun (period, status, totalAmount)
    - Payslip (userId, runId, base, allowance, deduction, net)
    - 수용 기준: 마이그레이션 + 6개 급여 규칙 시드

#### L2: 대시보드

##### L3: KPI + 현황 (TA-601)

###### 태스크 (L4)
35. **WI-035 급여 대시보드**
    - 4 KPI (월총액 ₩847.2M, 대상 1,240명, 미확인 3건, 마감 2/5)
    - 수용 기준: KPI 렌더링

#### L2: 급여 규칙

##### L3: 규칙 테이블 (TA-602)

###### 태스크 (L4)
36. **WI-036 급여 규칙 관리**
    - API: GET/PUT /api/payroll/rules
    - 규칙 테이블: 기본급, 초과수당, 야간수당, 연금, 건보, 소득세
    - 수용 기준: 규칙 조회 + 수정

#### L2: 마감 플로우

##### L3: 5단계 마감 프로세스 (TA-603)

###### 태스크 (L4)
37. **WI-037 급여 마감 플로우**
    - 5단계 프로세스 (데이터수집 → 변경확인 → 계산 → 검토 → 확정)
    - 체크리스트 큐
    - 수용 기준: 단계별 진행 + 상태 전환

#### L2: 명세서

##### L3: 급여 명세서 센터 (TA-604)

###### 태스크 (L4)
38. **WI-038 급여 명세서 센터**
    - API: GET /api/payroll/payslips
    - 월 선택 드롭다운
    - DataTable: 이름, 부서, 기본급, 수당, 공제, 실수령
    - 수용 기준: 월별 명세서 조회

---

## Phase 9: Performance (성과)

### L1: Performance (성과)

#### L2: DB 스키마

##### L3: 성과 데이터 모델

###### 태스크 (L4)
39. **WI-039 Performance DB 스키마**
    - Goal (userId, cycleId, title, progress, status)
    - EvalCycle (name, period, type, weights)
    - Evaluation (userId, cycleId, selfScore, peerScore, managerScore)
    - OneOnOne (managerId, employeeId, scheduledAt, agenda, notes)
    - 수용 기준: 마이그레이션 + 시드

#### L2: 목표 대시보드

##### L3: KPI + 부서별 달성률 (TA-701)

###### 태스크 (L4)
40. **WI-040 목표 대시보드**
    - 4 KPI (목표설정 82%, 진행중 45, 1:1 예정 12, 미설정 215)
    - 부서별 목표 달성률 바 차트
    - 활성 사이클 카드 (2026 H1)
    - 수용 기준: KPI + 차트 렌더링

#### L2: 평가 설정

##### L3: 사이클 + 가중치 (TA-702)

###### 태스크 (L4)
41. **WI-041 평가 설정**
    - 사이클 설정 폼 (이름, 기간, 유형)
    - 가중치 바 차트 (성과 40%, 역량 30%, 협업 20%, 리더십 10%)
    - 수용 기준: 사이클 생성 + 가중치 설정

#### L2: 진행 현황

##### L3: 평가 진행 테이블 (TA-703)

###### 태스크 (L4)
42. **WI-042 평가 진행 현황**
    - DataTable: 이름, 부서, 자기평가, 동료평가, 상사평가, 상태
    - 수용 기준: 5명 이상 진행현황 표시

#### L2: 1:1 허브

##### L3: 일정 + 안건 (TA-704)

###### 태스크 (L4)
43. **WI-043 1:1 허브**
    - API: GET /api/performance/one-on-ones
    - 예정된 1:1 목록 (날짜, 시간, 참석자)
    - 안건 미리보기
    - 수용 기준: 1:1 목록 + 안건 표시

---

## Phase 10: Recruiting (채용)

### L1: Recruiting (채용)

#### L2: DB 스키마

##### L3: 채용 데이터 모델

###### 태스크 (L4)
44. **WI-044 Recruiting DB 스키마**
    - JobPosting (title, department, status, deadline)
    - Application (postingId, candidateName, stage, appliedAt)
    - OnboardingTask (employeeId, task, status, dueDate)
    - OffboardingTask (employeeId, task, status, dueDate)
    - 수용 기준: 마이그레이션 + 시드

#### L2: 대시보드

##### L3: KPI (TA-801)

###### 태스크 (L4)
45. **WI-045 채용 대시보드**
    - 4 KPI (공고 8, 지원 47, 면접예정 12, 평균채용기간 28일)
    - 수용 기준: KPI 렌더링

#### L2: 채용 공고

##### L3: 공고 관리 테이블 (TA-802)

###### 태스크 (L4)
46. **WI-046 채용 공고 관리**
    - API: CRUD /api/recruiting/postings
    - DataTable: 포지션, 부서, 상태, 지원자수, 마감일
    - 수용 기준: 공고 CRUD + 테이블

#### L2: 파이프라인

##### L3: 칸반 보드 (TA-803)

###### 태스크 (L4)
47. **WI-047 채용 파이프라인**
    - 4컬럼 칸반: 지원(6) → 1차(4) → 2차(2) → 최종(2)
    - 후보자 카드 드래그 앤 드롭
    - 수용 기준: 칸반 렌더링 + 단계 이동

#### L2: 온보딩

##### L3: 입사자 온보딩 체크리스트 (TA-804)

###### 태스크 (L4)
48. **WI-048 온보딩 관리**
    - 온보딩 카드: 진행률 + 태스크 체크리스트
    - 수용 기준: 체크리스트 항목별 완료 처리

#### L2: 오프보딩

##### L3: 퇴사자 오프보딩 (TA-805)

###### 태스크 (L4)
49. **WI-049 오프보딩 관리**
    - 오프보딩 체크리스트 (퇴사확인, 인수인계, 장비반납, 계정비활성화 등)
    - 수용 기준: 6개 태스크 체크리스트

---

## Phase 11: Reports (리포트)

### L1: Reports (리포트)

#### L2: 리포트 센터

##### L3: 리포트 카드 그리드 (TA-901)

###### 태스크 (L4)
50. **WI-050 리포트 센터**
    - 7개 리포트 카드 (인사, 근태, 휴가, 이직률, 급여, 채용, 커스텀)
    - 수용 기준: 카드 클릭 → 해당 리포트 이동

#### L2: 인사이트

##### L3: 인사 + 근태 분석 (TA-902~903)

###### 태스크 (L4)
51. **WI-051 인사 인사이트**
    - 부서별 분포 바 차트 + 근속 분포
    - 평균 근속 3.2년, 최장 14년 통계
    - 수용 기준: 차트 + 통계 렌더링

52. **WI-052 근태 인사이트**
    - 주간 출근 추이 바 차트 (W5-W12)
    - 예외 요약 (6개 항목)
    - 수용 기준: 차트 + 요약 렌더링

#### L2: 예약 리포트

##### L3: 스케줄 리포트 (TA-904)

###### 태스크 (L4)
53. **WI-053 예약 리포트**
    - DataTable: 5개 예약 리포트 (주간근태, 월간인원, 급여, 분기이직률, 채용)
    - 예약 생성/수정/삭제
    - 수용 기준: 예약 CRUD

---

## Phase 12: Settings (설정)

### L1: Settings (설정)

#### L2: 회사 정보

##### L3: 기본 설정 폼 (TA-1001)

###### 태스크 (L4)
54. **WI-054 회사 정보 설정**
    - 2컬럼 폼: 좌측 (회사명, 사업자번호, 업종, 대표) + 우측 (회계연도, 시간대, 근무시간, 로고)
    - 수용 기준: 설정 조회 + 저장

#### L2: 역할 관리

##### L3: 역할 테이블 (TA-1002)

###### 태스크 (L4)
55. **WI-055 역할 관리**
    - DataTable: 6개 역할 (Super Admin 2, HR Manager 4, Payroll 3, 부서장 12, 팀장 28, 일반 1191)
    - 역할 생성/수정
    - 수용 기준: 역할 CRUD

#### L2: 권한 매트릭스

##### L3: 역할×기능 권한 매트릭스 (TA-1003)

###### 태스크 (L4)
56. **WI-056 권한 매트릭스**
    - 매트릭스 UI: 6개 기능 × 6개 역할
    - 접근 수준: Full/Read/Dept/Team/Personal/None
    - 셀 클릭 → 권한 변경
    - 수용 기준: 매트릭스 렌더링 + 권한 변경

#### L2: 알림/연동

##### L3: 알림 규칙 + 외부 서비스 (TA-1004)

###### 태스크 (L4)
57. **WI-057 알림 규칙 + 외부 연동**
    - 알림 규칙: 6개 이벤트별 채널 토글
    - 외부 연동: 3개 서비스 카드 (Slack, Google Workspace, Jira)
    - 수용 기준: 알림 토글 + 연동 상태 표시

#### L2: 감사 로그

##### L3: 감사 로그 테이블 (TA-1005)

###### 태스크 (L4)
58. **WI-058 감사 로그**
    - API: GET /api/settings/audit-log
    - DataTable: 시간, 사용자, 역할, 행위, 대상, IP
    - 검색 + 내보내기
    - 수용 기준: 로그 조회 + 검색

---

## Phase 13: Admin Dashboard (관리자 홈)

### L1: Admin Home

#### L2: 대시보드

##### L3: KPI + 오늘 큐 + 스냅샷 (TA-001~002)

###### 태스크 (L4)
59. **WI-059 Admin 대시보드**
    - TA-001: 5 KPI (승인대기, 근태이상, 초과근무, 서명대기, 마감차단)
    - TA-001: 오늘 큐 (4건 우선순위 항목)
    - TA-001: 조직 스냅샷 (부서별 출근율 바 차트)
    - TA-002: 결재 퍼널 (Draft→Pending→Escalated→Complete)
    - TA-002: 예외 모니터, 문서 상태, 급여 상태
    - 수용 기준: 모든 섹션 실데이터 렌더링

---

## Phase 14: Employee Portal (직원 포탈)

### L1: Employee Portal (직원)

#### L2: 홈

##### L3: 데스크톱 + 모바일 (TE-001~002)

###### 태스크 (L4)
60. **WI-060 직원 홈**
    - 근무 상태 히어로 (출근시간, 잔여시간, 타이머)
    - 퀵 액션 (퇴근, 외근, 휴가신청, 정정)
    - 주간 미니 캘린더 + 오늘 할 일 + 요약 통계
    - 모바일: 바텀 탭 바 레이아웃
    - 수용 기준: 데스크톱 + 모바일 반응형

#### L2: 스케줄

##### L3: 출퇴근 + 주간 + 이력 (TE-101~103)

###### 태스크 (L4)
61. **WI-061 출퇴근 체크 + 주간 스케줄**
    - 출퇴근 패널: 현재 시간 + 출근/퇴근 버튼 + 오늘 상태
    - 주간 스케줄 테이블: 요일, 교대유형, 시작, 종료, 상태
    - 수용 기준: 출퇴근 기록 + 주간 표시

62. **WI-062 출결 이력**
    - DataTable: 최근 10건 (날짜, 출근, 퇴근, 시간, 상태)
    - 상태 뱃지 + 페이지네이션
    - 수용 기준: 이력 조회

#### L2: 신청

##### L3: 유형 + 폼 + 이력 (TE-201~205)

###### 태스크 (L4)
63. **WI-063 신청 유형 그리드 + 휴가 신청 폼**
    - 7개 유형 카드 (연차, 반차, 병가, 출근정정, 퇴근정정, 경비, 일반)
    - 3단계 휴가 폼 (유형선택 → 상세입력 → 확인)
    - 수용 기준: 유형 선택 → 폼 작성 → 제출

64. **WI-064 근태 정정 폼 + 신청 이력**
    - 정정 폼: 날짜, 유형, 원래시간, 수정시간, 사유, 증빙
    - 신청 이력 테이블: 6건 (유형, 내용, 신청일, 승인자, 상태)
    - 취소/재제출/상세 액션
    - 수용 기준: 정정 제출 + 이력 조회

#### L2: 수신함

##### L3: 알림 + 상세 (TE-301~302)

###### 태스크 (L4)
65. **WI-065 알림 수신함**
    - 5개 탭 (전체 8, 알림, 결재, 공지)
    - 8개 알림 (3개 미읽음 하이라이팅)
    - 상세 드로어: 타임라인 + 관련 액션
    - 수용 기준: 탭 필터 + 미읽음 표시 + 상세

#### L2: 문서

##### L3: 서명 + 뷰어 + 보관함 (TE-401~403)

###### 태스크 (L4)
66. **WI-066 직원 문서 (서명 + 뷰어 + 보관함)**
    - 서명 수신함: 3건 (우선순위별)
    - 문서 뷰어: PDF 미리보기 + 서명 패드 (Canvas)
    - 보관함: 7건 테이블 + PDF 다운로드
    - 수용 기준: 서명 플로우 (수신 → 보기 → 서명) + 보관함 조회

#### L2: 프로필

##### L3: 기본정보 + 휴가 + 성과 (TE-501~503)

###### 태스크 (L4)
67. **WI-067 직원 프로필**
    - 프로필 헤더: 아바타, 이름, 직급, 부서
    - 기본정보 + 연락처 카드
    - 휴가 잔여: 3 KPI + 유형별 내역
    - 성과: 목표 진행률 + 피드백 타임라인 + 다음 1:1
    - 수용 기준: 전체 프로필 렌더링

---

## Phase 15: Platform Console (플랫폼 운영)

### L1: Platform Console

#### L2: DB 스키마

##### L3: 플랫폼 데이터 모델

###### 태스크 (L4)
68. **WI-068 Platform DB 스키마**
    - Plan (name, price, seats, features)
    - BillingAccount (tenantId, paymentMethod, nextBillingDate)
    - Invoice (accountId, amount, status, issuedAt)
    - SupportTicket (tenantId, title, priority, status)
    - PlatformAuditLog (action, operatorId, target, ip)
    - 수용 기준: 마이그레이션 + 시드 (247 테넌트, 3 플랜)

#### L2: 대시보드

##### L3: 운영 현황 (PC-001)

###### 태스크 (L4)
69. **WI-069 플랫폼 대시보드**
    - 4 KPI (활성 테넌트 247, 유예 12, 결제실패 3, 지원이슈 8)
    - 운영 큐: 5건 (결제실패, SSO 오류, 업그레이드, 마이그레이션, API 쿼터)
    - 플랫폼 헬스: API 성공률, 웹훅, SSO, 데이터 동기화
    - 최근 테넌트 변경 타임라인 + 보안 시그널
    - 수용 기준: 전체 섹션 렌더링

#### L2: 테넌트 관리

##### L3: 목록 + 상세 (PC-101~104)

###### 태스크 (L4)
70. **WI-070 테넌트 관리**
    - 필터: 검색 + 상태 칩 (전체 259, 활성 247, 유예 12, 트라이얼 18, 정지 5)
    - DataTable: 회사명, 플랜, 좌석수, 상태, MRR, 최근활동
    - 상세 드로어: 기본정보, 플랜/사용량, 지원이력
    - 수용 기준: 테넌트 CRUD + 상세

#### L2: 빌링

##### L3: 플랜 + 결제 + 인보이스 (PC-201~205)

###### 태스크 (L4)
71. **WI-071 플랜 & 빌링**
    - 4 KPI (MRR ₩48.7M, ACV ₩584M, 미수금 ₩4.2M, 이탈률 1.8%)
    - 플랜 카탈로그: 3개 카드 (Starter, Growth, Enterprise)
    - 결제 계정 + 인보이스 테이블
    - 수용 기준: 빌링 조회 + 인보이스

#### L2: 서포트/모니터링/감사/설정

##### L3: 나머지 콘솔 섹션 (PC-401~702)

###### 태스크 (L4)
72. **WI-072 서포트 + 모니터링**
    - 서포트 티켓 큐 + SLA 추적
    - API 성능 메트릭 + 서비스 업타임
    - 수용 기준: 티켓 목록 + 모니터링 차트

73. **WI-073 감사/보안 + 플랫폼 설정**
    - 감사 로그 + 보안 이벤트 + 접근 로그
    - 피처 플래그, 시스템 설정, API 설정, 이메일 템플릿
    - 수용 기준: 감사 로그 + 설정 CRUD

---

## Phase 16: Landing (랜딩)

### L1: Public Pages

#### L2: 랜딩 페이지

##### L3: 마케팅 + 네비게이션

###### 태스크 (L4)
74. **WI-074 랜딩 페이지**
    - 히어로 + 6개 기능 카드 + 3개 역할 카드 + 푸터
    - CTA: "시작하기" → 로그인 이동
    - 수용 기준: 반응형 랜딩 렌더링

75. **WI-075 인덱스 네비게이션 허브**
    - 3개 권한 레이어 표시 + 전체 모듈 링크 그리드
    - 수용 기준: 모든 모듈 링크 동작

---

## Phase 17: Testing & Polish (테스트)

### L1: Quality Assurance

#### L2: 테스트

##### L3: E2E + 유닛 테스트

###### 태스크 (L4)
76. **WI-076 E2E 테스트**
    - Playwright: 로그인 → Admin 대시보드 → People → Attendance 핵심 플로우
    - 3개 역할별 접근 테스트
    - 수용 기준: 핵심 5개 플로우 E2E 통과

77. **WI-077 유닛 + API 테스트**
    - Vitest: 모듈별 핵심 비즈니스 로직 테스트
    - API Route 테스트 (CRUD 동작, 권한 검증)
    - 수용 기준: 커버리지 70% 이상

78. **WI-078 반응형 + 접근성 + i18n 기본 구조**
    - 모바일 반응형 최종 점검
    - 기본 접근성 (aria-label, 키보드 네비게이션)
    - i18n 구조 설정 (한국어 기본)
    - 수용 기준: 모바일 브레이크포인트 동작 + 키보드 접근

---

## 비기능 요구사항
- **멀티테넌트**: 테넌트 간 데이터 격리 (Row-Level Security 또는 tenantId 필터)
- **성능**: 페이지 로드 < 2초, API 응답 < 500ms
- **보안**: CSRF 방지, XSS 방지, SQL 인젝션 방지, HTTPS 필수
- **인코딩**: 모든 파일 UTF-8 (BOM 없음), `<meta charset="UTF-8">`
- **반응형**: 데스크톱 + 태블릿 + 모바일 (Employee 포탈)
- **접근성**: 기본 aria-label, 키보드 네비게이션

## 외부 연동
- **Google OAuth**: SSO 로그인
- **Microsoft OAuth**: SSO 로그인
- **Slack**: 알림 연동 (설정에서 토글)
- **Google Workspace**: 캘린더 연동
- **Jira**: 이슈 트래커 연동

## WI 요약

| Phase | 범위 | WI 수 |
|-------|------|-------|
| 1. Foundation | Shared, 디자인시스템, 레이아웃 | 4 |
| 2. Auth | 인증, RBAC | 3 |
| 3. People | 인사관리 | 5 |
| 4. Attendance | 근태관리 | 6 |
| 5. Leave | 휴가관리 | 5 |
| 6. Workflow | 결재 | 5 |
| 7. Documents | 문서 | 5 |
| 8. Payroll | 급여 | 5 |
| 9. Performance | 성과 | 5 |
| 10. Recruiting | 채용 | 6 |
| 11. Reports | 리포트 | 4 |
| 12. Settings | 설정 | 5 |
| 13. Admin Dashboard | 관리자 홈 | 1 |
| 14. Employee Portal | 직원 포탈 | 8 |
| 15. Platform Console | 플랫폼 운영 | 6 |
| 16. Landing | 랜딩 | 2 |
| 17. Testing | 테스트/폴리시 | 3 |
| **총계** | | **78** |
