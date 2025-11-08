import { reservationApi } from '@/config/axios';
import type { 
  MonthlyPass, 
  CreateMonthlyPassRequest, 
  CreateMonthlyPassResponse,
  MonthlyPassesResponse,
  MonthlyPassesPaginatedResponse 
} from '@/types/monthlyPass';

/**
 * Tạo vé tháng và lấy URL thanh toán
 */
export async function createMonthlyPass(
  data: CreateMonthlyPassRequest
): Promise<CreateMonthlyPassResponse> {
  const res = await reservationApi.post<CreateMonthlyPassResponse>('/monthly-passes', data);
  return res.data;
}

/**
 * Lấy danh sách tất cả vé tháng (có phân trang và filter)
 */
export async function getAllMonthlyPasses(params?: {
  user_id?: number;
  status?: string;
  parking_lot_id?: number;
  page?: number;
  per_page?: number;
}): Promise<MonthlyPassesPaginatedResponse> {
  const res = await reservationApi.get<MonthlyPassesPaginatedResponse>('/monthly-passes', {
    params,
  });
  return res.data;
}

/**
 * Lấy danh sách vé tháng của user
 */
export async function getMonthlyPasses(userId: number): Promise<MonthlyPass[]> {
  const res = await reservationApi.get<MonthlyPassesResponse>('/monthly-passes/mine', {
    params: { user_id: userId },
  });
  return res.data.data;
}

/**
 * Lấy chi tiết vé tháng
 */
export async function getMonthlyPass(id: number): Promise<MonthlyPass> {
  const res = await reservationApi.get<{ data: MonthlyPass }>(`/monthly-passes/${id}`);
  return res.data.data;
}

/**
 * Hủy vé tháng (chỉ khi status PENDING)
 */
export async function cancelMonthlyPass(id: number): Promise<MonthlyPass> {
  const res = await reservationApi.put<{ data: MonthlyPass }>(`/monthly-passes/${id}/cancel`);
  return res.data.data;
}

