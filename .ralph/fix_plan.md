# Fix Plan (Work Items)

## Phase 1: Foundation (기반)

### L1: Shared > L2: 프로젝트 초기 설정 > L3: Next.js + TypeScript + Prisma 셋업
- [x] WI-001-feat Next.js 프로젝트 초기화 (TypeScript strict, ESLint, Prettier, Prisma, Tailwind) | L1:Shared > L2:초기설정 > L3:프로젝트셋업

### L1: Shared > L2: 디자인 시스템 > L3: 디자인 토큰 및 기본 컴포넌트
- [x] WI-002-feat 디자인 토큰 + 기본 UI 컴포넌트 (Button, Badge, Card, Input, Select, Textarea) | L1:Shared > L2:디자인시스템 > L3:기본컴포넌트
- [x] WI-003-feat 데이터 디스플레이 컴포넌트 (DataTable, KPICard, QueueList, Chart, StatusBadge, ProgressBar) | L1:Shared > L2:디자인시스템 > L3:데이터컴포넌트

### L1: Shared > L2: 레이아웃 > L3: 앱 셸
- [x] WI-004-feat 앱 셸 레이아웃 (Header, Sidebar 3종, Drawer, Modal, Toast, 반응형) | L1:Shared > L2:레이아웃 > L3:앱셸

## Phase 2: Auth & Multi-tenant (인증)

### L1: Auth > L2: DB 스키마 > L3: 멀티테넌트 인증 모델
- [x] WI-005-feat Auth DB 스키마 (Tenant, User, Role, Session + 시드 데이터) | L1:Auth > L2:DB > L3:인증모델

### L1: Auth > L2: 인증 플로우 > L3: 로그인 + SSO + RBAC
- [x] WI-006-feat 로그인 페이지 + NextAuth 설정 (Credentials, Google, Microsoft, 데모 퀵 액세스) | L1:Auth > L2:인증플로우 > L3:로그인
- [x] WI-007-feat RBAC 미들웨어 (역할 기반 라우트 가드) | L1:Auth > L2:인증플로우 > L3:RBAC

## Phase 3: People (인사관리)

### L1: People > L2: DB 스키마 > L3: 인사 데이터 모델
- [x] WI-008-feat People DB 스키마 (Employee, Department, Position, EmployeeChange + 시드) | L1:People > L2:DB > L3:인사모델

### L1: People > L2: 디렉토리 + 상세 + 조직도 + 이력
- [x] WI-009-feat 직원 디렉토리 (검색, 상태 필터, 페이지네이션) | L1:People > L2:디렉토리 > L3:목록필터
- [x] WI-010-feat 직원 상세 드로어 (프로필, 시그널, 액션) | L1:People > L2:상세 > L3:프로필드로어
- [x] WI-011-feat 조직도 (트리 구조, 부서별 인원수) | L1:People > L2:조직도 > L3:트리
- [x] WI-012-feat 인사 변동 타임라인 (입사, 이동, 퇴사, 승진) | L1:People > L2:변동 > L3:타임라인

## Phase 4: Attendance (근태관리)

### L1: Attendance > L2: DB 스키마 > L3: 근태 데이터 모델
- [x] WI-013-feat Attendance DB 스키마 (AttendanceRecord, Shift, ShiftAssignment, Exception, Closing + 시드) | L1:Attendance > L2:DB > L3:근태모델

### L1: Attendance > L2: 대시보드 + 교대 + 기록 + 예외 + 마감
- [x] WI-014-feat 근태 대시보드 (4 KPI, 부서별 출근율 차트, 5탭 네비) | L1:Attendance > L2:대시보드 > L3:KPI
- [x] WI-015-feat 교대 보드 (주간 교대표, 교대유형 뱃지) | L1:Attendance > L2:교대 > L3:주간보드
- [x] WI-016-feat 출결 기록 테이블 (필터, 정렬, 페이지네이션, 상태 뱃지) | L1:Attendance > L2:기록 > L3:테이블
- [x] WI-017-feat 근태 예외 처리 (4유형 카드, 상세, 승인/반려) | L1:Attendance > L2:예외 > L3:처리
- [x] WI-018-feat 근태 마감 (체크리스트 4항목, 상태 전환) | L1:Attendance > L2:마감 > L3:체크리스트

