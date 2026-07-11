'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Member } from '@/lib/types';

interface MemberFormProps {
  onAdd: (member: Omit<Member, 'id'>) => void;
}

export default function MemberForm({ onAdd }: MemberFormProps) {
  const [formData, setFormData] = useState<{
    name: string;
    specialty: string;
    position: 'chief' | 'guard';
    group: 1 | 2;
    switchOnMonday: boolean;
  }>({
    name: '',
    specialty: '',
    position: 'guard',
    group: 1,
    switchOnMonday: false,
  });

  const specialties = ['Mechanic', 'Deckhands'];
  const positions = [
    { value: 'chief', label: 'Chief' },
    { value: 'guard', label: 'Guard' },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.specialty.trim()) {
      alert('Please fill in all fields');
      return;
    }

    onAdd(formData);
    setFormData({
      name: '',
      specialty: '',
      position: 'guard',
      group: 1,
      switchOnMonday: false,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Name
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Enter name"
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Specialty
        </label>
        <select
          value={formData.specialty}
          onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
        >
          <option value="">Select specialty</option>
          {specialties.map((spec) => (
            <option key={spec} value={spec}>
              {spec}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Position
        </label>
        <select
          value={formData.position}
          onChange={(e) => setFormData({ ...formData, position: e.target.value as 'chief' | 'guard' })}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900"
        >
          {positions.map((pos) => (
            <option key={pos.value} value={pos.value}>
              {pos.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Group
        </label>
        <div className="flex gap-4">
          {[1, 2].map((g) => (
            <label key={g} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="group"
                value={g}
                checked={formData.group === g}
                onChange={(e) => setFormData({ ...formData, group: parseInt(e.target.value) as 1 | 2 })}
                className="w-4 h-4"
              />
              <span className="text-sm text-slate-700">Group {g}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="switchOnMonday"
          type="checkbox"
          checked={formData.switchOnMonday}
          onChange={(e) => setFormData({ ...formData, switchOnMonday: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="switchOnMonday" className="text-sm text-slate-700">
          Use Monday switch for this member
        </label>
      </div>

      <Button type="submit" className="w-full">
        Add Member
      </Button>
    </form>
  );
}
