import { reservationApi } from '@/config/axios';

export interface RevenueData {
  month: string;
  revenue: number;
  count: number;
}

export interface UtilizationData {
  month: string;
  utilization: number;
  total_slots: number;
  occupied_slots: number;
}

export interface ConflictData {
  id: number;
  requested_at: string;
  desired_start_time: string;
  duration_minutes: number;
  vehicle_type: string;
  parking_lot_id: number;
  user_id: number;
  status: string;
  reason?: string;
}

export interface ConflictChartData {
  month: string;
  conflicts: number;
  conflict_rate: number;
  total_slots: number;
}

export interface ReportSummary {
  total_revenue: number;
  total_payments: number;
  average_utilization: number;
  total_conflicts: number;
}

/**
 * Lấy dữ liệu doanh thu theo tháng từ các reservation đã checkout
 */
export async function getRevenueReport(params?: {
  from_date?: string;
  to_date?: string;
  parking_lot_id?: number;
}): Promise<RevenueData[]> {
  try {
    // Lấy danh sách reservations đã checkout (đã thanh toán)
    const queryParams: any = {
      status: 'checked_out',
      per_page: 1000,
    };

    if (params?.from_date) {
      queryParams.date_from = params.from_date;
    }
    if (params?.to_date) {
      queryParams.date_to = params.to_date;
    }
    if (params?.parking_lot_id) {
      queryParams.parking_lot_id = params.parking_lot_id;
    }

    const reservationsRes = await reservationApi.get('/reservations', {
      params: queryParams,
    });

    const reservations = reservationsRes.data.data?.reservations || [];

    // Lấy monthly passes đã thanh toán
    const monthlyPassesParams: any = {
      status: 'ACTIVE',
      per_page: 1000,
    };

    if (params?.parking_lot_id) {
      monthlyPassesParams.parking_lot_id = params.parking_lot_id;
    }

    const monthlyPassesRes = await reservationApi.get('/monthly-passes', {
      params: monthlyPassesParams,
    });

    const monthlyPasses = monthlyPassesRes.data.data || [];

    // Nhóm theo tháng và tính tổng doanh thu
    const monthlyRevenue: Record<string, { revenue: number; count: number; monthLabel: string }> = {};

    // Tính doanh thu từ reservations
    for (const reservation of reservations) {
      const date = new Date(reservation.check_out_at || reservation.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('vi-VN', { month: 'short' });

      if (!monthlyRevenue[monthKey]) {
        monthlyRevenue[monthKey] = { revenue: 0, count: 0, monthLabel };
      }

      // Lấy amount từ payment nếu có, nếu không thì ước tính từ pricing_snapshot
      let amount = 0;
      if (reservation.payment?.amount) {
        amount = reservation.payment.amount;
      } else if (reservation.pricing_snapshot) {
        // Ước tính từ pricing snapshot và duration
        const durationHours = reservation.duration_minutes ? Math.ceil(reservation.duration_minutes / 60) : 1;
        const hourlyRate = reservation.pricing_snapshot.hourly || 15000;
        const dailyCap = reservation.pricing_snapshot.daily_cap || 50000;
        amount = Math.min(hourlyRate * durationHours, dailyCap);
      } else {
        amount = 15000; // Giá mặc định
      }

      monthlyRevenue[monthKey].revenue += amount;
      monthlyRevenue[monthKey].count += 1;
    }

    // Tính doanh thu từ monthly passes
    // Monthly passes có status ACTIVE là đã thanh toán thành công
    for (const pass of monthlyPasses) {
      if (pass.amount && pass.status === 'ACTIVE') {
        // Lấy ngày tạo pass (ngày thanh toán) hoặc start_date
        const paymentDate = pass.start_date || pass.created_at;
        const date = new Date(paymentDate);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const monthLabel = date.toLocaleDateString('vi-VN', { month: 'short' });

        if (!monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey] = { revenue: 0, count: 0, monthLabel };
        }

        monthlyRevenue[monthKey].revenue += pass.amount;
        monthlyRevenue[monthKey].count += 1;
      }
    }

    return Object.entries(monthlyRevenue)
      .map(([, value]) => ({
        month: value.monthLabel,
        revenue: value.revenue / 1000000,
        count: value.count,
      }))
      .sort((a, b) => {
        const months = [
          'Thg 1',
          'Thg 2',
          'Thg 3',
          'Thg 4',
          'Thg 5',
          'Thg 6',
          'Thg 7',
          'Thg 8',
          'Thg 9',
          'Thg 10',
          'Thg 11',
          'Thg 12',
        ];
        const indexA = months.findIndex((m) => a.month.includes(m));
        const indexB = months.findIndex((m) => b.month.includes(m));
        return indexA - indexB;
      });
  } catch (error) {
    console.error('Error fetching revenue report:', error);
    return [];
  }
}

/**
 * Lấy dữ liệu tỷ lệ lấp đầy theo tháng
 * Tính từ reservation_request thành công (status không phải 'failed')
 */
