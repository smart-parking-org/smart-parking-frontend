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
    extension_minutes: number;
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
    extension_minutes: 0,
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
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chính sách gia hạn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">
            Vui lòng chọn bãi đỗ xe để cấu hình chính sách gia hạn
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!extensionPolicy) {
    return (
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Chính sách gia hạn</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground text-sm">Chưa có chính sách gia hạn cho bãi đỗ này</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Chính sách gia hạn</CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Cấu hình thời gian gia hạn cho bãi đỗ xe</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 space-y-2">
            <Label className="text-sm font-medium">Thời gian gia hạn (phút)</Label>
            <Input
              type="number"
              min={1}
              max={1440}
              step={1}
              value={extensionForm.extension_minutes || ''}
              onChange={(e) => setExtensionForm((prev) => ({ ...prev, extension_minutes: +e.target.value }))}
              placeholder="Nhập số phút..."
            />
            <p className="text-xs text-muted-foreground">Số phút được gia hạn mỗi lần (1-1440 phút)</p>
          </div>
          <Button onClick={updateExtensionPolicy} disabled={loading} className="mb-0.5">
            {loading ? 'Đang lưu...' : 'Lưu'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
