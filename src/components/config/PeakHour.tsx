import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useState, useEffect } from 'react';
import { reservationApi } from '@/config/axios';

// ==== Kiểu dữ liệu ====
interface PeakHour {
  id: number;
  parking_lot_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PeakHourForm {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface PeakHourProps {
  selectedLotId: number | null;
}

const PeakHour = ({ selectedLotId }: PeakHourProps) => {
  const [peakHours, setPeakHours] = useState<PeakHour[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [peakForms, setPeakForms] = useState<PeakHourForm[]>([]);

  // ==== Helper Functions ====
  const formatTimeForInput = (timeString: string): string => {
    if (timeString && timeString.includes('T')) {
      // Parse datetime string và extract time part
      const date = new Date(timeString);
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    // Fallback cho format cũ "07:00:00"
    if (timeString && timeString.includes(':')) {
      return timeString.substring(0, 5);
    }
    return timeString;
  };

  const formatTimeForAPI = (timeString: string): string => {
    // Chuyển đổi từ "07:00" thành "07:00:00" cho API
    if (timeString && timeString.length === 5) {
      return timeString + ':00';
    }
    return timeString;
  };

  const getDayName = (dayOfWeek: number): string => {
    const days = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    return days[dayOfWeek];
  };

  // const getDayShortName = (dayOfWeek: number): string => {
  //   const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  //   return days[dayOfWeek];
  // };

  // ==== API Functions ====
  const fetchPeakHours = async () => {
    if (!selectedLotId) return;

    try {
      setLoading(true);
      console.log('Fetching peak hours for parking lot:', selectedLotId);

      const res = await reservationApi.get(`/parking-lots/${selectedLotId}/peak-hours`);
      console.log('API Response:', res.data);

      const data = res.data;

      // API trả về { parking_lot: {...}, peak_hours: [...] }
      const hours = data.peak_hours || [];
      setPeakHours(hours);

      // Cập nhật form state từ API data
      const forms: PeakHourForm[] = hours.map((hour: PeakHour) => ({
        day_of_week: hour.day_of_week,
        start_time: hour.start_time,
        end_time: hour.end_time,
        is_active: hour.is_active,
      }));

      setPeakForms(forms);
      console.log('Peak hours loaded:', hours);
      console.log('Forms updated:', forms);
    } catch (err) {
      console.error('Lỗi tải giờ cao điểm:', err);
    } finally {
      setLoading(false);
    }
  };

  const updatePeakHour = async (index: number) => {
    if (!selectedLotId) return;

    try {
      setSaving(true);
      const formData = peakForms[index];

      // Validate form data
      if (!formData.start_time || !formData.end_time) {
        alert('Vui lòng nhập đầy đủ thời gian bắt đầu và kết thúc');
        return;
      }

      if (formData.start_time >= formData.end_time) {
        alert('Thời gian kết thúc phải sau thời gian bắt đầu');
        return;
      }

      // Tìm peak hour hiện có
      const existingPeakHour = peakHours[index];

      const payload = {
        day_of_week: formData.day_of_week,
        start_time: formatTimeForAPI(formatTimeForInput(formData.start_time)),
        end_time: formatTimeForAPI(formatTimeForInput(formData.end_time)),
        is_active: formData.is_active,
      };

      if (existingPeakHour) {
        // Cập nhật peak hour hiện có
        console.log('Updating peak hour:', existingPeakHour.id, payload);
        await reservationApi.put(`/peak-hours/${existingPeakHour.id}`, payload);
      } else {
        // Tạo peak hour mới
        console.log('Creating new peak hour:', payload);
        await reservationApi.post('/peak-hours', {
          parking_lot_id: selectedLotId,
          ...payload,
        });
      }
      await fetchPeakHours(); // Reload data
      alert('Cập nhật giờ cao điểm thành công');
    } catch (err: any) {
      console.error('Lỗi cập nhật giờ cao điểm:', err);
      const errorMessage = err.response?.data?.message || 'Không thể cập nhật giờ cao điểm';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const updateAllPeakHours = async () => {
    if (!selectedLotId) return;

    try {
      setSaving(true);

      // Validate all forms first
      for (let i = 0; i < peakForms.length; i++) {
        const form = peakForms[i];
        if (!form.start_time || !form.end_time) {
          alert(`Khung giờ #${i + 1}: Vui lòng nhập đầy đủ thời gian`);
          return;
        }
        if (form.start_time >= form.end_time) {
          alert(`Khung giờ #${i + 1}: Thời gian kết thúc phải sau thời gian bắt đầu`);
          return;
        }
      }

      // Cập nhật tất cả peak hours
      const promises = peakForms.map(async (formData, index) => {
        const existingPeakHour = peakHours[index];

        const payload = {
          day_of_week: formData.day_of_week,
          start_time: formatTimeForAPI(formData.start_time),
          end_time: formatTimeForAPI(formData.end_time),
          is_active: formData.is_active,
        };

        if (existingPeakHour) {
          return reservationApi.put(`/peak-hours/${existingPeakHour.id}`, payload);
        } else {
          return reservationApi.post('/peak-hours', {
            parking_lot_id: selectedLotId,
            ...payload,
          });
        }
      });

      await Promise.all(promises);
      alert('Cập nhật tất cả giờ cao điểm thành công');
      await fetchPeakHours(); // Reload data
    } catch (err: any) {
      console.error('Lỗi cập nhật giờ cao điểm:', err);
      const errorMessage = err.response?.data?.message || 'Không thể cập nhật giờ cao điểm';
      alert(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const deletePeakHour = async (index: number) => {
    if (!selectedLotId) return;

    try {
      const existingPeakHour = peakHours[index];

      if (existingPeakHour) {
        console.log('Deleting peak hour:', existingPeakHour.id);
        await reservationApi.delete(`/peak-hours/${existingPeakHour.id}`);
        alert('Xóa giờ cao điểm thành công');
        await fetchPeakHours(); // Reload data
      }
    } catch (err: any) {
      console.error('Lỗi xóa giờ cao điểm:', err);
      const errorMessage = err.response?.data?.message || 'Không thể xóa giờ cao điểm';
      alert(errorMessage);
    }
  };

  // ==== Form Handlers ====
  const updatePeakHourField = (index: number, field: keyof PeakHourForm, value: any) => {
    setPeakForms((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  };

  const addPeakHour = () => {
    setPeakForms((prev) => [
      ...prev,
      { day_of_week: 1, start_time: '07:00:00', end_time: '09:00:00', is_active: true },
    ]);
  };

  const removePeakHour = (index: number) => {
    setPeakForms((prev) => prev.filter((_, i) => i !== index));
  };

  // ==== Effects ====
  useEffect(() => {
    fetchPeakHours();
  }, [selectedLotId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>⏰</span>
            Giờ cao điểm
          </CardTitle>
          <p className="text-sm text-muted-foreground">Cấu hình khung giờ có mức giá cao hơn</p>
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
          <span>⏰</span>
          Giờ cao điểm
        </CardTitle>
        <p className="text-sm text-muted-foreground">Cấu hình khung giờ có mức giá cao hơn</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {peakForms.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-muted-foreground/25 rounded-lg">
            <div className="text-4xl mb-4">⏰</div>
            <p className="text-muted-foreground mb-4">Chưa có giờ cao điểm nào được cấu hình</p>
            <Button variant="outline" onClick={addPeakHour}>
              Thêm giờ cao điểm đầu tiên
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {peakForms.map((peak, i) => (
              <div key={i} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      #{i + 1}
                    </Badge>
                    <span className="text-sm font-medium">{getDayName(peak.day_of_week)}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" onClick={() => updatePeakHour(i)} disabled={saving} className="h-7 px-2 text-xs">
                      {saving ? '...' : 'Lưu'}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (peakHours[i]) {
                          deletePeakHour(i);
                        } else {
                          removePeakHour(i);
                        }
                      }}
                      className="h-7 w-7 p-0"
                    >
                      ×
                    </Button>
                  </div>
                </div>

                <div className="grid gap-2 grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Thứ</Label>
                    <Select
                      value={peak.day_of_week.toString()}
                      onValueChange={(val) => updatePeakHourField(i, 'day_of_week', +val)}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Chủ nhật</SelectItem>
                        <SelectItem value="1">Thứ 2</SelectItem>
                        <SelectItem value="2">Thứ 3</SelectItem>
                        <SelectItem value="3">Thứ 4</SelectItem>
                        <SelectItem value="4">Thứ 5</SelectItem>
                        <SelectItem value="5">Thứ 6</SelectItem>
                        <SelectItem value="6">Thứ 7</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Bắt đầu</Label>
                    <Input
                      type="time"
                      value={formatTimeForInput(peak.start_time)}
                      onChange={(e) => updatePeakHourField(i, 'start_time', e.target.value)}
                      className="h-8 text-xs"
                      step="60"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Kết thúc</Label>
                    <Input
                      type="time"
                      value={formatTimeForInput(peak.end_time)}
                      onChange={(e) => updatePeakHourField(i, 'end_time', e.target.value)}
                      className="h-8 text-xs"
                      step="60"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <div>
                    <Label className="text-xs font-medium">Kích hoạt</Label>
                  </div>
                  <Switch
                    checked={peak.is_active}
                    onCheckedChange={(checked) => updatePeakHourField(i, 'is_active', checked)}
                    className="scale-75"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex gap-3">
          <Button variant="outline" onClick={addPeakHour} className="flex-1">
            Thêm khung giờ cao điểm
          </Button>
          {peakForms.length > 0 && (
            <Button onClick={updateAllPeakHours} disabled={saving} className="flex-1">
              {saving ? 'Đang lưu tất cả...' : 'Lưu tất cả'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PeakHour;
