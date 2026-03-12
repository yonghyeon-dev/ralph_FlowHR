import {
  PrismaClient,
  TenantPlan,
  TenantStatus,
  UserStatus,
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e: unknown) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
