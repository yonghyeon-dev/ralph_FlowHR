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

  console.log(
    "Seed completed: 2 tenants, 9 roles, 7 users, 9 departments, 9 positions, 10 employees, 11 changes, 5 shifts, 8 assignments, 40 attendance records, 4 exceptions, 2 closings, 5 leave policies, 10 leave balances, 6 leave requests, 3 workflows, 10 approval requests, 4 document templates, 8 documents, 3 signatures, 6 payroll rules, 2 payroll runs, 13 payslips",
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
