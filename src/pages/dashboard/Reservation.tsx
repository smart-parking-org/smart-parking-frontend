import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Plus } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reservationApi, authApi } from '@/config/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

interface UserSnapshot {
  id: number;
  name: string;
  email: string;
  phone: string;
}

interface VehicleSnapshot {
  id: number;
  plate?: string;
  license_plate?: string;
  type?: string;
  vehicle_type?: string;
}

interface PricingSnapshot {
  id?: number;
  key?: string;
  value?: {
    hourly?: number;
    daily_cap?: number;
    monthly_pass?: number;
    peak_enabled?: boolean;
    peak_multiplier?: number;
  };
  hourly?: number;
  base_price_per_hour?: number;
  peak_multiplier?: number;
  peak_hour_multiplier?: number;
  rounding_minutes?: number;
  daily_cap?: number;
  monthly_pass?: number;
  peak_enabled?: boolean;
}

interface ReservationRequest {
  id: number;
  desired_start_time: string;
  duration_minutes: number;
  status: string;
  priority_score: number;
  processing_time_ms: number;
}

interface ParkingLot {
  id: number;
  name: string;
  gate_pos_x: number;
  gate_pos_y: number;
}

interface Slot {
  id: number;
  slot_code: string;
  vehicle_type: string;
  position_x: number;
  position_y: number;
  status: string;
  parking_lot: ParkingLot;
}

interface Reservation {
  id: number;
  reservation_code: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'expired';
  start_time: string;
  end_time: string;
  expires_at?: string;
  extended_at?: string;
  check_in_at?: string;
  check_out_at?: string;
  cancelled_at?: string;
  user_snapshot: UserSnapshot;
  vehicle_snapshot?: VehicleSnapshot;
  pricing_snapshot?: PricingSnapshot;
  slot?: Slot;
  reservation_request?: ReservationRequest;
  // Computed fields from backend
  plate?: string;
  duration_minutes?: number;
  extension_count?: number; // Thêm field này
}

interface ReservationDetail {
  id: number;
  reservation_code: string;
  status: string;
  start_time: string;
  end_time: string;
  expires_at?: string;
  extended_at?: string;
  check_in_at?: string;
  check_out_at?: string;
  cancelled_at?: string;
  plate?: string;
  duration_minutes?: number;
  extension_count?: number; // Thêm field này
  slot: Slot;
  reservation_request?: ReservationRequest;
  user_snapshot: UserSnapshot;
  vehicle_snapshot?: VehicleSnapshot;
  pricing_snapshot?: PricingSnapshot;
}

