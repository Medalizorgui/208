'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import MemberForm from '@/components/member-form';
import ScheduleTable from '@/components/schedule-table';
import MembersList from '@/components/members-list';

export interface Member {
  id: string;
  name: string;
  specialty: string;
  position: 'chief' | 'guard';
  group: 1 | 2;
}

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);

  const addMember = (member: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...member,
      id: `${Date.now()}-${Math.random()}`,
    };
    setMembers([...members, newMember]);
    setShowForm(false);
  };

  const removeMember = (id: string) => {
    setMembers(members.filter(m => m.id !== id));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-full">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Schedule Manager</h1>
          <p className="text-slate-600">Create a monthly roster with rotating groups and assigned specialties</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Form & Members List */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              {!showForm ? (
                <Button 
                  onClick={() => setShowForm(true)}
                  className="w-full"
                >
                  Add New Member
                </Button>
              ) : (
                <>
                  <Button 
                    onClick={() => setShowForm(false)}
                    variant="outline"
                    className="w-full mb-4"
                  >
                    Close
                  </Button>
                  <MemberForm onAdd={addMember} />
                </>
              )}
            </div>

            {members.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Members ({members.length})</h2>
                <MembersList members={members} onRemove={removeMember} />
              </div>
            )}
          </div>

          {/* Main - Schedule Table */}
          <div className="lg:col-span-3">
            {members.length >= 3 ? (
              <ScheduleTable members={members} />
            ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-12 text-center">
                <p className="text-slate-600 mb-2">Add at least 3 members to generate a schedule</p>
                <p className="text-sm text-slate-500">You need a minimum of 1 chief and 2 guards per shift</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
