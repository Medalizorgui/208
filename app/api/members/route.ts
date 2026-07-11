import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/members — List all members
export async function GET() {
  try {
    const members = await prisma.member.findMany({
      orderBy: [{ group: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        specialty: true,
        position: true,
        group: true,
        switchOnMonday: true,
      },
    });
    return NextResponse.json(members);
  } catch (error) {
    console.error('Failed to fetch members:', error);
    return NextResponse.json(
      { error: 'Failed to fetch members' },
      { status: 500 }
    );
  }
}

// POST /api/members — Create a new member
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, specialty, position, group, switchOnMonday } = body;

    if (!name?.trim() || !specialty?.trim() || !position || !group) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    const member = await prisma.member.create({
      data: {
        name: name.trim(),
        specialty,
        position,
        group: Number(group),
        switchOnMonday: Boolean(switchOnMonday),
      },
      select: {
        id: true,
        name: true,
        specialty: true,
        position: true,
        group: true,
        switchOnMonday: true,
      },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error('Failed to create member:', error);
    return NextResponse.json(
      { error: 'Failed to create member' },
      { status: 500 }
    );
  }
}