## Phase 5: Leave (휴가관리)

### L1: Leave > L2: DB 스키마 > L3: 휴가 데이터 모델
- [x] WI-019-feat Leave DB 스키마 (LeavePolicy, LeaveBalance, LeaveRequest + 5유형 시드) | L1:Leave > L2:DB > L3:휴가모델

### L1: Leave > L2: 대시보드 + 캘린더 + 정책 + 신청큐
- [x] WI-020-feat 휴가 대시보드 (4 KPI) | L1:Leave > L2:대시보드 > L3:KPI | batch:01
- [x] WI-021-feat 휴가 캘린더 (월간, 하이라이팅, 부재자 목록) | L1:Leave > L2:캘린더 > L3:월간 | batch:02
- [x] WI-022-feat 휴가 정책 관리 (5유형 테이블, CRUD) | L1:Leave > L2:정책 > L3:관리 | batch:03
- [x] WI-023-feat 휴가 신청 큐 (승인/반려 처리) | L1:Leave > L2:신청큐 > L3:처리 | batch:04

## Phase 6: Workflow (결재)

### L1: Workflow > L2: DB 스키마 > L3: 결재 데이터 모델
- [x] WI-024-feat Workflow DB 스키마 (Workflow, ApprovalRequest, ApprovalStep + 시드) | L1:Workflow > L2:DB > L3:결재모델 | batch:01

### L1: Workflow > L2: 대시보드 + 상세 + 빌더 + 이력
- [x] WI-025-feat 결재 대시보드 (4 KPI, 수신함, 처리통계) | L1:Workflow > L2:대시보드 > L3:KPI | batch:02
- [x] WI-026-feat 결재 상세 드로어 (요청상세, 4단계 결재 체인, 액션) | L1:Workflow > L2:상세 > L3:드로어 | batch:03
- [x] WI-027-feat 워크플로우 빌더 (5단계 비주얼, 조건분기, CRUD) | L1:Workflow > L2:빌더 > L3:비주얼 | batch:04
- [x] WI-028-feat 결재 이력 (테이블, 필터, 페이지네이션) | L1:Workflow > L2:이력 > L3:테이블 | batch:05

## Phase 7: Documents (문서)

### L1: Documents > L2: DB 스키마 > L3: 문서 데이터 모델
- [x] WI-029-feat Documents DB 스키마 (Template, Document, Signature + 4템플릿 시드) | L1:Documents > L2:DB > L3:문서모델 | batch:05

### L1: Documents > L2: 대시보드 + 템플릿 + 발송 + 보관함
- [x] WI-030-feat 문서 대시보드 (4 KPI) | L1:Documents > L2:대시보드 > L3:KPI | batch:06
- [x] WI-031-feat 템플릿 매니저 (4카드, CRUD) | L1:Documents > L2:템플릿 > L3:매니저 | batch:07
- [x] WI-032-feat 문서 발송 폼 (2컬럼, 미리보기, 알림 토글) | L1:Documents > L2:발송 > L3:폼 | batch:08
- [x] WI-033-feat 문서 보관함 (테이블, 다운로드, 재발송) | L1:Documents > L2:보관함 > L3:테이블 | batch:09

## Phase 8: Payroll (급여)

### L1: Payroll > L2: DB 스키마 > L3: 급여 데이터 모델
- [x] WI-034-feat Payroll DB 스키마 (PayrollRule, PayrollRun, Payslip + 6규칙 시드) | L1:Payroll > L2:DB > L3:급여모델 | batch:06

### L1: Payroll > L2: 대시보드 + 규칙 + 마감 + 명세서
- [x] WI-035-feat 급여 대시보드 (4 KPI) | L1:Payroll > L2:대시보드 > L3:KPI | batch:07
- [x] WI-036-feat 급여 규칙 관리 (6규칙 테이블, 수정) | L1:Payroll > L2:규칙 > L3:테이블 | batch:08
- [x] WI-037-feat 급여 마감 플로우 (5단계 프로세스, 체크리스트) | L1:Payroll > L2:마감 > L3:플로우 | batch:09
- [x] WI-038-feat 급여 명세서 센터 (월선택, 테이블) | L1:Payroll > L2:명세서 > L3:센터 | batch:10

## Phase 9: Performance (성과)

