import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Plus, Ticket, X } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reservationApi, authApi } from '@/config/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { createMonthlyPass, cancelMonthlyPass, getAllMonthlyPasses } from '@/services/monthlyPassApi';
import type { MonthlyPass, CreateMonthlyPassRequest } from '@/types/monthlyPass';

interface ParkingLot {
  id: number;
  name: string;
}

interface User {
  id: number;
  name: string;
  email: string;
}

interface Vehicle {
  id: number;
  license_plate: string;
  vehicle_type: string;
}

export default function MonthlyPassPage() {
  const [monthlyPasses, setMonthlyPasses] = useState<MonthlyPass[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Create dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newMonthlyPass, setNewMonthlyPass] = useState<CreateMonthlyPassRequest>({
    user_id: 0,
    vehicle_id: 0,
    parking_lot_id: 0,
    months: 1,
    start_date: '',
  });
  const [payUrl, setPayUrl] = useState<string | null>(null);

  // Detail dialog state
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedMonthlyPass, setSelectedMonthlyPass] = useState<MonthlyPass | null>(null);

  // Data for selects
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [loadingUserVehicles, setLoadingUserVehicles] = useState(false);

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch monthly passes when filters change
  useEffect(() => {
    fetchMonthlyPasses();
  }, [debouncedSearch, statusFilter]);

  // Fetch data for selects
  useEffect(() => {
    fetchParkingLots();
    fetchUsers();
  }, []);

  // Fetch user vehicles when user_id changes
  useEffect(() => {
    if (newMonthlyPass.user_id > 0) {
      fetchUserVehicles(newMonthlyPass.user_id);
    } else {
      setUserVehicles([]);
      setNewMonthlyPass((prev) => ({ ...prev, vehicle_id: 0 }));
    }
  }, [newMonthlyPass.user_id]);

  const fetchMonthlyPasses = async () => {
    try {
      setLoading(true);
      const params: {
        user_id?: number;
        status?: string;
        page?: number;
        per_page?: number;
      } = {};

      if (debouncedSearch) {
        params.user_id = Number(debouncedSearch);
      }

      if (statusFilter && statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const passes = await getAllMonthlyPasses(params);
      setMonthlyPasses(passes.data);
    } catch (err) {
      console.error('fetchMonthlyPasses error', err);
      alert('Lỗi khi tải danh sách vé tháng');
    } finally {
      setLoading(false);
    }
  };

  const fetchParkingLots = async () => {
    try {
      const res = await reservationApi.get('/parking-lots');
      setParkingLots(res.data.data || res.data || []);
    } catch (err) {
      console.error('fetchParkingLots error', err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await authApi.get('/users', { params: { limit: 100 } });
      const data = res.data.data || [];
      setUsers(data);
    } catch (err) {
      console.error('fetchUsers error', err);
    }
  };

  const fetchUserVehicles = async (userId: number) => {
    if (!userId) {
      setUserVehicles([]);
      return;
    }

    try {
      setLoadingUserVehicles(true);
      const res = await authApi.get('/vehicles', {
        params: {
          page: 1,
          limit: 100,
          user_id: userId,
        },
      });
      setUserVehicles(res.data.data || []);
    } catch (err) {
      console.error('fetchUserVehicles error', err);
      setUserVehicles([]);
    } finally {
      setLoadingUserVehicles(false);
    }
  };

  const handleCreate = async () => {
    if (!newMonthlyPass.user_id || !newMonthlyPass.vehicle_id || !newMonthlyPass.parking_lot_id) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setCreateLoading(true);
      const result = await createMonthlyPass(newMonthlyPass);
      setPayUrl(result.payUrl);
      alert('Tạo vé tháng thành công! Vui lòng thanh toán qua URL được cung cấp.');

      // Reset form
      setNewMonthlyPass({
        user_id: 0,
        vehicle_id: 0,
        parking_lot_id: 0,
        months: 1,
        start_date: '',
      });

      // Refresh list - luôn refresh sau khi tạo
      await fetchMonthlyPasses();

      // Optionally: Auto close dialog after a delay or let user close manually
    } catch (err: any) {
      console.error('createMonthlyPass error', err);
      alert(err.response?.data?.message || 'Lỗi khi tạo vé tháng');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Bạn có chắc muốn hủy vé tháng này?')) return;

    try {
      await cancelMonthlyPass(id);
      alert('Hủy vé tháng thành công');

      // Refresh list
      await fetchMonthlyPasses();
    } catch (err: any) {
      console.error('cancelMonthlyPass error', err);
      alert(err.response?.data?.message || 'Lỗi khi hủy vé tháng');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }
    > = {
      PENDING: { label: 'Chờ thanh toán', variant: 'outline' },
      ACTIVE: { label: 'Đang sử dụng', variant: 'default' },
      CANCELLED: { label: 'Đã hủy', variant: 'secondary' },
      EXPIRED: { label: 'Hết hạn', variant: 'secondary' },
      FAILED: { label: 'Thanh toán thất bại', variant: 'destructive' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const getParkingLotName = (parkingLotId: number): string => {
    const lot = parkingLots.find((l) => l.id === parkingLotId);
    return lot ? lot.name : `Bãi #${parkingLotId}`;
  };

  const getVehicleTypeName = (vehicleType: string): string => {
    const names: Record<string, string> = {
      motorbike: 'Xe máy',
      car_4_seat: 'Ô tô 4 chỗ',
      car_7_seat: 'Ô tô 7 chỗ',
      light_truck: 'Xe tải nhẹ',
    };
    return names[vehicleType] || vehicleType;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">Quản lý vé tháng</CardTitle>
            <Button onClick={() => setOpenCreate(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo vé tháng
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Lọc theo trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="PENDING">Chờ thanh toán</SelectItem>
                <SelectItem value="ACTIVE">Đang sử dụng</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                <SelectItem value="EXPIRED">Hết hạn</SelectItem>
                <SelectItem value="FAILED">Thanh toán thất bại</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                fetchMonthlyPasses();
              }}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : monthlyPasses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {debouncedSearch ? 'Không tìm thấy vé tháng' : 'Nhập User ID để tìm kiếm vé tháng'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Người dùng</TableHead>
                  <TableHead>Phương tiện</TableHead>
                  <TableHead>Bãi đỗ</TableHead>
                  <TableHead>Số tháng</TableHead>
                  <TableHead>Ngày bắt đầu</TableHead>
                  <TableHead>Ngày kết thúc</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthlyPasses.map((pass) => (
                  <TableRow key={pass.id}>
                    <TableCell>{pass.id}</TableCell>
                    <TableCell>
                      {pass.user_snapshot ? (
                        <div>
                          <div className="font-medium">{pass.user_snapshot.name}</div>
                          <div className="text-sm text-muted-foreground">{pass.user_snapshot.email}</div>
                        </div>
                      ) : (
                        `User ID: ${pass.user_id}`
                      )}
                    </TableCell>
                    <TableCell>
                      {pass.vehicle_snapshot ? (
                        <div>
                          <div className="font-medium">{pass.vehicle_snapshot.license_plate}</div>
                          <div className="text-sm text-muted-foreground">
                            {getVehicleTypeName(pass.vehicle_snapshot.vehicle_type)}
                          </div>
                        </div>
                      ) : (
                        `Vehicle ID: ${pass.vehicle_id}`
                      )}
                    </TableCell>
                    <TableCell>{getParkingLotName(pass.parking_lot_id)}</TableCell>
                    <TableCell>{pass.months} tháng</TableCell>
                    <TableCell>
                      {pass.start_date ? new Date(pass.start_date).toLocaleDateString('vi-VN') : '-'}
                    </TableCell>
                    <TableCell>{pass.end_date ? new Date(pass.end_date).toLocaleDateString('vi-VN') : '-'}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(pass.amount)}</TableCell>
                    <TableCell>{getStatusBadge(pass.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMonthlyPass(pass);
                            setOpenDetail(true);
                          }}
                        >
                          Chi tiết
                        </Button>
                        {pass.status === 'PENDING' && (
                          <Button variant="destructive" size="sm" onClick={() => handleCancel(pass.id)}>
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo vé tháng mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Người dùng *</Label>
              <Select
                value={newMonthlyPass.user_id.toString()}
                onValueChange={(value) =>
                  setNewMonthlyPass((prev) => ({ ...prev, user_id: Number(value), vehicle_id: 0 }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người dùng" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id.toString()}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Phương tiện *</Label>
              <Select
                value={newMonthlyPass.vehicle_id.toString()}
                onValueChange={(value) => setNewMonthlyPass((prev) => ({ ...prev, vehicle_id: Number(value) }))}
                disabled={!newMonthlyPass.user_id || loadingUserVehicles}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingUserVehicles ? 'Đang tải...' : 'Chọn phương tiện'} />
                </SelectTrigger>
                <SelectContent>
                  {userVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                      {vehicle.license_plate} ({getVehicleTypeName(vehicle.vehicle_type)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Bãi đỗ xe *</Label>
              <Select
                value={newMonthlyPass.parking_lot_id.toString()}
                onValueChange={(value) => setNewMonthlyPass((prev) => ({ ...prev, parking_lot_id: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bãi đỗ xe" />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Số tháng</Label>
                <Input
                  type="number"
                  min="1"
                  max="12"
                  value={newMonthlyPass.months || 1}
                  onChange={(e) => setNewMonthlyPass((prev) => ({ ...prev, months: Number(e.target.value) || 1 }))}
                />
              </div>
              <div>
                <Label>Ngày bắt đầu (tùy chọn)</Label>
                <Input
                  type="date"
                  value={newMonthlyPass.start_date || ''}
                  onChange={(e) => setNewMonthlyPass((prev) => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
            </div>

            {payUrl && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                <Label className="text-blue-900 font-semibold mb-2 block">URL thanh toán:</Label>
                <div className="flex gap-2">
                  <Input value={payUrl} readOnly className="flex-1" />
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(payUrl);
                      alert('Đã copy URL thanh toán');
                    }}
                  >
                    Copy
                  </Button>
                  <Button variant="outline" onClick={() => window.open(payUrl, '_blank')}>
                    Mở
                  </Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setOpenCreate(false);
                setPayUrl(null);
              }}
            >
              Đóng
            </Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? 'Đang tạo...' : 'Tạo vé tháng'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Chi tiết vé tháng</DialogTitle>
          </DialogHeader>
          {selectedMonthlyPass ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">ID</Label>
                  <div className="text-sm">{selectedMonthlyPass.id}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Mã đơn hàng</Label>
                  <div className="text-sm font-mono">{selectedMonthlyPass.order_id}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Trạng thái</Label>
                  <div className="text-sm">{getStatusBadge(selectedMonthlyPass.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Số tháng</Label>
                  <div className="text-sm">{selectedMonthlyPass.months} tháng</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Ngày bắt đầu</Label>
                  <div className="text-sm">
                    {selectedMonthlyPass.start_date
                      ? new Date(selectedMonthlyPass.start_date).toLocaleDateString('vi-VN')
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Ngày kết thúc</Label>
                  <div className="text-sm">
                    {selectedMonthlyPass.end_date
                      ? new Date(selectedMonthlyPass.end_date).toLocaleDateString('vi-VN')
                      : '-'}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Số tiền</Label>
                  <div className="text-sm font-semibold text-green-600">
                    {formatCurrency(selectedMonthlyPass.amount)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Bãi đỗ xe</Label>
                  <div className="text-sm">{getParkingLotName(selectedMonthlyPass.parking_lot_id)}</div>
                </div>
              </div>

              <Separator />

              {selectedMonthlyPass.user_snapshot && (
                <div>
                  <Label className="text-sm font-medium mb-2 block">Thông tin người dùng</Label>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tên:</span> {selectedMonthlyPass.user_snapshot.name}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Email:</span> {selectedMonthlyPass.user_snapshot.email}
                    </div>
                    <div>
                      <span className="text-muted-foreground">SĐT:</span> {selectedMonthlyPass.user_snapshot.phone}
                    </div>
                  </div>
                </div>
              )}

              {selectedMonthlyPass.vehicle_snapshot && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Thông tin phương tiện</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Biển số:</span>{' '}
                        {selectedMonthlyPass.vehicle_snapshot.license_plate}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Loại xe:</span>{' '}
                        {getVehicleTypeName(selectedMonthlyPass.vehicle_snapshot.vehicle_type)}
                      </div>
                    </div>
                  </div>
                </>
              )}

              <Separator />

              <div className="text-xs text-muted-foreground">
                <div>Ngày tạo: {new Date(selectedMonthlyPass.created_at).toLocaleString('vi-VN')}</div>
                <div>Ngày cập nhật: {new Date(selectedMonthlyPass.updated_at).toLocaleString('vi-VN')}</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDetail(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
