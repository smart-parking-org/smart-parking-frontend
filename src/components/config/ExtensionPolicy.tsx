import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { reservationApi } from '@/config/axios';

// ==== Kiểu dữ liệu ====
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

interface ExtensionPolicyProps {
  selectedLotId: number | null;
}

export default function ExtensionPolicy({ selectedLotId }: ExtensionPolicyProps) {
  // ==== State Management ====
  const [extensionPolicy, setExtensionPolicy] = useState<ExtensionPolicy | null>(null);
  const [loading, setLoading] = useState(false);

  const [extensionForm, setExtensionForm] = useState({
    max_extensions: 0,
    extension_minutes: 0,
    is_active: false,
    description: '',
  } as ExtensionPolicy['value']);

  // ==== API Functions ====
  const fetchExtensionPolicy = async () => {
    if (!selectedLotId) return;

    try {
      const res = await reservationApi.get(`/extension-policies/parking-lot/${selectedLotId}`);
      setExtensionPolicy(res.data.data || null);
    } catch (err) {
      console.error('Lỗi tải chính sách gia hạn:', err);
      setExtensionPolicy(null);
    }
  };

  const updateExtensionPolicy = async () => {
    if (!selectedLotId || !extensionPolicy) return;

    setLoading(true);
    try {
      await reservationApi.put(`/extension-policies/${extensionPolicy.key}`, {
        value: extensionForm,
      });
      alert('Cập nhật chính sách gia hạn thành công');
      await fetchExtensionPolicy();
    } catch (err: any) {
      console.error('Lỗi cập nhật chính sách gia hạn:', err);
      alert(err.response?.data?.message || 'Không thể cập nhật chính sách gia hạn');
    } finally {
      setLoading(false);
    }
  };

  // ==== Effects ====
  useEffect(() => {
    fetchExtensionPolicy();
  }, [selectedLotId]);

  useEffect(() => {
    if (extensionPolicy) {
      setExtensionForm(extensionPolicy.value);
    }
  }, [extensionPolicy]);

  // ==== Render ====
  if (!selectedLotId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chính sách gia hạn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            Vui lòng chọn bãi đỗ xe để cấu hình chính sách gia hạn
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!extensionPolicy) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Chính sách gia hạn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">Chưa có chính sách gia hạn cho bãi đỗ này</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chính sách gia hạn</CardTitle>
        <p className="text-sm text-muted-foreground">Cấu hình số lần gia hạn và thời gian gia hạn cho bãi đỗ xe</p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Fields */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Max Extensions */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Số lần gia hạn tối đa</Label>
            <Input
              type="number"
              min={0}
              max={10}
              step={1}
              value={extensionForm.max_extensions || ''}
              onChange={(e) => setExtensionForm((prev) => ({ ...prev, max_extensions: +e.target.value }))}
              className="h-11"
              placeholder="Nhập số lần gia hạn..."
            />
            <p className="text-xs text-muted-foreground">Số lần tối đa có thể gia hạn cho một đặt chỗ (0-10)</p>
          </div>

          {/* Extension Minutes */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Thời gian gia hạn (phút)</Label>
            <Input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={extensionForm.extension_minutes || ''}
              onChange={(e) => setExtensionForm((prev) => ({ ...prev, extension_minutes: +e.target.value }))}
              className="h-11"
              placeholder="Nhập số phút gia hạn..."
            />
            <p className="text-xs text-muted-foreground">Số phút được gia hạn mỗi lần (1-1440 phút)</p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Mô tả chính sách</Label>
          <Input
            type="text"
            value={extensionForm.description || ''}
            onChange={(e) => setExtensionForm((prev) => ({ ...prev, description: e.target.value }))}
            className="h-11"
            placeholder="Nhập mô tả chính sách gia hạn..."
          />
        </div>

        {/* Active Toggle */}
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Kích hoạt chính sách gia hạn</Label>
            <p className="text-xs text-muted-foreground">Cho phép người dùng gia hạn đặt chỗ</p>
          </div>
          <Switch
            checked={extensionForm.is_active}
            onCheckedChange={(checked) => setExtensionForm((prev) => ({ ...prev, is_active: checked }))}
          />
        </div>

        {/* Action Buttons */}
        <Button onClick={updateExtensionPolicy} disabled={loading} className="w-full h-11">
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </Button>
      </CardContent>
    </Card>
  );
}
