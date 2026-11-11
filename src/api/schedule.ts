import api from './client';
import { ScheduleAssignmentList, StaffScheduleAssignment } from '../types';

/** Khớp với `CheckInLocationVerification` của schedule-service. */
export interface CheckInLocationResult {
  verified: boolean;
  method: string;
  distanceMeters: number | null;
  radiusMeters: number | null;
  zoneId: string | null;
  reason: string;
}

export interface CheckInResponse {
  schedule: StaffScheduleAssignment;
  attendance: unknown;
  location?: CheckInLocationResult;
}

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

  getAssignmentGeofence: async (assignmentId: string): Promise<{ configured: boolean; geofence?: { latitude: number; longitude: number; radiusMeters: number; addressHint?: string | null } | null; isGlobal?: boolean; zoneName?: string }> => {
    const response = await api.get(`/schedules/assignments/${assignmentId}/geofence`);
    return response.data;
  },

  checkIn: async (id: string, lat?: number, lng?: number, method: string = 'mobile'): Promise<CheckInResponse> => {
    const body: Record<string, unknown> = { method };
    if (lat != null && lng != null) {
      body.lat = lat;
      body.lng = lng;
    }
    const response = await api.post<CheckInResponse>(`/schedules/assignments/${id}/check-in`, body);
    return response.data;
  },

  checkOut: async (id: string): Promise<unknown> => {
    const response = await api.post(`/schedules/assignments/${id}/check-out`, { method: 'mobile' });
    return response.data;
  },

  deleteAssignment: async (id: string): Promise<{ deleted: boolean; id: string }> => {
    const response = await api.delete<{ deleted: boolean; id: string }>(`/schedules/assignments/${id}`);
    return response.data;
  },
};
