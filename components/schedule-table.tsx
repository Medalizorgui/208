'use client';

import { Member } from '@/lib/types';
import { useMemo, useState, useEffect, useCallback } from 'react';

interface ScheduleTableProps {
  members: Member[];
}

interface DayAssignment {
  day: number;
  chief: Member | null;
  guard1: Member | null;
  guard2: Member | null;
}

const THURSDAY = 4; // JS Date.getDay(): 0 = Sunday, 4 = Thursday
const MONDAY = 1;

const getActiveGroup = (date: Date): 1 | 2 => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);

  const offsetToThursday = (normalized.getDay() - THURSDAY + 7) % 7;
  const boundary = new Date(normalized);
  boundary.setDate(normalized.getDate() - offsetToThursday);

  const reference = new Date(2026, 0, 1);
  reference.setHours(0, 0, 0, 0);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  const weeksSinceReference = Math.floor((boundary.getTime() - reference.getTime()) / msPerWeek);
  return weeksSinceReference % 2 === 0 ? 1 : 2;
};

const getActiveGroupForAnchor = (date: Date, anchorDayOfWeek: number): 1 | 2 => {
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
};

const getMemberActiveGroup = (date: Date, member: Member): 1 | 2 => {
  return getActiveGroupForAnchor(date, member.switchOnMonday ? MONDAY : THURSDAY);
};

