export interface Member {
  id: string;
  name: string;
  specialty: string;
  position: 'chief' | 'guard';
  group: 1 | 2;
}

export interface ScheduleOverride {
  date: string;
  chiefId: string | null;
  guard1Id: string | null;
  guard2Id: string | null;
}