### L1: Performance > L2: DB 스키마 > L3: 성과 데이터 모델
- [x] WI-039-feat Performance DB 스키마 (Goal, EvalCycle, Evaluation, OneOnOne + 시드) | L1:Performance > L2:DB > L3:성과모델 | batch:10

### L1: Performance > L2: 목표 + 평가 + 진행 + 1:1
- [x] WI-040-feat 목표 대시보드 (4 KPI, 부서별 달성률 차트, 활성사이클) | L1:Performance > L2:목표 > L3:대시보드 | batch:11
- [x] WI-041-feat 평가 설정 (사이클 폼, 가중치 차트) | L1:Performance > L2:평가 > L3:설정 | batch:12
- [x] WI-042-feat 평가 진행 현황 (5명+ 테이블) | L1:Performance > L2:진행 > L3:현황 | batch:13
- [x] WI-043-feat 1:1 허브 (일정 목록, 안건 미리보기) | L1:Performance > L2:1:1 > L3:허브 | batch:14

## Phase 10: Recruiting (채용)

### L1: Recruiting > L2: DB 스키마 > L3: 채용 데이터 모델
- [x] WI-044-feat Recruiting DB 스키마 (JobPosting, Application, OnboardingTask, OffboardingTask + 시드) | L1:Recruiting > L2:DB > L3:채용모델 | batch:11

### L1: Recruiting > L2: 대시보드 + 공고 + 파이프라인 + 온보딩 + 오프보딩
- [x] WI-045-feat 채용 대시보드 (4 KPI) | L1:Recruiting > L2:대시보드 > L3:KPI | batch:12
- [x] WI-046-feat 채용 공고 관리 (테이블, CRUD) | L1:Recruiting > L2:공고 > L3:관리 | batch:13
- [x] WI-047-feat 채용 파이프라인 (4컬럼 칸반, 드래그앤드롭) | L1:Recruiting > L2:파이프라인 > L3:칸반 | batch:14
- [x] WI-048-feat 온보딩 관리 (진행률, 체크리스트) | L1:Recruiting > L2:온보딩 > L3:체크리스트 | batch:15
- [x] WI-049-feat 오프보딩 관리 (6태스크 체크리스트) | L1:Recruiting > L2:오프보딩 > L3:체크리스트 | batch:16

## Phase 11: Reports (리포트)

### L1: Reports > L2: 센터 + 인사이트 + 예약
- [x] WI-050-feat 리포트 센터 (7카드 그리드) | L1:Reports > L2:센터 > L3:그리드 | batch:15
- [x] WI-051-feat 인사 인사이트 (부서분포 차트, 근속분포) | L1:Reports > L2:인사이트 > L3:인사 | batch:16
- [x] WI-052-feat 근태 인사이트 (주간추이 차트, 예외요약) | L1:Reports > L2:인사이트 > L3:근태 | batch:17
- [x] WI-053-feat 예약 리포트 (5개 스케줄 CRUD) | L1:Reports > L2:예약 > L3:스케줄 | batch:18

## Phase 12: Settings (설정)

### L1: Settings > L2: 회사 + 역할 + 권한 + 알림 + 감사
- [x] WI-054-feat 회사 정보 설정 (2컬럼 폼) | L1:Settings > L2:회사 > L3:기본설정 | batch:17
- [x] WI-055-feat 역할 관리 (6역할 테이블, CRUD) | L1:Settings > L2:역할 > L3:관리 | batch:18
- [x] WI-056-feat 권한 매트릭스 (6기능×6역할, 셀 클릭 변경) | L1:Settings > L2:권한 > L3:매트릭스 | batch:19
- [x] WI-057-feat 알림 규칙 + 외부 연동 (6이벤트 토글, Slack/Google/Jira 카드) | L1:Settings > L2:알림연동 > L3:규칙 | batch:20
- [x] WI-058-feat 감사 로그 (테이블, 검색, 내보내기) | L1:Settings > L2:감사 > L3:로그 | batch:21

## Phase 13: Admin Dashboard (관리자 홈)

### L1: Admin Home > L2: 대시보드
- [x] WI-059-feat Admin 대시보드 (5 KPI, 오늘큐, 조직스냅샷, 결재퍼널, 예외모니터, 문서상태, 급여상태) | L1:AdminHome > L2:대시보드 > L3:홈 | batch:19

