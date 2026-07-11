'use client';

import { Member } from '@/app/page';
import { Button } from '@/components/ui/button';

interface MembersListProps {
  members: Member[];
  onRemove: (id: string) => void;
}

export default function MembersList({ members, onRemove }: MembersListProps) {
  const groupMembers = {
    1: members.filter(m => m.group === 1),
    2: members.filter(m => m.group === 2),
  };

  return (
    <div className="space-y-4">
      {[1, 2].map((group) => (
        <div key={group}>
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Group {group}</h3>
          <div className="space-y-2">
            {groupMembers[group as 1 | 2].length === 0 ? (
              <p className="text-xs text-slate-500">No members</p>
            ) : (
              groupMembers[group as 1 | 2].map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-2 p-2 bg-slate-50 rounded border border-slate-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{member.name}</p>
                    <p className="text-xs text-slate-500">
                      {member.position === 'chief' ? '👨‍💼' : '👤'} {member.specialty}
                    </p>
                  </div>
                  <button
                    onClick={() => onRemove(member.id)}
                    className="text-red-500 hover:text-red-700 flex-shrink-0 text-sm font-medium"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
