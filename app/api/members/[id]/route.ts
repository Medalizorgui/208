import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// DELETE /api/members/[id] — Delete a member
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.member.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete member:', error);

    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      );
    }

    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete member: related records exist' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete member' },
      { status: 500 }
    );
  }
}