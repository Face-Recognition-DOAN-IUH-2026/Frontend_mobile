import api from './client';
import { ScheduleAssignmentList, StaffAvailabilityRequest, StaffScheduleAssignment } from '../types';

export interface ShiftBid {
  id: string;
  staffId: string;
  assignmentId: string;
  status: string;
  note?: string | null;
  createdAt: string;
}

export interface ShiftSwap {
  id: string;
  requesterStaffId: string;
  targetStaffId: string | null;
  requesterAssignmentId: string;
  targetAssignmentId?: string | null;
  reason?: string | null;
  status: string;
  responseNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

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

  getMyAvailability: async (): Promise<StaffAvailabilityRequest[]> => {
    const response = await api.get<StaffAvailabilityRequest[]>('/schedules/me/availability');
    return response.data;
  },

  confirmAssignment: async (id: string): Promise<StaffScheduleAssignment> => {
    const response = await api.post<StaffScheduleAssignment>(`/schedules/assignments/${id}/confirm`);
    return response.data;
  },

  checkIn: async (id: string, lat?: number, lng?: number): Promise<unknown> => {
    const body: Record<string, unknown> = { method: 'mobile' };
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

  getOpenShifts: async (): Promise<any[]> => {
    const response = await api.get<any[]>('/schedules/open-shifts');
    return response.data;
  },

  createBid: async (assignmentId: string, note?: string): Promise<ShiftBid> => {
    const response = await api.post<ShiftBid>('/schedules/bids', { assignmentId, note });
    return response.data;
  },

  listMyBids: async (status?: string): Promise<ShiftBid[]> => {
    const response = await api.get<ShiftBid[]>('/schedules/bids', { params: { status } });
    return response.data;
  },

  cancelBid: async (id: string): Promise<ShiftBid> => {
    const response = await api.post<ShiftBid>(`/schedules/bids/${id}/cancel`);
    return response.data;
  },

  createSwap: async (data: {
    targetStaffId?: string;
    requesterAssignmentId: string;
    targetAssignmentId?: string;
    reason?: string;
  }): Promise<ShiftSwap> => {
    const response = await api.post<ShiftSwap>('/schedules/swaps', data);
    return response.data;
  },

  listMySwaps: async (status?: string): Promise<ShiftSwap[]> => {
    const response = await api.get<ShiftSwap[]>('/schedules/swaps', { params: { status } });
    return response.data;
  },

  respondSwap: async (id: string, action: 'accepted' | 'rejected', responseNote?: string): Promise<ShiftSwap> => {
    const response = await api.post<ShiftSwap>(`/schedules/swaps/${id}/respond`, { action, responseNote });
    return response.data;
  },

  requestManualCheckIn: async (assignmentId: string, reason?: string): Promise<any> => {
    const response = await api.post('/schedules/attendance/manual-checkin', { assignmentId, reason });
    return response.data;
  },

  claimOpenSwap: async (swapId: string): Promise<ShiftSwap> => {
    const response = await api.post<ShiftSwap>(`/schedules/swaps/${swapId}/claim`);
    return response.data;
  },
};
