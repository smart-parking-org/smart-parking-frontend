import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { authApi } from '@/config/axios';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

interface User {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

interface Vehicle {
  id: number;
  license_plate: string;
  vehicle_type: string;
  user?: { id: number; name: string };
  is_active: boolean;
  is_primary?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export default function Vehicles() {
  // list state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const perPage = 10; // Fixed page size
  const [totalPages, setTotalPages] = useState(1);

  // filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vehIsActiveFilter, setVehIsActiveFilter] = useState<string>('all');
  const [vehUserFilter, setVehUserFilter] = useState<string>('all');
  const [vehTypeFilter, setVehTypeFilter] = useState('all');
  const [vehStatusFilter, setVehStatusFilter] = useState<string>('all');

  // users for select
  const [users, setUsers] = useState<User[]>([]);

  // dialog + form
  const [openForm, setOpenForm] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [formPayload, setFormPayload] = useState({
    license_plate: '',
    user_id: '' as string | number,
    vehicle_type: 'motorbike',
    is_active: true,
  });

  // --- Detail dialog state ---
  const [openDetail, setOpenDetail] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editPayload, setEditPayload] = useState({
    license_plate: '',
    vehicle_type: 'motorbike',
  });

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, vehIsActiveFilter, vehUserFilter, vehTypeFilter, vehStatusFilter]);

  // fetch data
  useEffect(() => {
    fetchVehicles();
  }, [page, debouncedSearch, vehIsActiveFilter, vehUserFilter, vehTypeFilter, vehStatusFilter]);

  useEffect(() => {
    fetchUsersForSelect();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: perPage };
      if (debouncedSearch) params.search = debouncedSearch;
      if (vehIsActiveFilter !== 'all') params.is_active = vehIsActiveFilter === 'true';
      if (vehUserFilter !== 'all') params.user_id = vehUserFilter;
      if (vehTypeFilter !== 'all') params.vehicle_type = vehTypeFilter;
      if (vehStatusFilter !== 'all') params.status = vehStatusFilter;

      const res = await authApi.get('/vehicles', { params });
      const data = res.data.data || [];
      setVehicles(data);

      const total = res.data.pagination?.total || res.data.total || data.length;
      setTotalPages(Math.max(1, Math.ceil(total / perPage)));
    } catch (err) {
      console.error('fetchVehicles', err);
      alert('Lỗi khi tải danh sách phương tiện');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsersForSelect = async () => {
    try {
      const res = await authApi.get('/users', { params: { page: 1, limit: 200 } });
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('fetchUsersForSelect', err);
    }
  };

  const openCreateForm = () => {
    setIsEditMode(false);
    setFormPayload({ license_plate: '', user_id: '', vehicle_type: 'motorbike', is_active: false });
    setSelectedVehicle(null);
    setOpenForm(true);
  };

  const openEditForm = (v: Vehicle) => {
    setIsEditMode(true);
    setSelectedVehicle(v);
    setFormPayload({
      license_plate: v.license_plate || '',
      user_id: v.user?.id || '',
      vehicle_type: v.vehicle_type || 'motorbike',
      is_active: !!v.is_active,
    });
    setOpenForm(true);
  };

  const handleCreateVehicle = async () => {
    try {
      if (!formPayload.license_plate) {
        alert('Vui lòng nhập biển số');
        return;
      }
      if (!formPayload.user_id) {
        alert('Vui lòng chọn người dùng');
        return;
      }
      const payload = {
        license_plate: formPayload.license_plate,
        user_id: formPayload.user_id,
        vehicle_type: formPayload.vehicle_type,
      };
      await authApi.post('/vehicles', payload);
      alert('Tạo phương tiện thành công. Phương tiện đang chờ admin duyệt.');
      setOpenForm(false);
      fetchVehicles();
    } catch (err: any) {
      console.error('create vehicle', err);
      alert(err?.response?.data?.message || 'Không thể tạo phương tiện');
    }
  };

  const handleUpdateVehicle = async () => {
    if (!selectedVehicle) return;
    try {
      const payload = {
        license_plate: formPayload.license_plate,
        vehicle_type: formPayload.vehicle_type,
      };
      await authApi.patch(`/vehicles/${selectedVehicle.id}`, payload, {
        headers: {},
      });
      alert('Cập nhật phương tiện thành công');
      setOpenForm(false);
      fetchVehicles();
    } catch (err: any) {
      console.error('update vehicle', err);
      alert(err?.response?.data?.message || 'Không thể cập nhật phương tiện');
    }
  };


  const handleToggleActive = async (v: Vehicle, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const action = v.is_active ? 'khóa' : 'mở khóa';
    if (!confirm(`Xác nhận ${action} phương tiện này?`)) return;

    try {
      await authApi.post(`/vehicles/toggle-active/${v.id}`);
      alert(`Đã ${action} phương tiện thành công`);
      fetchVehicles();
    } catch (err) {
      console.error('toggle active', err);
      alert('Không thể thay đổi trạng thái');
    }
  };

  const handleReviewVehicle = async (v: Vehicle, status: 'approved' | 'rejected') => {
    const action = status === 'approved' ? 'duyệt' : 'từ chối';
    if (!confirm(`Xác nhận ${action} phương tiện này?`)) return;

    try {
      await authApi.post(`/vehicles/${v.id}/review`, { status });
      alert(`Đã ${action} phương tiện thành công`);
      fetchVehicles();
      if (selectedVehicle?.id === v.id) {
        await fetchVehicleDetail(v.id);
      }
    } catch (err: any) {
      console.error('handleReviewVehicle', err);
      alert(err?.response?.data?.message || `Không thể ${action} phương tiện`);
    }
  };

  // --- Fetch Vehicle detail ---
  const fetchVehicleDetail = async (id: number) => {
    try {
      setDetailLoading(true);
      const res = await authApi.get(`/vehicles/${id}`, {});
      const d = res.data.data || res.data;
      setSelectedVehicle(d);
      setEditPayload({
        license_plate: d.license_plate || '',
        vehicle_type: d.vehicle_type || 'motorbike',
      });
      setOpenDetail(true);
    } catch (err) {
      console.error('fetchVehicleDetail', err);
      alert('Không thể tải chi tiết phương tiện');
    } finally {
      setDetailLoading(false);
    }
  };

  // --- Update Vehicle (PATCH) ---
  const handleUpdateVehicleDetail = async () => {
    if (!selectedVehicle) return;
    try {
      await authApi.patch(`/vehicles/${selectedVehicle.id}`, editPayload, {});
      alert('Cập nhật thành công');
      await fetchVehicleDetail(selectedVehicle.id);
      fetchVehicles();
    } catch (err: any) {
      console.error('update Vehicle', err);
      alert(err.response?.data?.message || 'Không thể cập nhật');
    }
  };

  // --- Delete Vehicle ---
  const performDeleteVehicle = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa phương tiện này?')) return;
    try {
      await authApi.delete(`/vehicles/${id}`);
      alert('Đã xóa phương tiện');
      if (selectedVehicle?.id === id) {
        setOpenDetail(false);
        setSelectedVehicle(null);
      }
      fetchVehicles();
    } catch (err) {
      console.error('delete Vehicle', err);
      alert('Không thể xóa phương tiện');
    }
  };

  // --- Refresh all ---
  const handleRefreshAll = () => {
    fetchVehicles();
    if (selectedVehicle) {
      fetchVehicleDetail(selectedVehicle.id);
    }
  };

  const pagedData = useMemo(() => vehicles, [vehicles]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <CardTitle>Quản lý phương tiện</CardTitle>

          <Dialog open={openForm} onOpenChange={setOpenForm}>
            <DialogTrigger asChild>
              <Button onClick={openCreateForm}>
                <Plus className="mr-2 h-4 w-4" /> Thêm phương tiện
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>{isEditMode ? 'Chỉnh sửa phương tiện' : 'Thêm phương tiện mới'}</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 py-4">
                <div>
                  <Label>Biển số</Label>
                  <Input
                    value={formPayload.license_plate}
                    onChange={(e) => setFormPayload({ ...formPayload, license_plate: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Loại xe</Label>
                  <Select
                    value={formPayload.vehicle_type}
                    onValueChange={(v) => setFormPayload({ ...formPayload, vehicle_type: v })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Chọn loại xe" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="motorbike">Xe máy</SelectItem>
                      <SelectItem value="car_4_seat">Xe 4 chỗ</SelectItem>
                      <SelectItem value="car_7_seat">Xe 7 chỗ</SelectItem>
                      <SelectItem value="light_truck">Xe tải nhẹ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {!isEditMode ? (
                  <div>
                    <Label>Người dùng</Label>
                    <Select
                      value={String(formPayload.user_id ?? 'none')}
                      onValueChange={(v) => setFormPayload({ ...formPayload, user_id: v === 'none' ? '' : Number(v) })}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn người dùng" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">-- Chọn người dùng --</SelectItem>
                        {users.map((u) => (
                          <SelectItem key={u.id} value={String(u.id)}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div>
                    <Label>Người dùng</Label>
                    <Input
                      value={selectedVehicle?.user?.name || '-'}
                      disabled
                      className="bg-muted"
                    />
                  </div>
                )}
              </div>

              <DialogFooter>
                {isEditMode ? (
                  <Button onClick={handleUpdateVehicle}>Lưu</Button>
                ) : (
                  <Button onClick={handleCreateVehicle}>Tạo</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filters */}
        <div className="w-full space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="text-sm font-medium text-muted-foreground">Bộ lọc tìm kiếm</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[250px]">
              <Label className="text-sm text-muted-foreground">Từ khóa</Label>
              <div className="relative">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nhập biển số hoặc tên người dùng..."
                  className="pl-8"
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground">Trạng thái hoạt động</Label>
              <Select value={vehIsActiveFilter} onValueChange={(v) => setVehIsActiveFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Trạng thái hoạt động" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="true">Đang hoạt động</SelectItem>
                  <SelectItem value="false">Đã ngừng</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground">Tình trạng duyệt</Label>
              <Select value={vehStatusFilter} onValueChange={(v) => setVehStatusFilter(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tình trạng duyệt" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="pending">Chờ duyệt</SelectItem>
                  <SelectItem value="approved">Đã duyệt</SelectItem>
                  <SelectItem value="rejected">Đã từ chối</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground">Loại phương tiện</Label>
              <Select value={vehTypeFilter} onValueChange={setVehTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Loại phương tiện" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="motorbike">Xe máy</SelectItem>
                  <SelectItem value="car_4_seat">Xe 4 chỗ</SelectItem>
                  <SelectItem value="car_7_seat">Xe 7 chỗ</SelectItem>
                  <SelectItem value="light_truck">Xe tải nhẹ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground">Người sở hữu</Label>
              <Select value={vehUserFilter} onValueChange={(v) => setVehUserFilter(v)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Người sở hữu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground"> </Label>
              <Button variant="outline" onClick={handleRefreshAll} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Làm mới
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading && pagedData.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-muted-foreground">Đang tải...</div>
          </div>
        ) : (
          <>
            <div className="relative">
              {loading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
                  <div className="text-sm text-muted-foreground">Đang tải...</div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Biển số</TableHead>
                    <TableHead>Loại xe</TableHead>
                    <TableHead>Người dùng</TableHead>
                    <TableHead>Trạng thái duyệt</TableHead>
                    <TableHead>Hoạt động</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Không tìm thấy phương tiện
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedData.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/50 transition">
                        <TableCell className="font-medium">{v.id}</TableCell>
                        <TableCell>{v.license_plate}</TableCell>
                        <TableCell>
                          {{
                            motorbike: 'Xe máy',
                            car_4_seat: 'Xe 4 chỗ',
                            car_7_seat: 'Xe 7 chỗ',
                            light_truck: 'Xe tải nhẹ',
                          }[v.vehicle_type] || v.vehicle_type}
                        </TableCell>
                        <TableCell>{v.user?.name || '-'}</TableCell>
                        <TableCell>
                          {v.status === 'pending' ? (
                            <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">Chờ duyệt</Badge>
                          ) : v.status === 'approved' ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200">Đã duyệt</Badge>
                          ) : v.status === 'rejected' ? (
                            <Badge className="bg-red-50 text-red-700 border-red-200">Từ chối</Badge>
                          ) : (
                            <Badge variant="outline">-</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {v.is_active ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200">Hoạt động</Badge>
                          ) : (
                            <Badge className="bg-gray-50 text-gray-700 border-gray-200">Ngừng</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => fetchVehicleDetail(v.id)}>
                              Chi tiết
                            </Button>
                            {v.status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="bg-green-600 hover:bg-green-700"
                                  onClick={() => handleReviewVehicle(v, 'approved')}
                                >
                                  Duyệt
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleReviewVehicle(v, 'rejected')}
                                >
                                  Từ chối
                                </Button>
                              </>
                            )}
                            {v.status === 'approved' && (
                              <Button
                                size="sm"
                                variant={v.is_active ? 'secondary' : 'default'}
                                onClick={(e) => handleToggleActive(v, e)}
                              >
                                {v.is_active ? 'Khóa' : 'Mở khóa'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => performDeleteVehicle(v.id)}
                            >
                              Xóa
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                ←
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button key={p} variant={p === page ? 'default' : 'outline'} size="sm" onClick={() => setPage(p)}>
                  {p}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              >
                →
              </Button>
            </div>
          </>
        )}
      </CardContent>

      {/* Detail dialog */}
      <Dialog
        open={openDetail}
        onOpenChange={(v) => {
          setOpenDetail(v);
          if (!v) {
            setSelectedVehicle(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Chi tiết phương tiện</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
          ) : selectedVehicle ? (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Thông tin phương tiện</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="license_plate">Biển số *</Label>
                      <Input
                        id="license_plate"
                        value={editPayload.license_plate}
                        onChange={(e) => setEditPayload({ ...editPayload, license_plate: e.target.value })}
                        placeholder="Nhập biển số xe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_type">Loại phương tiện *</Label>
                      <Select
                        value={editPayload.vehicle_type}
                        onValueChange={(v) => setEditPayload({ ...editPayload, vehicle_type: v })}
                      >
                        <SelectTrigger id="vehicle_type">
                          <SelectValue placeholder="Chọn loại phương tiện" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="motorbike">Xe máy</SelectItem>
                          <SelectItem value="car_4_seat">Xe 4 chỗ</SelectItem>
                          <SelectItem value="car_7_seat">Xe 7 chỗ</SelectItem>
                          <SelectItem value="light_truck">Xe tải nhẹ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="user">Chủ sở hữu</Label>
                      <Input
                        id="user"
                        value={selectedVehicle.user?.name || '-'}
                        disabled
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="is_primary">Xe chính</Label>
                      <Input
                        id="is_primary"
                        value={selectedVehicle.is_primary ? 'Có' : 'Không'}
                        disabled
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Trạng thái</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tình trạng duyệt</Label>
                      <Input
                        value={
                          selectedVehicle.status === 'pending'
                            ? 'Chờ duyệt'
                            : selectedVehicle.status === 'approved'
                              ? 'Đã duyệt'
                              : selectedVehicle.status === 'rejected'
                                ? 'Đã từ chối'
                                : '-'
                        }
                        disabled
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Trạng thái hoạt động</Label>
                      <Input
                        value={selectedVehicle.is_active ? 'Đang hoạt động' : 'Đã ngừng'}
                        disabled
                        readOnly
                        className="bg-muted"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Thông tin hệ thống</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedVehicle.created_at && (
                      <div className="space-y-2">
                        <Label>Ngày tạo</Label>
                        <Input
                          value={new Date(selectedVehicle.created_at).toLocaleString('vi-VN', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                          disabled
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    )}
                    {selectedVehicle.updated_at && (
                      <div className="space-y-2">
                        <Label>Cập nhật lần cuối</Label>
                        <Input
                          value={new Date(selectedVehicle.updated_at).toLocaleString('vi-VN', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                          disabled
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => fetchVehicleDetail(selectedVehicle.id)}>
                    Làm mới
                  </Button>
                  <Button onClick={handleUpdateVehicleDetail}>Lưu thay đổi</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Không có dữ liệu</div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
