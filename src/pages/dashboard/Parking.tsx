import { useEffect, useState, useRef } from 'react';
import { reservationApi } from '@/config/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RefreshCw } from 'lucide-react';
import ENV from '@/config/env';

// ==== Kiểu dữ liệu ====
interface ParkingLot {
  id: number;
  name: string;
  gate_pos_x: number;
  gate_pos_y: number;
}

interface ParkingSlot {
  id: number;
  parking_lot_id: number;
  slot_code: string;
  vehicle_type: string;
  effective_status: string;
  status: string;
  position_x: number;
  position_y: number;
  created_at: string;
  updated_at: string;
  current_reservation?: Reservation | null;
}

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

interface Slot {
  id: number;
  slot_code: string;
  vehicle_type: string;
  position_x: number;
  position_y: number;
  status: string;
  parking_lot: ParkingLot;
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

interface Gate {
  id: number;
  gate_code: string;
  gate_type: string;
  position_x: number;
  position_y: number;
  is_active: boolean;
}

interface Reservation {
  id: number;
  reservation_code: string;
  status: 'confirmed' | 'checked_in' | 'checked_out' | 'cancelled' | 'expired' | 'pending_checkout';
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
  reservation_request?: ReservationRequest & {
    parking_lot?: ParkingLot;
    gate?: Gate;
  };
  parking_lot?: ParkingLot;
  gate?: Gate;
  distance_from_gate_meters?: number;
  plate?: string;
  duration_minutes?: number;
  extension_count?: number;
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
  extension_count?: number;
  slot: Slot;
  reservation_request?: ReservationRequest & {
    parking_lot?: ParkingLot;
    gate?: Gate;
  };
  parking_lot?: ParkingLot;
  gate?: Gate;
  distance_from_gate_meters?: number;
  user_snapshot: UserSnapshot;
  vehicle_snapshot?: VehicleSnapshot;
  pricing_snapshot?: PricingSnapshot;
  payment?: {
    id: number;
    order_id: string;
    amount: number;
    txn_ref: string;
    status: 'PENDING' | 'PAID' | 'FAILED';
    vnp_response_code?: string;
    vnp_transaction_no?: string;
    bank_code?: string;
    card_type?: string;
    meta?: any;
    created_at: string;
    updated_at: string;
    paid_at?: string;
  };
}

export default function ParkingLots() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const sseRef = useRef<EventSource | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [slotSummary, setSlotSummary] = useState<any>(null); // Summary từ API slots

  // Reservations state
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [extensionPolicies, setExtensionPolicies] = useState<Map<number, any>>(new Map());
  const [extensionPolicy, setExtensionPolicy] = useState<any>(null);

