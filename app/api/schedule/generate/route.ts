import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSchedule } from '@/server/services/scheduler';

// POST /api/schedule/generate — Generate schedule for a month
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { month, year } = body;

    if (month === null || month === undefined || !year) {
      return NextResponse.json(
        { error: 'month and year are required' },
        { status: 400 }
      );
    }

    // Fetch all members
    const members = await prisma.member.findMany({
      select: {
        id: true,
        name: true,
        specialty: true,
        position: true,
        group: true,
        switchOnMonday: true,
      },
    });

    if (members.length === 0) {
      return NextResponse.json(
        { error: 'No members found' },
        { status: 400 }
      );
    }

    // Clear existing assignments for this month
    const daysInMonth = new Date(year, Number(month) + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      await prisma.scheduleAssignment.deleteMany({
        where: {
          date,
        },
      });
    }

    // Generate new schedule (cast types to correct interface)
    const typedMembers = members.map(m => ({
      ...m,
      position: m.position as 'chief' | 'guard',
      group: m.group as 1 | 2
      ,
      switchOnMonday: m.switchOnMonday,
    }));
    
    await generateSchedule(
      typedMembers,
      Number(month),
      year
    );

    // Fetch the generated assignments with member details
    const persistedAssignments = await prisma.scheduleAssignment.findMany({
      where: {
        month: Number(month),
        year,
      },
      include: {
        chief: { select: { id: true, name: true, specialty: true, position: true, group: true } },
        guard1: { select: { id: true, name: true, specialty: true, position: true, group: true } },
        guard2: { select: { id: true, name: true, specialty: true, position: true, group: true } },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json(
      {
        success: true,
        month,
        year,
        assignments: persistedAssignments,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to generate schedule:', error);
    return NextResponse.json(
      { error: 'Failed to generate schedule' },
      { status: 500 }
    );
  }
}
