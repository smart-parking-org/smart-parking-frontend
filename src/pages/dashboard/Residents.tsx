import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useMemo, useState } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/config/axios';

interface Resident {
  id: number;
  name: string;
  email: string;
  phone: string;
  apartment_code: string;
  role: string;
  status: string;
  is_active: boolean;
  approved_by: number | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}
export default function Residents() {
  const [query, setQuery] = useState('');
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const { token } = useAuth();

  // Fetch residents khi component mount
  useEffect(() => {
    fetchResidents();
  }, []);

  const fetchResidents = async () => {
    try {
      setLoading(true);
      const response = await authApi.get('/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setResidents(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch residents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    if (!confirm('Bạn có chắc muốn duyệt tài khoản này?')) {
      return;
    }

    try {
      await authApi.patch(
        `/admin/users/${userId}/approve`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      alert('Đã chấp nhận tài khoản');
      fetchResidents();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể chấp nhận tài khoản';
      alert(message);
    }
  };

  const handleReject = async (userId: number) => {
    const reason = prompt('Nhập lý do từ chối:');
    if (!reason || reason.trim() === '') {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }

    if (!confirm('Bạn có chắc muốn từ chối tài khoản này?')) {
      return;
    }

    try {
      await authApi.patch(
        `/admin/users/${userId}/reject`,
        { reason: reason.trim() },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      alert('Đã từ chối tài khoản');
      fetchResidents();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể từ chối tài khoản';
      alert(message);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return residents;
    return residents.filter((r) =>
      [r.name, r.email, r.apartment_code, r.phone].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [query, residents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Đang tải...</div>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý cư dân</h1>
          <p className="text-muted-foreground">Tài khoản, phương tiện và lịch sử vi phạm.</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Thêm cư dân
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>Danh sách cư dân</CardTitle>
          <div className="relative">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, căn hộ, email..."
              className="pl-8 w-72"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Họ tên</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Căn hộ</TableHead>
                <TableHead>Điện thoại</TableHead>
                <TableHead>Vai trò</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Không tìm thấy cư dân nào
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell>{r.email}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{r.apartment_code}</Badge>
                    </TableCell>
                    <TableCell>{r.phone}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {r.status === 'approved' ? (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Đã duyệt
                        </Badge>
                      ) : r.status === 'rejected' ? (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          Đã từ chối
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                          Chờ duyệt
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="default" onClick={() => handleApprove(r.id)} className="h-8">
                            <Check className="mr-1 h-3 w-3" />
                            Duyệt
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(r.id)}
                            className="h-8 text-red-600 hover:text-red-700"
                          >
                            <X className="mr-1 h-3 w-3" />
                            Từ chối
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
