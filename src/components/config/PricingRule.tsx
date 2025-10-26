import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect } from 'react';
import { reservationApi } from '@/config/axios';

type VehicleType = 'motorbike' | 'car_4_seat' | 'car_7_seat' | 'light_truck';

// ==== Kiểu dữ liệu ====
interface PricingRule {
  id: number;
  parking_lot_id: number;
  vehicle_type: VehicleType;
  hourly: number;
  daily_cap: number | null;
  monthly_pass: number | null;
  peak_enabled: boolean;
  peak_multiplier: number | null;
  created_at: string;
  updated_at: string;
}

interface PricingRuleProps {
  selectedLotId: number | null;
}

const PricingRule = ({ selectedLotId }: PricingRuleProps) => {
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state cho từng loại xe
  const [pricingForms, setPricingForms] = useState<Record<VehicleType, Partial<PricingRule>>>({
    motorbike: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
    car_4_seat: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
    car_7_seat: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
    light_truck: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
  });

  // ==== API Functions ====
  const fetchPricingRules = async () => {
    if (!selectedLotId) return;

    try {
      setLoading(true);
      const res = await reservationApi.get(`/parking-lots/${selectedLotId}/pricing-rules`);
      const rules = res.data.pricing_rules || [];
      setPricingRules(rules);

      // Cập nhật form state từ API data
      const forms: Record<VehicleType, Partial<PricingRule>> = {
        motorbike: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
        car_4_seat: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
        car_7_seat: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
        light_truck: { hourly: 0, daily_cap: null, monthly_pass: null, peak_enabled: false, peak_multiplier: null },
      };

      rules.forEach((rule: PricingRule) => {
        forms[rule.vehicle_type] = {
          hourly: rule.hourly,
          daily_cap: rule.daily_cap,
          monthly_pass: rule.monthly_pass,
          peak_enabled: rule.peak_enabled,
          peak_multiplier: rule.peak_multiplier,
        };
      });

      setPricingForms(forms);
    } catch (err) {
      console.error('Lỗi tải bảng giá:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePricingRule = async (vehicleType: VehicleType) => {
    if (!selectedLotId) return;

    try {
      setSaving(true);
      const formData = pricingForms[vehicleType];

      // Tìm rule hiện có
      const existingRule = pricingRules.find((rule) => rule.vehicle_type === vehicleType);

      if (existingRule) {
        // Cập nhật rule hiện có
        await reservationApi.put(`/pricing-rules/${existingRule.id}`, formData);
      }

      alert(`Cập nhật bảng giá cho ${getVehicleTypeName(vehicleType)} thành công`);
    } catch (err: any) {
      console.error('Lỗi cập nhật bảng giá:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật bảng giá');
    } finally {
      await fetchPricingRules();
      setSaving(false);
    }
  };

  const updateAllPricingRules = async () => {
    if (!selectedLotId) return;

    try {
      setSaving(true);

      // Cập nhật tất cả các loại xe
      const promises = Object.entries(pricingForms).map(async ([vehicleType, formData]) => {
        const existingRule = pricingRules.find((rule) => rule.vehicle_type === vehicleType);

        if (existingRule) {
          return reservationApi.put(`/pricing-rules/${existingRule.id}`, formData);
        } else {
          return reservationApi.post('/pricing-rules', {
            parking_lot_id: selectedLotId,
            vehicle_type: vehicleType,
            ...formData,
          });
        }
      });

      await Promise.all(promises);
      alert('Cập nhật tất cả bảng giá thành công');
    } catch (err: any) {
      console.error('Lỗi cập nhật bảng giá:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật bảng giá');
    } finally {
      await fetchPricingRules();
      setSaving(false);
    }
  };

  // ==== Form Handlers ====
  const updatePricingField = (vehicleType: VehicleType, field: keyof PricingRule, value: any) => {
    setPricingForms((prev) => ({
      ...prev,
      [vehicleType]: {
        ...prev[vehicleType],
        [field]: value,
      },
    }));
  };

  // ==== Helper Functions ====
  const getVehicleTypeName = (vehicleType: VehicleType): string => {
    const names = {
      motorbike: 'Xe máy',
      car_4_seat: 'Ô tô 4 chỗ',
      car_7_seat: 'Ô tô 7 chỗ',
      light_truck: 'Xe tải nhẹ',
    };
    return names[vehicleType];
  };

  const getVehicleIcon = (vehicleType: VehicleType): string => {
    const icons = {
      motorbike: '🏍️',
      car_4_seat: '🚗',
      car_7_seat: '🚐',
      light_truck: '🚛',
    };
    return icons[vehicleType];
  };

  // ==== Effects ====
  useEffect(() => {
    fetchPricingRules();
  }, [selectedLotId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💰</span>
            Bảng giá theo loại xe
          </CardTitle>
          <p className="text-sm text-muted-foreground">Cấu hình giá cho từng loại phương tiện</p>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Đang tải...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>💰</span>
          Bảng giá theo loại xe
        </CardTitle>
        <p className="text-sm text-muted-foreground">Cấu hình giá cho từng loại phương tiện</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pricing Table */}
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Loại xe</TableHead>
                <TableHead className="w-[120px]">Giá/giờ (VND)</TableHead>
                <TableHead className="w-[120px]">Giới hạn ngày</TableHead>
                <TableHead className="w-[120px]">Vé tháng</TableHead>
                <TableHead className="w-[100px]">Hệ số cao điểm</TableHead>
                <TableHead className="w-[100px]">Cao điểm</TableHead>
                <TableHead className="w-[80px]">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(pricingForms).map(([vehicleType, pricing]) => (
                <TableRow key={vehicleType}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getVehicleIcon(vehicleType as VehicleType)}</span>
                      <span className="text-sm">{getVehicleTypeName(vehicleType as VehicleType)}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={1000}
                      value={pricing.hourly || ''}
                      onChange={(e) => updatePricingField(vehicleType as VehicleType, 'hourly', +e.target.value)}
                      className="h-8 w-full"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={10000}
                      value={pricing.daily_cap || ''}
                      onChange={(e) =>
                        updatePricingField(
                          vehicleType as VehicleType,
                          'daily_cap',
                          e.target.value ? +e.target.value : null,
                        )
                      }
                      className="h-8 w-full"
                      placeholder="Không giới hạn"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={0}
                      step={100000}
                      value={pricing.monthly_pass || ''}
                      onChange={(e) =>
                        updatePricingField(
                          vehicleType as VehicleType,
                          'monthly_pass',
                          e.target.value ? +e.target.value : null,
                        )
                      }
                      className="h-8 w-full"
                      placeholder="Không có"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      step={0.1}
                      value={pricing.peak_multiplier || ''}
                      onChange={(e) =>
                        updatePricingField(
                          vehicleType as VehicleType,
                          'peak_multiplier',
                          e.target.value ? +e.target.value : null,
                        )
                      }
                      className="h-8 w-full"
                      placeholder="1.5"
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={pricing.peak_enabled || false}
                      onCheckedChange={(checked) =>
                        updatePricingField(vehicleType as VehicleType, 'peak_enabled', checked)
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      onClick={() => updatePricingRule(vehicleType as VehicleType)}
                      disabled={saving}
                      className="h-8 px-3"
                    >
                      {saving ? '...' : 'Lưu'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button onClick={updateAllPricingRules} disabled={saving} className="min-w-[200px]">
            {saving ? 'Đang lưu tất cả...' : 'Lưu tất cả bảng giá'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PricingRule;