  // Bộ lọc
  const [lotFilter, setLotFilter] = useState<string>('all');
  const [vehicleType, setVehicleType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');
  const [reservationStatusFilter, setReservationStatusFilter] = useState<string>('all');
  const [activeSlotTab, setActiveSlotTab] = useState<string>('all');

  // ====== FETCH DANH SÁCH BÃI ======
  const fetchParkingLots = async () => {
    try {
      const res = await reservationApi.get('/parking-lots');
      const data = Array.isArray(res.data) ? res.data : res.data.data || [];
      setLots(data);
    } catch (err) {
      console.error('Lỗi tải danh sách bãi:', err);
    }
  };

  // ====== FETCH CHỖ ĐỖ THEO BÃI ======
  const fetchSlots = async (lot: ParkingLot) => {
    setLoading(true);
    try {
      const params: any = {};
      if (vehicleType !== 'all') params.vehicle_type = vehicleType;
      if (status !== 'all') params.status = status;

      const res = await reservationApi.get(`/parking-lots/${lot.id}/slots`);
      setSlots(res.data.slots || []);
      setSelectedLot(res.data.parking_lot || lot);
      // Lưu summary từ API
      if (res.data.summary) {
        setSlotSummary(res.data.summary);
      }
      if (res.data.by_vehicle_type) {
        setSlotSummary((prev: any) => ({ ...prev, by_vehicle_type: res.data.by_vehicle_type }));
      }
    } catch (err) {
      console.error('Lỗi tải chỗ đỗ:', err);
    } finally {
      setLoading(false);
    }
  };

  // ====== FETCH ĐẶT CHỖ THEO BÃI ======
  const fetchReservations = async () => {
    if (!selectedLot) {
      setSummary(null);
      return;
    }
    try {
      setReservationsLoading(true);
      const params: any = {
        page: 1,
        per_page: 100,
        parking_lot_id: selectedLot.id,
      };

      if (reservationStatusFilter !== 'all') {
        params.status = reservationStatusFilter;
      }

      const res = await reservationApi.get('/reservations', { params });
      const data = res.data.data;
      const reservations = data.reservations || [];
      setReservations(reservations);

      const calculatedSummary = {
        total_reservations: reservations.length,
        confirmed: reservations.filter((r: Reservation) => r.status === 'confirmed').length,
        checked_in: reservations.filter((r: Reservation) => r.status === 'checked_in').length,
        checked_out: reservations.filter((r: Reservation) => r.status === 'checked_out').length,
        cancelled: reservations.filter((r: Reservation) => r.status === 'cancelled').length,
        expired: reservations.filter((r: Reservation) => r.status === 'expired').length,
      };
      setSummary(calculatedSummary);

      // Fetch extension policies
      try {
        const policyRes = await reservationApi.get(`/extension-policies/parking-lot/${selectedLot.id}`);
        if (policyRes.data.success) {
          const policiesMap = new Map<number, any>();
          policiesMap.set(selectedLot.id, policyRes.data.data);
          setExtensionPolicies(policiesMap);
        }
      } catch (err) {
        console.error('Error fetching extension policy:', err);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đặt chỗ:', err);
    } finally {
      setReservationsLoading(false);
    }
  };

  // Fetch reservations when lot is selected
  useEffect(() => {
    if (selectedLot) {
      fetchReservations();
    } else {
      setReservations([]);
    }
  }, [selectedLot?.id, reservationStatusFilter]);

  // Làm mới danh sách chỗ đỗ trong bãi
  const handleRefresh = () => {
    if (selectedLot) {
      fetchSlots(selectedLot);
      fetchReservations();
      // Refresh detail nếu đang mở
      if (selectedReservation) {
        fetchReservationDetail(selectedReservation.id);
      }
    }
  };

  // Khởi tạo
  useEffect(() => {
    fetchParkingLots();
  }, []);

  // Kết nối SSE theo bãi đã chọn
  useEffect(() => {
    let reconnectTimer: any = null;
    const connect = () => {
      // đóng kết nối cũ nếu có
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }

      if (!selectedLot) return;

      const url = `${ENV.RESERVATION_API_URL}/parking-lots/${selectedLot.id}/stream`;
      const es = new EventSource(url);
      sseRef.current = es;

      es.onmessage = (evt) => {
        try {
          const payload = JSON.parse(evt.data);
          if (payload?.slots) {
            setSlots(payload.slots);
          }
          if (payload?.summary) {
            setSlotSummary(payload.summary);
          }
        } catch (e) {
          console.error('SSE parse error:', e);
        }
      };

      es.onerror = (err) => {
        console.warn('SSE error, sẽ tự kết nối lại sau 2s:', err);
        es.close();
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            connect();
          }, 3000);
        }
      };
    };

    if (selectedLot) connect();

