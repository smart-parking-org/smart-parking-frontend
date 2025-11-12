import { useEffect, useState, useRef } from 'react';
import { reservationApi } from '@/config/axios';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
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
}

export default function ParkingLots() {
  const [lots, setLots] = useState<ParkingLot[]>([]);
  const [selectedLot, setSelectedLot] = useState<ParkingLot | null>(null);
  const [slots, setSlots] = useState<ParkingSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const sseRef = useRef<EventSource | null>(null);

  // Bộ lọc
  const [lotFilter, setLotFilter] = useState<string>('all');
  const [vehicleType, setVehicleType] = useState<string>('all');
  const [status, setStatus] = useState<string>('all');

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
    } catch (err) {
      console.error('Lỗi tải chỗ đỗ:', err);
    } finally {
      setLoading(false);
    }
  };

  // Làm mới danh sách chỗ đỗ trong bãi
  const handleRefresh = () => {
    if (selectedLot) fetchSlots(selectedLot);
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

  return (
    <Card className="mt-6 p-4">
      {/* ===== Bộ lọc bãi đỗ ===== */}
      {!selectedLot && (
        <div className="mb-4 flex items-center gap-3">
          <Select value={lotFilter} onValueChange={setLotFilter}>
            <SelectTrigger className="w-[180px]">
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
        <>
          <div className="text-lg font-semibold mb-3">Danh sách bãi đỗ xe</div>
          <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
            {filteredLots.map((lot) => (
              <div
                key={lot.id}
                onClick={() => fetchSlots(lot)}
                className="p-3 border rounded-md bg-muted hover:bg-blue-50 cursor-pointer transition"
              >
                <div className="font-semibold">{lot.name}</div>
              </div>
            ))}
            {filteredLots.length === 0 && <div className="text-gray-500 text-sm italic">Không có bãi nào phù hợp</div>}
          </div>
        </>
      ) : (
        <>
          {/* ===== Tiêu đề & hành động ===== */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-lg font-semibold">Chỗ đỗ trong {selectedLot.name}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Làm mới
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLot(null)}>
                ← Quay lại
              </Button>
            </div>
          </div>

          {/* ===== Bộ lọc trong bãi ===== */}
          <div className="flex flex-wrap gap-4 mb-4">
            <Select value={vehicleType} onValueChange={setVehicleType}>
              <SelectTrigger className="w-[160px]">
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
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="available">Còn trống</SelectItem>
                <SelectItem value="occupied">Đang sử dụng</SelectItem>
                <SelectItem value="hold">Đã đặt</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ===== Danh sách chỗ đỗ ===== */}
          {loading ? (
            <div className="text-center text-gray-500 py-10">Đang tải danh sách chỗ đỗ...</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[650px] overflow-y-auto pr-2">
              {displayedSlots.map((slot) => {
                const vehicleLabel =
                  slot.vehicle_type === 'motorbike'
                    ? 'Xe máy'
                    : slot.vehicle_type === 'car_4_seat'
                      ? 'Ô tô 4 chỗ'
                      : slot.vehicle_type === 'car_7_seat'
                        ? 'Ô tô 7 chỗ'
                        : 'Xe tải nhẹ';

                const statusLabel =
                  slot.effective_status === 'available'
                    ? 'Còn trống'
                    : slot.effective_status === 'occupied'
                      ? 'Đang sử dụng'
                      : 'Đã đặt';

                const bgClass =
                  slot.effective_status === 'available'
                    ? 'bg-green-100 border-green-400'
                    : slot.effective_status === 'occupied'
                      ? 'bg-red-100 border-red-400'
                      : 'bg-yellow-100 border-yellow-400';

                return (
                  <div
                    key={slot.id}
                    className={`flex flex-col border rounded-md p-3 text-center font-medium ${bgClass}`}
                  >
                    {slot.slot_code}
                    <div className="text-xs text-gray-800 mt-1">{vehicleLabel}</div>
                    <div className="text-xs text-gray-500 mt-1">{statusLabel}</div>
                  </div>
                );
              })}

              {!loading && displayedSlots.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-10">Không có chỗ đỗ phù hợp</div>
              )}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