interface ReservationsResponse {
  success: boolean;
  data: {
    reservations: Reservation[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
    summary?: {
      total_reservations: number;
      confirmed: number;
      checked_in: number;
      checked_out: number;
      cancelled: number;
      expired: number;
    };
  };
}

interface CreateReservationRequest {
  parking_lot_id: number;
  user_id: number;
  vehicle_id: number;
  vehicle_type: 'motorbike' | 'car_4_seat' | 'car_7_seat' | 'light_truck';
  desired_start_time: string;
  duration_minutes: number;
  algorithm?: 'priority_queue';
}

interface CreateReservationResponse {
  success: boolean;
  message: string;
  data?: {
    reservation: {
      id: number;
      reservation_code: string;
      status: string;
      reserved_at: string;
      expires_at: string;
      slot_id: number;
      reservation_request_id: number;
    };
    allocated_slot: {
      id: number;
      slot_code: string;
      vehicle_type: string;
    };
    algorithm_used: string;
    processing_time_ms: number;
    qr_payload: string;
  };
}

export default function Reservations() {
  // List state
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(15);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState<any>(null);
  const [extensionPolicy, setExtensionPolicy] = useState<any>(null);
  // Extension policies cache
  const [extensionPolicies, setExtensionPolicies] = useState<Map<number, any>>(new Map());
  const [peakHours, setPeakHours] = useState<any[]>([]);

  // Filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('all');
  const [parkingLotFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail dialog
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Create reservation dialog
  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newReservation, setNewReservation] = useState<CreateReservationRequest>({
    parking_lot_id: 1,
    user_id: 0,
    vehicle_id: 0,
    vehicle_type: 'car_4_seat',
    desired_start_time: '',
    duration_minutes: 120,
    algorithm: 'priority_queue',
  });

  // Data for selects
  const [parkingLots, setParkingLots] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [userVehicles, setUserVehicles] = useState<any[]>([]);
  const [loadingUserVehicles, setLoadingUserVehicles] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, vehicleTypeFilter, parkingLotFilter, dateFrom, dateTo, limit]);

  // Fetch reservations
  useEffect(() => {
    fetchReservations();
  }, [page, limit, debouncedSearch, statusFilter, vehicleTypeFilter, parkingLotFilter, dateFrom, dateTo]);

  // Fetch data for selects
  useEffect(() => {
    fetchParkingLots();
    fetchUsers();
  }, []);

  const fetchReservations = async () => {
    try {
      setLoading(true);
      const params: any = {
        page,
        per_page: limit,
      };

      // Add filters
      if (debouncedSearch) params.user_id = debouncedSearch;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (vehicleTypeFilter !== 'all') params.vehicle_type = vehicleTypeFilter;
      if (parkingLotFilter !== 'all') params.parking_lot_id = parkingLotFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const res = await reservationApi.get('/reservations', { params });
      const data: ReservationsResponse = res.data;

      console.log('API Response:', data);
      console.log('Reservations data:', data.data.reservations);

      setReservations(data.data.reservations || []);
      setSummary(data.data.summary || null);

      const parkingLotIds = new Set<number>();
      (data.data.reservations || []).forEach((res: Reservation) => {
        if (res.slot?.parking_lot?.id) {
          parkingLotIds.add(res.slot.parking_lot.id);
        }
      });

      const policiesMap = new Map<number, any>();
      await Promise.all(
        Array.from(parkingLotIds).map(async (lotId) => {
          try {
            const res = await reservationApi.get(`/extension-policies/parking-lot/${lotId}`);
            if (res.data.success) {
              policiesMap.set(lotId, res.data.data);
            }
          } catch (err) {
            console.log(err);
          }
        }),
      );
      setExtensionPolicies(policiesMap);

      const pagination = data.data.pagination;
      setTotalPages(pagination.last_page || Math.max(1, Math.ceil(pagination.total / pagination.per_page)));
    } catch (err) {
      console.error('fetchReservations error', err);
      alert('Lỗi khi tải danh sách đặt chỗ');
    } finally {
      setLoading(false);
    }
  };

  const fetchReservationDetail = async (id: number) => {
    try {
      setDetailLoading(true);
      const res = await reservationApi.get(`/reservations/${id}`);
      const data = res.data.data;
      setSelectedReservation(data);
      setOpenDetail(true);

      // Fetch extension policy for the parking lot
      if (data.slot?.parking_lot_id) {
        try {
          const policyRes = await reservationApi.get(`/extension-policies/parking-lot/${data.slot.parking_lot_id}`);
          if (policyRes.data.success) {
            setExtensionPolicy(policyRes.data.data);
          } else {
            setExtensionPolicy(null);
          }
        } catch (err) {
          console.error('fetchExtensionPolicy error', err);
          setExtensionPolicy(null);
        }

        // Fetch peak hours
        try {
          const peakRes = await reservationApi.get(`/parking-lots/${data.slot.parking_lot_id}/peak-hours`);
          if (peakRes.data.success) {
            setPeakHours(peakRes.data.peak_hours || []);
          }
        } catch (err) {
          console.error('fetchPeakHours error', err);
          setPeakHours([]);
        }
      }
    } catch (err) {
      console.error('fetchReservationDetail error', err);
      alert('Lỗi khi tải chi tiết đặt chỗ');
    } finally {
      setDetailLoading(false);
    }
  };

  const fetchParkingLots = async () => {
    try {
      const res = await reservationApi.get('/parking-lots');
      setParkingLots(res.data || []);
    } catch (err) {
      console.error('fetchParkingLots error', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await authApi.get('/users', { params: { page: 1, limit: 200 } });
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('fetchUsers error', err);
    }
  };

  const fetchUserVehicles = async (userId: number) => {
    if (!userId) {
      setUserVehicles([]);
      return;
    }

    try {
      setLoadingUserVehicles(true);
      const res = await authApi.get('/vehicles', {
        params: {
          page: 1,
          limit: 100,
          user_id: userId,
        },
      });
      setUserVehicles(res.data.data || []);
    } catch (err) {
      console.error('fetchUserVehicles error', err);
      setUserVehicles([]);
    } finally {
      setLoadingUserVehicles(false);
    }
  };

  const handleUserChange = (userId: string) => {
    const userIdNum = Number(userId);
    setNewReservation({
      ...newReservation,
      user_id: userIdNum,
      vehicle_id: 0,
    });

    fetchUserVehicles(userIdNum);
  };

  const handleVehicleChange = (vehicleId: string) => {
    const vehicleIdNum = Number(vehicleId);
    const selectedVehicle = userVehicles.find((v) => v.id === vehicleIdNum);

    setNewReservation({
      ...newReservation,
      vehicle_id: vehicleIdNum,
      vehicle_type: selectedVehicle?.vehicle_type || 'car_4_seat',
    });
  };

  const handleCreateReservation = async () => {
    try {
      if (!newReservation.user_id || !newReservation.vehicle_id || !newReservation.desired_start_time) {
        alert('Vui lòng điền đầy đủ thông tin');
        return;
      }

      setCreateLoading(true);
      const localDateTime = new Date(newReservation.desired_start_time);
      const utcDateTime = localDateTime.toISOString();

      const payload = {
        ...newReservation,
        desired_start_time: utcDateTime,
      };

      const res = await reservationApi.post('/reservations', payload);
      const data: CreateReservationResponse = res.data;

      if (data.success) {
        alert(
          `Đặt chỗ thành công!\nMã đặt chỗ: ${data.data?.reservation.reservation_code}\nChỗ đỗ: ${data.data?.allocated_slot.slot_code}`,
        );
        setOpenCreate(false);
        setNewReservation({
          parking_lot_id: 1,
          user_id: 0,
          vehicle_id: 0,
          vehicle_type: 'car_4_seat',
          desired_start_time: '',
          duration_minutes: 120,
          algorithm: 'priority_queue',
        });
        setUserVehicles([]);
        fetchReservations();
      } else {
        alert(data.message || 'Có lỗi xảy ra khi tạo đặt chỗ');
      }
    } catch (err: any) {
      console.error('createReservation error', err);
      const errorMessage = err.response?.data?.message || 'Không thể tạo đặt chỗ';
      alert(errorMessage);
    } finally {
      setCreateLoading(false);
    }
  };

  const openCreateDialog = () => {
    setNewReservation({
      parking_lot_id: 1,
      user_id: 0,
      vehicle_id: 0,
      vehicle_type: 'car_4_seat',
      desired_start_time: '',
      duration_minutes: 120,
      algorithm: 'priority_queue',
    });
    setUserVehicles([]);
    setOpenCreate(true);
  };

  const openDetailDialog = (reservation: Reservation) => {
    fetchReservationDetail(reservation.id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: 'Đã xác nhận', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      checked_in: { label: 'Đã check-in', className: 'bg-green-50 text-green-700 border-green-200' },
      checked_out: { label: 'Đã check-out', className: 'bg-gray-50 text-gray-700 border-gray-200' },
      cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-red-700 border-red-200' },
      expired: { label: 'Hết hạn', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.confirmed;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const getVehicleTypeLabel = (type: string) => {
    const typeLabels = {
      motorbike: 'Xe máy',
      car_4_seat: 'Xe 4 chỗ',
      car_7_seat: 'Xe 7 chỗ',
      light_truck: 'Xe tải nhẹ',
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('vi-VN');
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatDateTimeShort = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('vi-VN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid Date';
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || isNaN(minutes)) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const canExtend = (reservation: Reservation): boolean => {
    if (reservation.status !== 'confirmed') return false;
    if (reservation.expires_at && new Date(reservation.expires_at) <= new Date()) return false;

    // Fallback: hiển thị nút nếu không có đủ thông tin
    const lotId = reservation.slot?.parking_lot?.id;
    if (!lotId) {
      console.log('No parking lot ID for reservation:', reservation.id);
      return true;
    }

    const policy = extensionPolicies.get(lotId);
    if (!policy) {
      console.log('No policy for lot:', lotId);
      return true; // Hiển thị để backend validate
    }

    if (!policy.value?.is_active) return false;

    const currentCount = reservation.extension_count || 0;
    const maxCount = policy.value.max_extensions || 0;
    const canExtendResult = currentCount < maxCount;

    console.log('Can extend check:', { lotId, currentCount, maxCount, canExtendResult });

    return canExtendResult;
  };

  const calculateDurationMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const calculatePrice = (pricing: PricingSnapshot, durationMinutes: number, startTime?: string, peakHours?: any[]) => {
    if (!pricing || !durationMinutes) return 0;

    // Lấy giá từ value object hoặc từ pricing trực tiếp
    const hourlyRate = pricing.value?.hourly || pricing.hourly || pricing.base_price_per_hour || 0;
    const peakMultiplier =
      pricing.value?.peak_multiplier || pricing.peak_multiplier || pricing.peak_hour_multiplier || 1;
    const peakEnabled = pricing.value?.peak_enabled ?? pricing.peak_enabled ?? false;

    const hours = durationMinutes / 60;
    const basePrice = hourlyRate * hours;

    // Chỉ áp dụng peak multiplier nếu:
    // 1. Peak enabled = true
    // 2. Có startTime và peakHours để kiểm tra
    // 3. startTime nằm trong giờ cao điểm
    let finalMultiplier = 1;

    if (peakEnabled && startTime && peakHours && peakHours.length > 0) {
      const start = new Date(startTime);
      const dayOfWeek = start.getDay(); // 0 = Chủ nhật, 1 = Thứ 2, ..., 6 = Thứ 7
      const timeStr = start.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      // Kiểm tra xem có peak hour nào match không
      const isInPeakHour = peakHours.some((peak: any) => {
        if (!peak.is_active) return false;
        if (peak.day_of_week !== dayOfWeek) return false;

        const peakStart = peak.start_time; // Format: "HH:mm:ss"
        const peakEnd = peak.end_time;

        return timeStr >= peakStart && timeStr < peakEnd;
      });

      if (isInPeakHour) {
        finalMultiplier = peakMultiplier;
      }
    }

    const totalPrice = basePrice * finalMultiplier;
    return Math.round(totalPrice);
  };

  const handleExtendReservation = async (id: number) => {
    try {
      // Get reservation detail first to check extension policy
      const detailRes = await reservationApi.get(`/reservations/${id}`);
      const reservation = detailRes.data.data;

      if (reservation.slot?.parking_lot_id) {
        // Fetch extension policy
        try {
          const policyRes = await reservationApi.get(
            `/extension-policies/parking-lot/${reservation.slot.parking_lot_id}`,
          );

          if (policyRes.data.success) {
            const policy = policyRes.data.data;
            const currentExtensions = reservation.extension_count || 0;
            const maxExtensions = policy.value?.max_extensions || 0;
            const extensionMinutes = policy.value?.extension_minutes || 15;
            const isActive = policy.value?.is_active === true;

            if (!isActive) {
              alert('Chính sách gia hạn chưa được kích hoạt');
              return;
            }

            if (currentExtensions >= maxExtensions) {
              alert(`Bạn đã đạt giới hạn số lần gia hạn (${maxExtensions} lần)`);
              return;
            }

            // Show confirmation with policy info
            const confirmMessage =
              `Gia hạn đặt chỗ thêm ${extensionMinutes} phút?\n` +
              `Số lần đã gia hạn: ${currentExtensions}/${maxExtensions}`;

            if (!confirm(confirmMessage)) {
              return;
            }
          }
        } catch (err) {
          console.error('Error fetching extension policy:', err);
          // Continue with extension if policy fetch fails (for backward compatibility)
        }
      }

      const res = await reservationApi.put(`/reservations/${id}/extend`);
      if (res.data.success) {
        const extendMinutes = res.data.data?.extended_minutes || 15;
        alert(`Gia hạn đặt chỗ thành công! Thêm ${extendMinutes} phút.`);
        fetchReservations(); // Refresh danh sách
        // Refresh detail if dialog is open
        if (selectedReservation && selectedReservation.id === id) {
          fetchReservationDetail(id);
        }
      } else {
        alert(res.data.message || 'Không thể gia hạn đặt chỗ');
      }
    } catch (err: any) {
      console.error('extendReservation error', err);
      const errorMessage = err.response?.data?.message || 'Không thể gia hạn đặt chỗ';
      alert(errorMessage);
    }
  };

  const handleCancelReservation = async (id: number) => {
    if (!confirm('Bạn có chắc muốn hủy đặt chỗ này?')) return;

    try {
      const res = await reservationApi.put(`/reservations/${id}/cancel`);
      if (res.data.success) {
        alert('Hủy đặt chỗ thành công!');
        fetchReservations(); // Refresh danh sách
      } else {
        alert(res.data.message || 'Không thể hủy đặt chỗ');
      }
    } catch (err: any) {
      console.error('cancelReservation error', err);
      const errorMessage = err.response?.data?.message || 'Không thể hủy đặt chỗ';
      alert(errorMessage);
    }
  };

  const handleCheckIn = async (id: number) => {
    try {
      const res = await reservationApi.put(`/reservations/${id}/check-in`);
      if (res.data.success) {
        alert('Check-in thành công!');
        fetchReservations(); // Refresh danh sách
      } else {
        alert(res.data.message || 'Không thể check-in');
      }
    } catch (err: any) {
      console.error('checkIn error', err);
      const errorMessage = err.response?.data?.message || 'Không thể check-in';
      alert(errorMessage);
    }
  };

  const handleCheckInAll = async () => {
    const confirmedReservations = reservations.filter((r) => r.status === 'confirmed');

    if (confirmedReservations.length === 0) {
      alert('Không có đặt chỗ nào đang ở trạng thái "Đã xác nhận" để check-in');
      return;
    }

    const confirmMessage = `Bạn có chắc muốn check-in tất cả ${confirmedReservations.length} đặt chỗ đã xác nhận?`;
    if (!confirm(confirmMessage)) {
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    for (const reservation of confirmedReservations) {
      try {
        const res = await reservationApi.put(`/reservations/${reservation.id}/check-in`);
        if (res.data.success) {
          successCount++;
        } else {
          failCount++;
          errors.push(`${reservation.reservation_code}: ${res.data.message || 'Không thể check-in'}`);
        }
      } catch (err: any) {
        failCount++;
        const errorMessage = err.response?.data?.message || 'Không thể check-in';
        errors.push(`${reservation.reservation_code}: ${errorMessage}`);
      }
    }

    let resultMessage = `Đã check-in thành công ${successCount} đặt chỗ`;
    if (failCount > 0) {
      resultMessage += `\nThất bại: ${failCount} đặt chỗ`;
      if (errors.length > 0) {
        resultMessage += '\n\nChi tiết lỗi:\n' + errors.slice(0, 5).join('\n');
        if (errors.length > 5) {
          resultMessage += `\n... và ${errors.length - 5} lỗi khác`;
        }
      }
    }
    alert(resultMessage);
    fetchReservations();
  };

  const handleCheckOut = async (id: number) => {
    try {
      const res = await reservationApi.put(`/reservations/${id}/check-out`);
      if (res.data.success) {
        alert('Check-out thành công!');
        fetchReservations(); // Refresh danh sách
      } else {
        alert(res.data.message || 'Không thể check-out');
      }
    } catch (err: any) {
      console.error('checkOut error', err);
      const errorMessage = err.response?.data?.message || 'Không thể check-out';
      alert(errorMessage);
    }
  };

  const pagedData = useMemo(() => reservations, [reservations]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{summary.total_reservations}</div>
              <div className="text-sm text-muted-foreground">Tổng đặt chỗ</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{summary.confirmed}</div>
              <div className="text-sm text-muted-foreground">Đã xác nhận</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{summary.checked_in}</div>
              <div className="text-sm text-muted-foreground">Đã check-in</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-600">{summary.checked_out}</div>
              <div className="text-sm text-muted-foreground">Đã check-out</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-red-600">{summary.cancelled}</div>
              <div className="text-sm text-muted-foreground">Đã hủy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-orange-600">{summary.expired}</div>
              <div className="text-sm text-muted-foreground">Hết hạn</div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-col gap-3">
          <div className="flex justify-between items-center w-full">
            <CardTitle>Quản lý đặt chỗ</CardTitle>
            <div className="flex gap-2">
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Tạo đặt chỗ
              </Button>
              <Button variant="outline" onClick={fetchReservations}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Làm mới
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3 flex-wrap items-center">
            <div className="relative flex-1 min-w-[250px]">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo mã đặt chỗ, biển số..."
                className="pl-8"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                <SelectItem value="checked_in">Đã check-in</SelectItem>
                <SelectItem value="checked_out">Đã check-out</SelectItem>
                <SelectItem value="cancelled">Đã hủy</SelectItem>
                <SelectItem value="expired">Hết hạn</SelectItem>
              </SelectContent>
            </Select>

            <Select value={vehicleTypeFilter} onValueChange={setVehicleTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Loại xe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả loại xe</SelectItem>
                <SelectItem value="motorbike">Xe máy</SelectItem>
                <SelectItem value="car_4_seat">Xe 4 chỗ</SelectItem>
                <SelectItem value="car_7_seat">Xe 7 chỗ</SelectItem>
                <SelectItem value="light_truck">Xe tải nhẹ</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Từ ngày:</Label>
              <Input
                type="datetime-local"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-sm">Đến ngày:</Label>
              <Input
                type="datetime-local"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[180px]"
              />
            </div>

            <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / trang</SelectItem>
                <SelectItem value="15">15 / trang</SelectItem>
                <SelectItem value="20">20 / trang</SelectItem>
                <SelectItem value="50">50 / trang</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={handleCheckInAll}
              disabled={!reservations.some((r) => r.status === 'confirmed')}
            >
              Check-in ({reservations.filter((r) => r.status === 'confirmed').length})
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading && pagedData.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">Đang tải...</div>
            </div>
          ) : (
            <>
              <div className="relative">
                {loading && (
                  <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                    <div className="text-sm text-muted-foreground">Đang tải...</div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đặt chỗ</TableHead>
                      <TableHead>Biển số</TableHead>
                      <TableHead>Loại xe</TableHead>
                      <TableHead>Chỗ đỗ</TableHead>
                      <TableHead>Người đặt</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Thời gian đặt</TableHead>
                      <TableHead>Thời lượng</TableHead>
                      <TableHead>Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground">
                          Không tìm thấy đặt chỗ nào
                        </TableCell>
                      </TableRow>
                    ) : (
                      pagedData.map((reservation) => (
                        <TableRow
                          key={reservation.id}
                          className="cursor-pointer hover:bg-muted/50 transition"
                          onClick={() => openDetailDialog(reservation)}
                        >
                          <TableCell className="font-medium">{reservation.reservation_code}</TableCell>
                          <TableCell>
                            {reservation.plate ||
                              reservation.vehicle_snapshot?.plate ||
                              reservation.vehicle_snapshot?.license_plate ||
                              'N/A'}
                          </TableCell>
                          <TableCell>
                            {getVehicleTypeLabel(
                              reservation.vehicle_snapshot?.type || reservation.vehicle_snapshot?.vehicle_type || '',
                            )}
                          </TableCell>
                          <TableCell>{reservation.slot?.slot_code || 'N/A'}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{reservation.user_snapshot?.name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">
                                {reservation.user_snapshot?.phone || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(reservation.status)}</TableCell>
                          <TableCell>{formatDateTimeShort(reservation.start_time)}</TableCell>
                          <TableCell>
                            {formatDuration(
                              reservation.duration_minutes ||
                                calculateDurationMinutes(reservation.start_time, reservation.end_time),
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {/* Gia hạn - chỉ hiện khi confirmed và chưa gia hạn */}
                              {canExtend(reservation) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleExtendReservation(reservation.id);
                                  }}
                                >
                                  Gia hạn
                                </Button>
                              )}

                              {/* Check-in - chỉ hiện khi confirmed */}
                              {reservation.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCheckIn(reservation.id);
                                  }}
                                >
                                  Check-in
                                </Button>
                              )}

                              {/* Check-out - chỉ hiện khi checked_in */}
                              {reservation.status === 'checked_in' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCheckOut(reservation.id);
                                  }}
                                >
                                  Check-out
                                </Button>
                              )}

                              {/* Hủy - chỉ hiện khi confirmed */}
                              {reservation.status === 'confirmed' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelReservation(reservation.id);
                                  }}
                                >
                                  Hủy
                                </Button>
                              )}

                              {/* Chi tiết - luôn hiện */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailDialog(reservation);
                                }}
                              >
                                Chi tiết
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                >
                  ←
                </Button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(p)}>
                    {p}
                  </Button>
                ))}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                >
                  →
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Reservation Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Tạo đặt chỗ mới</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bãi đỗ</Label>
                <Select
                  value={newReservation.parking_lot_id.toString()}
                  onValueChange={(v) => setNewReservation({ ...newReservation, parking_lot_id: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn bãi đỗ" />
                  </SelectTrigger>
                  <SelectContent>
                    {parkingLots.map((lot) => (
                      <SelectItem key={lot.id} value={lot.id.toString()}>
                        {lot.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Người dùng *</Label>
                <Select value={newReservation.user_id.toString()} onValueChange={handleUserChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn người dùng" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Phương tiện *</Label>
                <Select
                  value={newReservation.vehicle_id.toString()}
                  onValueChange={handleVehicleChange}
                  disabled={!newReservation.user_id || loadingUserVehicles}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        !newReservation.user_id
                          ? 'Chọn người dùng trước'
                          : loadingUserVehicles
                            ? 'Đang tải...'
                            : 'Chọn phương tiện'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {userVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.license_plate}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Loại xe</Label>
                <Select
                  value={newReservation.vehicle_type}
                  onValueChange={(v) => setNewReservation({ ...newReservation, vehicle_type: v as any })}
                  disabled={true}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại xe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="motorbike">Xe máy</SelectItem>
                    <SelectItem value="car_4_seat">Xe 4 chỗ</SelectItem>
                    <SelectItem value="car_7_seat">Xe 7 chỗ</SelectItem>
                    <SelectItem value="light_truck">Xe tải nhẹ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Thời gian mong muốn *</Label>
                <Input
                  type="datetime-local"
                  value={newReservation.desired_start_time}
                  onChange={(e) => setNewReservation({ ...newReservation, desired_start_time: e.target.value })}
                />
              </div>

              <div>
                <Label>Thời lượng (phút)</Label>
                <Input
                  type="number"
                  value={newReservation.duration_minutes}
                  onChange={(e) => setNewReservation({ ...newReservation, duration_minutes: Number(e.target.value) })}
                  min="30"
                  max="480"
                />
              </div>
            </div>

            <div>
              <Label>Thuật toán phân bổ</Label>
              <Select
                value={newReservation.algorithm || 'priority_queue'}
                onValueChange={(v) => setNewReservation({ ...newReservation, algorithm: v as any })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn thuật toánlap" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="priority_queue">Priority Queue (Hàng đợi ưu tiên)</SelectItem>
                  <SelectItem value="hungarian">Hungarian Algorithm (Thuật toán Hungarian)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Hủy
            </Button>
            <Button
              onClick={handleCreateReservation}
              disabled={createLoading || !newReservation.user_id || !newReservation.vehicle_id}
            >
              {createLoading ? 'Đang tạo...' : 'Tạo đặt chỗ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết đặt chỗ</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="text-center py-10 text-muted-foreground">Đang tải chi tiết...</div>
          ) : selectedReservation ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Mã đặt chỗ</Label>
                  <div className="text-sm font-mono">{selectedReservation.reservation_code || 'N/A'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Trạng thái</Label>
                  <div className="mt-1">{getStatusBadge(selectedReservation.status)}</div>
                </div>
              </div>

              <Separator />

              {/* Vehicle & Slot Info */}
              <div>
                <h4 className="text-lg font-medium mb-3">Thông tin phương tiện & chỗ đỗ</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Biển số</Label>
                    <div className="text-sm">
                      {selectedReservation.plate ||
                        selectedReservation.vehicle_snapshot?.plate ||
                        selectedReservation.vehicle_snapshot?.license_plate ||
                        'N/A'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Loại xe</Label>
                    <div className="text-sm">
                      {selectedReservation.vehicle_snapshot?.type || selectedReservation.vehicle_snapshot?.vehicle_type
                        ? getVehicleTypeLabel(
                            selectedReservation.vehicle_snapshot.type ||
                              selectedReservation.vehicle_snapshot.vehicle_type ||
                              '',
                          )
                        : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Chỗ đỗ</Label>
                    <div className="text-sm">{selectedReservation.slot?.slot_code || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bãi đỗ</Label>
                    <div className="text-sm">{selectedReservation.slot?.parking_lot?.name || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* User Info */}
              <div>
                <h4 className="text-lg font-medium mb-3">Thông tin người đặt</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Tên</Label>
                    <div className="text-sm">{selectedReservation.user_snapshot?.name || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <div className="text-sm">{selectedReservation.user_snapshot?.email || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Số điện thoại</Label>
                    <div className="text-sm">{selectedReservation.user_snapshot?.phone || 'N/A'}</div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Timing Info */}
              <div>
                <h4 className="text-lg font-medium mb-3">Thông tin thời gian</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Thời gian đặt</Label>
                    <div className="text-sm">
                      {selectedReservation.start_time ? formatDateTime(selectedReservation.start_time) : 'N/A'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Hết hạn</Label>
                    <div className="text-sm">
                      {selectedReservation.expires_at ? formatDateTime(selectedReservation.expires_at) : 'N/A'}
                    </div>
                  </div>
                  {selectedReservation.extended_at && (
                    <div>
                      <Label className="text-sm font-medium">Gia hạn</Label>
                      <div className="text-sm">{formatDateTime(selectedReservation.extended_at)}</div>
                    </div>
                  )}
                  {selectedReservation.check_in_at && (
                    <div>
                      <Label className="text-sm font-medium">Check-in</Label>
                      <div className="text-sm">{formatDateTime(selectedReservation.check_in_at)}</div>
                    </div>
                  )}
                  {selectedReservation.check_out_at && (
                    <div>
                      <Label className="text-sm font-medium">Check-out</Label>
                      <div className="text-sm">{formatDateTime(selectedReservation.check_out_at)}</div>
                    </div>
                  )}
                  {selectedReservation.cancelled_at && (
                    <div>
                      <Label className="text-sm font-medium">Hủy lúc</Label>
                      <div className="text-sm">{formatDateTime(selectedReservation.cancelled_at)}</div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Thời lượng</Label>
                    <div className="text-sm">
                      {selectedReservation.duration_minutes ||
                      calculateDurationMinutes(selectedReservation.start_time, selectedReservation.end_time)
                        ? formatDuration(
                            selectedReservation.duration_minutes ||
                              calculateDurationMinutes(selectedReservation.start_time, selectedReservation.end_time),
                          )
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Pricing Info */}
              {selectedReservation.pricing_snapshot && (
                <>
                  <div>
                    <h4 className="text-lg font-medium mb-3">Thông tin giá</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Giá cơ bản/giờ</Label>
                        <div className="text-sm">
                          {(
                            selectedReservation.pricing_snapshot?.value?.hourly ||
                            selectedReservation.pricing_snapshot?.hourly ||
                            selectedReservation.pricing_snapshot?.base_price_per_hour ||
                            0
                          ).toLocaleString()}{' '}
                          VNĐ
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Hệ số giờ cao điểm</Label>
                        <div className="text-sm">
                          {selectedReservation.pricing_snapshot?.value?.peak_multiplier ||
                            selectedReservation.pricing_snapshot?.peak_multiplier ||
                            selectedReservation.pricing_snapshot?.peak_hour_multiplier ||
                            1}
                          x
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Giá theo ngày</Label>
                        <div className="text-sm">
                          {(
                            selectedReservation.pricing_snapshot?.value?.daily_cap ||
                            selectedReservation.pricing_snapshot?.daily_cap ||
                            0
                          ).toLocaleString()}{' '}
                          VNĐ
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Giá theo tháng</Label>
                        <div className="text-sm">
                          {(
                            selectedReservation.pricing_snapshot?.value?.monthly_pass ||
                            selectedReservation.pricing_snapshot?.monthly_pass ||
                            0
                          ).toLocaleString()}{' '}
                          VNĐ
                        </div>
                      </div>
                      <div className="col-span-2">
                        <Label className="text-sm font-medium">Tổng tiền dự kiến</Label>
                        <div className="text-sm font-medium text-green-600">
                          {calculatePrice(
                            selectedReservation.pricing_snapshot,
                            selectedReservation.duration_minutes ||
                              calculateDurationMinutes(selectedReservation.start_time, selectedReservation.end_time),
                            selectedReservation.start_time, // Thêm startTime
                            peakHours, // Thêm peakHours
                          ).toLocaleString()}{' '}
                          VNĐ
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
              {/* Extension Policy Info in Detail Dialog */}
              {extensionPolicy && extensionPolicy.value?.is_active && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-lg font-medium mb-3">Chính sách gia hạn</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Trạng thái</Label>
                        <div className="text-sm">
                          <Badge className="bg-green-50 text-green-700 border-green-200">Đã kích hoạt</Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Số phút gia hạn</Label>
                        <div className="text-sm">{extensionPolicy.value.extension_minutes || 15} phút</div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Số lần gia hạn tối đa</Label>
                        <div className="text-sm">{extensionPolicy.value.max_extensions || 1} lần</div>
                      </div>
                      {selectedReservation && (
                        <div>
                          <Label className="text-sm font-medium">Số lần đã gia hạn</Label>
                          <div className="text-sm">
                            {(selectedReservation as any).extension_count || 0} /{' '}
                            {extensionPolicy.value.max_extensions || 1}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetail(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
