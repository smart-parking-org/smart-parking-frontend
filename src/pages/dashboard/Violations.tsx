import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw, Plus, AlertTriangle, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { reservationApi, authApi } from '@/config/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  getViolations,
  createViolation,
  getViolation,
  resolveViolation,
  cancelViolation,
  createViolationPayment,
  detectOverstay,
  detectLateCheckIn,
  detectNoShow,
  detectLatePayment,
} from '@/services/violationApi';
import type { Violation, CreateViolationRequest, ViolationType, ViolationSeverity } from '@/types/violation';

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

export default function ViolationsPage() {
  const [violations, setViolations] = useState<Violation[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pagination, setPagination] = useState({
    current_page: 1,
    per_page: 20,
    total: 0,
    last_page: 1,
  });

  // Create dialog state
  const [openCreate, setOpenCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newViolation, setNewViolation] = useState<CreateViolationRequest>({
    type: 'OTHER',
    severity: 'MEDIUM',
    description: '',
  });

  // Detail dialog state
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);

  // Resolve dialog state
  const [openResolve, setOpenResolve] = useState(false);
  const [resolveData, setResolveData] = useState({
    resolved_by: 1, // TODO: Get from auth context
    resolution_note: '',
    fine_amount: undefined as number | undefined,
  });

  // Data for selects
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [userVehicles, setUserVehicles] = useState<Vehicle[]>([]);
  const [loadingUserVehicles, setLoadingUserVehicles] = useState(false);

  // Fetch violations
  useEffect(() => {
    fetchViolations();
  }, [typeFilter, statusFilter, pagination.current_page]);

  // Fetch data for selects
  useEffect(() => {
    fetchParkingLots();
    fetchUsers();
  }, []);

  // Fetch user vehicles when user_id changes
  useEffect(() => {
    if (newViolation.user_id && newViolation.user_id > 0) {
      fetchUserVehicles(newViolation.user_id);
    } else {
      setUserVehicles([]);
      setNewViolation((prev) => ({ ...prev, vehicle_id: undefined }));
    }
  }, [newViolation.user_id]);

  const fetchViolations = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.current_page,
        per_page: pagination.per_page,
      };

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (search) {
        const numSearch = Number(search);
        if (!isNaN(numSearch)) {
          params.user_id = numSearch;
        }
      }

      const res = await getViolations(params);
      setViolations(Array.isArray(res.data) ? res.data : []);
      if (res.current_page) {
        setPagination({
          current_page: res.current_page || 1,
          per_page: res.per_page || 20,
          total: res.total || 0,
          last_page: res.last_page || 1,
        });
      }
    } catch (err) {
      console.error('fetchViolations error', err);
      alert('Lỗi khi tải danh sách vi phạm');
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
    if (!newViolation.type || !newViolation.severity) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    try {
      setCreateLoading(true);
      await createViolation(newViolation);
      alert('Tạo vi phạm thành công');
      setOpenCreate(false);
      setNewViolation({
        type: 'OTHER',
        severity: 'MEDIUM',
        description: '',
      });
      fetchViolations();
    } catch (err: any) {
      console.error('createViolation error', err);
      alert(err.response?.data?.message || 'Lỗi khi tạo vi phạm');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedViolation) return;

    try {
      await resolveViolation(selectedViolation.id, resolveData);
      alert('Xử lý vi phạm thành công');
      setOpenResolve(false);
      fetchViolations();
      if (openDetail) {
        const updated = await getViolation(selectedViolation.id);
        setSelectedViolation(updated);
      }
    } catch (err: any) {
      console.error('resolveViolation error', err);
      alert(err.response?.data?.message || 'Lỗi khi xử lý vi phạm');
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Bạn có chắc muốn hủy vi phạm này?')) return;

    try {
      await cancelViolation(id);
      alert('Hủy vi phạm thành công');
      fetchViolations();
    } catch (err: any) {
      console.error('cancelViolation error', err);
      alert(err.response?.data?.message || 'Lỗi khi hủy vi phạm');
    }
  };

  const handleCreatePayment = async (id: number) => {
    if (!confirm('Tạo thanh toán phạt cho vi phạm này?')) return;

    try {
      const result = await createViolationPayment(id);
      window.open(result.payUrl, '_blank');
      alert('Đã mở trang thanh toán. Vui lòng hoàn tất thanh toán.');
      fetchViolations();
    } catch (err: any) {
      console.error('createViolationPayment error', err);
      alert(err.response?.data?.message || 'Lỗi khi tạo thanh toán');
    }
  };

  const handleDetect = async (detectFn: () => Promise<any>, type: string) => {
    if (!confirm(`Phát hiện ${type}? Chọn OK để tự động tạo vi phạm.`)) {
      // Preview mode
      try {
        const result = await detectFn();
        alert(`Phát hiện ${result.detected} vi phạm ${type}`);
      } catch (err: any) {
        console.error(`detect ${type} error`, err);
        alert(err.response?.data?.message || `Lỗi khi phát hiện ${type}`);
      }
      return;
    }

    try {
      const result = await detectFn();
      alert(`Đã tạo ${result.violations_created || result.updated || 0} vi phạm ${type}`);
      fetchViolations();
    } catch (err: any) {
      console.error(`detect ${type} error`, err);
      alert(err.response?.data?.message || `Lỗi khi phát hiện ${type}`);
    }
  };

  const getTypeLabel = (type: ViolationType) => {
    const labels: Record<ViolationType, string> = {
      OVERSTAY: 'Đỗ quá giờ',
      LATE_CHECK_IN: 'Check-in muộn',
      PARKING_EXPIRED_CHECK_IN: 'Check-in khi hết hạn',
      NO_SHOW: 'Không đến',
      LATE_PAYMENT: 'Thanh toán chậm',
      WRONG_SLOT: 'Đỗ sai chỗ',
      NO_RESERVATION: 'Đỗ không có reservation',
      OTHER: 'Khác',
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      LOW: { label: 'Thấp', variant: 'outline' },
      MEDIUM: { label: 'Trung bình', variant: 'secondary' },
      HIGH: { label: 'Cao', variant: 'default' },
      CRITICAL: { label: 'Nghiêm trọng', variant: 'destructive' },
    };
    const c = config[severity] || { label: severity, variant: 'outline' };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      PENDING: { label: 'Chờ xử lý', variant: 'outline' },
      RESOLVED: { label: 'Đã xử lý', variant: 'default' },
      CANCELLED: { label: 'Đã hủy', variant: 'secondary' },
      APPEALED: { label: 'Đang khiếu nại', variant: 'destructive' },
    };
    const c = config[status] || { label: status, variant: 'outline' };
    return <Badge variant={c.variant}>{c.label}</Badge>;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '-';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">Quản lý vi phạm</CardTitle>
            <div className="flex gap-2">
              {/* <Button
                variant="outline"
                onClick={() =>
                  handleDetect(() => detectOverstay({ auto_create: true }), 'đỗ quá giờ')
                }
              >
                Phát hiện OVERSTAY
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  handleDetect(() => detectLateCheckIn({ auto_create: true }), 'check-in muộn')
                }
              >
                Phát hiện LATE_CHECK_IN
              </Button>
              <Button
                variant="outline"
                onClick={() => handleDetect(() => detectNoShow({ auto_create: true }), 'NO_SHOW')}
              >
                Phát hiện NO_SHOW
              </Button> */}
              <Button onClick={() => setOpenCreate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo vi phạm
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm theo User ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      fetchViolations();
                    }
                  }}
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Loại vi phạm" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="OVERSTAY">Đỗ quá giờ</SelectItem>
                <SelectItem value="LATE_CHECK_IN">Check-in muộn</SelectItem>
                <SelectItem value="NO_SHOW">Không đến</SelectItem>
                <SelectItem value="LATE_PAYMENT">Thanh toán chậm</SelectItem>
                <SelectItem value="WRONG_SLOT">Đỗ sai chỗ</SelectItem>
                <SelectItem value="NO_RESERVATION">Đỗ không reservation</SelectItem>
                <SelectItem value="OTHER">Khác</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                <SelectItem value="RESOLVED">Đã xử lý</SelectItem>
                <SelectItem value="CANCELLED">Đã hủy</SelectItem>
                <SelectItem value="APPEALED">Đang khiếu nại</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchViolations} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Làm mới
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Đang tải...</div>
          ) : violations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Không có vi phạm nào</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Ticket #</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Mức độ</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Biển số</TableHead>
                    <TableHead>Tiền phạt</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thời gian</TableHead>
                    <TableHead>Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {violations.map((violation) => (
                    <TableRow key={violation.id}>
                      <TableCell>{violation.id}</TableCell>
                      <TableCell className="font-mono text-sm">{violation.ticket_number || '-'}</TableCell>
                      <TableCell>{getTypeLabel(violation.type)}</TableCell>
                      <TableCell>{getSeverityBadge(violation.severity)}</TableCell>
                      <TableCell>
                        {violation.user_snapshot ? (
                          <div>
                            <div className="font-medium">{violation.user_snapshot.name}</div>
                            <div className="text-sm text-muted-foreground">{violation.user_snapshot.email}</div>
                          </div>
                        ) : (
                          `User ID: ${violation.user_id || '-'}`
                        )}
                      </TableCell>
                      <TableCell>{violation.vehicle_snapshot?.license_plate || '-'}</TableCell>
                      <TableCell className="font-medium">{formatCurrency(violation.fine_amount)}</TableCell>
                      <TableCell>{getStatusBadge(violation.status)}</TableCell>
                      <TableCell className="text-sm">
                        {violation.violation_time
                          ? new Date(violation.violation_time).toLocaleString('vi-VN', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedViolation(violation);
                              setOpenDetail(true);
                            }}
                          >
                            Chi tiết
                          </Button>
                          {violation.status === 'PENDING' && (
                            <>
                              {violation.fine_amount && violation.fine_amount > 0 && !violation.payment_id && (
                                <Button variant="default" size="sm" onClick={() => handleCreatePayment(violation.id)}>
                                  Thanh toán
                                </Button>
                              )}
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedViolation(violation);
                                  setResolveData({
                                    resolved_by: 1,
                                    resolution_note: '',
                                    fine_amount: violation.fine_amount || undefined,
                                  });
                                  setOpenResolve(true);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleCancel(violation.id)}>
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {pagination.last_page > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-muted-foreground">
                    Trang {pagination.current_page} / {pagination.last_page} (Tổng: {pagination.total})
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current_page === 1}
                      onClick={() => setPagination((prev) => ({ ...prev, current_page: prev.current_page - 1 }))}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.current_page === pagination.last_page}
                      onClick={() => setPagination((prev) => ({ ...prev, current_page: prev.current_page + 1 }))}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tạo vi phạm mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Loại vi phạm *</Label>
              <Select
                value={newViolation.type}
                onValueChange={(value: 'WRONG_SLOT' | 'NO_RESERVATION' | 'OTHER') =>
                  setNewViolation((prev) => ({ ...prev, type: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại vi phạm" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="WRONG_SLOT">Đỗ sai chỗ</SelectItem>
                  <SelectItem value="NO_RESERVATION">Đỗ không có reservation</SelectItem>
                  <SelectItem value="OTHER">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mức độ *</Label>
              <Select
                value={newViolation.severity}
                onValueChange={(value: ViolationSeverity) => setNewViolation((prev) => ({ ...prev, severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn mức độ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Thấp</SelectItem>
                  <SelectItem value="MEDIUM">Trung bình</SelectItem>
                  <SelectItem value="HIGH">Cao</SelectItem>
                  <SelectItem value="CRITICAL">Nghiêm trọng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Người dùng</Label>
              <Select
                value={newViolation.user_id?.toString() || undefined}
                onValueChange={(value) =>
                  setNewViolation((prev) => ({
                    ...prev,
                    user_id: value ? Number(value) : undefined,
                    vehicle_id: undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người dùng (tùy chọn)" />
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

            {newViolation.user_id && (
              <div>
                <Label>Phương tiện</Label>
                <Select
                  value={newViolation.vehicle_id?.toString() || undefined}
                  onValueChange={(value) =>
                    setNewViolation((prev) => ({
                      ...prev,
                      vehicle_id: value ? Number(value) : undefined,
                    }))
                  }
                  disabled={loadingUserVehicles}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUserVehicles ? 'Đang tải...' : 'Chọn phương tiện (tùy chọn)'} />
                  </SelectTrigger>
                  <SelectContent>
                    {userVehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                        {vehicle.license_plate} ({vehicle.vehicle_type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Bãi đỗ xe</Label>
              <Select
                value={newViolation.parking_lot_id?.toString() || undefined}
                onValueChange={(value) =>
                  setNewViolation((prev) => ({
                    ...prev,
                    parking_lot_id: value ? Number(value) : undefined,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn bãi đỗ xe (tùy chọn)" />
                </SelectTrigger>
                <SelectContent>
                  {parkingLots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id.toString()}>
                      {lot.name} (ID: {lot.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Mô tả</Label>
              <Input
                value={newViolation.description || ''}
                onChange={(e) => setNewViolation((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả chi tiết vi phạm..."
              />
            </div>

            <div>
              <Label>Tiền phạt (VND)</Label>
              <Input
                type="number"
                min="0"
                value={newViolation.fine_amount || ''}
                onChange={(e) =>
                  setNewViolation((prev) => ({
                    ...prev,
                    fine_amount: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="Nhập số tiền phạt..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>
              Đóng
            </Button>
            <Button onClick={handleCreate} disabled={createLoading}>
              {createLoading ? 'Đang tạo...' : 'Tạo vi phạm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={openDetail} onOpenChange={setOpenDetail}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Chi tiết vi phạm #{selectedViolation?.id}</DialogTitle>
          </DialogHeader>
          {selectedViolation ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Ticket Number</Label>
                  <div className="text-sm font-mono">{selectedViolation.ticket_number || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Loại vi phạm</Label>
                  <div className="text-sm">{getTypeLabel(selectedViolation.type)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Mức độ</Label>
                  <div className="text-sm">{getSeverityBadge(selectedViolation.severity)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Trạng thái</Label>
                  <div className="text-sm">{getStatusBadge(selectedViolation.status)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Tiền phạt</Label>
                  <div className="text-sm font-semibold text-red-600">
                    {formatCurrency(selectedViolation.fine_amount)}
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Thời gian vi phạm</Label>
                  <div className="text-sm">
                    {selectedViolation.violation_time
                      ? new Date(selectedViolation.violation_time).toLocaleString('vi-VN')
                      : '-'}
                  </div>
                </div>
              </div>

              {selectedViolation.description && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Mô tả</Label>
                    <div className="text-sm p-3 bg-muted rounded-md">{selectedViolation.description}</div>
                  </div>
                </>
              )}

              {selectedViolation.user_snapshot && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Thông tin người dùng</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Tên:</span> {selectedViolation.user_snapshot.name}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email:</span> {selectedViolation.user_snapshot.email}
                      </div>
                      <div>
                        <span className="text-muted-foreground">SĐT:</span> {selectedViolation.user_snapshot.phone}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedViolation.vehicle_snapshot && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Thông tin phương tiện</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Biển số:</span>{' '}
                        {selectedViolation.vehicle_snapshot.license_plate}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Loại xe:</span>{' '}
                        {selectedViolation.vehicle_snapshot.vehicle_type}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedViolation.reservation_snapshot && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Thông tin reservation</Label>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Mã reservation:</span>{' '}
                        {selectedViolation.reservation_snapshot.reservation_code}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Slot được phân:</span>{' '}
                        {selectedViolation.reservation_snapshot.allocated_slot_code || '-'}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {selectedViolation.resolution_note && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Ghi chú xử lý</Label>
                    <div className="text-sm p-3 bg-muted rounded-md">{selectedViolation.resolution_note}</div>
                    {selectedViolation.resolved_at && (
                      <div className="text-xs text-muted-foreground mt-2">
                        Xử lý lúc: {new Date(selectedViolation.resolved_at).toLocaleString('vi-VN')}
                      </div>
                    )}
                  </div>
                </>
              )}

              <Separator />
              <div className="text-xs text-muted-foreground">
                <div>Ngày tạo: {new Date(selectedViolation.created_at).toLocaleString('vi-VN')}</div>
                <div>Ngày cập nhật: {new Date(selectedViolation.updated_at).toLocaleString('vi-VN')}</div>
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

      {/* Resolve Dialog */}
      <Dialog open={openResolve} onOpenChange={setOpenResolve}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý vi phạm</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Ghi chú xử lý</Label>
              <Input
                value={resolveData.resolution_note}
                onChange={(e) => setResolveData((prev) => ({ ...prev, resolution_note: e.target.value }))}
                placeholder="Nhập ghi chú..."
              />
            </div>
            <div>
              <Label>Tiền phạt (VND) - Cập nhật nếu cần</Label>
              <Input
                type="number"
                min="0"
                value={resolveData.fine_amount || ''}
                onChange={(e) =>
                  setResolveData((prev) => ({
                    ...prev,
                    fine_amount: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                placeholder="Giữ nguyên hoặc cập nhật..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenResolve(false)}>
              Hủy
            </Button>
            <Button onClick={handleResolve}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Xử lý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
