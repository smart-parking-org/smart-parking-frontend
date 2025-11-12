import { useEffect, useState } from 'react';
import { reservationApi } from '@/config/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import QRScanner from '@/components/QRScanner';

interface VehicleTypeStats {
  total: number;
  available: number;
  occupied: number;
}

interface Stats {
  parking_lot_id: number;
  parking_lot_name: string;
  summary: {
    total: number;
    available: number;
    occupied: number;
    utilization_rate: number;
  };
  by_vehicle_type: Record<string, VehicleTypeStats>;
}

export default function ParkingLotStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [vehicleType, setVehicleType] = useState<string>('all');
  const [chartData, setChartData] = useState<any[]>([]);

  const parkingLotId = 1;

  useEffect(() => {
    reservationApi
      .get(`/parking-lots/${parkingLotId}/statistics`)
      .then((res) => {
        setStats(res.data);
      })
      .catch((err) => {
        console.error('Lỗi khi tải thống kê bãi đỗ xe:', err);
      });
  }, []);

  // 🔄 Chuyển đổi dữ liệu thống kê thành dạng array để vẽ biểu đồ
  useEffect(() => {
    if (!stats?.by_vehicle_type) return;

    const entries = Object.entries(stats.by_vehicle_type).map(([key, value]) => ({
      type: key,
      total: value.total,
      available: value.available,
      occupied: value.occupied,
    }));

    const filtered = vehicleType === 'all' ? entries : entries.filter((v) => v.type === vehicleType);

    setChartData(filtered);
  }, [stats, vehicleType]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap gap-4 mb-4">
        <Select value={vehicleType} onValueChange={setVehicleType}>
          <SelectTrigger className="w-[180px]">
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
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thống kê {stats ? `bãi ${stats.parking_lot_name}` : 'bãi đỗ xe'}</CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="occupied" fill="#ef4444" name="Đã chiếm" radius={[4, 4, 0, 0]} />
                <Bar dataKey="available" fill="#22c55e" name="Còn trống" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-gray-500">Không có dữ liệu thống kê</p>
          )}
        </CardContent>
      </Card>
      <QRScanner />
    </div>
  );
}