    return () => {
      if (reconnectTimer) clearTimeout(reconnectTimer);
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
    };
  }, [selectedLot?.id]);

  // ====== LỌC DANH SÁCH BÃI ======
  const filteredLots = lotFilter === 'all' ? lots : lots.filter((lot) => lot.id === Number(lotFilter));

  // ====== LỌC CHỖ ĐỖ ======
  const displayedSlots = slots.filter((s) => {
    const matchVehicle = vehicleType === 'all' || s.vehicle_type === vehicleType;
    const matchStatus = status === 'all' || s.effective_status === status;
    return matchVehicle && matchStatus;
  });

  // ====== GROUP SLOTS THEO LOẠI XE ======
  const groupedSlots = {
    all: displayedSlots,
    motorbike: displayedSlots.filter((s) => s.vehicle_type === 'motorbike'),
    car_4_seat: displayedSlots.filter((s) => s.vehicle_type === 'car_4_seat'),
    car_7_seat: displayedSlots.filter((s) => s.vehicle_type === 'car_7_seat'),
    light_truck: displayedSlots.filter((s) => s.vehicle_type === 'light_truck'),
  };

  // ====== GROUP RESERVATIONS THEO LOẠI XE ======
  const groupedReservations = {
    all: reservations,
    motorbike: reservations.filter(
      (r) => r.vehicle_snapshot?.type === 'motorbike' || r.vehicle_snapshot?.vehicle_type === 'motorbike',
    ),
    car_4_seat: reservations.filter(
      (r) => r.vehicle_snapshot?.type === 'car_4_seat' || r.vehicle_snapshot?.vehicle_type === 'car_4_seat',
    ),
    car_7_seat: reservations.filter(
      (r) => r.vehicle_snapshot?.type === 'car_7_seat' || r.vehicle_snapshot?.vehicle_type === 'car_7_seat',
    ),
    light_truck: reservations.filter(
      (r) => r.vehicle_snapshot?.type === 'light_truck' || r.vehicle_snapshot?.vehicle_type === 'light_truck',
    ),
  };

  // ====== THỐNG KÊ SLOT THEO LOẠI XE ======
  const getSlotStats = (slots: ParkingSlot[], vehicleType?: string) => {
    const filtered = vehicleType ? slots.filter((s) => s.vehicle_type === vehicleType) : slots;

    const available = filtered.filter((s) => s.effective_status === 'available').length;
    const occupied = filtered.filter((s) => s.effective_status === 'occupied').length;

    // Lấy pending_assignments từ slotSummary nếu có
    let pending = 0;
    if (slotSummary) {
      if (vehicleType && slotSummary.by_vehicle_type?.[vehicleType]) {
        pending = slotSummary.by_vehicle_type[vehicleType].pending_assignments || 0;
      } else if (!vehicleType) {
        pending = slotSummary.pending_assignments || 0;
      }
    }

    return {
      total: filtered.length,
      available: Math.max(0, available - pending), // Trừ pending_assignments
      occupied,
      pending_assignments: pending,
      physical_available: available, // Số slot không có reservation checked_in/pending_checkout
    };
  };

  // ====== RESERVATION HELPERS ======
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
      }
    } catch (err) {
      console.error('fetchReservationDetail error', err);
      alert('Lỗi khi tải chi tiết đặt chỗ');
    } finally {
      setDetailLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      confirmed: { label: 'Đã xác nhận', className: 'bg-blue-50 text-blue-700 border-blue-200' },
      checked_in: { label: 'Đã check-in', className: 'bg-green-50 text-green-700 border-green-200' },
      pending_checkout: { label: 'Chờ checkout', className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
      checked_out: { label: 'Đã check-out', className: 'bg-gray-50 text-gray-700 border-gray-200' },
      cancelled: { label: 'Đã hủy', className: 'bg-red-50 text-red-700 border-red-200' },
      expired: { label: 'Hết hạn', className: 'bg-orange-50 text-orange-700 border-orange-200' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      className: 'bg-gray-50 text-gray-700 border-gray-200',
    };
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
      return 'Invalid Date';
    }
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || isNaN(minutes)) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const calculateDurationMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(startTime);
    const end = new Date(endTime);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
  };

  const canExtend = (reservation: Reservation): boolean => {
    if (reservation.status !== 'confirmed') return false;
    if (reservation.expires_at && new Date(reservation.expires_at) <= new Date()) return false;

    const lotId = reservation.slot?.parking_lot?.id;
    if (!lotId) return true;

    const policy = extensionPolicies.get(lotId);
    if (!policy) return true;

    if (!policy.value?.is_active) return false;

    const currentCount = reservation.extension_count || 0;
    const maxCount = policy.value.max_extensions || 0;
    return currentCount < maxCount;
  };

  const handleExtendReservation = async (id: number) => {
    try {
      const res = await reservationApi.put(`/reservations/${id}/extend`);
      if (res.data.success) {
        const extendMinutes = res.data.data?.extended_minutes || 15;
        alert(`Gia hạn đặt chỗ thành công! Thêm ${extendMinutes} phút.`);
        fetchReservations();
        if (selectedReservation && selectedReservation.id === id) {
          fetchReservationDetail(id);
        }
      } else {
        alert(res.data.message || 'Không thể gia hạn đặt chỗ');
      }
    } catch (err: any) {
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
        fetchReservations();
      } else {
        alert(res.data.message || 'Không thể hủy đặt chỗ');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Không thể hủy đặt chỗ';
      alert(errorMessage);
    }
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 py-4 space-y-4">
      {/* Main Content Card */}
      <Card className="w-full overflow-hidden">
        <CardContent className="p-4">
          {/* ===== Bộ lọc bãi đỗ ===== */}
          {!selectedLot && (
            <div className="mb-4">
              <Select value={lotFilter} onValueChange={setLotFilter}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Chọn bãi đỗ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả bãi</SelectItem>
                  {lots.map((lot) => (
                    <SelectItem key={lot.id} value={String(lot.id)}>
                      {lot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* ===== Nếu chưa chọn bãi thì hiện danh sách bãi ===== */}
          {!selectedLot ? (
            <div>
              <h2 className="text-lg font-semibold mb-3">Danh sách bãi đỗ xe</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[500px] overflow-y-auto">
                {filteredLots.map((lot) => (
                  <div
                    key={lot.id}
                    onClick={() => fetchSlots(lot)}
                    className="p-3 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <div className="font-medium">{lot.name}</div>
                  </div>
                ))}
                {filteredLots.length === 0 && (
                  <div className="col-span-2 text-center text-muted-foreground py-8">Không có bãi nào</div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* ===== Header ===== */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b">
                <div>
                  <h2 className="text-lg font-semibold">{selectedLot.name}</h2>
                  {!loading && displayedSlots.length > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {displayedSlots.length} chỗ • Trống: {getSlotStats(displayedSlots).available} • Đang dùng:{' '}
                      {getSlotStats(displayedSlots).occupied}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRefresh} className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Làm mới
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedLot(null)}>
                    ← Quay lại
                  </Button>
                </div>
              </div>

              {/* ===== Bộ lọc ===== */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Loại xe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả loại xe</SelectItem>
                    <SelectItem value="motorbike">Xe máy</SelectItem>
                    <SelectItem value="car_4_seat">Ô tô 4 chỗ</SelectItem>
                    <SelectItem value="car_7_seat">Ô tô 7 chỗ</SelectItem>
                    <SelectItem value="light_truck">Xe tải nhẹ</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Trạng thái chỗ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="available">Còn trống</SelectItem>
                    <SelectItem value="occupied">Đang sử dụng</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={reservationStatusFilter} onValueChange={setReservationStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Trạng thái đặt chỗ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                    <SelectItem value="confirmed">Đã xác nhận</SelectItem>
                    <SelectItem value="checked_in">Đã check-in</SelectItem>
                    <SelectItem value="pending_checkout">Chờ checkout</SelectItem>
                    <SelectItem value="checked_out">Đã check-out</SelectItem>
                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                    <SelectItem value="expired">Hết hạn</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* ===== Sơ đồ chỗ đỗ ===== */}
              <div className="mb-4">
                {loading ? (
                  <div className="text-center text-muted-foreground py-8">Đang tải...</div>
                ) : (
                  <Tabs value={activeSlotTab} onValueChange={setActiveSlotTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-3 h-9">
                      <TabsTrigger value="all" className="text-xs">
                        Tất cả
                      </TabsTrigger>
                      <TabsTrigger value="motorbike" className="text-xs">
                        Xe máy
                      </TabsTrigger>
                      <TabsTrigger value="car_4_seat" className="text-xs">
                        4 chỗ
                      </TabsTrigger>
                      <TabsTrigger value="car_7_seat" className="text-xs">
                        7 chỗ
                      </TabsTrigger>
                      <TabsTrigger value="light_truck" className="text-xs">
                        Xe tải
                      </TabsTrigger>
                    </TabsList>

                    {(['all', 'motorbike', 'car_4_seat', 'car_7_seat', 'light_truck'] as const).map((type) => {
                      const slotsToShow = groupedSlots[type];
                      const stats = getSlotStats(slotsToShow, type !== 'all' ? type : undefined);

                      return (
                        <TabsContent key={type} value={type} className="mt-0">
                          {slotsToShow.length > 0 ? (
                            <>
                              <div className="mb-2 flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                  Trống: {stats.available}
                                </span>
                                <span className="flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                                  Dùng: {stats.occupied}
                                </span>
                                {stats.pending_assignments > 0 && (
                                  <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                    Chờ: {stats.pending_assignments}
                                  </span>
                                )}
                              </div>
                              <div className="w-full overflow-hidden border rounded-lg p-2 bg-muted/30">
                                <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1 max-h-[300px] overflow-y-auto">
                                  {slotsToShow.map((slot) => {
                                    const isAvailable = slot.effective_status === 'available';
                                    const hasReservation = slot.current_reservation && !isAvailable;

                                    return (
                                      <TooltipProvider key={slot.id}>
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <div
                                              className={`aspect-square flex flex-col items-center justify-center border rounded text-center cursor-pointer transition-all text-[9px] sm:text-[10px] ${
                                                isAvailable
                                                  ? 'bg-green-50 border-green-300 hover:bg-green-100'
                                                  : 'bg-red-50 border-red-300 hover:bg-red-100'
                                              }`}
                                            >
                                              <div className="font-bold truncate w-full px-0.5">{slot.slot_code}</div>
                                              <div className="text-[8px] truncate w-full px-0.5">
                                                {isAvailable ? 'Trống' : 'Dùng'}
                                              </div>
                                            </div>
                                          </TooltipTrigger>
                                          {hasReservation && slot.current_reservation && (
                                            <TooltipContent side="top" className="max-w-xs">
                                              <div className="space-y-1 text-xs">
                                                <div className="font-semibold">Thông tin đỗ xe</div>
                                                <div>Mã: {slot.current_reservation.reservation_code}</div>
                                                <div>
                                                  Biển số:{' '}
                                                  {slot.current_reservation.vehicle_snapshot?.license_plate || 'N/A'}
                                                </div>
                                                <div>
                                                  Người đỗ: {slot.current_reservation.user_snapshot?.name || 'N/A'}
                                                </div>
                                              </div>
                                            </TooltipContent>
                                          )}
                                        </Tooltip>
                                      </TooltipProvider>
                                    );
                                  })}
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center text-muted-foreground py-8 border rounded-lg">
                              Không có chỗ đỗ {type !== 'all' ? getVehicleTypeLabel(type) : ''}
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </div>

              {/* ===== Danh sách đặt chỗ ===== */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-semibold">Danh sách đặt chỗ</h3>
                  {!reservationsLoading && reservations.length > 0 && (
                    <span className="text-xs text-muted-foreground">{reservations.length} đặt chỗ</span>
                  )}
                </div>
                {reservationsLoading ? (
                  <div className="text-center text-muted-foreground py-8">Đang tải...</div>
                ) : reservations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 border rounded-lg">Không có đặt chỗ nào</div>
                ) : (
                  <Tabs defaultValue="all" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-3 h-9">
                      <TabsTrigger value="all" className="text-xs">
                        Tất cả
                      </TabsTrigger>
                      <TabsTrigger value="motorbike" className="text-xs">
                        Xe máy
                      </TabsTrigger>
                      <TabsTrigger value="car_4_seat" className="text-xs">
                        4 chỗ
                      </TabsTrigger>
                      <TabsTrigger value="car_7_seat" className="text-xs">
                        7 chỗ
                      </TabsTrigger>
                      <TabsTrigger value="light_truck" className="text-xs">
                        Xe tải
                      </TabsTrigger>
                    </TabsList>

                    {(['all', 'motorbike', 'car_4_seat', 'car_7_seat', 'light_truck'] as const).map((type) => {
                      const reservationsToShow = groupedReservations[type];

                      return (
                        <TabsContent key={type} value={type} className="mt-0">
                          {reservationsToShow.length > 0 ? (
                            <div className="border rounded-lg overflow-hidden">
                              <div className="overflow-x-auto">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead className="w-[100px]">Mã</TableHead>
                                      <TableHead className="w-[80px]">Biển số</TableHead>
                                      <TableHead className="w-[70px] hidden sm:table-cell">Loại</TableHead>
                                      <TableHead className="w-[70px]">Chỗ</TableHead>
                                      <TableHead className="w-[100px] hidden md:table-cell">Người đặt</TableHead>
                                      <TableHead className="w-[90px]">Trạng thái</TableHead>
                                      <TableHead className="w-[100px] hidden lg:table-cell">Thời gian</TableHead>
                                      <TableHead className="w-[120px]">Thao tác</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {reservationsToShow.map((reservation) => (
                                      <TableRow
                                        key={reservation.id}
                                        className="cursor-pointer hover:bg-muted/50 transition"
                                        onClick={() => fetchReservationDetail(reservation.id)}
                                      >
                                        <TableCell className="font-mono text-xs">
                                          <div className="truncate max-w-[100px]">{reservation.reservation_code}</div>
                                          <div className="text-[10px] text-muted-foreground sm:hidden mt-0.5">
                                            {getVehicleTypeLabel(
                                              reservation.vehicle_snapshot?.type ||
                                                reservation.vehicle_snapshot?.vehicle_type ||
                                                '',
                                            )}
                                          </div>
                                        </TableCell>
                                        <TableCell className="text-xs font-medium">
                                          {reservation.plate ||
                                            reservation.vehicle_snapshot?.plate ||
                                            reservation.vehicle_snapshot?.license_plate ||
                                            'N/A'}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                          <Badge variant="outline" className="text-[10px]">
                                            {getVehicleTypeLabel(
                                              reservation.vehicle_snapshot?.type ||
                                                reservation.vehicle_snapshot?.vehicle_type ||
                                                '',
                                            )}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs font-semibold">
                                          {reservation.slot?.slot_code || 'N/A'}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                          <div className="text-xs">
                                            <div className="font-medium truncate">
                                              {reservation.user_snapshot?.name || 'N/A'}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground truncate">
                                              {reservation.user_snapshot?.phone || 'N/A'}
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex flex-col gap-1">
                                            {getStatusBadge(reservation.status)}
                                            <div className="text-[10px] text-muted-foreground md:hidden">
                                              {formatDateTimeShort(reservation.start_time)}
                                            </div>
                                          </div>
                                        </TableCell>
                                        <TableCell className="hidden lg:table-cell text-xs">
                                          {formatDateTimeShort(reservation.start_time)}
                                        </TableCell>
                                        <TableCell>
                                          <div className="flex items-center gap-1">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-[10px] h-6 px-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                fetchReservationDetail(reservation.id);
                                              }}
                                            >
                                              Chi tiết
                                            </Button>
                                            {canExtend(reservation) && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-[10px] h-6 px-2"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleExtendReservation(reservation.id);
                                                }}
                                              >
                                                GH
                                              </Button>
                                            )}
                                            {reservation.status === 'confirmed' && (
                                              <Button
                                                size="sm"
                                                variant="destructive"
                                                className="text-[10px] h-6 px-1.5"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCancelReservation(reservation.id);
                                                }}
                                              >
                                                Hủy
                                              </Button>
                                            )}
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground py-8 border rounded-lg">
                              Không có đặt chỗ {type !== 'all' ? getVehicleTypeLabel(type) : ''}
                            </div>
                          )}
                        </TabsContent>
                      );
                    })}
                  </Tabs>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
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
                <h4 className="text-base sm:text-lg font-medium mb-3">Thông tin phương tiện & chỗ đỗ</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <div className="text-sm font-semibold">{selectedReservation.slot?.slot_code || 'N/A'}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bãi đỗ</Label>
                    <div className="text-sm">
                      {selectedReservation.parking_lot?.name ||
                        selectedReservation.slot?.parking_lot?.name ||
                        selectedReservation.reservation_request?.parking_lot?.name ||
                        'N/A'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Cổng</Label>
                    <div className="text-sm font-mono">
                      {selectedReservation.gate?.gate_code ||
                        selectedReservation.reservation_request?.gate?.gate_code ||
                        'N/A'}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Khoảng cách từ cổng</Label>
                    <div className="text-sm">
                      {selectedReservation.distance_from_gate_meters !== undefined &&
                      selectedReservation.distance_from_gate_meters !== null
                        ? `${selectedReservation.distance_from_gate_meters.toFixed(1)}m`
                        : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* User Info */}
              <div>
                <h4 className="text-base sm:text-lg font-medium mb-3">Thông tin người đặt</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                <h4 className="text-base sm:text-lg font-medium mb-3">Thông tin thời gian</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <h4 className="text-base sm:text-lg font-medium mb-3">Thông tin giá</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </div>
                  </div>
                </>
              )}

              {/* Payment Info - Thêm section mới này */}
              <Separator />
              <div>
                <h4 className="text-base sm:text-lg font-medium mb-3">Thông tin thanh toán</h4>
                {selectedReservation.payment ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium">Mã đơn hàng</Label>
                      <div className="text-sm font-mono">{selectedReservation.payment.order_id || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Mã giao dịch</Label>
                      <div className="text-sm font-mono">{selectedReservation.payment.txn_ref || 'N/A'}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Số tiền</Label>
                      <div className="text-sm font-semibold text-green-600">
                        {selectedReservation.payment.amount?.toLocaleString('vi-VN') || 0} VNĐ
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Trạng thái</Label>
                      <div className="mt-1">
                        {selectedReservation.payment.status === 'PAID' ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200">Đã thanh toán</Badge>
                        ) : selectedReservation.payment.status === 'PENDING' ? (
                          <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Chờ thanh toán</Badge>
                        ) : (
                          <Badge className="bg-red-50 text-red-700 border-red-200">Thất bại</Badge>
                        )}
                      </div>
                    </div>
                    {selectedReservation.payment.bank_code && (
                      <div>
                        <Label className="text-sm font-medium">Ngân hàng</Label>
                        <div className="text-sm">{selectedReservation.payment.bank_code}</div>
                      </div>
                    )}
                    {selectedReservation.payment.card_type && (
                      <div>
                        <Label className="text-sm font-medium">Loại thẻ</Label>
                        <div className="text-sm">{selectedReservation.payment.card_type}</div>
                      </div>
                    )}
                    {selectedReservation.payment.vnp_transaction_no && (
                      <div>
                        <Label className="text-sm font-medium">Mã giao dịch VNPay</Label>
                        <div className="text-sm font-mono">{selectedReservation.payment.vnp_transaction_no}</div>
                      </div>
                    )}
                    {selectedReservation.payment.paid_at && (
                      <div>
                        <Label className="text-sm font-medium">Thời gian thanh toán</Label>
                        <div className="text-sm">{formatDateTime(selectedReservation.payment.paid_at)}</div>
                      </div>
                    )}
                    {selectedReservation.payment.meta && (
                      <div className="col-span-2">
                        <div className="grid grid-cols-2 gap-4">
                          {selectedReservation.payment.meta.payment_method && (
                            <div>
                              <Label className="text-sm font-medium">Phương thức thanh toán</Label>
                              <div className="text-sm">
                                {selectedReservation.payment.meta.payment_method === 'monthly_pass'
                                  ? 'Vé tháng'
                                  : selectedReservation.payment.meta.payment_method === 'offline'
                                    ? 'Thanh toán tại chỗ'
                                    : selectedReservation.payment.meta.payment_method === 'online'
                                      ? 'Thanh toán online'
                                      : selectedReservation.payment.meta.payment_method}
                              </div>
                            </div>
                          )}
                          {selectedReservation.payment.meta.monthly_pass_id && (
                            <div>
                              <Label className="text-sm font-medium">ID Vé tháng</Label>
                              <div className="text-sm">{selectedReservation.payment.meta.monthly_pass_id}</div>
                            </div>
                          )}
                          {selectedReservation.payment.meta.is_free !== undefined && (
                            <div>
                              <Label className="text-sm font-medium">Miễn phí</Label>
                              <div className="text-sm">{selectedReservation.payment.meta.is_free ? 'Có' : 'Không'}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div>
                      <Label className="text-sm font-medium">Ngày tạo</Label>
                      <div className="text-sm">
                        {selectedReservation.payment.created_at
                          ? formatDateTime(selectedReservation.payment.created_at)
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    {selectedReservation.status === 'checked_out' || selectedReservation.status === 'pending_checkout'
                      ? 'Chưa có thông tin thanh toán'
                      : 'Chưa có thanh toán (chỉ thanh toán khi checkout)'}
                  </div>
                )}
              </div>

              {/* Extension Policy Info in Detail Dialog */}
              {extensionPolicy && extensionPolicy.value?.is_active && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-base sm:text-lg font-medium mb-3">Chính sách gia hạn</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