export async function getUtilizationReport(params?: {
  from_date?: string;
  to_date?: string;
  parking_lot_id?: number;
}): Promise<UtilizationData[]> {
  try {
    const parkingLotId = params?.parking_lot_id || 1;

    // Lấy thống kê hiện tại để biết tổng số slots
    const statsRes = await reservationApi.get(`/parking-lots/${parkingLotId}/statistics`);
    const stats = statsRes.data;
    const totalSlots = stats.summary?.total || 0;

    // Lấy lịch sử reservations để tìm reservation_request thành công
    const queryParams: any = {
      per_page: 1000,
    };

    if (params?.from_date) {
      queryParams.date_from = params.from_date;
    }
    if (params?.to_date) {
      queryParams.date_to = params.to_date;
    }
    if (params?.parking_lot_id) {
      queryParams.parking_lot_id = params.parking_lot_id;
    }

    const reservationsRes = await reservationApi.get('/reservations', {
      params: queryParams,
    });

    const reservations = reservationsRes.data.data?.reservations || [];

    // Nhóm reservation_request thành công theo tháng
    const monthlyUtilization: Record<string, { total: number; successful: number; monthLabel: string }> = {};

    // Khởi tạo 6 tháng gần nhất
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('vi-VN', { month: 'short' });
      monthlyUtilization[monthKey] = {
        total: totalSlots,
        successful: 0,
        monthLabel,
      };
    }

    // Đếm reservation_request thành công theo tháng
    for (const reservation of reservations) {
      if (reservation.reservation_request) {
        const request = reservation.reservation_request;
        if (request.status && request.status !== 'failed') {
          const requestDate = new Date(request.requested_at || reservation.created_at);
          const monthKey = `${requestDate.getFullYear()}-${String(requestDate.getMonth() + 1).padStart(2, '0')}`;

          if (monthlyUtilization[monthKey]) {
            monthlyUtilization[monthKey].successful += 1;
          }
        }
      } else {
        const reservationDate = new Date(reservation.created_at || reservation.start_time);
        const monthKey = `${reservationDate.getFullYear()}-${String(reservationDate.getMonth() + 1).padStart(2, '0')}`;

        if (monthlyUtilization[monthKey]) {
          monthlyUtilization[monthKey].successful += 1;
        }
      }
    }

    // Chuyển đổi thành array và tính utilization rate
    // Utilization = (số request thành công / tổng số slots) * 100
    return Object.entries(monthlyUtilization)
      .map(([, value]) => {
        const utilization = value.total > 0 ? (value.successful / value.total) * 100 : 0;
        return {
          month: value.monthLabel,
          utilization: Math.min(utilization, 100), // Giới hạn tối đa 100%
          total_slots: value.total,
          occupied_slots: value.successful,
        };
      })
      .sort((a, b) => {
        const months = [
          'Thg 1',
          'Thg 2',
          'Thg 3',
          'Thg 4',
          'Thg 5',
          'Thg 6',
          'Thg 7',
          'Thg 8',
          'Thg 9',
          'Thg 10',
          'Thg 11',
          'Thg 12',
        ];
        const indexA = months.findIndex((m) => a.month.includes(m));
        const indexB = months.findIndex((m) => b.month.includes(m));
        return indexA - indexB;
      });
  } catch (error) {
    console.error('Error fetching utilization report:', error);
    // Trả về dữ liệu mặc định nếu có lỗi
    const now = new Date();
    const months: UtilizationData[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        month: date.toLocaleDateString('vi-VN', { month: 'short' }),
        utilization: 0,
        total_slots: 0,
        occupied_slots: 0,
      });
    }
    return months;
  }
}

/**
 * Lấy dữ liệu xung đột theo tháng (cho biểu đồ)
 * Tính tỷ lệ xung đột: (số request failed / tổng số slots) * 100
 */
