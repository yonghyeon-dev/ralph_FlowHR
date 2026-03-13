import {
  PrismaClient,
  TenantPlan,
  TenantStatus,
  UserStatus,
  EmployeeStatus,
  EmploymentType,
  EmployeeChangeType,
  ShiftType,
  AttendanceStatus,
  ExceptionType,
  ExceptionStatus,
  ClosingStatus,
  LeaveType,
  LeaveRequestStatus,
  WorkflowStatus,
  ApprovalRequestStatus,
  RequestPriority,
  DocumentTemplateCategory,
  DocumentStatus,
  PayrollRuleType,
  PayrollRunStatus,
  PayslipStatus,
  GoalStatus,
  EvalCycleStatus,
  EvalCycleType,
  EvaluationStatus,
  OneOnOneStatus,
  JobPostingStatus,
  ApplicationStatus,
  BoardingTaskStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

async function upsertSystemRole(
  name: string,
  description: string,
  permissions: string[],
): Promise<string> {
  const existing = await prisma.role.findFirst({
    where: { name, tenantId: null },
  });
  if (existing) return existing.id;

  const role = await prisma.role.create({
    data: { name, description, permissions, isSystem: true },
  });
  return role.id;
}

async function main(): Promise<void> {
  // ─── Tenants ──────────────────────────────────────────

  const acme = await prisma.tenant.upsert({
    where: { slug: "acme-corp" },
    update: {},
    create: {
      name: "Acme Corporation",
      slug: "acme-corp",
      plan: TenantPlan.GROWTH,
      status: TenantStatus.ACTIVE,
      settings: {
        timezone: "Asia/Seoul",
        fiscalYearStart: 1,
        defaultWorkHours: { start: "09:00", end: "18:00" },
        locale: "ko-KR",
      },
    },
  });

  const techstart = await prisma.tenant.upsert({
    where: { slug: "techstart-inc" },
    update: {},
    create: {
      name: "TechStart Inc",
      slug: "techstart-inc",
      plan: TenantPlan.STARTER,
      status: TenantStatus.ACTIVE,
      settings: {
        timezone: "Asia/Seoul",
        fiscalYearStart: 3,
        defaultWorkHours: { start: "10:00", end: "19:00" },
        locale: "ko-KR",
      },
    },
  });

  // ─── System Role (Platform Operator, no tenant) ───────

  const platformOperatorRoleId = await upsertSystemRole(
    "PLATFORM_OPERATOR",
    "SaaS 플랫폼 운영자",
    [
      "PLATFORM_MANAGE",
      "TENANT_MANAGE",
      "BILLING_MANAGE",
      "SUPPORT_MANAGE",
      "AUDIT_VIEW",
    ],
  );

  // ─── Tenant Roles (Acme) ─────────────────────────────

  const acmeRoles = await createTenantRoles(acme.id);

  // ─── Tenant Roles (TechStart) ────────────────────────

  const techRoles = await createTenantRoles(techstart.id);

  // ─── Users ────────────────────────────────────────────

  const users = [
    {
      email: "operator@flowhr.io",
      name: "플랫폼 운영자",
      roleId: platformOperatorRoleId,
      tenantId: undefined,
      password: "demo1234!",
    },
    {
      email: "admin@acme.example.com",
      name: "김관리",
      roleId: acmeRoles.SUPER_ADMIN,
      tenantId: acme.id,
      password: "demo1234!",
    },
    {
      email: "hr@acme.example.com",
      name: "이인사",
      roleId: acmeRoles.HR_ADMIN,
      tenantId: acme.id,
      password: "demo1234!",
    },
    {
      email: "manager@acme.example.com",
      name: "박팀장",
      roleId: acmeRoles.MANAGER,
      tenantId: acme.id,
      password: "demo1234!",
    },
    {
      email: "employee@acme.example.com",
      name: "최직원",
      roleId: acmeRoles.EMPLOYEE,
      tenantId: acme.id,
      password: "demo1234!",
    },
    {
      email: "admin@techstart.example.com",
      name: "정대표",
      roleId: techRoles.SUPER_ADMIN,
      tenantId: techstart.id,
      password: "demo1234!",
    },
    {
      email: "dev@techstart.example.com",
      name: "한개발",
      roleId: techRoles.EMPLOYEE,
      tenantId: techstart.id,
      password: "demo1234!",
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: {
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        tenantId: user.tenantId,
        status: UserStatus.ACTIVE,
        password: user.password,
      },
    });
  }

  console.log("Seed completed: 2 tenants, 9 roles, 7 users");

  // ─── Positions (Acme) ────────────────────────────────

  const positionDefs = [
    { name: "대표이사", level: 10, sortOrder: 1 },
    { name: "이사", level: 9, sortOrder: 2 },
    { name: "부장", level: 8, sortOrder: 3 },
    { name: "팀장", level: 7, sortOrder: 4 },
    { name: "과장", level: 6, sortOrder: 5 },
    { name: "대리", level: 5, sortOrder: 6 },
    { name: "주임", level: 4, sortOrder: 7 },
    { name: "사원", level: 3, sortOrder: 8 },
    { name: "인턴", level: 1, sortOrder: 9 },
  ];

  const positionIds: Record<string, string> = {};
  for (const def of positionDefs) {
    const pos = await prisma.position.upsert({
      where: { tenantId_name: { tenantId: acme.id, name: def.name } },
      update: {},
      create: {
        tenantId: acme.id,
        name: def.name,
        level: def.level,
        sortOrder: def.sortOrder,
      },
    });
    positionIds[def.name] = pos.id;
  }

  // ─── Departments (Acme) ──────────────────────────────

  const ceo = await upsertDepartment(acme.id, "CEO", "CEO", "대표이사실", null, 1);
  const product = await upsertDepartment(acme.id, "PRODUCT", "PRD", "Product", ceo.id, 2);
  const engineering = await upsertDepartment(acme.id, "ENGINEERING", "ENG", "Engineering", ceo.id, 3);
  const sales = await upsertDepartment(acme.id, "SALES", "SAL", "Sales", ceo.id, 4);
  const hr = await upsertDepartment(acme.id, "HR", "HRM", "HR", ceo.id, 5);

  // Sub-departments
  const ux = await upsertDepartment(acme.id, "UX", "UX", "UX팀", product.id, 1);
  const planning = await upsertDepartment(acme.id, "PLANNING", "PLN", "기획팀", product.id, 2);
  const backend = await upsertDepartment(acme.id, "BACKEND", "BE", "백엔드팀", engineering.id, 1);
  const frontend = await upsertDepartment(acme.id, "FRONTEND", "FE", "프론트엔드팀", engineering.id, 2);

  // ─── Employees (Acme) ────────────────────────────────

  const userAdmin = await prisma.user.findUnique({ where: { email: "admin@acme.example.com" } });
  const userHr = await prisma.user.findUnique({ where: { email: "hr@acme.example.com" } });
  const userManager = await prisma.user.findUnique({ where: { email: "manager@acme.example.com" } });
  const userEmployee = await prisma.user.findUnique({ where: { email: "employee@acme.example.com" } });

  const empDefs: {
    employeeNumber: string;
    name: string;
    email: string;
    phone: string;
    departmentId: string;
    positionId: string;
    hireDate: string;
    status: EmployeeStatus;
    type: EmploymentType;
    userId?: string;
  }[] = [
    {
      employeeNumber: "EMP-20200101",
      name: "김관리",
      email: "admin@acme.example.com",
      phone: "010-1234-0001",
      departmentId: ceo.id,
      positionId: positionIds["대표이사"],
      hireDate: "2020-01-01",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
      userId: userAdmin?.id,
    },
    {
      employeeNumber: "EMP-20210301",
      name: "이인사",
      email: "hr@acme.example.com",
      phone: "010-1234-0002",
      departmentId: hr.id,
      positionId: positionIds["부장"],
      hireDate: "2021-03-01",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
      userId: userHr?.id,
    },
    {
      employeeNumber: "EMP-20210601",
      name: "박팀장",
      email: "manager@acme.example.com",
      phone: "010-1234-0003",
      departmentId: backend.id,
      positionId: positionIds["팀장"],
      hireDate: "2021-06-01",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
      userId: userManager?.id,
    },
    {
      employeeNumber: "EMP-20220415",
      name: "최직원",
      email: "employee@acme.example.com",
      phone: "010-1234-0004",
      departmentId: backend.id,
      positionId: positionIds["대리"],
      hireDate: "2022-04-15",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
      userId: userEmployee?.id,
    },
    {
      employeeNumber: "EMP-20220901",
      name: "정시니어",
      email: "senior.designer@acme.example.com",
      phone: "010-1234-0005",
      departmentId: ux.id,
      positionId: positionIds["과장"],
      hireDate: "2022-09-01",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
    },
    {
      employeeNumber: "EMP-20230201",
      name: "한프론트",
      email: "frontend.lead@acme.example.com",
      phone: "010-1234-0006",
      departmentId: frontend.id,
      positionId: positionIds["팀장"],
      hireDate: "2023-02-01",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
    },
    {
      employeeNumber: "EMP-20230601",
      name: "윤영업",
      email: "sales.mgr@acme.example.com",
      phone: "010-1234-0007",
      departmentId: sales.id,
      positionId: positionIds["과장"],
      hireDate: "2023-06-01",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
    },
    {
      employeeNumber: "EMP-20240101",
      name: "조기획",
      email: "planner@acme.example.com",
      phone: "010-1234-0008",
      departmentId: planning.id,
      positionId: positionIds["사원"],
      hireDate: "2024-01-01",
      status: EmployeeStatus.ACTIVE,
      type: EmploymentType.FULL_TIME,
    },
    {
      employeeNumber: "EMP-20240301",
      name: "임휴직",
      email: "onleave@acme.example.com",
      phone: "010-1234-0009",
      departmentId: engineering.id,
      positionId: positionIds["대리"],
      hireDate: "2022-03-01",
      status: EmployeeStatus.ON_LEAVE,
      type: EmploymentType.FULL_TIME,
    },
    {
      employeeNumber: "EMP-20240601",
      name: "강퇴사",
      email: "resigned@acme.example.com",
      phone: "010-1234-0010",
      departmentId: sales.id,
      positionId: positionIds["사원"],
      hireDate: "2023-06-01",
      status: EmployeeStatus.PENDING_RESIGNATION,
      type: EmploymentType.FULL_TIME,
    },
  ];

  const employeeIds: Record<string, string> = {};
  for (const def of empDefs) {
    const emp = await prisma.employee.upsert({
      where: {
        tenantId_employeeNumber: {
          tenantId: acme.id,
          employeeNumber: def.employeeNumber,
        },
      },
      update: {},
      create: {
        tenantId: acme.id,
        employeeNumber: def.employeeNumber,
        name: def.name,
        email: def.email,
        phone: def.phone,
        departmentId: def.departmentId,
        positionId: def.positionId,
        hireDate: new Date(def.hireDate),
        status: def.status,
        type: def.type,
        userId: def.userId,
      },
    });
    employeeIds[def.employeeNumber] = emp.id;
  }

  // Set department managers
  await prisma.department.update({
    where: { tenantId_code: { tenantId: acme.id, code: "CEO" } },
    data: { managerId: employeeIds["EMP-20200101"] },
  });
  await prisma.department.update({
    where: { tenantId_code: { tenantId: acme.id, code: "HRM" } },
    data: { managerId: employeeIds["EMP-20210301"] },
  });
  await prisma.department.update({
    where: { tenantId_code: { tenantId: acme.id, code: "BE" } },
    data: { managerId: employeeIds["EMP-20210601"] },
  });
  await prisma.department.update({
    where: { tenantId_code: { tenantId: acme.id, code: "FE" } },
    data: { managerId: employeeIds["EMP-20230201"] },
  });
  await prisma.department.update({
    where: { tenantId_code: { tenantId: acme.id, code: "UX" } },
    data: { managerId: employeeIds["EMP-20220901"] },
  });

  // ─── Employee Changes (Acme) ─────────────────────────

  const changeDefs: {
    employeeNumber: string;
    type: EmployeeChangeType;
    description: string;
    toDepartmentId?: string;
    toPositionId?: string;
    fromDepartmentId?: string;
    fromPositionId?: string;
    effectiveDate: string;
  }[] = [
    {
      employeeNumber: "EMP-20200101",
      type: EmployeeChangeType.HIRE,
      description: "입사",
      toDepartmentId: ceo.id,
      toPositionId: positionIds["대표이사"],
      effectiveDate: "2020-01-01",
    },
    {
      employeeNumber: "EMP-20210301",
      type: EmployeeChangeType.HIRE,
      description: "입사",
      toDepartmentId: hr.id,
      toPositionId: positionIds["과장"],
      effectiveDate: "2021-03-01",
    },
    {
      employeeNumber: "EMP-20210301",
      type: EmployeeChangeType.PROMOTION,
      description: "부장 승진",
      toDepartmentId: hr.id,
      fromPositionId: positionIds["과장"],
      toPositionId: positionIds["부장"],
      effectiveDate: "2024-01-01",
    },
    {
      employeeNumber: "EMP-20210601",
      type: EmployeeChangeType.HIRE,
      description: "입사",
      toDepartmentId: backend.id,
      toPositionId: positionIds["과장"],
      effectiveDate: "2021-06-01",
    },
    {
      employeeNumber: "EMP-20210601",
      type: EmployeeChangeType.PROMOTION,
      description: "팀장 승진",
      toDepartmentId: backend.id,
      fromPositionId: positionIds["과장"],
      toPositionId: positionIds["팀장"],
      effectiveDate: "2023-07-01",
    },
    {
      employeeNumber: "EMP-20220415",
      type: EmployeeChangeType.HIRE,
      description: "입사",
      toDepartmentId: backend.id,
      toPositionId: positionIds["사원"],
      effectiveDate: "2022-04-15",
    },
    {
      employeeNumber: "EMP-20220415",
      type: EmployeeChangeType.PROMOTION,
      description: "대리 승진",
      toDepartmentId: backend.id,
      fromPositionId: positionIds["사원"],
      toPositionId: positionIds["대리"],
      effectiveDate: "2025-01-01",
    },
    {
      employeeNumber: "EMP-20240301",
      type: EmployeeChangeType.HIRE,
      description: "입사",
      toDepartmentId: engineering.id,
      toPositionId: positionIds["대리"],
      effectiveDate: "2022-03-01",
    },
    {
      employeeNumber: "EMP-20240601",
      type: EmployeeChangeType.HIRE,
      description: "입사",
      toDepartmentId: sales.id,
      toPositionId: positionIds["사원"],
      effectiveDate: "2023-06-01",
    },
    {
      employeeNumber: "EMP-20240601",
      type: EmployeeChangeType.RESIGNATION,
      description: "퇴사 예정 (2026-04-30)",
      effectiveDate: "2026-03-15",
    },
    {
      employeeNumber: "EMP-20230201",
      type: EmployeeChangeType.TRANSFER,
      description: "백엔드팀에서 프론트엔드팀으로 이동",
      fromDepartmentId: backend.id,
      toDepartmentId: frontend.id,
      effectiveDate: "2024-06-01",
    },
  ];

  for (const def of changeDefs) {
    const empId = employeeIds[def.employeeNumber];
    await prisma.employeeChange.create({
      data: {
        tenantId: acme.id,
        employeeId: empId,
        type: def.type,
        description: def.description,
        fromDepartmentId: def.fromDepartmentId,
        toDepartmentId: def.toDepartmentId,
        fromPositionId: def.fromPositionId,
        toPositionId: def.toPositionId,
        effectiveDate: new Date(def.effectiveDate),
      },
    });
  }

  // ─── Shifts (Acme) ───────────────────────────────────────

  const shiftDefs = [
    { name: "주간", type: ShiftType.REGULAR, startTime: "09:00", endTime: "18:00", breakMinutes: 60, color: "#3B82F6" },
    { name: "오전", type: ShiftType.MORNING, startTime: "06:00", endTime: "14:00", breakMinutes: 60, color: "#10B981" },
    { name: "오후", type: ShiftType.AFTERNOON, startTime: "14:00", endTime: "22:00", breakMinutes: 60, color: "#F59E0B" },
    { name: "야간", type: ShiftType.NIGHT, startTime: "22:00", endTime: "06:00", breakMinutes: 60, color: "#6366F1" },
    { name: "유연근무", type: ShiftType.FLEXIBLE, startTime: "07:00", endTime: "19:00", breakMinutes: 60, color: "#8B5CF6" },
  ];

  const shiftIds: Record<string, string> = {};
  for (const def of shiftDefs) {
    const shift = await prisma.shift.upsert({
      where: { tenantId_name: { tenantId: acme.id, name: def.name } },
      update: {},
      create: {
        tenantId: acme.id,
        name: def.name,
        type: def.type,
        startTime: def.startTime,
        endTime: def.endTime,
        breakMinutes: def.breakMinutes,
        color: def.color,
      },
    });
    shiftIds[def.name] = shift.id;
  }

  // ─── Shift Assignments (Acme) ──────────────────────────

  const assignmentDefs = [
    { employeeNumber: "EMP-20200101", shiftName: "주간" },
    { employeeNumber: "EMP-20210301", shiftName: "주간" },
    { employeeNumber: "EMP-20210601", shiftName: "주간" },
    { employeeNumber: "EMP-20220415", shiftName: "주간" },
    { employeeNumber: "EMP-20220901", shiftName: "유연근무" },
    { employeeNumber: "EMP-20230201", shiftName: "주간" },
    { employeeNumber: "EMP-20230601", shiftName: "주간" },
    { employeeNumber: "EMP-20240101", shiftName: "주간" },
  ];

  for (const def of assignmentDefs) {
    const empId = employeeIds[def.employeeNumber];
    const shiftId = shiftIds[def.shiftName];
    await prisma.shiftAssignment.create({
      data: {
        tenantId: acme.id,
        employeeId: empId,
        shiftId,
        startDate: new Date("2026-01-01"),
      },
    });
  }

  // ─── Attendance Records (Acme, this week sample) ───────

  const activeEmployeeNumbers = [
    "EMP-20200101", "EMP-20210301", "EMP-20210601", "EMP-20220415",
    "EMP-20220901", "EMP-20230201", "EMP-20230601", "EMP-20240101",
  ];

  const attendanceSamples: {
    dayOffset: number;
    status: AttendanceStatus;
    checkInOffset: string;
    checkOutOffset: string;
    workMinutes: number;
    overtime: number;
  }[] = [
    { dayOffset: -4, status: AttendanceStatus.PRESENT, checkInOffset: "08:55", checkOutOffset: "18:05", workMinutes: 480, overtime: 0 },
    { dayOffset: -3, status: AttendanceStatus.PRESENT, checkInOffset: "08:58", checkOutOffset: "19:00", workMinutes: 540, overtime: 60 },
    { dayOffset: -2, status: AttendanceStatus.LATE, checkInOffset: "09:32", checkOutOffset: "18:30", workMinutes: 450, overtime: 0 },
    { dayOffset: -1, status: AttendanceStatus.PRESENT, checkInOffset: "08:50", checkOutOffset: "18:00", workMinutes: 480, overtime: 0 },
    { dayOffset: 0, status: AttendanceStatus.PRESENT, checkInOffset: "09:00", checkOutOffset: "18:00", workMinutes: 480, overtime: 0 },
  ];

  for (const empNum of activeEmployeeNumbers) {
    const empId = employeeIds[empNum];
    for (const sample of attendanceSamples) {
      const date = new Date();
      date.setDate(date.getDate() + sample.dayOffset);
      date.setHours(0, 0, 0, 0);

      const checkIn = new Date(date);
      const [ciH, ciM] = sample.checkInOffset.split(":");
      checkIn.setHours(parseInt(ciH, 10), parseInt(ciM, 10), 0, 0);

      const checkOut = new Date(date);
      const [coH, coM] = sample.checkOutOffset.split(":");
      checkOut.setHours(parseInt(coH, 10), parseInt(coM, 10), 0, 0);

      await prisma.attendanceRecord.upsert({
        where: {
          tenantId_employeeId_date: { tenantId: acme.id, employeeId: empId, date },
        },
        update: {},
        create: {
          tenantId: acme.id,
          employeeId: empId,
          date,
          status: sample.status,
          checkIn,
          checkOut,
          workMinutes: sample.workMinutes,
          overtime: sample.overtime,
        },
      });
    }
  }

  // ─── Attendance Exceptions (Acme) ──────────────────────

  const exceptionDefs = [
    {
      employeeNumber: "EMP-20220415",
      type: ExceptionType.CORRECTION,
      status: ExceptionStatus.APPROVED,
      dayOffset: -3,
      reason: "출근 기록 누락 정정 요청",
      approvedBy: employeeIds["EMP-20210601"],
    },
    {
      employeeNumber: "EMP-20230201",
      type: ExceptionType.OVERTIME,
      status: ExceptionStatus.PENDING,
      dayOffset: -2,
      reason: "프로젝트 마감으로 인한 초과근무 (2시간)",
    },
    {
      employeeNumber: "EMP-20240101",
      type: ExceptionType.REMOTE_WORK,
      status: ExceptionStatus.APPROVED,
      dayOffset: -1,
      reason: "재택근무 신청",
      approvedBy: employeeIds["EMP-20210301"],
    },
    {
      employeeNumber: "EMP-20220901",
      type: ExceptionType.BUSINESS_TRIP,
      status: ExceptionStatus.APPROVED,
      dayOffset: 0,
      reason: "고객사 미팅 출장",
      approvedBy: employeeIds["EMP-20200101"],
    },
  ];

  for (const def of exceptionDefs) {
    const empId = employeeIds[def.employeeNumber];
    const date = new Date();
    date.setDate(date.getDate() + def.dayOffset);
    date.setHours(0, 0, 0, 0);

    await prisma.attendanceException.create({
      data: {
        tenantId: acme.id,
        employeeId: empId,
        type: def.type,
        status: def.status,
        date,
        reason: def.reason,
        approvedBy: def.approvedBy,
        approvedAt: def.status === ExceptionStatus.APPROVED ? new Date() : undefined,
      },
    });
  }

  // ─── Attendance Closing (Acme) ─────────────────────────

  await prisma.attendanceClosing.upsert({
    where: { tenantId_year_month: { tenantId: acme.id, year: 2026, month: 2 } },
    update: {},
    create: {
      tenantId: acme.id,
      year: 2026,
      month: 2,
      status: ClosingStatus.CLOSED,
      closedBy: employeeIds["EMP-20210301"],
      closedAt: new Date("2026-03-05"),
      totalDays: 20,
      totalHours: 1280,
    },
  });

  await prisma.attendanceClosing.upsert({
    where: { tenantId_year_month: { tenantId: acme.id, year: 2026, month: 3 } },
    update: {},
    create: {
      tenantId: acme.id,
      year: 2026,
      month: 3,
      status: ClosingStatus.OPEN,
      totalDays: 0,
      totalHours: 0,
    },
  });

  // ─── Leave Policies (Acme, 5 types) ──────────────────────

  const leavePolicyDefs = [
    {
      name: "연차",
      type: LeaveType.ANNUAL,
      description: "법정 연차 휴가 (근속 1년 이상 15일, 1년 미만 월 1일)",
      defaultDays: 15,
      carryOverLimit: 5,
      requiresApproval: true,
    },
    {
      name: "반차",
      type: LeaveType.HALF_DAY,
      description: "오전/오후 반일 휴가 (연차에서 0.5일 차감)",
      defaultDays: 0,
      carryOverLimit: 0,
      requiresApproval: true,
    },
    {
      name: "병가",
      type: LeaveType.SICK,
      description: "질병 또는 부상으로 인한 휴가 (연간 최대 60일)",
      defaultDays: 60,
      carryOverLimit: 0,
      requiresApproval: true,
    },
    {
      name: "경조사",
      type: LeaveType.FAMILY_EVENT,
      description: "결혼, 출산, 사망 등 경조사 휴가",
      defaultDays: 5,
      carryOverLimit: 0,
      requiresApproval: true,
    },
    {
      name: "대체휴가",
      type: LeaveType.COMPENSATORY,
      description: "휴일근무 대체 휴가",
      defaultDays: 0,
      carryOverLimit: 0,
      requiresApproval: true,
    },
  ];

  const policyIds: Record<string, string> = {};
  for (const def of leavePolicyDefs) {
    const policy = await prisma.leavePolicy.upsert({
      where: { tenantId_type: { tenantId: acme.id, type: def.type } },
      update: {},
      create: {
        tenantId: acme.id,
        name: def.name,
        type: def.type,
        description: def.description,
        defaultDays: def.defaultDays,
        carryOverLimit: def.carryOverLimit,
        requiresApproval: def.requiresApproval,
      },
    });
    policyIds[def.type] = policy.id;
  }

  // ─── Leave Balances (Acme, 2026) ─────────────────────────

  const leaveBalanceDefs = [
    { employeeNumber: "EMP-20200101", type: LeaveType.ANNUAL, totalDays: 20, usedDays: 3, pendingDays: 0, carriedOver: 5 },
    { employeeNumber: "EMP-20210301", type: LeaveType.ANNUAL, totalDays: 18, usedDays: 2, pendingDays: 1, carriedOver: 3 },
    { employeeNumber: "EMP-20210601", type: LeaveType.ANNUAL, totalDays: 18, usedDays: 5, pendingDays: 0, carriedOver: 3 },
    { employeeNumber: "EMP-20220415", type: LeaveType.ANNUAL, totalDays: 16, usedDays: 1, pendingDays: 2, carriedOver: 1 },
    { employeeNumber: "EMP-20220901", type: LeaveType.ANNUAL, totalDays: 16, usedDays: 4, pendingDays: 0, carriedOver: 1 },
    { employeeNumber: "EMP-20230201", type: LeaveType.ANNUAL, totalDays: 15, usedDays: 2, pendingDays: 1, carriedOver: 0 },
    { employeeNumber: "EMP-20230601", type: LeaveType.ANNUAL, totalDays: 15, usedDays: 0, pendingDays: 0, carriedOver: 0 },
    { employeeNumber: "EMP-20240101", type: LeaveType.ANNUAL, totalDays: 15, usedDays: 1, pendingDays: 0, carriedOver: 0 },
    { employeeNumber: "EMP-20220415", type: LeaveType.SICK, totalDays: 60, usedDays: 2, pendingDays: 0, carriedOver: 0 },
    { employeeNumber: "EMP-20210601", type: LeaveType.COMPENSATORY, totalDays: 2, usedDays: 1, pendingDays: 0, carriedOver: 0 },
  ];

  for (const def of leaveBalanceDefs) {
    const empId = employeeIds[def.employeeNumber];
    const polId = policyIds[def.type];
    await prisma.leaveBalance.upsert({
      where: {
        tenantId_employeeId_policyId_year: {
          tenantId: acme.id,
          employeeId: empId,
          policyId: polId,
          year: 2026,
        },
      },
      update: {},
      create: {
        tenantId: acme.id,
        employeeId: empId,
        policyId: polId,
        year: 2026,
        totalDays: def.totalDays,
        usedDays: def.usedDays,
        pendingDays: def.pendingDays,
        carriedOver: def.carriedOver,
      },
    });
  }

  // ─── Leave Requests (Acme) ───────────────────────────────

  const leaveRequestDefs = [
    {
      employeeNumber: "EMP-20220415",
      type: LeaveType.ANNUAL,
      status: LeaveRequestStatus.APPROVED,
      startDate: "2026-02-10",
      endDate: "2026-02-10",
      days: 1,
      reason: "개인 사유",
      approvedBy: employeeIds["EMP-20210601"],
    },
    {
      employeeNumber: "EMP-20210301",
      type: LeaveType.ANNUAL,
      status: LeaveRequestStatus.PENDING,
      startDate: "2026-03-20",
      endDate: "2026-03-20",
      days: 1,
      reason: "가족 행사",
    },
    {
      employeeNumber: "EMP-20220415",
      type: LeaveType.ANNUAL,
      status: LeaveRequestStatus.PENDING,
      startDate: "2026-03-25",
      endDate: "2026-03-26",
      days: 2,
      reason: "여행",
    },
    {
      employeeNumber: "EMP-20230201",
      type: LeaveType.HALF_DAY,
      status: LeaveRequestStatus.APPROVED,
      startDate: "2026-03-14",
      endDate: "2026-03-14",
      days: 0.5,
      reason: "병원 방문",
      approvedBy: employeeIds["EMP-20210601"],
    },
    {
      employeeNumber: "EMP-20220901",
      type: LeaveType.FAMILY_EVENT,
      status: LeaveRequestStatus.APPROVED,
      startDate: "2026-01-20",
      endDate: "2026-01-22",
      days: 3,
      reason: "가족 경조사",
      approvedBy: employeeIds["EMP-20200101"],
    },
    {
      employeeNumber: "EMP-20240101",
      type: LeaveType.ANNUAL,
      status: LeaveRequestStatus.REJECTED,
      startDate: "2026-03-10",
      endDate: "2026-03-12",
      days: 3,
      reason: "개인 휴가",
      rejectedBy: employeeIds["EMP-20210301"],
      rejectReason: "프로젝트 마감 기간과 겹침",
    },
  ];

  for (const def of leaveRequestDefs) {
    const empId = employeeIds[def.employeeNumber];
    const polId = policyIds[def.type];
    await prisma.leaveRequest.create({
      data: {
        tenantId: acme.id,
        employeeId: empId,
        policyId: polId,
        status: def.status,
        startDate: new Date(def.startDate),
        endDate: new Date(def.endDate),
        days: def.days,
        reason: def.reason,
        approvedBy: def.approvedBy,
        approvedAt: def.approvedBy ? new Date() : undefined,
        rejectedBy: def.rejectedBy,
        rejectedAt: def.rejectedBy ? new Date() : undefined,
        rejectReason: def.rejectReason,
      },
    });
  }

  // ─── Workflows (Acme) ──────────────────────────────────────

  const workflowDefs = [
    {
      name: "연차 승인",
      description: "연차/반차 휴가 요청 결재 프로세스",
      triggerType: "LEAVE",
      status: WorkflowStatus.ACTIVE,
      steps: [
        { order: 1, role: "SELF", label: "본인 신청" },
        { order: 2, role: "MANAGER", label: "팀장 승인" },
        { order: 3, role: "HR", label: "HR 검토" },
      ],
    },
    {
      name: "경비 정산",
      description: "출장비, 교육비 등 경비 정산 결재",
      triggerType: "EXPENSE",
      status: WorkflowStatus.ACTIVE,
      steps: [
        { order: 1, role: "SELF", label: "본인 신청" },
        { order: 2, role: "MANAGER", label: "팀장 승인" },
        { order: 3, role: "FINANCE", label: "재무 승인" },
      ],
    },
    {
      name: "초과근무 사전 승인",
      description: "초과근무 사전 승인 프로세스 (조건 분기 포함)",
      triggerType: "OVERTIME",
      status: WorkflowStatus.ACTIVE,
      steps: [
        { order: 1, role: "SELF", label: "본인 신청" },
        { order: 2, role: "MANAGER", label: "팀장 승인" },
        { order: 3, role: "HR", label: "HR 검토" },
        { order: 4, role: "HR_HEAD", label: "최종 승인" },
      ],
      conditions: [
        { condition: "weeklyHours <= 40", action: "AUTO_APPROVE" },
        { condition: "40 < weeklyHours <= 48", action: "SKIP_TO_STEP_2" },
        { condition: "weeklyHours > 48", action: "FULL_CHAIN" },
      ],
    },
  ];

  const workflowIds: Record<string, string> = {};
  for (const def of workflowDefs) {
    const wf = await prisma.workflow.upsert({
      where: { tenantId_name: { tenantId: acme.id, name: def.name } },
      update: {},
      create: {
        tenantId: acme.id,
        name: def.name,
        description: def.description,
        triggerType: def.triggerType,
        status: def.status,
        steps: def.steps,
        conditions: def.conditions ?? undefined,
      },
    });
    workflowIds[def.name] = wf.id;
  }

  // ─── Approval Requests (Acme) ─────────────────────────────

  const approvalRequestDefs: {
    workflowName: string;
    requesterNumber: string;
    title: string;
    description: string;
    status: ApprovalRequestStatus;
    priority: RequestPriority;
    requestType: string;
    data: Record<string, string | number>;
    escalatedAt?: Date;
    completedAt?: Date;
    createdAtOffset: number;
    steps: {
      stepOrder: number;
      approverNumber: string;
      status: ApprovalRequestStatus;
      comment?: string;
      actionAt?: Date;
    }[];
  }[] = [
    {
      workflowName: "초과근무 사전 승인",
      requesterNumber: "EMP-20220415",
      title: "초과근무 사전 승인 — 최직원",
      description: "긴급 서버 마이그레이션 작업",
      status: ApprovalRequestStatus.IN_PROGRESS,
      priority: RequestPriority.CRITICAL,
      requestType: "OVERTIME",
      data: { scheduledDate: "2026-03-13", hours: 4, reason: "긴급 서버 마이그레이션 작업" },
      createdAtOffset: -1,
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20220415", status: ApprovalRequestStatus.APPROVED, comment: "신청", actionAt: new Date("2026-03-12T10:30:00") },
        { stepOrder: 2, approverNumber: "EMP-20210601", status: ApprovalRequestStatus.APPROVED, comment: "승인합니다", actionAt: new Date("2026-03-12T14:00:00") },
        { stepOrder: 3, approverNumber: "EMP-20210301", status: ApprovalRequestStatus.PENDING },
        { stepOrder: 4, approverNumber: "EMP-20200101", status: ApprovalRequestStatus.PENDING },
      ],
    },
    {
      workflowName: "연차 승인",
      requesterNumber: "EMP-20230201",
      title: "연차 신청 — 한프론트",
      description: "3/17~18 (2일) 개인 사유",
      status: ApprovalRequestStatus.PENDING,
      priority: RequestPriority.HIGH,
      requestType: "LEAVE",
      data: { startDate: "2026-03-17", endDate: "2026-03-18", days: 2 },
      createdAtOffset: -3,
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20230201", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-10T09:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20210601", status: ApprovalRequestStatus.PENDING },
        { stepOrder: 3, approverNumber: "EMP-20210301", status: ApprovalRequestStatus.PENDING },
      ],
    },
    {
      workflowName: "경비 정산",
      requesterNumber: "EMP-20230601",
      title: "경비 정산 — 윤영업",
      description: "출장 경비 ₩1,240,000",
      status: ApprovalRequestStatus.PENDING,
      priority: RequestPriority.HIGH,
      requestType: "EXPENSE",
      data: { amount: 1240000, category: "출장 경비", description: "고객사 미팅 출장비" },
      createdAtOffset: -2,
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20230601", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-11T11:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20200101", status: ApprovalRequestStatus.PENDING },
        { stepOrder: 3, approverNumber: "EMP-20210301", status: ApprovalRequestStatus.PENDING },
      ],
    },
    {
      workflowName: "연차 승인",
      requesterNumber: "EMP-20240101",
      title: "연봉 변경 통지 — 조기획",
      description: "승진에 따른 연봉 조정",
      status: ApprovalRequestStatus.PENDING,
      priority: RequestPriority.MEDIUM,
      requestType: "SALARY_CHANGE",
      data: { reason: "승진에 따른 연봉 조정", department: "HR" },
      createdAtOffset: -4,
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20240101", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-09T10:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20210301", status: ApprovalRequestStatus.PENDING },
      ],
    },
    {
      workflowName: "경비 정산",
      requesterNumber: "EMP-20220901",
      title: "교육 수강 신청 — 정시니어 외 2명",
      description: "AWS 자격증 과정 비용 승인",
      status: ApprovalRequestStatus.PENDING,
      priority: RequestPriority.LOW,
      requestType: "EXPENSE",
      data: { amount: 890000, category: "교육비", description: "AWS 자격증 과정" },
      createdAtOffset: -5,
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20220901", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-08T09:30:00") },
        { stepOrder: 2, approverNumber: "EMP-20200101", status: ApprovalRequestStatus.PENDING },
      ],
    },
    // Completed requests (this week)
    {
      workflowName: "연차 승인",
      requesterNumber: "EMP-20210601",
      title: "연차 신청 — 박팀장",
      description: "가족 행사",
      status: ApprovalRequestStatus.APPROVED,
      priority: RequestPriority.MEDIUM,
      requestType: "LEAVE",
      data: { startDate: "2026-03-14", endDate: "2026-03-14", days: 1 },
      createdAtOffset: -5,
      completedAt: new Date("2026-03-09"),
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20210601", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-08T09:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20200101", status: ApprovalRequestStatus.APPROVED, comment: "승인", actionAt: new Date("2026-03-09T10:00:00") },
      ],
    },
    {
      workflowName: "경비 정산",
      requesterNumber: "EMP-20220415",
      title: "경비 정산 — 최직원",
      description: "택시비 정산",
      status: ApprovalRequestStatus.APPROVED,
      priority: RequestPriority.LOW,
      requestType: "EXPENSE",
      data: { amount: 45000, category: "교통비" },
      createdAtOffset: -4,
      completedAt: new Date("2026-03-10"),
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20220415", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-09T08:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20210601", status: ApprovalRequestStatus.APPROVED, comment: "확인", actionAt: new Date("2026-03-10T11:00:00") },
      ],
    },
    {
      workflowName: "초과근무 사전 승인",
      requesterNumber: "EMP-20230201",
      title: "초과근무 — 한프론트",
      description: "릴리즈 배포",
      status: ApprovalRequestStatus.APPROVED,
      priority: RequestPriority.MEDIUM,
      requestType: "OVERTIME",
      data: { hours: 2 },
      createdAtOffset: -6,
      completedAt: new Date("2026-03-08"),
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20230201", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-07T14:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20210601", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-08T09:00:00") },
      ],
    },
    {
      workflowName: "연차 승인",
      requesterNumber: "EMP-20220901",
      title: "반차 신청 — 정시니어",
      description: "병원 방문",
      status: ApprovalRequestStatus.REJECTED,
      priority: RequestPriority.LOW,
      requestType: "LEAVE",
      data: { days: 0.5 },
      createdAtOffset: -7,
      completedAt: new Date("2026-03-07"),
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20220901", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-06T10:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20200101", status: ApprovalRequestStatus.REJECTED, comment: "프로젝트 마감 기간", actionAt: new Date("2026-03-07T15:00:00") },
      ],
    },
    // Escalated request
    {
      workflowName: "경비 정산",
      requesterNumber: "EMP-20240101",
      title: "출장비 정산 — 조기획",
      description: "해외 출장비 $2,500",
      status: ApprovalRequestStatus.ESCALATED,
      priority: RequestPriority.HIGH,
      requestType: "EXPENSE",
      data: { amount: 3250000, category: "해외 출장비" },
      createdAtOffset: -6,
      escalatedAt: new Date("2026-03-10"),
      steps: [
        { stepOrder: 1, approverNumber: "EMP-20240101", status: ApprovalRequestStatus.APPROVED, actionAt: new Date("2026-03-07T09:00:00") },
        { stepOrder: 2, approverNumber: "EMP-20200101", status: ApprovalRequestStatus.ESCALATED, comment: "금액이 커서 상위 결재 필요", actionAt: new Date("2026-03-10T10:00:00") },
      ],
    },
  ];

  for (const def of approvalRequestDefs) {
    const wfId = workflowIds[def.workflowName];
    const requesterId = employeeIds[def.requesterNumber];
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() + def.createdAtOffset);

    const request = await prisma.approvalRequest.create({
      data: {
        tenantId: acme.id,
        workflowId: wfId,
        requesterId,
        title: def.title,
        description: def.description,
        status: def.status,
        priority: def.priority,
        requestType: def.requestType,
        data: def.data,
        escalatedAt: def.escalatedAt,
        completedAt: def.completedAt,
        createdAt,
      },
    });

    for (const step of def.steps) {
      const approverId = employeeIds[step.approverNumber];
      await prisma.approvalStep.create({
        data: {
          tenantId: acme.id,
          requestId: request.id,
          stepOrder: step.stepOrder,
          approverId,
          status: step.status,
          comment: step.comment,
          actionAt: step.actionAt,
        },
      });
    }
  }

  // ─── Document Templates (Acme, 4 templates) ──────────────

  const templateDefs = [
    {
      name: "근로계약서",
      description: "표준 근로계약서 양식 (정규직/계약직)",
      category: DocumentTemplateCategory.CONTRACT,
      content: {
        sections: [
          { title: "계약 당사자", fields: ["회사명", "근로자명", "주민등록번호"] },
          { title: "근로 조건", fields: ["근무지", "업무내용", "근로시간", "휴일"] },
          { title: "임금", fields: ["기본급", "수당", "지급일"] },
          { title: "계약 기간", fields: ["시작일", "종료일"] },
          { title: "서명", fields: ["사용자서명", "근로자서명", "날짜"] },
        ],
      },
      version: "3.2",
      usageCount: 128,
    },
    {
      name: "연봉 변경 통지서",
      description: "연봉 조정 및 변경 통지 양식",
      category: DocumentTemplateCategory.NOTICE,
      content: {
        sections: [
          { title: "수신자 정보", fields: ["성명", "사번", "부서", "직급"] },
          { title: "변경 내용", fields: ["현재 연봉", "변경 연봉", "변경 사유", "적용일"] },
          { title: "서명", fields: ["인사담당자서명", "근로자서명", "날짜"] },
        ],
      },
      version: "2.1",
      usageCount: 45,
    },
    {
      name: "비밀유지계약서 (NDA)",
      description: "기밀 정보 비밀유지 서약서",
      category: DocumentTemplateCategory.NDA,
      content: {
        sections: [
          { title: "계약 당사자", fields: ["공개자", "수신자"] },
          { title: "기밀 정보 범위", fields: ["기밀정보정의", "예외사항"] },
          { title: "의무 사항", fields: ["비밀유지의무", "사용제한", "반환의무"] },
          { title: "계약 기간", fields: ["유효기간", "존속조항"] },
          { title: "서명", fields: ["공개자서명", "수신자서명", "날짜"] },
        ],
      },
      version: "1.4",
      usageCount: 312,
    },
    {
      name: "퇴사 확인서",
      description: "퇴직 사실 확인 및 증명서",
      category: DocumentTemplateCategory.CERTIFICATE,
      content: {
        sections: [
          { title: "인적 사항", fields: ["성명", "사번", "부서", "직급"] },
          { title: "재직 정보", fields: ["입사일", "퇴사일", "퇴사사유"] },
          { title: "확인 사항", fields: ["업무인수인계", "장비반납", "보안서약"] },
          { title: "서명", fields: ["인사담당자서명", "퇴직자서명", "날짜"] },
        ],
      },
      version: "1.1",
      usageCount: 67,
    },
  ];

  const templateIds: Record<string, string> = {};
  for (const def of templateDefs) {
    const template = await prisma.documentTemplate.upsert({
      where: { tenantId_name: { tenantId: acme.id, name: def.name } },
      update: {},
      create: {
        tenantId: acme.id,
        name: def.name,
        description: def.description,
        category: def.category,
        content: def.content,
        version: def.version,
        usageCount: def.usageCount,
      },
    });
    templateIds[def.name] = template.id;
  }

  // ─── Documents (Acme, sample documents) ───────────────────

  const documentDefs: {
    templateName: string;
    senderNumber: string;
    recipientNumber: string;
    title: string;
    status: DocumentStatus;
    deadline: string | null;
    sentAt: string | null;
    viewedAt: string | null;
    completedAt: string | null;
    memo: string | null;
  }[] = [
    {
      templateName: "근로계약서",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20240101",
      title: "근로계약서 갱신 — 조기획",
      status: DocumentStatus.SENT,
      deadline: "2026-03-13",
      sentAt: "2026-03-10",
      viewedAt: null,
      completedAt: null,
      memo: "계약 갱신 요청",
    },
    {
      templateName: "연봉 변경 통지서",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20220415",
      title: "연봉 변경 통지서 — 최직원",
      status: DocumentStatus.SENT,
      deadline: "2026-03-15",
      sentAt: "2026-03-11",
      viewedAt: null,
      completedAt: null,
      memo: "승진에 따른 연봉 조정",
    },
    {
      templateName: "비밀유지계약서 (NDA)",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20230201",
      title: "NDA 갱신 — 한프론트",
      status: DocumentStatus.SENT,
      deadline: "2026-03-20",
      sentAt: "2026-03-08",
      viewedAt: "2026-03-09",
      completedAt: null,
      memo: "연간 NDA 갱신",
    },
    {
      templateName: "근로계약서",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20210601",
      title: "근로계약서 — 박팀장",
      status: DocumentStatus.SIGNED,
      deadline: "2026-03-01",
      sentAt: "2026-02-20",
      viewedAt: "2026-02-21",
      completedAt: "2026-02-25",
      memo: null,
    },
    {
      templateName: "비밀유지계약서 (NDA)",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20220901",
      title: "NDA — 정시니어",
      status: DocumentStatus.SIGNED,
      deadline: "2026-02-28",
      sentAt: "2026-02-15",
      viewedAt: "2026-02-16",
      completedAt: "2026-02-20",
      memo: null,
    },
    {
      templateName: "퇴사 확인서",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20240601",
      title: "퇴사 확인서 — 강퇴사",
      status: DocumentStatus.DRAFT,
      deadline: null,
      sentAt: null,
      viewedAt: null,
      completedAt: null,
      memo: "퇴사 처리 예정",
    },
    {
      templateName: "연봉 변경 통지서",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20210601",
      title: "연봉 변경 통지서 — 박팀장",
      status: DocumentStatus.SIGNED,
      deadline: "2026-01-31",
      sentAt: "2026-01-15",
      viewedAt: "2026-01-16",
      completedAt: "2026-01-20",
      memo: null,
    },
    {
      templateName: "근로계약서",
      senderNumber: "EMP-20210301",
      recipientNumber: "EMP-20230601",
      title: "근로계약서 — 윤영업",
      status: DocumentStatus.EXPIRED,
      deadline: "2026-02-10",
      sentAt: "2026-01-25",
      viewedAt: null,
      completedAt: null,
      memo: "기한 만료",
    },
  ];

  const documentRecords: { id: string; recipientNumber: string }[] = [];
  for (const def of documentDefs) {
    const templateId = templateIds[def.templateName];
    const senderId = employeeIds[def.senderNumber];
    const recipientId = employeeIds[def.recipientNumber];

    const doc = await prisma.document.create({
      data: {
        tenantId: acme.id,
        templateId,
        senderId,
        recipientId,
        title: def.title,
        status: def.status,
        deadline: def.deadline ? new Date(def.deadline) : undefined,
        sentAt: def.sentAt ? new Date(def.sentAt) : undefined,
        viewedAt: def.viewedAt ? new Date(def.viewedAt) : undefined,
        completedAt: def.completedAt ? new Date(def.completedAt) : undefined,
        memo: def.memo,
      },
    });
    documentRecords.push({ id: doc.id, recipientNumber: def.recipientNumber });
  }

  // ─── Signatures (for signed documents) ──────────────────────

  const signedDocs = documentDefs
    .map((def, idx) => ({ ...def, docId: documentRecords[idx].id }))
    .filter((d) => d.status === DocumentStatus.SIGNED);

  for (const sd of signedDocs) {
    const signerId = employeeIds[sd.recipientNumber];
    await prisma.signature.create({
      data: {
        tenantId: acme.id,
        documentId: sd.docId,
        signerId,
        signatureData: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`,
        ipAddress: "192.168.1.100",
        signedAt: sd.completedAt ? new Date(sd.completedAt) : new Date(),
      },
    });
  }

  // ─── Payroll Rules (6 rules) ────────────────────────────────

  const payrollRuleDefs: {
    name: string;
    type: PayrollRuleType;
    description: string;
    formula: string;
    rate: number | null;
    sortOrder: number;
  }[] = [
    {
      name: "기본급",
      type: PayrollRuleType.FIXED,
      description: "연봉을 12개월로 나눈 월 기본급",
      formula: "연봉 / 12",
      rate: null,
      sortOrder: 1,
    },
    {
      name: "초과근무 수당",
      type: PayrollRuleType.VARIABLE,
      description: "통상시급의 1.5배로 초과근무 시간에 대해 지급",
      formula: "통상시급 × 1.5 × 초과시간",
      rate: 1.5,
      sortOrder: 2,
    },
    {
      name: "야간근무 수당",
      type: PayrollRuleType.VARIABLE,
      description: "22:00~06:00 야간근무 시간에 대해 통상시급의 0.5배 추가 지급",
      formula: "통상시급 × 0.5 × 야간시간",
      rate: 0.5,
      sortOrder: 3,
    },
    {
      name: "국민연금",
      type: PayrollRuleType.DEDUCTION,
      description: "기준소득월액의 4.5%를 공제",
      formula: "기준소득월액 × 4.5%",
      rate: 0.045,
      sortOrder: 4,
    },
    {
      name: "건강보험",
      type: PayrollRuleType.DEDUCTION,
      description: "보수월액의 3.545%를 공제",
      formula: "보수월액 × 3.545%",
      rate: 0.03545,
      sortOrder: 5,
    },
    {
      name: "소득세",
      type: PayrollRuleType.DEDUCTION,
      description: "간이세액표 기준 원천징수",
      formula: "간이세액표 기준",
      rate: null,
      sortOrder: 6,
    },
  ];

  for (const def of payrollRuleDefs) {
    await prisma.payrollRule.upsert({
      where: { tenantId_name: { tenantId: acme.id, name: def.name } },
      update: {},
      create: {
        tenantId: acme.id,
        name: def.name,
        type: def.type,
        description: def.description,
        formula: def.formula,
        rate: def.rate,
        sortOrder: def.sortOrder,
      },
    });
  }

  // ─── Payroll Run (2 runs: Feb closed, Mar in-progress) ────────

  const payrollRunFeb = await prisma.payrollRun.upsert({
    where: { tenantId_year_month: { tenantId: acme.id, year: 2026, month: 2 } },
    update: {},
    create: {
      tenantId: acme.id,
      year: 2026,
      month: 2,
      status: PayrollRunStatus.CONFIRMED,
      currentStep: 5,
      totalEmployees: 8,
      totalAmount: 31200000,
      confirmedAt: new Date("2026-02-25"),
    },
  });

  const payrollRunMar = await prisma.payrollRun.upsert({
    where: { tenantId_year_month: { tenantId: acme.id, year: 2026, month: 3 } },
    update: {},
    create: {
      tenantId: acme.id,
      year: 2026,
      month: 3,
      status: PayrollRunStatus.CALCULATION,
      currentStep: 3,
      totalEmployees: 8,
      totalAmount: 0,
    },
  });

  // ─── Payslips (Feb confirmed payslips for active employees) ────

  const payslipDefs: {
    empNumber: string;
    baseSalary: number;
    allowances: number;
    deductions: number;
    netAmount: number;
    status: PayslipStatus;
    sentAt: string | null;
  }[] = [
    { empNumber: "EMP-20200101", baseSalary: 4166667, allowances: 320000, deductions: 845200, netAmount: 3641467, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
    { empNumber: "EMP-20210301", baseSalary: 4583333, allowances: 680000, deductions: 1012400, netAmount: 4250933, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
    { empNumber: "EMP-20210601", baseSalary: 3750000, allowances: 150000, deductions: 734800, netAmount: 3165200, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
    { empNumber: "EMP-20220415", baseSalary: 4000000, allowances: 200000, deductions: 789600, netAmount: 3410400, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
    { empNumber: "EMP-20220901", baseSalary: 5000000, allowances: 250000, deductions: 1047500, netAmount: 4202500, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
    { empNumber: "EMP-20230201", baseSalary: 3333333, allowances: 100000, deductions: 646000, netAmount: 2787333, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
    { empNumber: "EMP-20230601", baseSalary: 2916667, allowances: 80000, deductions: 564250, netAmount: 2432417, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
    { empNumber: "EMP-20240101", baseSalary: 2500000, allowances: 50000, deductions: 480000, netAmount: 2070000, status: PayslipStatus.SENT, sentAt: "2026-02-25" },
  ];

  for (const def of payslipDefs) {
    const empId = employeeIds[def.empNumber];
    if (!empId) continue;

    await prisma.payslip.upsert({
      where: { payrollRunId_employeeId: { payrollRunId: payrollRunFeb.id, employeeId: empId } },
      update: {},
      create: {
        tenantId: acme.id,
        payrollRunId: payrollRunFeb.id,
        employeeId: empId,
        baseSalary: def.baseSalary,
        allowances: def.allowances,
        deductions: def.deductions,
        netAmount: def.netAmount,
        breakdown: {
          baseSalary: def.baseSalary,
          overtimePay: def.allowances * 0.6,
          nightShiftPay: def.allowances * 0.4,
          nationalPension: def.deductions * 0.25,
          healthInsurance: def.deductions * 0.2,
          incomeTax: def.deductions * 0.55,
        },
        status: def.status,
        sentAt: def.sentAt ? new Date(def.sentAt) : undefined,
      },
    });
  }

  // Mar draft payslips (empty, waiting for calculation)
  for (const def of payslipDefs.slice(0, 5)) {
    const empId = employeeIds[def.empNumber];
    if (!empId) continue;

    await prisma.payslip.upsert({
      where: { payrollRunId_employeeId: { payrollRunId: payrollRunMar.id, employeeId: empId } },
      update: {},
      create: {
        tenantId: acme.id,
        payrollRunId: payrollRunMar.id,
        employeeId: empId,
        baseSalary: def.baseSalary,
        allowances: 0,
        deductions: 0,
        netAmount: 0,
        status: PayslipStatus.DRAFT,
      },
    });
  }

  // ─── Eval Cycles (Acme) ──────────────────────────────────

  const evalCycleH1 = await prisma.evalCycle.upsert({
    where: { tenantId_name: { tenantId: acme.id, name: "2026 H1 평가" } },
    update: {},
    create: {
      tenantId: acme.id,
      name: "2026 H1 평가",
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-06-30"),
      type: EvalCycleType.HALF_YEARLY,
      status: EvalCycleStatus.ACTIVE,
      weights: {
        performance: 40,
        competency: 30,
        collaboration: 20,
        leadership: 10,
      },
    },
  });

  const evalCycleH2_2025 = await prisma.evalCycle.upsert({
    where: { tenantId_name: { tenantId: acme.id, name: "2025 H2 평가" } },
    update: {},
    create: {
      tenantId: acme.id,
      name: "2025 H2 평가",
      startDate: new Date("2025-07-01"),
      endDate: new Date("2025-12-31"),
      type: EvalCycleType.HALF_YEARLY,
      status: EvalCycleStatus.CLOSED,
      weights: {
        performance: 40,
        competency: 30,
        collaboration: 20,
        leadership: 10,
      },
    },
  });

  // ─── Goals (Acme, active cycle) ──────────────────────────

  const goalDefs: {
    empNumber: string;
    title: string;
    description: string;
    progress: number;
    status: GoalStatus;
    weight: number;
    dueDate: string;
  }[] = [
    {
      empNumber: "EMP-20200101",
      title: "팀 생산성 20% 향상",
      description: "개발 프로세스 개선 및 자동화를 통한 팀 생산성 향상",
      progress: 65,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.5,
      dueDate: "2026-06-30",
    },
    {
      empNumber: "EMP-20200101",
      title: "기술 부채 해소",
      description: "레거시 코드 리팩토링 및 테스트 커버리지 80% 달성",
      progress: 40,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.0,
      dueDate: "2026-06-30",
    },
    {
      empNumber: "EMP-20210601",
      title: "신규 고객 관리 시스템 구축",
      description: "CRM 통합 및 고객 데이터 파이프라인 구축",
      progress: 80,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.5,
      dueDate: "2026-05-31",
    },
    {
      empNumber: "EMP-20210601",
      title: "팀 역량 강화",
      description: "팀원 기술 교육 프로그램 운영 및 멘토링",
      progress: 50,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.0,
      dueDate: "2026-06-30",
    },
    {
      empNumber: "EMP-20220415",
      title: "API 응답 속도 개선",
      description: "주요 API 엔드포인트 응답 시간 50% 감소",
      progress: 90,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.0,
      dueDate: "2026-04-30",
    },
    {
      empNumber: "EMP-20220901",
      title: "디자인 시스템 v2 구축",
      description: "모바일 반응형 컴포넌트 라이브러리 완성",
      progress: 100,
      status: GoalStatus.COMPLETED,
      weight: 1.5,
      dueDate: "2026-03-31",
    },
    {
      empNumber: "EMP-20230201",
      title: "프론트엔드 성능 최적화",
      description: "Core Web Vitals 지표 개선 (LCP < 2.5s, FID < 100ms)",
      progress: 30,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.0,
      dueDate: "2026-06-30",
    },
    {
      empNumber: "EMP-20230601",
      title: "분기 매출 목표 달성",
      description: "Q1 매출 목표 1.2억원 달성",
      progress: 70,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.5,
      dueDate: "2026-03-31",
    },
    {
      empNumber: "EMP-20240101",
      title: "신규 서비스 기획서 작성",
      description: "B2B SaaS 신규 기능 기획 및 로드맵 수립",
      progress: 0,
      status: GoalStatus.NOT_STARTED,
      weight: 1.0,
      dueDate: "2026-06-30",
    },
    {
      empNumber: "EMP-20210301",
      title: "HR 프로세스 디지털화",
      description: "수동 HR 프로세스 80% 자동화",
      progress: 55,
      status: GoalStatus.IN_PROGRESS,
      weight: 1.5,
      dueDate: "2026-06-30",
    },
  ];

  for (const def of goalDefs) {
    const empId = employeeIds[def.empNumber];
    if (!empId) continue;

    await prisma.goal.create({
      data: {
        tenantId: acme.id,
        employeeId: empId,
        cycleId: evalCycleH1.id,
        title: def.title,
        description: def.description,
        progress: def.progress,
        status: def.status,
        weight: def.weight,
        dueDate: new Date(def.dueDate),
      },
    });
  }

  // ─── Evaluations (Acme) ─────────────────────────────────

  const evaluationDefs: {
    empNumber: string;
    cycleId: string;
    status: EvaluationStatus;
    selfScore: number | null;
    peerScore: number | null;
    managerScore: number | null;
    finalScore: number | null;
    selfComment: string | null;
    managerComment: string | null;
  }[] = [
    // Current cycle (H1 2026) - in-progress evaluations
    {
      empNumber: "EMP-20200101",
      cycleId: evalCycleH1.id,
      status: EvaluationStatus.MANAGER_REVIEW,
      selfScore: 4.2,
      peerScore: 4.0,
      managerScore: null,
      finalScore: null,
      selfComment: "팀 생산성 향상 프로젝트를 성공적으로 진행 중입니다.",
      managerComment: null,
    },
    {
      empNumber: "EMP-20210601",
      cycleId: evalCycleH1.id,
      status: EvaluationStatus.PEER_REVIEW,
      selfScore: 3.8,
      peerScore: null,
      managerScore: null,
      finalScore: null,
      selfComment: "CRM 구축 프로젝트 80% 완료",
      managerComment: null,
    },
    {
      empNumber: "EMP-20220415",
      cycleId: evalCycleH1.id,
      status: EvaluationStatus.SELF_REVIEW,
      selfScore: null,
      peerScore: null,
      managerScore: null,
      finalScore: null,
      selfComment: null,
      managerComment: null,
    },
    {
      empNumber: "EMP-20220901",
      cycleId: evalCycleH1.id,
      status: EvaluationStatus.COMPLETED,
      selfScore: 4.5,
      peerScore: 4.3,
      managerScore: 4.4,
      finalScore: 4.4,
      selfComment: "디자인 시스템 v2를 성공적으로 완성했습니다.",
      managerComment: "우수한 성과입니다. 특히 반응형 컴포넌트 품질이 탁월합니다.",
    },
    {
      empNumber: "EMP-20230201",
      cycleId: evalCycleH1.id,
      status: EvaluationStatus.NOT_STARTED,
      selfScore: null,
      peerScore: null,
      managerScore: null,
      finalScore: null,
      selfComment: null,
      managerComment: null,
    },
    // Previous cycle (H2 2025) - all completed
    {
      empNumber: "EMP-20200101",
      cycleId: evalCycleH2_2025.id,
      status: EvaluationStatus.COMPLETED,
      selfScore: 4.0,
      peerScore: 4.1,
      managerScore: 4.3,
      finalScore: 4.2,
      selfComment: "인프라 안정화 프로젝트 완료",
      managerComment: "리더십과 기술력 모두 우수",
    },
    {
      empNumber: "EMP-20210601",
      cycleId: evalCycleH2_2025.id,
      status: EvaluationStatus.COMPLETED,
      selfScore: 3.5,
      peerScore: 3.8,
      managerScore: 3.7,
      finalScore: 3.7,
      selfComment: "팀 관리 역량을 키우고 있습니다",
      managerComment: "성장세가 눈에 띕니다. 계속 발전하기 바랍니다.",
    },
  ];

  for (const def of evaluationDefs) {
    const empId = employeeIds[def.empNumber];
    if (!empId) continue;

    await prisma.evaluation.upsert({
      where: {
        tenantId_employeeId_cycleId: {
          tenantId: acme.id,
          employeeId: empId,
          cycleId: def.cycleId,
        },
      },
      update: {},
      create: {
        tenantId: acme.id,
        employeeId: empId,
        cycleId: def.cycleId,
        status: def.status,
        selfScore: def.selfScore,
        peerScore: def.peerScore,
        managerScore: def.managerScore,
        finalScore: def.finalScore,
        selfComment: def.selfComment,
        managerComment: def.managerComment,
      },
    });
  }

  // ─── OneOnOnes (Acme) ──────────────────────────────────

  const oneOnOneDefs: {
    managerNumber: string;
    employeeNumber: string;
    scheduledAt: string;
    duration: number;
    status: OneOnOneStatus;
    agenda: string;
    notes: string | null;
  }[] = [
    {
      managerNumber: "EMP-20210601",
      employeeNumber: "EMP-20220415",
      scheduledAt: "2026-03-14T10:00:00",
      duration: 30,
      status: OneOnOneStatus.SCHEDULED,
      agenda: "API 성능 개선 진행 상황, Q2 목표 설정",
      notes: null,
    },
    {
      managerNumber: "EMP-20210601",
      employeeNumber: "EMP-20230201",
      scheduledAt: "2026-03-14T14:00:00",
      duration: 30,
      status: OneOnOneStatus.SCHEDULED,
      agenda: "프론트엔드 성능 최적화 방향, 커리어 개발",
      notes: null,
    },
    {
      managerNumber: "EMP-20200101",
      employeeNumber: "EMP-20210601",
      scheduledAt: "2026-03-17T11:00:00",
      duration: 45,
      status: OneOnOneStatus.SCHEDULED,
      agenda: "팀 운영 현황, H1 평가 진행 점검, 채용 계획",
      notes: null,
    },
    {
      managerNumber: "EMP-20200101",
      employeeNumber: "EMP-20220901",
      scheduledAt: "2026-03-18T10:00:00",
      duration: 30,
      status: OneOnOneStatus.SCHEDULED,
      agenda: "디자인 시스템 v2 완료 회고, 다음 프로젝트 논의",
      notes: null,
    },
    // Completed 1:1s
    {
      managerNumber: "EMP-20210601",
      employeeNumber: "EMP-20220415",
      scheduledAt: "2026-03-07T10:00:00",
      duration: 30,
      status: OneOnOneStatus.COMPLETED,
      agenda: "API 성능 개선 중간 점검",
      notes: "캐싱 전략 도입으로 응답 시간 30% 개선 확인. 나머지 20% 최적화를 위해 DB 인덱스 튜닝 진행 예정.",
    },
    {
      managerNumber: "EMP-20210601",
      employeeNumber: "EMP-20230201",
      scheduledAt: "2026-03-07T14:00:00",
      duration: 30,
      status: OneOnOneStatus.COMPLETED,
      agenda: "프론트엔드 코드 리뷰 피드백, 학습 계획",
      notes: "React 성능 최적화 온라인 과정 수강 권장. 코드 리뷰 품질 향상됨.",
    },
    {
      managerNumber: "EMP-20200101",
      employeeNumber: "EMP-20210601",
      scheduledAt: "2026-03-03T11:00:00",
      duration: 45,
      status: OneOnOneStatus.COMPLETED,
      agenda: "Q1 OKR 중간 점검, 팀 이슈",
      notes: "CRM 프로젝트 일정 내 진행 중. 신규 채용 1명 필요, JD 작성 예정.",
    },
    {
      managerNumber: "EMP-20200101",
      employeeNumber: "EMP-20210301",
      scheduledAt: "2026-03-05T15:00:00",
      duration: 30,
      status: OneOnOneStatus.COMPLETED,
      agenda: "HR 디지털화 진행 현황",
      notes: "전자문서 시스템 도입 완료. 다음 단계로 급여 자동화 검토 중.",
    },
  ];

  for (const def of oneOnOneDefs) {
    const managerId = employeeIds[def.managerNumber];
    const empId = employeeIds[def.employeeNumber];
    if (!managerId || !empId) continue;

    await prisma.oneOnOne.create({
      data: {
        tenantId: acme.id,
        managerId,
        employeeId: empId,
        scheduledAt: new Date(def.scheduledAt),
        duration: def.duration,
        status: def.status,
        agenda: def.agenda,
        notes: def.notes,
      },
    });
  }

  // ─── Job Postings (Acme) ──────────────────────────────────

  const jobPostingDefs: {
    title: string;
    departmentCode: string;
    hiringManagerNumber: string;
    status: JobPostingStatus;
    description: string;
    requirements: string;
    location: string;
    employmentType: EmploymentType;
    headcount: number;
    openDate: string | null;
    closeDate: string | null;
  }[] = [
    {
      title: "시니어 백엔드 개발자",
      departmentCode: "DEV",
      hiringManagerNumber: "EMP-20200101",
      status: JobPostingStatus.OPEN,
      description: "대규모 트래픽을 처리하는 백엔드 시스템 설계 및 개발",
      requirements: "Node.js/TypeScript 5년+, PostgreSQL, AWS 경험",
      location: "서울 강남구",
      employmentType: EmploymentType.FULL_TIME,
      headcount: 2,
      openDate: "2026-02-15",
      closeDate: "2026-04-15",
    },
    {
      title: "프론트엔드 개발자",
      departmentCode: "DEV",
      hiringManagerNumber: "EMP-20210601",
      status: JobPostingStatus.OPEN,
      description: "React/Next.js 기반 HR SaaS 프론트엔드 개발",
      requirements: "React 3년+, TypeScript, 디자인 시스템 경험 우대",
      location: "서울 강남구",
      employmentType: EmploymentType.FULL_TIME,
      headcount: 1,
      openDate: "2026-03-01",
      closeDate: "2026-04-30",
    },
    {
      title: "데이터 분석 인턴",
      departmentCode: "DEV",
      hiringManagerNumber: "EMP-20200101",
      status: JobPostingStatus.OPEN,
      description: "HR 데이터 분석 및 인사이트 도출, 대시보드 구축 지원",
      requirements: "Python, SQL 기본 역량, 통계학/데이터 분석 전공 우대",
      location: "서울 강남구",
      employmentType: EmploymentType.INTERN,
      headcount: 1,
      openDate: "2026-03-10",
      closeDate: "2026-05-31",
    },
    {
      title: "HR 매니저",
      departmentCode: "HR",
      hiringManagerNumber: "EMP-20210301",
      status: JobPostingStatus.CLOSED,
      description: "인사 운영 총괄 및 채용/교육/평가 프로세스 관리",
      requirements: "HR 경력 7년+, 노무 관련 자격증 보유자 우대",
      location: "서울 강남구",
      employmentType: EmploymentType.FULL_TIME,
      headcount: 1,
      openDate: "2026-01-10",
      closeDate: "2026-02-28",
    },
    {
      title: "영업 담당자",
      departmentCode: "SALES",
      hiringManagerNumber: "EMP-20200101",
      status: JobPostingStatus.DRAFT,
      description: "B2B SaaS 신규 고객 발굴 및 기존 고객 관리",
      requirements: "B2B 영업 3년+, SaaS 도메인 경험 우대",
      location: "서울 강남구",
      employmentType: EmploymentType.FULL_TIME,
      headcount: 2,
      openDate: null,
      closeDate: null,
    },
  ];

  const jobPostingIds: Record<string, string> = {};
  for (const def of jobPostingDefs) {
    const hiringManagerId = employeeIds[def.hiringManagerNumber];
    const jp = await prisma.jobPosting.upsert({
      where: { tenantId_title: { tenantId: acme.id, title: def.title } },
      update: {},
      create: {
        tenantId: acme.id,
        title: def.title,
        hiringManagerId,
        status: def.status,
        description: def.description,
        requirements: def.requirements,
        location: def.location,
        employmentType: def.employmentType,
        headcount: def.headcount,
        openDate: def.openDate ? new Date(def.openDate) : undefined,
        closeDate: def.closeDate ? new Date(def.closeDate) : undefined,
      },
    });
    jobPostingIds[def.title] = jp.id;
  }

  // ─── Applications (Acme) ──────────────────────────────────

  const applicationDefs: {
    jobTitle: string;
    candidateName: string;
    candidateEmail: string;
    candidatePhone: string;
    status: ApplicationStatus;
    stage: number;
    rating: number | null;
    notes: string | null;
    appliedAt: string;
    hiredAt: string | null;
    rejectedAt: string | null;
    assigneeNumber: string;
  }[] = [
    {
      jobTitle: "시니어 백엔드 개발자",
      candidateName: "김서버",
      candidateEmail: "kim.server@example.com",
      candidatePhone: "010-1111-2222",
      status: ApplicationStatus.SECOND_INTERVIEW,
      stage: 3,
      rating: 4,
      notes: "시스템 설계 역량 우수, 2차 기술 면접 예정",
      appliedAt: "2026-02-20",
      hiredAt: null,
      rejectedAt: null,
      assigneeNumber: "EMP-20200101",
    },
    {
      jobTitle: "시니어 백엔드 개발자",
      candidateName: "이클라우드",
      candidateEmail: "lee.cloud@example.com",
      candidatePhone: "010-3333-4444",
      status: ApplicationStatus.FIRST_INTERVIEW,
      stage: 2,
      rating: 3,
      notes: "AWS 경험 풍부, 1차 면접 통과",
      appliedAt: "2026-02-25",
      hiredAt: null,
      rejectedAt: null,
      assigneeNumber: "EMP-20200101",
    },
    {
      jobTitle: "시니어 백엔드 개발자",
      candidateName: "박노드",
      candidateEmail: "park.node@example.com",
      candidatePhone: "010-5555-6666",
      status: ApplicationStatus.SCREENING,
      stage: 1,
      rating: null,
      notes: null,
      appliedAt: "2026-03-05",
      hiredAt: null,
      rejectedAt: null,
      assigneeNumber: "EMP-20200101",
    },
    {
      jobTitle: "시니어 백엔드 개발자",
      candidateName: "정데이터",
      candidateEmail: "jung.data@example.com",
      candidatePhone: "010-7777-8888",
      status: ApplicationStatus.REJECTED,
      stage: 2,
      rating: 2,
      notes: "기술 역량 부족",
      appliedAt: "2026-02-18",
      hiredAt: null,
      rejectedAt: "2026-03-01",
      assigneeNumber: "EMP-20200101",
    },
    {
      jobTitle: "프론트엔드 개발자",
      candidateName: "최리액트",
      candidateEmail: "choi.react@example.com",
      candidatePhone: "010-9999-0000",
      status: ApplicationStatus.FINAL,
      stage: 4,
      rating: 5,
      notes: "디자인 시스템 경험 우수, 최종 면접 통과 — 오퍼 준비 중",
      appliedAt: "2026-03-03",
      hiredAt: null,
      rejectedAt: null,
      assigneeNumber: "EMP-20210601",
    },
    {
      jobTitle: "프론트엔드 개발자",
      candidateName: "강타입",
      candidateEmail: "kang.type@example.com",
      candidatePhone: "010-1234-5678",
      status: ApplicationStatus.FIRST_INTERVIEW,
      stage: 2,
      rating: 3,
      notes: "TypeScript 역량 양호",
      appliedAt: "2026-03-08",
      hiredAt: null,
      rejectedAt: null,
      assigneeNumber: "EMP-20210601",
    },
    {
      jobTitle: "데이터 분석 인턴",
      candidateName: "윤파이썬",
      candidateEmail: "yoon.python@example.com",
      candidatePhone: "010-2345-6789",
      status: ApplicationStatus.APPLIED,
      stage: 1,
      rating: null,
      notes: null,
      appliedAt: "2026-03-12",
      hiredAt: null,
      rejectedAt: null,
      assigneeNumber: "EMP-20200101",
    },
    {
      jobTitle: "HR 매니저",
      candidateName: "송인사",
      candidateEmail: "song.hr@example.com",
      candidatePhone: "010-3456-7890",
      status: ApplicationStatus.HIRED,
      stage: 4,
      rating: 5,
      notes: "채용 확정, 4월 입사 예정",
      appliedAt: "2026-01-15",
      hiredAt: "2026-02-20",
      rejectedAt: null,
      assigneeNumber: "EMP-20210301",
    },
  ];

  for (const def of applicationDefs) {
    const jpId = jobPostingIds[def.jobTitle];
    const assigneeId = employeeIds[def.assigneeNumber];

    await prisma.application.create({
      data: {
        tenantId: acme.id,
        jobPostingId: jpId,
        candidateName: def.candidateName,
        candidateEmail: def.candidateEmail,
        candidatePhone: def.candidatePhone,
        status: def.status,
        stage: def.stage,
        rating: def.rating,
        notes: def.notes,
        appliedAt: new Date(def.appliedAt),
        hiredAt: def.hiredAt ? new Date(def.hiredAt) : undefined,
        rejectedAt: def.rejectedAt ? new Date(def.rejectedAt) : undefined,
        assigneeId: assigneeId,
      },
    });
  }

  // ─── Onboarding Tasks (Acme, for new hire EMP-20240101) ─────

  const onboardingDefs: {
    empNumber: string;
    title: string;
    description: string;
    category: string;
    status: BoardingTaskStatus;
    dueDate: string;
    completedAt: string | null;
    sortOrder: number;
  }[] = [
    {
      empNumber: "EMP-20240101",
      title: "노트북 및 장비 지급",
      description: "업무용 노트북, 모니터, 키보드/마우스 세팅",
      category: "IT",
      status: BoardingTaskStatus.COMPLETED,
      dueDate: "2026-01-02",
      completedAt: "2026-01-02",
      sortOrder: 1,
    },
    {
      empNumber: "EMP-20240101",
      title: "계정 생성 (이메일, Slack, Jira)",
      description: "사내 이메일, 협업 도구, 프로젝트 관리 도구 계정 발급",
      category: "IT",
      status: BoardingTaskStatus.COMPLETED,
      dueDate: "2026-01-02",
      completedAt: "2026-01-02",
      sortOrder: 2,
    },
    {
      empNumber: "EMP-20240101",
      title: "근로계약서 서명",
      description: "전자문서 시스템을 통한 근로계약서 서명",
      category: "HR",
      status: BoardingTaskStatus.COMPLETED,
      dueDate: "2026-01-03",
      completedAt: "2026-01-03",
      sortOrder: 3,
    },
    {
      empNumber: "EMP-20240101",
      title: "사내 규정 교육",
      description: "취업규칙, 보안 규정, 개인정보 처리방침 교육 이수",
      category: "HR",
      status: BoardingTaskStatus.COMPLETED,
      dueDate: "2026-01-05",
      completedAt: "2026-01-04",
      sortOrder: 4,
    },
    {
      empNumber: "EMP-20240101",
      title: "사원증 발급",
      description: "사원증 사진 촬영 및 출입카드 발급",
      category: "ADMIN",
      status: BoardingTaskStatus.COMPLETED,
      dueDate: "2026-01-05",
      completedAt: "2026-01-05",
      sortOrder: 5,
    },
    {
      empNumber: "EMP-20240101",
      title: "팀 소개 및 멘토 배정",
      description: "팀원 소개, 온보딩 멘토 배정, 첫 1:1 일정 수립",
      category: "TEAM",
      status: BoardingTaskStatus.COMPLETED,
      dueDate: "2026-01-03",
      completedAt: "2026-01-03",
      sortOrder: 6,
    },
  ];

  for (const def of onboardingDefs) {
    const empId = employeeIds[def.empNumber];
    if (!empId) continue;

    await prisma.onboardingTask.create({
      data: {
        tenantId: acme.id,
        employeeId: empId,
        title: def.title,
        description: def.description,
        category: def.category,
        status: def.status,
        dueDate: new Date(def.dueDate),
        completedAt: def.completedAt ? new Date(def.completedAt) : undefined,
        sortOrder: def.sortOrder,
      },
    });
  }

  // ─── Offboarding Tasks (Acme, for resigned EMP-20240601) ────

  const offboardingDefs: {
    empNumber: string;
    title: string;
    description: string;
    category: string;
    status: BoardingTaskStatus;
    dueDate: string;
    completedAt: string | null;
    sortOrder: number;
  }[] = [
    {
      empNumber: "EMP-20240601",
      title: "업무 인수인계",
      description: "담당 업무 목록 정리 및 후임자 인수인계",
      category: "TEAM",
      status: BoardingTaskStatus.IN_PROGRESS,
      dueDate: "2026-03-20",
      completedAt: null,
      sortOrder: 1,
    },
    {
      empNumber: "EMP-20240601",
      title: "장비 반납",
      description: "노트북, 모니터, 사원증, 출입카드 반납",
      category: "IT",
      status: BoardingTaskStatus.PENDING,
      dueDate: "2026-03-25",
      completedAt: null,
      sortOrder: 2,
    },
    {
      empNumber: "EMP-20240601",
      title: "계정 비활성화",
      description: "이메일, Slack, Jira 등 사내 시스템 계정 비활성화",
      category: "IT",
      status: BoardingTaskStatus.PENDING,
      dueDate: "2026-03-25",
      completedAt: null,
      sortOrder: 3,
    },
    {
      empNumber: "EMP-20240601",
      title: "퇴사 확인서 발급",
      description: "퇴직 사실 확인서 및 경력증명서 발급",
      category: "HR",
      status: BoardingTaskStatus.PENDING,
      dueDate: "2026-03-25",
      completedAt: null,
      sortOrder: 4,
    },
    {
      empNumber: "EMP-20240601",
      title: "최종 급여 정산",
      description: "잔여 연차 수당, 퇴직금 산정 및 정산",
      category: "FINANCE",
      status: BoardingTaskStatus.PENDING,
      dueDate: "2026-03-28",
      completedAt: null,
      sortOrder: 5,
    },
    {
      empNumber: "EMP-20240601",
      title: "비밀유지 서약서",
      description: "퇴사 후 비밀유지 서약서 서명",
      category: "LEGAL",
      status: BoardingTaskStatus.PENDING,
      dueDate: "2026-03-25",
      completedAt: null,
      sortOrder: 6,
    },
  ];

  for (const def of offboardingDefs) {
    const empId = employeeIds[def.empNumber];
    if (!empId) continue;

    await prisma.offboardingTask.create({
      data: {
        tenantId: acme.id,
        employeeId: empId,
        title: def.title,
        description: def.description,
        category: def.category,
        status: def.status,
        dueDate: new Date(def.dueDate),
        completedAt: def.completedAt ? new Date(def.completedAt) : undefined,
        sortOrder: def.sortOrder,
      },
    });
  }

  console.log(
    "Seed completed: 2 tenants, 9 roles, 7 users, 9 departments, 9 positions, 10 employees, 11 changes, 5 shifts, 8 assignments, 40 attendance records, 4 exceptions, 2 closings, 5 leave policies, 10 leave balances, 6 leave requests, 3 workflows, 10 approval requests, 4 document templates, 8 documents, 3 signatures, 6 payroll rules, 2 payroll runs, 13 payslips, 2 eval cycles, 10 goals, 7 evaluations, 8 one-on-ones, 5 job postings, 8 applications, 6 onboarding tasks, 6 offboarding tasks",
  );
}

interface TenantRoleIds {
  SUPER_ADMIN: string;
  HR_ADMIN: string;
  MANAGER: string;
  EMPLOYEE: string;
}

const TENANT_ROLE_DEFS: {
  name: keyof TenantRoleIds;
  description: string;
  permissions: string[];
}[] = [
  {
    name: "SUPER_ADMIN",
    description: "최고 관리자 (모든 권한)",
    permissions: [
      "PEOPLE_MANAGE",
      "ATTENDANCE_MANAGE",
      "LEAVE_MANAGE",
      "PAYROLL_MANAGE",
      "APPROVAL_MANAGE",
      "DOCUMENT_MANAGE",
      "PERFORMANCE_MANAGE",
      "RECRUITING_MANAGE",
      "REPORTS_VIEW",
      "SETTINGS_EDIT",
    ],
  },
  {
    name: "HR_ADMIN",
    description: "HR 관리자 (설정 제외 전체)",
    permissions: [
      "PEOPLE_MANAGE",
      "ATTENDANCE_MANAGE",
      "LEAVE_MANAGE",
      "PAYROLL_MANAGE",
      "APPROVAL_MANAGE",
      "DOCUMENT_MANAGE",
      "PERFORMANCE_MANAGE",
      "RECRUITING_MANAGE",
      "REPORTS_VIEW",
    ],
  },
  {
    name: "MANAGER",
    description: "부서/팀 관리자",
    permissions: [
      "PEOPLE_MANAGE",
      "ATTENDANCE_MANAGE",
      "LEAVE_MANAGE",
      "APPROVAL_MANAGE",
      "PERFORMANCE_MANAGE",
      "REPORTS_VIEW",
    ],
  },
  {
    name: "EMPLOYEE",
    description: "일반 직원 (셀프서비스)",
    permissions: [
      "ATTENDANCE_SELF",
      "LEAVE_SELF",
      "DOCUMENT_SELF",
      "PERFORMANCE_SELF",
    ],
  },
];

async function createTenantRoles(tenantId: string): Promise<TenantRoleIds> {
  const ids: Partial<TenantRoleIds> = {};

  for (const def of TENANT_ROLE_DEFS) {
    const role = await prisma.role.upsert({
      where: { tenantId_name: { tenantId, name: def.name } },
      update: {},
      create: {
        tenantId,
        name: def.name,
        description: def.description,
        permissions: def.permissions,
        isSystem: true,
      },
    });
    ids[def.name] = role.id;
  }

  return ids as TenantRoleIds;
}

async function upsertDepartment(
  tenantId: string,
  code: string,
  _shortCode: string,
  name: string,
  parentId: string | null,
  sortOrder: number,
): Promise<{ id: string }> {
  const dept = await prisma.department.upsert({
    where: { tenantId_code: { tenantId, code } },
    update: {},
    create: {
      tenantId,
      name,
      code,
      parentId,
      sortOrder,
    },
  });
  return dept;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
