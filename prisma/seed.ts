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

  console.log(
    "Seed completed: 2 tenants, 9 roles, 7 users, 9 departments, 9 positions, 10 employees, 11 changes, 5 shifts, 8 assignments, 40 attendance records, 4 exceptions, 2 closings, 5 leave policies, 10 leave balances, 6 leave requests",
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
