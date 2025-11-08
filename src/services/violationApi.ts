import { reservationApi } from '@/config/axios';
import type {
  Violation,
  CreateViolationRequest,
  ViolationsResponse,
  ViolationDetailResponse,
  ResolveViolationRequest,
  CreateViolationPaymentResponse,
  DetectViolationsResponse,
} from '@/types/violation';

/**
 * Lấy danh sách vi phạm
 */
export async function getViolations(params?: {
  user_id?: number;
  vehicle_id?: number;
  parking_lot_id?: number;
  type?: string;
  status?: string;
  page?: number;
  per_page?: number;
}): Promise<ViolationsResponse> {
  const res = await reservationApi.get<ViolationsResponse>('/violations', { params });
  return res.data;
}

/**
 * Tạo vi phạm mới (thủ công)
 */
export async function createViolation(
  data: CreateViolationRequest
): Promise<Violation> {
  const res = await reservationApi.post<ViolationDetailResponse>('/violations', data);
  return res.data.data;
}

/**
 * Lấy chi tiết vi phạm
 */
export async function getViolation(id: number): Promise<Violation> {
  const res = await reservationApi.get<ViolationDetailResponse>(`/violations/${id}`);
  return res.data.data;
}

/**
 * Lấy danh sách vi phạm của user
 */
export async function getMyViolations(
  userId: number,
  status?: string
): Promise<Violation[]> {
  const res = await reservationApi.get<{ data: Violation[] }>('/violations/mine', {
    params: { user_id: userId, status },
  });
  return res.data.data;
}

/**
 * Lấy lịch sử vi phạm của cư dân (tích hợp với quản lý cư dân)
 */
export async function getUserViolations(
  userId: number,
  params?: {
    status?: string;
    page?: number;
    per_page?: number;
  }
): Promise<{
  data: Violation[];
  meta: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
  };
  summary: {
    total_violations: number;
    pending_count: number;
    resolved_count: number;
    total_fines: number;
  };
}> {
  const res = await reservationApi.get(`/users/${userId}/violations`, { params });
  return res.data;
}

/**
 * Xử lý vi phạm (Admin)
 */
export async function resolveViolation(
  id: number,
  data: ResolveViolationRequest
): Promise<Violation> {
  const res = await reservationApi.put<ViolationDetailResponse>(`/violations/${id}/resolve`, data);
  return res.data.data;
}

/**
 * Hủy vi phạm
 */
export async function cancelViolation(
  id: number,
  resolutionNote?: string
): Promise<Violation> {
  const res = await reservationApi.put<ViolationDetailResponse>(`/violations/${id}/cancel`, {
    resolution_note: resolutionNote,
  });
  return res.data.data;
}

/**
 * Tạo thanh toán phạt cho vi phạm
 */
export async function createViolationPayment(
  id: number,
  bankCode?: string
): Promise<CreateViolationPaymentResponse> {
  const res = await reservationApi.post<CreateViolationPaymentResponse>(
    `/violations/${id}/create-payment`,
    { bank_code: bankCode }
  );
  return res.data;
}

/**
 * Tự động phát hiện vi phạm đỗ quá giờ
 */
export async function detectOverstay(params?: {
  from_date?: string;
  to_date?: string;
  auto_create?: boolean;
}): Promise<DetectViolationsResponse> {
  const res = await reservationApi.post<DetectViolationsResponse>(
    '/violations/detect-overstay',
    params
  );
  return res.data;
}

/**
 * Tự động phát hiện check-in muộn
 */
export async function detectLateCheckIn(params?: {
  late_threshold_minutes?: number;
  auto_create?: boolean;
}): Promise<DetectViolationsResponse> {
  const res = await reservationApi.post<DetectViolationsResponse>(
    '/violations/detect-late-checkin',
    params
  );
  return res.data;
}

/**
 * Tự động phát hiện không đến (NO_SHOW)
 */
export async function detectNoShow(params?: {
  auto_create?: boolean;
}): Promise<DetectViolationsResponse> {
  const res = await reservationApi.post<DetectViolationsResponse>(
    '/violations/detect-no-show',
    params
  );
  return res.data;
}

/**
 * Tự động phát hiện thanh toán phạt chậm
 */
export async function detectLatePayment(params?: {
  payment_deadline_days?: number;
  auto_update?: boolean;
}): Promise<DetectViolationsResponse> {
  const res = await reservationApi.post<DetectViolationsResponse>(
    '/violations/detect-late-payment',
    params
  );
  return res.data;
}

