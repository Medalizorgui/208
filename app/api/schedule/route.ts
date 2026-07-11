import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/schedule?month=6&year=2026 — Get overrides for a month
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (month === null || year === null) {
      return NextResponse.json(
        { error: 'month and year query params are required' },
        { status: 400 }
      );
    }

    const assignments = await prisma.scheduleAssignment.findMany({
      where: {
        month: Number(month),
        year: Number(year),
      },
      include: {
        chief: { select: { id: true, name: true, specialty: true, position: true, group: true } },
        guard1: { select: { id: true, name: true, specialty: true, position: true, group: true } },
        guard2: { select: { id: true, name: true, specialty: true, position: true, group: true } },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Failed to fetch schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// PUT /api/schedule — Upsert a schedule override for a specific date
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { date, chiefId, guard1Id, guard2Id } = body;

    if (!date) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      );
    }

    const dateObj = new Date(date);
    const month = dateObj.getMonth();
    const year = dateObj.getFullYear();

    const assignment = await prisma.scheduleAssignment.upsert({
      where: { date: dateObj },
      create: {
        date: dateObj,
        month,
        year,
        chiefId: chiefId || null,
        guard1Id: guard1Id || null,
        guard2Id: guard2Id || null,
      },
      update: {
        chiefId: chiefId || null,
        guard1Id: guard1Id || null,
        guard2Id: guard2Id || null,
      },
      include: {
        chief: { select: { id: true, name: true, specialty: true, position: true, group: true } },
        guard1: { select: { id: true, name: true, specialty: true, position: true, group: true } },
        guard2: { select: { id: true, name: true, specialty: true, position: true, group: true } },
      },
    });

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Failed to save schedule override:', error);
    return NextResponse.json(
      { error: 'Failed to save schedule override' },
      { status: 500 }
    );
  }
}
