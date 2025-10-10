import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useMemo, useState } from 'react';
import { authApi } from '@/config/axios';
import { useAuth } from '@/contexts/AuthContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface VehicleType {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export default function Config() {
  const [query, setQuery] = useState('');
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  const [page, setPage] = useState(1);
  const [limit] = useState(2);
  const [totalPages, setTotalPages] = useState(1);
  const [isActive] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    fetchVehicleTypes();
  }, [isActive]);

  const fetchVehicleTypes = async () => {
    try {
      setLoading(true);
      const res = await authApi.get('/vehicle-types', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          is_active: isActive,
        },
      });

      const data = res.data.data || [];
      setVehicleTypes(data);

      setTotalPages(Math.ceil(data.length / limit));
    } catch (error) {
      console.error('Failed to fetch vehicle types:', error);
    } finally {
      setLoading(false);
    }
  };
  // Giá theo giờ nhiều loại phương tiện
  const [hourlyPrices, setHourlyPrices] = useState([
    { type: 'Xe máy', base: 10000, peak: 15000 },
    { type: 'Ô tô', base: 20000, peak: 30000 },
  ]);

  // nhiều khung giờ cao điểm
  const [peakTimes, setPeakTimes] = useState([
    { start: '07:00', end: '09:00' },
    { start: '17:00', end: '19:00' },
  ]);

  // giá theo tháng
  const [monthlyPrices, setMonthlyPrices] = useState([
    { type: 'Xe máy', price: 100000 },
    { type: 'Ô tô', price: 1500000 },
  ]);

  const [autoRenew, setAutoRenew] = useState(true);
  const [graceMinutes, setGraceMinutes] = useState(10);

  // Giờ cao điểm
  const updatePeakTime = (index: number, field: 'start' | 'end', value: string) => {
    setPeakTimes((prev) => prev.map((t, i) => (i === index ? { ...t, [field]: value } : t)));
  };
  const removePeakTime = (index: number) => {
    setPeakTimes((prev) => prev.filter((_, i) => i !== index));
  };

  // Giá giờ
  const updateHourlyPrice = (index: number, field: 'type' | 'base' | 'peak', value: string | number) => {
    setHourlyPrices((prev) => prev.map((h, i) => (i === index ? { ...h, [field]: value } : h)));
  };
  const removeHourlyPrice = (index: number) => {
    setHourlyPrices((prev) => prev.filter((_, i) => i !== index));
  };

  // Giá tháng
  const updateMonthlyPrice = (index: number, field: 'type' | 'price', value: string | number) => {
    setMonthlyPrices((prev) => prev.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  };
  const removeMonthlyPrice = (index: number) => {
    setMonthlyPrices((prev) => prev.filter((_, i) => i !== index));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicleTypes;
    return vehicleTypes.filter((r) => [r.name, r.code].some((v) => v?.toLowerCase().includes(q)));
  }, [query, vehicleTypes]);

  const pagedData = useMemo(() => {
    const start = (page - 1) * limit;
    return filtered.slice(start, start + limit);
  }, [filtered, page, limit]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cấu hình & Chính sách</h1>
        <p className="text-muted-foreground">Giờ cao điểm, mức giá và chính sách gia hạn.</p>
      </div>
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Danh sách loại phương tiện</CardTitle>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm tên, mã loại xe..."
              className="pl-8 w-72"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên phương tiện</TableHead>
                <TableHead>Mã phương tiện</TableHead>
                <TableHead>Mô tả</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Không tìm thấy!
                  </TableCell>
                </TableRow>
              ) : (
                pagedData.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.code}</TableCell>
                    <TableCell>{r.description}</TableCell>
                    <TableCell>
                      {r.is_active ? (
                        <Badge className="bg-green-50 text-green-700 border-green-200">Hoạt động</Badge>
                      ) : (
                        <Badge className="bg-red-50 text-red-700 border-red-200">Ngừng</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right"></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
            >
              ←
            </Button>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button
                key={p}
                variant={p === page ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPage(p)}
                className={p === page ? 'bg-primary text-white' : ''}
              >
                {p}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
            >
              →
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Giá theo giờ */}
        <Card>
          <CardHeader>
            <CardTitle>Giá theo giờ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {hourlyPrices.map((h, i) => (
              <div key={i} className="grid gap-4 md:grid-cols-3 items-end">
                <div className="grid gap-2">
                  <Label>Loại</Label>
                  <Select value={h.type} onValueChange={(val) => updateHourlyPrice(i, 'type', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Xe máy">Xe máy</SelectItem>
                      <SelectItem value="Ô tô">Ô tô</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Cơ bản (VND/giờ)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={500}
                    value={h.base}
                    onChange={(e) => updateHourlyPrice(i, 'base', +e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Cao điểm (VND/giờ)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={500}
                      value={h.peak}
                      onChange={(e) => updateHourlyPrice(i, 'peak', +e.target.value)}
                    />
                    <Button variant="destructive" size="icon" onClick={() => removeHourlyPrice(i)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setHourlyPrices([...hourlyPrices, { type: 'Xe máy', base: 0, peak: 0 }])}
            >
              + Thêm loại giá
            </Button>

            <Button className="w-full">Lưu giá giờ</Button>
          </CardContent>
        </Card>

        {/* Giờ cao điểm */}
        <Card>
          <CardHeader>
            <CardTitle>Khung giờ cao điểm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {peakTimes.map((t, i) => (
              <div key={i} className="grid grid-cols-2 gap-4 items-end">
                <div className="grid gap-2">
                  <Label>Bắt đầu</Label>
                  <Input type="time" value={t.start} onChange={(e) => updatePeakTime(i, 'start', e.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Kết thúc</Label>
                  <div className="flex gap-2">
                    <Input type="time" value={t.end} onChange={(e) => updatePeakTime(i, 'end', e.target.value)} />
                    <Button variant="destructive" size="icon" onClick={() => removePeakTime(i)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setPeakTimes([...peakTimes, { start: '00:00', end: '00:00' }])}
            >
              + Thêm khung giờ
            </Button>

            <Button className="w-full">Lưu khung giờ</Button>
          </CardContent>
        </Card>

        {/* Giá theo tháng */}
        <Card>
          <CardHeader>
            <CardTitle>Giá theo tháng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monthlyPrices.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-4 items-end">
                <div className="grid gap-2">
                  <Label>Loại</Label>
                  <Select value={m.type} onValueChange={(val) => updateMonthlyPrice(i, 'type', val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Xe máy">Xe máy</SelectItem>
                      <SelectItem value="Ô tô">Ô tô</SelectItem>
                      <SelectItem value="VIP">VIP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Giá (VND/tháng)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      step={10000}
                      value={m.price}
                      onChange={(e) => updateMonthlyPrice(i, 'price', +e.target.value)}
                    />
                    <Button variant="destructive" size="icon" onClick={() => removeMonthlyPrice(i)}>
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => setMonthlyPrices([...monthlyPrices, { type: 'Xe máy', price: 0 }])}
            >
              + Thêm loại giá
            </Button>

            <Button className="w-full">Lưu giá tháng</Button>
          </CardContent>
        </Card>

        {/* Chính sách gia hạn */}
        <Card>
          <CardHeader>
            <CardTitle>Chính sách gia hạn</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Tự động gia hạn đặt chỗ</div>
                <div className="text-sm text-muted-foreground">Gia hạn tối đa 1 lần nếu còn chỗ trống.</div>
              </div>
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
            </div>
            <div className="grid gap-2">
              <Label>Thời gian gia hạn (phút)</Label>
              <Input
                type="number"
                min={0}
                step={5}
                value={graceMinutes}
                onChange={(e) => setGraceMinutes(+e.target.value)}
              />
            </div>
            <Button className="w-full">Lưu chính sách</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
