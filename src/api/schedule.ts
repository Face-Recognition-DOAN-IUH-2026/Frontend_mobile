import api from './client';
import { ScheduleAssignmentList, StaffAvailabilityRequest, StaffScheduleAssignment } from '../types';

export const scheduleApi = {
  getMySchedules: async (from?: string, to?: string): Promise<ScheduleAssignmentList> => {
    const response = await api.get<ScheduleAssignmentList>('/schedules/me', {
      params: { from, to },
    });
    return response.data;
  },

  requestAvailability: async (
    dateFrom: string,
    dateTo: string,
    reason?: string,
  ): Promise<StaffAvailabilityRequest> => {
    const response = await api.post<StaffAvailabilityRequest>('/schedules/me/availability', {
      dateFrom,
      dateTo,
      reason,
    });
    return response.data;
  },

  confirmAssignment: async (id: string): Promise<StaffScheduleAssignment> => {
    const response = await api.post<StaffScheduleAssignment>(`/schedules/assignments/${id}/confirm`);
    return response.data;
  },

  checkIn: async (id: string): Promise<unknown> => {
    const response = await api.post(`/schedules/assignments/${id}/check-in`, { method: 'mobile' });
    return response.data;
  },

  checkOut: async (id: string): Promise<unknown> => {
    const response = await api.post(`/schedules/assignments/${id}/check-out`, { method: 'mobile' });
    return response.data;
  },
};
