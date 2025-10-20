import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function Config() {
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cấu hình & Chính sách</h1>
        <p className="text-muted-foreground">Giờ cao điểm, mức giá và chính sách gia hạn.</p>
      </div>
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
