import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { reservationApi } from '@/config/axios';
import PricingRule from '@/components/config/PricingRule';
import PeakHour from '@/components/config/PeakHour';
import ExtensionPolicy from '@/components/config/ExtensionPolicy';

interface ParkingLot {
  id: number;
  name: string;
  gate_pos_x: number;
  gate_pos_y: number;
}

export default function Config() {
  // ==== State Management ====
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  // ==== API Functions ====
  const fetchParkingLots = async () => {
    try {
      const res = await reservationApi.get('/parking-lots');
      const lots = Array.isArray(res.data) ? res.data : res.data.data || [];
      setParkingLots(lots);
      if (lots.length > 0) {
        setSelectedLotId(lots[0].id);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách bãi đỗ:', err);
    }
  };

  // ==== Effects ====
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchParkingLots();
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cấu hình & Chính sách</h1>
          <p className="text-muted-foreground">Giờ cao điểm, mức giá và chính sách gia hạn.</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Đang tải...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Cấu hình & Chính sách</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý giờ cao điểm, mức giá và chính sách gia hạn
          </p>
        </div>
        <div className="text-xs sm:text-sm text-muted-foreground">
          {parkingLots.length} bãi đỗ xe
        </div>
      </div>

      {/* Parking Lot Selector */}
      <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
        <Label className="text-sm font-medium whitespace-nowrap">Bãi đỗ xe:</Label>
        <Select value={selectedLotId?.toString() || ''} onValueChange={(val) => setSelectedLotId(+val)}>
          <SelectTrigger className="w-full sm:w-[300px]">
            <SelectValue placeholder="Chọn bãi đỗ xe" />
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

      {/* Configuration Cards */}
      <div className="space-y-4">
        <PricingRule selectedLotId={selectedLotId} />
        <PeakHour selectedLotId={selectedLotId} />
        <ExtensionPolicy selectedLotId={selectedLotId} />
      </div>
    </div>
  );
}
