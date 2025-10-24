import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { reservationApi } from '@/config/axios';

// ==== Kiểu dữ liệu ====
interface ParkingLot {
  id: number;
  name: string;
  gate_pos_x: number;
  gate_pos_y: number;
}

interface PricingRule {
  id: number;
  key: string;
  value: {
    vehicle_types: {
      motorbike: {
        hourly: number;
        daily_cap?: number;
        monthly_pass?: number;
        peak_enabled: boolean;
        peak_multiplier?: number;
      };
      car_4_seat: {
        hourly: number;
        daily_cap?: number;
        monthly_pass?: number;
        peak_enabled: boolean;
        peak_multiplier?: number;
      };
      car_7_seat: {
        hourly: number;
        daily_cap?: number;
        monthly_pass?: number;
        peak_enabled: boolean;
        peak_multiplier?: number;
      };
      light_truck: {
        hourly: number;
        daily_cap?: number;
        monthly_pass?: number;
        peak_enabled: boolean;
        peak_multiplier?: number;
      };
    };
  };
  created_at: string;
  updated_at: string;
}

interface PeakHour {
  id: number;
  key: string;
  value: {
    peak_hours: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_active: boolean;
    }>;
  };
  created_at: string;
  updated_at: string;
}

interface ExtensionPolicy {
  id: number;
  key: string;
  value: {
    max_extensions: number;
    extension_minutes: number;
    is_active: boolean;
    description?: string;
  };
  created_at: string;
  updated_at: string;
}

