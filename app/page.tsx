'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import MemberForm from '@/components/member-form';
import ScheduleTable from '@/components/schedule-table';
import MembersList from '@/components/members-list';
import { Member } from '@/lib/types';

export default function Page() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch('/api/members');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setMembers(data);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const [showForm, setShowForm] = useState(false);

  const addMember = async (member: Omit<Member, 'id'>) => {
    try {
      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(member),
      });
      if (!res.ok) throw new Error('Failed to create');
      await fetchMembers();
      setShowForm(false);
    } catch (error) {
      console.error('Failed to add member:', error);
      alert('Failed to add member');
    }
  };

  const removeMember = async (id: string) => {
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      await fetchMembers();
    } catch (error) {
      console.error('Failed to remove member:', error);
      alert('Failed to remove member');
    }
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

            {loading ? (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 text-center">
                <p className="text-slate-500">Loading members...</p>
              </div>
            ) : members.length > 0 && (
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
