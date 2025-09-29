import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEffect, useMemo, useState } from 'react';
import { Car, Circle, RefreshCcw, Search } from 'lucide-react';

// Ký hiệu trạng thái chỗ đỗ
const STATUS = {
  free: { label: 'Trống', color: 'bg-emerald-500' },
  occupied: { label: 'Đang đỗ', color: 'bg-rose-500' },
  reserved: { label: 'Đã giữ chỗ', color: 'bg-amber-500' },
  disabled: { label: 'Khoá', color: 'bg-slate-400' },
} as const;

type SpotStatus = keyof typeof STATUS;

type Spot = { id: string; status: SpotStatus };

function makeInitialSpots(rows = 6, cols = 10): Spot[] {
  const spots: Spot[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const id = `${String.fromCharCode(65 + r)}${c + 1}`; // A1..A10
      const status: SpotStatus = Math.random() < 0.15 ? 'occupied' : Math.random() < 0.2 ? 'reserved' : 'free';
      spots.push({ id, status });
    }
  }
  // một vài chỗ bị khoá
  spots.slice(0, 3).forEach((s) => (s.status = 'disabled'));
  return spots;
}

export default function Parking() {
  const [spots, setSpots] = useState<Spot[]>(() => makeInitialSpots());
  const [query, setQuery] = useState('');
  const [autoSimulate, setAutoSimulate] = useState(true);

  // Giả lập cập nhật theo thời gian thực
  useEffect(() => {
    if (!autoSimulate) return;
    const t = setInterval(() => {
      setSpots((prev) => {
        const next = [...prev];
        for (let i = 0; i < 3; i++) {
          const idx = Math.floor(Math.random() * next.length);
          const s = next[idx];
          if (!s) continue;
          const cycle: SpotStatus[] = ['free', 'reserved', 'occupied'];
          if (s.status !== 'disabled') {
            const ni = (cycle.indexOf(s.status) + 1) % cycle.length;
            next[idx] = { ...s, status: cycle[ni] };
          }
        }
        return next;
      });
    }, 3500);
    return () => clearInterval(t);
  }, [autoSimulate]);

  const stats = useMemo(() => {
    const total = spots.length;
    const occupied = spots.filter((s) => s.status === 'occupied').length;
    const reserved = spots.filter((s) => s.status === 'reserved').length;
    const disabled = spots.filter((s) => s.status === 'disabled').length;
    const free = total - occupied - reserved - disabled;
    const occupancy = Math.round(((occupied + reserved) / total) * 100);
    return { total, occupied, reserved, disabled, free, occupancy };
  }, [spots]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return spots;
    return spots.filter((s) => s.id.toLowerCase().includes(q));
  }, [query, spots]);

  // Nhóm theo khu (A, B, C...)
  const grouped = useMemo(() => {
    return filtered.reduce<Record<string, Spot[]>>((acc, s) => {
      const zone = s.id[0];
      if (!acc[zone]) acc[zone] = [];
      acc[zone].push(s);
      return acc;
    }, {});
  }, [filtered]);

  const zones = Object.keys(grouped);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">Quản lý bãi đỗ xe</h1>
        <p className="text-muted-foreground">
          Sơ đồ chỗ theo từng khu, cập nhật thời gian thực, tra cứu và thao tác nhanh.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Sơ đồ chỗ</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Tìm A1, B3..."
                  className="pl-8 h-9 w-40 sm:w-56"
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
              <Button variant="outline" size="sm" onClick={() => setSpots(makeInitialSpots())}>
                <RefreshCcw className="mr-2 h-4 w-4" />
                Tải lại
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              {Object.entries(STATUS).map(([k, v]) => (
                <div key={k} className="flex items-center gap-2 text-sm">
                  <span className={`h-2.5 w-2.5 rounded-sm ${v.color}`} />
                  <span className="text-muted-foreground">{v.label}</span>
                </div>
              ))}
            </div>

            {/* Tabs cho từng khu */}
            {zones.length > 0 && (
              <Tabs defaultValue={zones[0]}>
                <TabsList>
                  {zones.map((z) => (
                    <TabsTrigger key={z} value={z}>
                      Khu {z}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {zones.map((z) => (
                  <TabsContent key={z} value={z} className="mt-4">
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2">
                      {grouped[z].map((s) => (
                        <button
                          key={s.id}
                          className="group flex items-center justify-between rounded-md border px-2 py-2 hover:bg-accent hover:text-accent-foreground transition"
                          title={`Chỗ ${s.id} • ${STATUS[s.status].label}`}
                        >
                          <span className="font-mono text-xs">{s.id}</span>
                          <span className={`h-2.5 w-2.5 rounded-sm ${STATUS[s.status].color}`} />
                        </button>
                      ))}
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái bãi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>Tổng chỗ</span>
                <span className="font-medium">{stats.total}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Đang đỗ</span>
                <Badge variant="secondary">{stats.occupied}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Đã giữ chỗ</span>
                <Badge variant="secondary">{stats.reserved}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Trống</span>
                <Badge variant="outline">{stats.free}</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Khoá</span>
                <Badge variant="outline">{stats.disabled}</Badge>
              </div>
              <div className="pt-2">
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>Tỷ lệ lấp đầy</span>
                  <span className="font-medium">{stats.occupancy}%</span>
                </div>
                <Progress value={stats.occupancy} />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  size="sm"
                  onClick={() => setAutoSimulate((v) => !v)}
                  variant={autoSimulate ? 'default' : 'outline'}
                >
                  <Circle className={`mr-2 h-4 w-4 ${autoSimulate ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                  {autoSimulate ? 'Đang mô phỏng' : 'Bật mô phỏng'}
                </Button>
                <Button size="sm" variant="outline">
                  <Car className="mr-2 h-4 w-4" /> Tạo giữ chỗ nhanh
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sự kiện gần đây</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Xe 43A-123.45 vào cổng</span>
                <span className="text-muted-foreground">2 phút trước</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Đặt chỗ B7 hết hạn</span>
                <span className="text-muted-foreground">10 phút trước</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Vi phạm đỗ sai E2</span>
                <Badge variant="destructive">Cảnh báo</Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
          <TabsTrigger value="reserved">Đã giữ chỗ</TabsTrigger>
          <TabsTrigger value="violations">Vi phạm</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="text-sm text-muted-foreground">
          Danh sách xe đang trong bãi sẽ hiển thị ở đây.
        </TabsContent>
        <TabsContent value="reserved" className="text-sm text-muted-foreground">
          Các đặt chỗ hiện tại.
        </TabsContent>
        <TabsContent value="violations" className="text-sm text-muted-foreground">
          Lịch sử vi phạm mới nhất.
        </TabsContent>
      </Tabs>
    </div>
  );
}
