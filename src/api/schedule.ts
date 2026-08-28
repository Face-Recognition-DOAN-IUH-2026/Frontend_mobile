import api from './client';
import { ScheduleAssignmentList, StaffScheduleAssignment } from '../types';

export const scheduleApi = {
  getMySchedules: async (from?: string, to?: string): Promise<ScheduleAssignmentList> => {
    const response = await api.get<ScheduleAssignmentList>('/schedules/me', {
      params: { from, to },
    });
    return response.data;
  },

  confirmAssignment: async (id: string): Promise<StaffScheduleAssignment> => {
    const response = await api.post<StaffScheduleAssignment>(`/schedules/assignments/${id}/confirm`);
    return response.data;
  },

  checkIn: async (id: string, lat?: number, lng?: number, method: string = 'mobile'): Promise<unknown> => {
    const body: Record<string, unknown> = { method };
    if (lat != null && lng != null) {
      body.lat = lat;
      body.lng = lng;
    }
    const response = await api.post(`/schedules/assignments/${id}/check-in`, body);
    return response.data;
  },

  checkOut: async (id: string): Promise<unknown> => {
    const response = await api.post(`/schedules/assignments/${id}/check-out`, { method: 'mobile' });
    return response.data;
  },

  requestManualCheckIn: async (assignmentId: string, note?: string): Promise<any> => {
    const response = await api.post('/schedules/attendance/manual-checkin', {
      assignmentId,
      note: note && note.trim() ? note.trim() : 'Yêu cầu check-in thủ công từ ứng dụng di động',
    });
    return response.data;
  },

  deleteAssignment: async (id: string): Promise<{ deleted: boolean; id: string }> => {
    const response = await api.delete<{ deleted: boolean; id: string }>(`/schedules/assignments/${id}`);
    return response.data;
  },
};
