import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ─── Plans ────────────────────────────────────────────
  const plans = await prisma.plan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { billingAccounts: true } },
    },
  });

  // ─── Billing Accounts ─────────────────────────────────
  const billingAccounts = await prisma.billingAccount.findMany({
    include: {
      tenant: { select: { name: true } },
      plan: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // ─── Invoices ──────────────────────────────────────────
  const invoices = await prisma.invoice.findMany({
    include: {
      tenant: { select: { name: true } },
    },
    orderBy: { issuedDate: "desc" },
  });

  // ─── KPI: MRR ──────────────────────────────────────────
  const activeAccounts = billingAccounts.filter(
    (ba) => ba.status === "ACTIVE",
  );
  const mrr = activeAccounts.reduce((sum, ba) => sum + ba.monthlyAmount, 0);

  // ─── KPI: ACV ──────────────────────────────────────────
  const acv = mrr * 12;

  // ─── KPI: 미수금 (Accounts Receivable) ─────────────────
  const overdueInvoices = invoices.filter(
    (inv) => inv.status === "OVERDUE" || inv.status === "ISSUED",
  );
  const accountsReceivable = overdueInvoices.reduce(
    (sum, inv) => sum + inv.amount,
    0,
  );

  // ─── KPI: 이탈률 (Churn Rate) ──────────────────────────
  const totalAccounts = billingAccounts.length;
  const failedOrSuspended = billingAccounts.filter(
    (ba) => ba.status === "FAILED" || ba.status === "SUSPENDED",
  ).length;
  const churnRate =
    totalAccounts > 0
      ? Math.round((failedOrSuspended / totalAccounts) * 1000) / 10
      : 0;

  // ─── Plan catalog data ─────────────────────────────────
  const planCatalog = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    pricePerSeat: p.pricePerSeat,
    maxSeats: p.maxSeats,
    storageGb: p.storageGb,
    apiCallsPerMonth: p.apiCallsPerMonth,
    supportLevel: p.supportLevel,
    features: p.features as string[],
    customerCount: p._count.billingAccounts,
  }));

  // ─── Billing account list ──────────────────────────────
  const billingList = billingAccounts.map((ba) => ({
    id: ba.id,
    tenantName: ba.tenant.name,
    planName: ba.plan.name,
    monthlyAmount: ba.monthlyAmount,
    paymentMethod: ba.paymentMethod,
    nextBillingDate: ba.nextBillingDate.toISOString(),
    status: ba.status,
  }));

  // ─── Invoice list ──────────────────────────────────────
  const invoiceList = invoices.map((inv) => ({
    id: inv.id,
    invoiceNumber: inv.invoiceNumber,
    tenantName: inv.tenant.name,
    period: inv.period,
    amount: inv.amount,
    issuedDate: inv.issuedDate.toISOString(),
    paidAt: inv.paidAt?.toISOString() ?? null,
    status: inv.status,
  }));

  return NextResponse.json({
    kpi: {
      mrr,
      acv,
      accountsReceivable,
      churnRate,
    },
    planCatalog,
    billingAccounts: billingList,
    invoices: invoiceList,
  });
}