export async function getConflictsChartData(params?: {
  from_date?: string;
  to_date?: string;
  parking_lot_id?: number;
}): Promise<ConflictChartData[]> {
  try {
    const parkingLotId = params?.parking_lot_id || 1;

    // Lấy thống kê hiện tại để biết tổng số slots
    const statsRes = await reservationApi.get(`/parking-lots/${parkingLotId}/statistics`);
    const stats = statsRes.data;
    const totalSlots = stats.summary?.total || 0;

    // Lấy tất cả conflicts để tính theo tháng
    const conflictsData = await getConflictsReport({ ...params, per_page: 10000 });
    const conflicts = conflictsData.data;

    // Nhóm theo tháng
    const monthlyConflicts: Record<string, { count: number; monthLabel: string }> = {};

    // Khởi tạo 6 tháng gần nhất
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = date.toLocaleDateString('vi-VN', { month: 'short' });
      monthlyConflicts[monthKey] = {
        count: 0,
        monthLabel,
      };
    }

    // Đếm conflicts theo tháng
    for (const conflict of conflicts) {
      const date = new Date(conflict.requested_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (monthlyConflicts[monthKey]) {
        monthlyConflicts[monthKey].count += 1;
      }
    }

    // Chuyển đổi thành array và tính tỷ lệ xung đột
    return Object.entries(monthlyConflicts)
      .map(([, value]) => {
        const conflictRate = totalSlots > 0 ? (value.count / totalSlots) * 100 : 0;
        return {
          month: value.monthLabel,
          conflicts: value.count,
          conflict_rate: Math.min(conflictRate, 100), // Giới hạn tối đa 100%
          total_slots: totalSlots,
        };
      })
      .sort((a, b) => {
        const months = [
          'Thg 1',
          'Thg 2',
          'Thg 3',
          'Thg 4',
          'Thg 5',
          'Thg 6',
          'Thg 7',
          'Thg 8',
          'Thg 9',
          'Thg 10',
          'Thg 11',
          'Thg 12',
        ];
        const indexA = months.findIndex((m) => a.month.includes(m));
        const indexB = months.findIndex((m) => b.month.includes(m));
        return indexA - indexB;
      });
  } catch (error) {
    console.error('Error fetching conflicts chart data:', error);
    return [];
  }
}

/**
 * Lấy danh sách xung đột từ reservation_request failed
 * Lấy từ reservations có reservation_request với status failed
 */
export async function getConflictsReport(params?: {
  from_date?: string;
  to_date?: string;
  parking_lot_id?: number;
  page?: number;
  per_page?: number;
}): Promise<{
  data: ConflictData[];
  total: number;
}> {
  try {
    // Lấy reservations với reservation_request để tìm các request failed
    const queryParams: any = {
      per_page: params?.per_page || 1000, // Lấy nhiều để tìm conflicts
      page: params?.page || 1,
    };

    if (params?.from_date) {
      queryParams.date_from = params.from_date;
    }
    if (params?.to_date) {
      queryParams.date_to = params.to_date;
    }
    if (params?.parking_lot_id) {
      queryParams.parking_lot_id = params.parking_lot_id;
    }

    const reservationsRes = await reservationApi.get('/reservations', {
      params: queryParams,
    });

    const reservations = reservationsRes.data.data?.reservations || [];

    // Lọc các reservation có reservation_request với status failed
    const conflicts: ConflictData[] = [];

    for (const reservation of reservations) {
      // Kiểm tra nếu có reservation_request và status là failed
      if (reservation.reservation_request) {
        const request = reservation.reservation_request;
        if (request.status === 'failed') {
          conflicts.push({
            id: request.id,
            requested_at: request.requested_at || reservation.created_at,
            desired_start_time: request.desired_start_time || reservation.start_time,
            duration_minutes: request.duration_minutes || reservation.duration_minutes || 0,
            vehicle_type:
              reservation.vehicle_snapshot?.vehicle_type ||
              reservation.vehicle_snapshot?.type ||
              request.vehicle_type ||
              'unknown',
            parking_lot_id:
              reservation.slot?.parking_lot_id || reservation.slot?.parking_lot?.id || request.parking_lot_id || 0,
            user_id: reservation.user_id || request.user_id || 0,
            status: request.status,
            reason: request.reason || request.error_message || 'Không có chỗ trống phù hợp',
          });
        }
      }
    }

    // Sắp xếp theo thời gian yêu cầu mới nhất
    conflicts.sort((a, b) => {
      return new Date(b.requested_at).getTime() - new Date(a.requested_at).getTime();
    });

    const limitedConflicts = params?.per_page ? conflicts.slice(0, params.per_page) : conflicts;

    return {
      data: limitedConflicts,
      total: conflicts.length,
    };
  } catch (error) {
    console.error('Error fetching conflicts report:', error);
    return { data: [], total: 0 };
  }
}

/**
 * Lấy tổng quan báo cáo
 */
export async function getReportSummary(params?: {
  from_date?: string;
  to_date?: string;
  parking_lot_id?: number;
}): Promise<ReportSummary> {
  try {
    const [revenueData, utilizationData, conflictsData] = await Promise.all([
      getRevenueReport(params),
      getUtilizationReport(params),
      getConflictsReport({ ...params, per_page: 1000 }),
    ]);

    const totalRevenue = revenueData.reduce((sum, item) => sum + item.revenue * 1000000, 0);
    const totalPayments = revenueData.reduce((sum, item) => sum + item.count, 0);
    const averageUtilization =
      utilizationData.length > 0
        ? utilizationData.reduce((sum, item) => sum + item.utilization, 0) / utilizationData.length
        : 0;

    return {
      total_revenue: totalRevenue,
      total_payments: totalPayments,
      average_utilization: averageUtilization,
      total_conflicts: conflictsData.total,
    };
  } catch (error) {
    console.error('Error fetching report summary:', error);
    return {
      total_revenue: 0,
      total_payments: 0,
      average_utilization: 0,
      total_conflicts: 0,
    };
  }
}