export default function ScheduleTable({ members }: ScheduleTableProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [overrides, setOverrides] = useState<Record<string, { chief: string; guard1: string; guard2: string }>>({});
  const [editingCell, setEditingCell] = useState<{ day: number; role: 'chief' | 'guard1' | 'guard2' } | null>(null);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const getDayKey = useCallback((day: number) => `${selectedYear}-${selectedMonth}-${day}`, [selectedYear, selectedMonth]);

  const didMemberWorkOnDay = useCallback((memberId: string, day: number): boolean => {
    const dayKey = getDayKey(day);
    const assignment = overrides[dayKey];
    if (!assignment) return false;
    return (
      assignment.chief === memberId ||
      assignment.guard1 === memberId ||
      assignment.guard2 === memberId
    );
  }, [overrides, getDayKey]);

  const getAvailableMembers = useCallback((day: number, role: 'chief' | 'guard1' | 'guard2'): Member[] => {
    const positionFilter = role === 'chief' ? 'chief' : 'guard';
    let candidates = members.filter(
      (m) => m.position === positionFilter && m.group === getMemberActiveGroup(new Date(selectedYear, selectedMonth, day), m)
    );

    // Filter out members who worked yesterday or tomorrow (no consecutive days)
    const previousDay = day - 1;
    const nextDay = day + 1;
    candidates = candidates.filter(m => {
      const workedPrevious = previousDay > 0 && didMemberWorkOnDay(m.id, previousDay);
      const workedNext = nextDay <= new Date(selectedYear, selectedMonth + 1, 0).getDate() && 
                         didMemberWorkOnDay(m.id, nextDay);
      return !workedPrevious && !workedNext;
    });

    return candidates;
  }, [members, selectedYear, selectedMonth, didMemberWorkOnDay]);

  // Fetch saved overrides from DB when month/year changes
  const fetchOverrides = useCallback(async () => {
    setLoadingOverrides(true);
    try {
      const res = await fetch(`/api/schedule?month=${selectedMonth}&year=${selectedYear}`);
      if (!res.ok) throw new Error('Failed to fetch schedule');
      const assignments = await res.json();

      const loadedOverrides: Record<string, { chief: string; guard1: string; guard2: string }> = {};
      for (const assignment of assignments) {
        const date = new Date(assignment.date);
        const day = date.getDate();
        const dayKey = getDayKey(day);
        loadedOverrides[dayKey] = {
          chief: assignment.chiefId || '',
          guard1: assignment.guard1Id || '',
          guard2: assignment.guard2Id || '',
        };
      }
      setOverrides(loadedOverrides);
    } catch (error) {
      console.error('Failed to fetch overrides:', error);
    } finally {
      setLoadingOverrides(false);
    }
  }, [selectedMonth, selectedYear, getDayKey]);

  // Generate schedule for the selected month
  const handleGenerateSchedule = useCallback(async () => {
    setIsGenerating(true);
    try {
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to generate schedule');
      }

      // Reload overrides after generation
      await fetchOverrides();
      alert('✅ Schedule generated and saved successfully!');
    } catch (error) {
      console.error('Failed to generate schedule:', error);
      alert(`❌ Failed to generate schedule: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsGenerating(false);
    }
  }, [selectedMonth, selectedYear, fetchOverrides]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchOverrides();
  }, [fetchOverrides]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const schedule = useMemo(() => {
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const assignments: DayAssignment[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayKey = getDayKey(day);
      const override = overrides[dayKey];

      if (override) {
        // Use manual override
        const chief = override.chief ? members.find(m => m.id === override.chief) || null : null;
        const guard1 = override.guard1 ? members.find(m => m.id === override.guard1) || null : null;
        const guard2 = override.guard2 ? members.find(m => m.id === override.guard2) || null : null;
        
        assignments.push({ day, chief, guard1, guard2 });
      } else {
        // Auto-assign respecting no-consecutive-days rule
        const chiefs = getAvailableMembers(day, 'chief');
        const guards = getAvailableMembers(day, 'guard1');

        // Use day number as seed for pseudo-random selection
        const chiefIndex = day % Math.max(chiefs.length, 1);
        const guard1Index = (day + 1) % Math.max(guards.length, 1);
        const guard2Index = (day + 2) % Math.max(guards.length, 1);

        const selectedGuards = new Set<string>();
        const chief = chiefs.length > 0 ? chiefs[chiefIndex] : null;
        const guard1 = guards.length > 0 ? guards[guard1Index] : null;
        
        if (guard1) selectedGuards.add(guard1.id);

        // For guard2, pick a different guard than guard1
        let guard2 = null;
        if (guards.length > 1) {
          const guard2Candidate = guards[(guard2Index) % guards.length];
          if (guard2Candidate && guard2Candidate.id !== guard1?.id) {
            guard2 = guard2Candidate;
          } else if (guards.length > 1) {
            guard2 = guards.find(g => g.id !== guard1?.id) || null;
          }
        }

        assignments.push({
          day,
          chief: chief || null,
          guard1: guard1 || null,
          guard2: guard2 || null,
        });
      }
    }

    return assignments;
  }, [members, selectedMonth, selectedYear, overrides, getAvailableMembers, getDayKey]);

  const handleCellClick = (day: number, role: 'chief' | 'guard1' | 'guard2') => {
    setEditingCell({ day, role });
  };

  // Persist override to DB
  const saveOverride = async (dayKey: string, overrideData: { chief: string; guard1: string; guard2: string }) => {
    const parts = dayKey.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    const date = new Date(year, month, day);

    try {
      await fetch('/api/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: date.toISOString(),
          chiefId: overrideData.chief || null,
          guard1Id: overrideData.guard1 || null,
          guard2Id: overrideData.guard2 || null,
        }),
      });
    } catch (error) {
      console.error('Failed to save override:', error);
    }
  };

  const handleMemberSelect = (memberId: string | null) => {
    if (!editingCell) return;

    const dayKey = getDayKey(editingCell.day);
    const currentAssignment = overrides[dayKey] || {
      chief: schedule.find(a => a.day === editingCell.day)?.chief?.id || '',
      guard1: schedule.find(a => a.day === editingCell.day)?.guard1?.id || '',
      guard2: schedule.find(a => a.day === editingCell.day)?.guard2?.id || '',
    };

    const updatedAssignment = {
      ...currentAssignment,
      [editingCell.role]: memberId || '',
    };

    const updated = { ...overrides };
    updated[dayKey] = updatedAssignment;

    setOverrides(updated);
    setEditingCell(null);

    // Persist to DB
    saveOverride(dayKey, updatedAssignment);
  };

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - 1 + i);

  const formatDate = (day: number) => {
    const d = String(day).padStart(2, '0');
    const m = String(selectedMonth + 1).padStart(2, '0');
    const y = String(selectedYear).slice(-2);
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      {/* Month/Year Selector */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">
          {months[selectedMonth]} {selectedYear}
          {loadingOverrides && (
            <span className="ml-3 text-sm font-normal text-slate-400">Loading...</span>
          )}
        </h2>
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
          >
            {months.map((month, idx) => (
              <option key={month} value={idx}>
                {month}
              </option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
          >
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerateSchedule}
            disabled={isGenerating || members.length < 3}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? '⏳ Generating...' : '🔄 Generate'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-300">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border border-slate-200">Date</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border border-slate-200">Chief</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border border-slate-200">Guard 1</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-900 border border-slate-200">Guard 2</th>
            </tr>
          </thead>
          <tbody>
            {schedule.map((assignment) => {
              const dayDate = new Date(selectedYear, selectedMonth, assignment.day);
              const isWeekend = dayDate.getDay() === 0 || dayDate.getDay() === 6;
              const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayDate.getDay()];
              const activeGroup = getActiveGroup(new Date(selectedYear, selectedMonth, assignment.day));

              return (
                <tr
                  key={assignment.day}
                  className={`${isWeekend ? 'bg-blue-50' : 'bg-white'} border-b border-slate-200 hover:bg-slate-50`}
                >
                  <td className={`px-4 py-3 text-sm font-medium border border-slate-200 ${isWeekend ? 'bg-blue-100' : ''}`}>
                    <div className="font-semibold text-slate-900">{formatDate(assignment.day)}</div>
                    <div className="text-xs text-slate-500">{dayName}</div>
                    <div className="text-xs text-slate-400 mt-1">Group {activeGroup}</div>
                  </td>

                  {/* Chief Cell */}
                  <td
                    onClick={() => handleCellClick(assignment.day, 'chief')}
                    className="px-4 py-3 text-sm border border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    {editingCell?.day === assignment.day && editingCell?.role === 'chief' ? (
                      <div className="flex flex-col gap-2 max-w-xs">
                        {getAvailableMembers(assignment.day, 'chief').map((member) => (
                          <button
                            key={member.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMemberSelect(member.id);
                            }}
                            className="text-left px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs"
                          >
                            {member.name} ({member.specialty})
                          </button>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberSelect(null);
                          }}
                          className="text-left px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-900 text-xs"
                        >
                          Clear
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell(null);
                          }}
                          className="text-left px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-slate-900 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : assignment.chief ? (
                      <div className="font-medium text-slate-900">
                        <div>👨‍💼 {assignment.chief.name}</div>
                        <div className="text-xs text-slate-500">{assignment.chief.specialty}</div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">No chief</div>
                    )}
                  </td>

                  {/* Guard 1 Cell */}
                  <td
                    onClick={() => handleCellClick(assignment.day, 'guard1')}
                    className="px-4 py-3 text-sm border border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    {editingCell?.day === assignment.day && editingCell?.role === 'guard1' ? (
                      <div className="flex flex-col gap-2 max-w-xs">
                        {getAvailableMembers(assignment.day, 'guard1').map((member) => (
                          <button
                            key={member.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMemberSelect(member.id);
                            }}
                            className="text-left px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs"
                          >
                            {member.name} ({member.specialty})
                          </button>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberSelect(null);
                          }}
                          className="text-left px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-900 text-xs"
                        >
                          Clear
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell(null);
                          }}
                          className="text-left px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-slate-900 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : assignment.guard1 ? (
                      <div className="font-medium text-slate-900">
                        <div>👤 {assignment.guard1.name}</div>
                        <div className="text-xs text-slate-500">{assignment.guard1.specialty}</div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">No guard</div>
                    )}
                  </td>

                  {/* Guard 2 Cell */}
                  <td
                    onClick={() => handleCellClick(assignment.day, 'guard2')}
                    className="px-4 py-3 text-sm border border-slate-200 cursor-pointer hover:bg-blue-50 transition-colors"
                  >
                    {editingCell?.day === assignment.day && editingCell?.role === 'guard2' ? (
                      <div className="flex flex-col gap-2 max-w-xs">
                        {getAvailableMembers(assignment.day, 'guard2').map((member) => (
                          <button
                            key={member.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMemberSelect(member.id);
                            }}
                            className="text-left px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 text-xs"
                          >
                            {member.name} ({member.specialty})
                          </button>
                        ))}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMemberSelect(null);
                          }}
                          className="text-left px-2 py-1 rounded bg-red-100 hover:bg-red-200 text-red-900 text-xs"
                        >
                          Clear
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingCell(null);
                          }}
                          className="text-left px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-slate-900 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : assignment.guard2 ? (
                      <div className="font-medium text-slate-900">
                        <div>👤 {assignment.guard2.name}</div>
                        <div className="text-xs text-slate-500">{assignment.guard2.specialty}</div>
                      </div>
                    ) : (
                      <div className="text-slate-400 italic">No guard</div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200 text-xs text-slate-600">
        <p className="mb-2">
          <span className="inline-block w-4 h-4 bg-blue-100 border border-blue-300 mr-2 align-middle"></span>
          Weekend
        </p>
        <p className="mb-2">
          Click any cell to edit. Members cannot work on consecutive days.
        </p>
        <p>
          Groups alternate every Thursday: Thursday–Wednesday blocks are assigned to alternating groups.
        </p>
      </div>
    </div>
  );
}
