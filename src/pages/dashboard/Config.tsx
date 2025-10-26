import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cấu hình & Chính sách</h1>
          <p className="text-muted-foreground mt-2">
            Quản lý giờ cao điểm, mức giá và chính sách gia hạn cho từng bãi đỗ xe
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{parkingLots.length} bãi đỗ xe</span>
        </div>
      </div>

      {/* Parking Lot Selector */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle>Chọn bãi đỗ xe</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Select value={selectedLotId?.toString() || ''} onValueChange={(val) => setSelectedLotId(+val)}>
              <SelectTrigger className="w-[300px] h-12 text-lg">
                <SelectValue placeholder="Chọn bãi đỗ xe để cấu hình" />
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
        </CardContent>
      </Card>

      {/* Configuration Cards */}
      <div className="grid gap-8">
        {/* Bảng giá */}
        <PricingRule selectedLotId={selectedLotId} />
        {/* Giờ cao điểm */}
        <PeakHour selectedLotId={selectedLotId} />
        {/* Chính sách gia hạn */}
        <ExtensionPolicy selectedLotId={selectedLotId} />
      </div>
    </div>
  );
}