export default function Config() {
  // ==== State Management ====
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [extensionPolicies, setExtensionPolicies] = useState<ExtensionPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLotId, setSelectedLotId] = useState<number | null>(null);

  // Form states
  const [pricingForm, setPricingForm] = useState({
    vehicle_types: {
      motorbike: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
      car_4_seat: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
      car_7_seat: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
      light_truck: {
        hourly: 0,
        daily_cap: null,
        monthly_pass: null,
        peak_enabled: false,
        peak_multiplier: null,
      },
    },
  } as PricingRule['value']);

  const [peakForm, setPeakForm] = useState({
    peak_hours: [],
  });

  const [extensionForm, setExtensionForm] = useState({
    max_extensions: 0,
    extension_minutes: 0,
    is_active: false,
    description: ''
  } as ExtensionPolicy['value']);

  const [autoRenew, setAutoRenew] = useState(false);
  const [graceMinutes, setGraceMinutes] = useState(0);

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

  const fetchPricingRules = async () => {
    try {
      const res = await reservationApi.get('/pricing-rules');
      setPricingRules(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải bảng giá:', err);
    }
  };

  const fetchPeakHours = async () => {
    try {
      const res = await reservationApi.get('/peak-hours');
      setPeakHours(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải giờ cao điểm:', err);
    }
  };

  const fetchExtensionPolicies = async () => {
    try {
      const res = await reservationApi.get('/extension-policies');
      setExtensionPolicies(res.data.data || []);
    } catch (err) {
      console.error('Lỗi tải chính sách gia hạn:', err);
    }
  };

  const updatePricingRule = async () => {
    if (!selectedLotId) return;
    try {
      const pricingKey = `parking_lot_${selectedLotId}_pricing`;
      await reservationApi.put(`/pricing-rules/${pricingKey}`, { value: pricingForm });
      alert('Cập nhật bảng giá thành công');
      fetchPricingRules();
    } catch (err: any) {
      console.error('Lỗi cập nhật bảng giá:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật bảng giá');
    }
  };

  const updatePeakHour = async () => {
    if (!selectedLotId) return;
    try {
      const peakKey = `parking_lot_${selectedLotId}_peak_hours`;
      
      // Kiểm tra xem config đã tồn tại chưa
      const existingPeak = peakHours.find(p => p.key === peakKey);
      
      if (existingPeak) {
        // Cập nhật config hiện có
        await reservationApi.put(`/peak-hours/${peakKey}`, { value: peakForm });
        alert('Cập nhật giờ cao điểm thành công');
      } else {
        // Tạo config mới
        await reservationApi.post('/peak-hours', { 
          key: peakKey, 
          value: peakForm 
        });
        alert('Tạo cấu hình giờ cao điểm thành công');
      }
      
      fetchPeakHours();
    } catch (err: any) {
      console.error('Lỗi cập nhật giờ cao điểm:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật giờ cao điểm');
    }
  };

  const updateExtensionPolicy = async () => {
    if (!selectedLotId) return;
    try {
      const extensionKey = `parking_lot_${selectedLotId}_extension_policy`;
      
      // Kiểm tra xem config đã tồn tại chưa
      const existingPolicy = extensionPolicies.find(p => p.key === extensionKey);
      
      if (existingPolicy) {
        // Cập nhật config hiện có
        await reservationApi.put(`/extension-policies/${extensionKey}`, { value: extensionForm });
        alert('Cập nhật chính sách gia hạn thành công');
      } else {
        // Tạo config mới
        await reservationApi.post('/extension-policies', { 
          key: extensionKey, 
          value: extensionForm 
        });
        alert('Tạo cấu hình chính sách gia hạn thành công');
      }
      
      fetchExtensionPolicies();
    } catch (err: any) {
      console.error('Lỗi cập nhật chính sách gia hạn:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật chính sách gia hạn');
    }
  };

  // ==== Form Handlers ====
  const updatePricingField = (vehicleType: string, field: string, value: any) => {
    setPricingForm((prev) => ({
      ...prev,
      vehicle_types: {
        ...prev.vehicle_types,
        [vehicleType]: {
          ...prev.vehicle_types[vehicleType as keyof typeof prev.vehicle_types],
          [field]: value,
        },
      },
    }));
  };

  const updatePeakHourField = (index: number, field: string, value: any) => {
    setPeakForm((prev) => ({
      ...prev,
      peak_hours: prev.peak_hours.map((p, i) => (i === index ? { ...p, [field]: value } : p)),
    }));
  };

  const addPeakHour = () => {
    setPeakForm((prev) => ({
      ...prev,
      peak_hours: [
        ...prev.peak_hours,
        { day_of_week: 1, start_time: '00:00:00', end_time: '00:00:00', is_active: false },
      ],
    }));
  };

  const removePeakHour = (index: number) => {
    setPeakForm((prev) => ({
      ...prev,
      peak_hours: prev.peak_hours.filter((_, i) => i !== index),
    }));
  };

  const updateExtensionField = (field: string, value: any) => {
    setExtensionForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ==== Effects ====
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchParkingLots(), fetchPricingRules(), fetchPeakHours(), fetchExtensionPolicies()]);
      setLoading(false);
    };
    loadData();
  }, []);

  useEffect(() => {
    if (selectedLotId && pricingRules.length > 0) {
      const pricingKey = `parking_lot_${selectedLotId}_pricing`;
      const rule = pricingRules.find((r) => r.key === pricingKey);
      if (rule) {
        setPricingForm(rule.value as PricingRule['value']);
      } else {
        // Reset to empty if no rule found
        setPricingForm({
          vehicle_types: {
            motorbike: {
              hourly: 0,
              daily_cap: null,
              monthly_pass: null,
              peak_enabled: false,
              peak_multiplier: null,
            },
            car_4_seat: {
              hourly: 0,
              daily_cap: null,
              monthly_pass: null,
              peak_enabled: false,
              peak_multiplier: null,
            },
            car_7_seat: {
              hourly: 0,
              daily_cap: null,
              monthly_pass: null,
              peak_enabled: false,
              peak_multiplier: null,
            },
            light_truck: {
              hourly: 0,
              daily_cap: null,
              monthly_pass: null,
              peak_enabled: false,
              peak_multiplier: null,
            },
          },
        } as PricingRule['value']);
      }
    }
  }, [selectedLotId, pricingRules]);

  useEffect(() => {
    if (selectedLotId && peakHours.length > 0) {
      const peakKey = `parking_lot_${selectedLotId}_peak_hours`;
      const peak = peakHours.find((p) => p.key === peakKey);
      if (peak) {
        setPeakForm(peak.value as PeakHour['value']);
      } else {
        // Reset to empty if no peak hour config found
        setPeakForm({
          peak_hours: [],
        });
      }
    }
  }, [selectedLotId, peakHours]);

  useEffect(() => {
    if (selectedLotId && extensionPolicies.length > 0) {
      const extensionKey = `parking_lot_${selectedLotId}_extension_policy`;
      const policy = extensionPolicies.find((p) => p.key === extensionKey);
      if (policy) {
        setExtensionForm(policy.value as ExtensionPolicy['value']);
      } else {
        // Reset to empty if no extension policy config found
        setExtensionForm({
          max_extensions: 0,
          extension_minutes: 0,
          is_active: false,
          description: ''
        } as ExtensionPolicy['value']);
      }
    }
  }, [selectedLotId, extensionPolicies]);

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
          <h1 className="text-3xl font-bold tracking-tight">
            Cấu hình & Chính sách
          </h1>
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
          <CardTitle>
            Chọn bãi đỗ xe
          </CardTitle>
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
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Bảng giá */}
        <Card>
          <CardHeader>
            <CardTitle>
              Bảng giá theo loại xe
            </CardTitle>
            <p className="text-sm text-muted-foreground">Cấu hình giá cho từng loại phương tiện</p>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {pricingForm.vehicle_types &&
              Object.entries(pricingForm.vehicle_types).map(([vehicleType, pricing]) => (
                <div key={vehicleType} className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-lg">
                      {vehicleType === 'motorbike'
                        ? 'Xe máy'
                        : vehicleType === 'car_4_seat'
                          ? 'Ô tô 4 chỗ'
                          : vehicleType === 'car_7_seat'
                            ? 'Ô tô 7 chỗ'
                            : 'Xe tải nhẹ'}
                    </h4>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Giá theo giờ (VND)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={1000}
                        value={pricing.hourly}
                        onChange={(e) => updatePricingField(vehicleType, 'hourly', +e.target.value)}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Giới hạn ngày (VND)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={10000}
                        value={pricing.daily_cap || ''}
                        onChange={(e) =>
                          updatePricingField(vehicleType, 'daily_cap', e.target.value ? +e.target.value : null)
                        }
                        className="h-10"
                        placeholder="Không giới hạn"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Vé tháng (VND)</Label>
                      <Input
                        type="number"
                        min={0}
                        step={100000}
                        value={pricing.monthly_pass || ''}
                        onChange={(e) =>
                          updatePricingField(vehicleType, 'monthly_pass', e.target.value ? +e.target.value : null)
                        }
                        className="h-10"
                        placeholder="Không có vé tháng"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Hệ số giờ cao điểm</Label>
                      <Input
                        type="number"
                        min={1}
                        step={0.1}
                        value={pricing.peak_multiplier || ''}
                        onChange={(e) =>
                          updatePricingField(vehicleType, 'peak_multiplier', e.target.value ? +e.target.value : null)
                        }
                        className="h-10"
                        placeholder="1.5"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <Label className="text-sm font-medium">Áp dụng giờ cao điểm</Label>
                      <p className="text-xs text-gray-500">Tăng giá trong khung giờ cao điểm</p>
                    </div>
                    <Switch
                      checked={pricing.peak_enabled}
                      onCheckedChange={(checked) => updatePricingField(vehicleType, 'peak_enabled', checked)}
                    />
                  </div>
                </div>
              ))}

            <Button
              className="w-full h-12 text-lg font-medium"
              onClick={updatePricingRule}
            >
              Lưu bảng giá
            </Button>
          </CardContent>
        </Card>

        {/* Giờ cao điểm */}
        <Card>
          <CardHeader>
            <CardTitle>
              Giờ cao điểm
            </CardTitle>
            <p className="text-sm text-muted-foreground">Cấu hình khung giờ có mức giá cao hơn</p>
          </CardHeader>
          <CardContent className="space-y-6 p-6">
            {peakForm.peak_hours &&
              peakForm.peak_hours.map((peak, i) => (
                <div key={i} className="border rounded-lg p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <h4 className="font-semibold text-lg">Khung giờ #{i + 1}</h4>
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removePeakHour(i)} className="h-8 w-8 p-0">
                      X
                    </Button>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Thứ trong tuần</Label>
                      <Select
                        value={peak.day_of_week.toString()}
                        onValueChange={(val) => updatePeakHourField(i, 'day_of_week', +val)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Thứ 2</SelectItem>
                          <SelectItem value="2">Thứ 3</SelectItem>
                          <SelectItem value="3">Thứ 4</SelectItem>
                          <SelectItem value="4">Thứ 5</SelectItem>
                          <SelectItem value="5">Thứ 6</SelectItem>
                          <SelectItem value="6">Thứ 7</SelectItem>
                          <SelectItem value="7">Chủ nhật</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Bắt đầu</Label>
                      <Input
                        type="time"
                        value={peak.start_time.substring(0, 5)}
                        onChange={(e) => updatePeakHourField(i, 'start_time', e.target.value + ':00')}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Kết thúc</Label>
                      <Input
                        type="time"
                        value={peak.end_time.substring(0, 5)}
                        onChange={(e) => updatePeakHourField(i, 'end_time', e.target.value + ':00')}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                    <div>
                      <Label className="text-sm font-medium">Kích hoạt khung giờ</Label>
                      <p className="text-xs text-gray-500">Áp dụng giá cao điểm trong khung giờ này</p>
                    </div>
                    <Switch
                      checked={peak.is_active}
                      onCheckedChange={(checked) => updatePeakHourField(i, 'is_active', checked)}
                    />
                  </div>
                </div>
              ))}

            <Button
              variant="outline"
              className="w-full h-12 text-lg font-medium"
              onClick={addPeakHour}
            >
              Thêm khung giờ cao điểm
            </Button>

            <Button
              className="w-full h-12 text-lg font-medium"
              onClick={updatePeakHour}
            >
              Lưu giờ cao điểm
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Chính sách gia hạn - Full width */}
      <Card>
        <CardHeader>
          <CardTitle>
            Chính sách gia hạn
          </CardTitle>
          <p className="text-sm text-muted-foreground">Cấu hình số lần gia hạn và thời gian gia hạn cho từng bãi đỗ xe</p>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-6">
            {/* Extension Policy Configuration */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-lg">Cấu hình chính sách gia hạn</h4>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Số lần gia hạn tối đa</Label>
                  <Input
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={extensionForm.max_extensions}
                    onChange={(e) => updateExtensionField('max_extensions', +e.target.value)}
                    className="h-10"
                    placeholder="3"
                  />
                  <p className="text-xs text-gray-500">Số lần tối đa có thể gia hạn cho một đặt chỗ</p>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Thời gian gia hạn (phút)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={1440}
                    step={1}
                    value={extensionForm.extension_minutes}
                    onChange={(e) => updateExtensionField('extension_minutes', +e.target.value)}
                    className="h-10"
                    placeholder="30"
                  />
                  <p className="text-xs text-gray-500">Số phút được gia hạn mỗi lần</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Mô tả chính sách</Label>
                <Input
                  type="text"
                  value={extensionForm.description || ''}
                  onChange={(e) => updateExtensionField('description', e.target.value)}
                  className="h-10"
                  placeholder="Mô tả chính sách gia hạn"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Kích hoạt chính sách gia hạn</Label>
                  <p className="text-xs text-gray-500">Cho phép người dùng gia hạn đặt chỗ</p>
                </div>
                <Switch
                  checked={extensionForm.is_active}
                  onCheckedChange={(checked) => updateExtensionField('is_active', checked)}
                />
              </div>
            </div>

            {/* Legacy Auto Renew Settings */}
            <div className="border rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-lg">Cài đặt tự động gia hạn (Legacy)</h4>
              </div>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                    <div>
                      <Label className="text-sm font-medium">Tự động gia hạn đặt chỗ</Label>
                      <p className="text-xs text-gray-500">Gia hạn tối đa 1 lần nếu còn chỗ trống</p>
                    </div>
                    <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Thời gian chờ (phút)</Label>
                    <Input
                      type="number"
                      min={0}
                      step={5}
                      value={graceMinutes}
                      onChange={(e) => setGraceMinutes(+e.target.value)}
                      className="h-10"
                      placeholder="10"
                    />
                    <p className="text-xs text-gray-500">Thời gian chờ trước khi tự động gia hạn</p>
                  </div>
                </div>

                <div className="flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto flex items-center justify-center">
                      <span className="text-2xl">⚙️</span>
                    </div>
                    <p className="text-sm text-gray-600">Cấu hình tự động</p>
                    <p className="text-xs text-gray-500">Tự động gia hạn khi cần thiết</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button 
              className="flex-1 h-12 text-lg font-medium"
              onClick={updateExtensionPolicy}
            >
              Lưu chính sách gia hạn
            </Button>
            <Button 
              variant="outline"
              className="flex-1 h-12 text-lg font-medium"
              onClick={() => {
                // Reset to empty values
                setExtensionForm({
                  max_extensions: 0,
                  extension_minutes: 0,
                  is_active: false,
                  description: ''
                } as ExtensionPolicy['value']);
              }}
            >
              Đặt lại mặc định
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
