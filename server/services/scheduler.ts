import { Member } from '@/lib/types';
import { prisma } from '@/lib/prisma';

export interface DayAssignment {
  date: Date;
  day: number;
  chief: Member | null;
  guard1: Member | null;
  guard2: Member | null;
  chiefId: string | null;
  guard1Id: string | null;
  guard2Id: string | null;
}

/**
 * Helper function to check if a member worked on a specific day in the existing schedule
 */
async function didMemberWorkOnDay(
  memberId: string,
  date: Date
): Promise<boolean> {
  const assignment = await prisma.scheduleAssignment.findUnique({
    where: { date },
  });

  if (!assignment) return false;

  return (
    assignment.chiefId === memberId ||
    assignment.guard1Id === memberId ||
    assignment.guard2Id === memberId
  );
}

/**
 * Get available members for a role on a specific day (respects no-consecutive-days rule)
 */
async function getAvailableMembers(
  members: Member[],
  day: number,
  role: 'chief' | 'guard1' | 'guard2',
  date: Date,
  month: number,
  year: number
): Promise<Member[]> {
  // Determine active group based on per-member anchor (Thursday by default, Monday for override members).

  // Filter by role/group
  const positionFilter = role === 'chief' ? 'chief' : 'guard';
  const candidates = members.filter((m) => {
    const memberActiveGroup = getMemberActiveGroup(date, m);
    return m.group === memberActiveGroup && m.position === positionFilter;
  });

  // Filter out members who worked yesterday or tomorrow (no consecutive days)
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const previousDay = day - 1;
  const nextDay = day + 1;

  const filtered: Member[] = [];

  for (const candidate of candidates) {
    let canUse = true;

    // Check previous day
    if (previousDay > 0) {
      const prevDate = new Date(year, month, previousDay);
      const workedPrevious = await didMemberWorkOnDay(
        candidate.id,
        prevDate
      );
      if (workedPrevious) canUse = false;
    }

    // Check next day
    if (canUse && nextDay <= daysInMonth) {
      const nextDate = new Date(year, month, nextDay);
      const workedNext = await didMemberWorkOnDay(
        candidate.id,
        nextDate
      );
      if (workedNext) canUse = false;
    }

    if (canUse) {
      filtered.push(candidate);
    }
  }

  return filtered;
}

const THURSDAY = 4; // JS Date.getDay(): 0 = Sunday, 4 = Thursday
const MONDAY = 1; // JS Date.getDay(): 1 = Monday

function getActiveGroupForAnchor(date: Date, anchorDayOfWeek: number): 1 | 2 {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);

  const offsetToAnchor = (normalized.getDay() - anchorDayOfWeek + 7) % 7;
  const boundary = new Date(normalized);
  boundary.setDate(normalized.getDate() - offsetToAnchor);

  const reference = new Date(2026, 0, 1);
  reference.setHours(0, 0, 0, 0);
  const referenceOffset = (reference.getDay() - anchorDayOfWeek + 7) % 7;
  const referenceBoundary = new Date(reference);
  referenceBoundary.setDate(reference.getDate() - referenceOffset);

  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceReference = Math.floor((boundary.getTime() - referenceBoundary.getTime()) / msPerWeek);
  return weeksSinceReference % 2 === 0 ? 1 : 2;
}

function getMemberActiveGroup(date: Date, member: Member): 1 | 2 {
  return getActiveGroupForAnchor(date, member.switchOnMonday ? MONDAY : THURSDAY);
}

/**
 * Generate schedule for a given month/year
 * Returns array of day assignments that should be persisted to DB
 */
export async function generateSchedule(
  members: Member[],
  month: number, // 0-11 (JS month)
  year: number
): Promise<DayAssignment[]> {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const assignments: DayAssignment[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);

    // Get available members for each role
    const chiefCandidates = await getAvailableMembers(
      members,
      day,
      'chief',
      date,
      month,
      year
    );
    const guard1Candidates = await getAvailableMembers(
      members,
      day,
      'guard1',
      date,
      month,
      year
    );
    const guard2Candidates = await getAvailableMembers(
      members,
      day,
      'guard2',
      date,
      month,
      year
    );

    // Select members (prefer last-used to rotate fairly)
    // For now, use simple round-robin by selecting first available
    const chief = chiefCandidates[0] || null;
    const guard1 = guard1Candidates[0] || null;
    const guard2 = guard2Candidates[1] || guard2Candidates[0] || null; // Try to avoid same guard twice

    assignments.push({
      date,
      day,
      chief,
      guard1,
      guard2,
      chiefId: chief?.id || null,
      guard1Id: guard1?.id || null,
      guard2Id: guard2?.id || null,
    });

    // Mark selected members as assigned for next iteration (simulate working)
    if (chief) {
      // Create temporary assignment in DB for this day
      await prisma.scheduleAssignment.upsert({
        where: { date },
        update: {
          chiefId: chief.id,
        },
        create: {
          date,
          month,
          year,
          chiefId: chief.id,
        },
      });
    }

    if (guard1) {
      await prisma.scheduleAssignment.update({
        where: { date },
        data: {
          guard1Id: guard1.id,
        },
      });
    }

    if (guard2) {
      await prisma.scheduleAssignment.update({
        where: { date },
        data: {
          guard2Id: guard2.id,
        },
      });
    }
  }

  return assignments;
}