## Phase 14: Employee Portal (직원 포탈)

### L1: Employee > L2: 홈 + 스케줄 + 신청 + 수신함 + 문서 + 프로필
- [x] WI-060-feat 직원 홈 (근무상태 히어로, 퀵액션, 미니캘린더, 할일, 요약통계, 모바일) | L1:Employee > L2:홈 > L3:대시보드 | batch:20
- [x] WI-061-feat 출퇴근 체크 + 주간 스케줄 (출퇴근 패널, 주간 테이블) | L1:Employee > L2:스케줄 > L3:출퇴근 | batch:21
- [x] WI-062-feat 출결 이력 (최근 10건 테이블, 페이지네이션) | L1:Employee > L2:스케줄 > L3:이력 | batch:22
- [x] WI-063-feat 신청 유형 그리드 + 휴가 신청 폼 (7유형 카드, 3단계 폼) | L1:Employee > L2:신청 > L3:휴가폼 | batch:23
- [ ] WI-064-feat 근태 정정 폼 + 신청 이력 (정정폼, 이력 테이블) | L1:Employee > L2:신청 > L3:정정이력 | batch:24
- [ ] WI-065-feat 알림 수신함 (5탭, 8알림, 미읽음, 상세 드로어) | L1:Employee > L2:수신함 > L3:알림 | batch:25
- [ ] WI-066-feat 직원 문서 (서명수신함, PDF뷰어+서명패드, 보관함) | L1:Employee > L2:문서 > L3:서명 | batch:26
- [ ] WI-067-feat 직원 프로필 (기본정보, 연락처, 휴가잔여, 성과, 1:1) | L1:Employee > L2:프로필 > L3:전체 | batch:27

## Phase 15: Platform Console (플랫폼 운영)

### L1: Platform > L2: DB + 대시보드 + 테넌트 + 빌링 + 기타
- [ ] WI-068-feat Platform DB 스키마 (Plan, BillingAccount, Invoice, SupportTicket, AuditLog + 시드) | L1:Platform > L2:DB > L3:플랫폼모델 | batch:22
- [x] WI-069-feat 플랫폼 대시보드 (4 KPI, 운영큐, 헬스, 테넌트변경, 보안시그널) | L1:Platform > L2:대시보드 > L3:운영 | batch:23
- [ ] WI-070-feat 테넌트 관리 (필터, 테이블, 상세 드로어) | L1:Platform > L2:테넌트 > L3:관리 | batch:24
- [ ] WI-071-feat 플랜 & 빌링 (4 KPI, 플랜카탈로그, 결제계정, 인보이스) | L1:Platform > L2:빌링 > L3:플랜 | batch:25
- [ ] WI-072-feat 서포트 + 모니터링 (티켓큐, SLA, API메트릭, 업타임) | L1:Platform > L2:서포트 > L3:모니터링 | batch:26
- [ ] WI-073-feat 감사/보안 + 플랫폼 설정 (감사로그, 피처플래그, 시스템설정) | L1:Platform > L2:감사설정 > L3:보안 | batch:27

## Phase 16: Landing (랜딩)

### L1: Public > L2: 랜딩
- [ ] WI-074-feat 랜딩 페이지 (히어로, 6기능카드, 3역할카드, 푸터, 반응형) | L1:Public > L2:랜딩 > L3:마케팅 | batch:28
- [ ] WI-075-feat 인덱스 네비게이션 허브 (3권한 레이어, 모듈 링크 그리드) | L1:Public > L2:인덱스 > L3:허브 | batch:29

## Phase 17: Testing & Polish (테스트)

### L1: QA > L2: 테스트
- [ ] WI-076-test E2E 테스트 (Playwright: 로그인→대시보드→People→Attendance 핵심 플로우) | L1:QA > L2:E2E > L3:핵심플로우 | batch:28
- [ ] WI-077-test 유닛 + API 테스트 (Vitest: 모듈별 비즈니스 로직, API Route, 커버리지 70%+) | L1:QA > L2:유닛 > L3:API | batch:29
- [ ] WI-078-chore 반응형 + 접근성 + i18n 기본 구조 | L1:QA > L2:폴리시 > L3:반응형접근성 | batch:30
