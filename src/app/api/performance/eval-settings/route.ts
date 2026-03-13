import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

interface WeightsPayload {
  performance: number;
  competency: number;
  collaboration: number;
  leadership: number;
}

interface UpdateBody {
  id?: string;
  name: string;
  startDate: string;
  endDate: string;
  type: "HALF_YEARLY" | "QUARTERLY" | "ANNUAL";
  weights: WeightsPayload;
}

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;

  const cycles = await prisma.evalCycle.findMany({
    where: { tenantId },
    orderBy: { startDate: "desc" },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      type: true,
      status: true,
      weights: true,
    },
  });

  const formatted = cycles.map((c) => ({
    id: c.id,
    name: c.name,
    startDate: c.startDate.toISOString().slice(0, 10),
    endDate: c.endDate.toISOString().slice(0, 10),
    type: c.type,
    status: c.status,
    weights: (c.weights as WeightsPayload | null) ?? {
      performance: 40,
      competency: 30,
      collaboration: 20,
      leadership: 10,
    },
  }));

  return NextResponse.json({ cycles: formatted });
}

export async function PUT(request: NextRequest) {
  const token = await getToken({ req: request });
  if (!token || !token.tenantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tenantId = token.tenantId as string;
  const body: UpdateBody = await request.json();

  const { name, startDate, endDate, type, weights } = body;

  if (!name || !startDate || !endDate || !type || !weights) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 },
    );
  }

  const totalWeight =
    weights.performance +
    weights.competency +
    weights.collaboration +
    weights.leadership;
  if (totalWeight !== 100) {
    return NextResponse.json(
      { error: "Weights must sum to 100" },
      { status: 400 },
    );
  }

  const weightsJson = weights as unknown as Prisma.InputJsonValue;

  if (body.id) {
    const updated = await prisma.evalCycle.update({
      where: { id: body.id },
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        type,
        weights: weightsJson,
      },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      startDate: updated.startDate.toISOString().slice(0, 10),
      endDate: updated.endDate.toISOString().slice(0, 10),
      type: updated.type,
      status: updated.status,
      weights,
    });
  }

  const created = await prisma.evalCycle.create({
    data: {
      tenantId,
      name,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      status: "DRAFT",
      weights: weightsJson,
    },
  });

  return NextResponse.json(
    {
      id: created.id,
      name: created.name,
      startDate: created.startDate.toISOString().slice(0, 10),
      endDate: created.endDate.toISOString().slice(0, 10),
      type: created.type,
      status: created.status,
      weights,
    },
    { status: 201 },
  );
}
