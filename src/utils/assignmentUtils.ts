import { normalizeTime } from './dateUtils';
import { StaffScheduleAssignment } from '../types';

export type AssignmentTimeState = 'now' | 'today' | 'upcoming' | 'past';

export function getAssignmentTimeState(item: StaffScheduleAssignment): AssignmentTimeState {
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (item.workDate < today) return 'past';
  if (item.workDate > today) return 'upcoming';
  const startTime = normalizeTime(item.shift?.startTime);
  const endTime = normalizeTime(item.shift?.endTime);
  if (startTime && endTime) {
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (currentTime >= startTime && currentTime <= endTime) return 'now';
  }
  return 'today';
}
