import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, Plus } from 'lucide-react';
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
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export default function Vehicles() {
  // list state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);

  // filters
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [vehIsActiveFilter, setVehIsActiveFilter] = useState<string>('all');
  const [vehUserFilter, setVehUserFilter] = useState<string>('all');
  const [vehTypeFilter, setVehTypeFilter] = useState('all');

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

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, vehIsActiveFilter, vehUserFilter, vehTypeFilter, limit]);

  // fetch data
  useEffect(() => {
    fetchVehicles();
  }, [page, limit, debouncedSearch, vehIsActiveFilter, vehUserFilter, vehTypeFilter]);

  useEffect(() => {
    fetchUsersForSelect();
  }, []);

  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit };
      if (debouncedSearch) params.search = debouncedSearch;
      if (vehIsActiveFilter !== 'all') params.is_active = vehIsActiveFilter === 'true';
      if (vehUserFilter !== 'all') params.user_id = vehUserFilter;
      if (vehTypeFilter !== 'all') params.vehicle_type = vehTypeFilter;

      const res = await authApi.get('/vehicles', { params });
      const data = res.data.data || [];
      setVehicles(data);

      const total = res.data.pagination?.total || res.data.total || data.length;
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
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
    setFormPayload({ license_plate: '', user_id: '', vehicle_type: 'motorbike', is_active: true });
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
      const payload = {
        license_plate: formPayload.license_plate,
        user_id: formPayload.user_id || null,
        vehicle_type: formPayload.vehicle_type,
        is_active: formPayload.is_active,
      };
      await authApi.post('/vehicles', payload);
      alert('Tạo phương tiện thành công');
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
        user_id: formPayload.user_id || null,
        vehicle_type: formPayload.vehicle_type,
        is_active: formPayload.is_active,
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

  const handleDeleteVehicle = async (v: Vehicle) => {
    if (!confirm('Bạn có chắc muốn xóa phương tiện này?')) return;
    try {
      await authApi.delete(`/vehicles/${v.id}`);
      alert('Đã xóa phương tiện');
      fetchVehicles();
    } catch (err) {
      console.error('delete vehicle', err);
      alert('Không thể xóa phương tiện');
    }
  };

  const handleToggleActive = async (v: Vehicle, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await authApi.post(`/vehicles/toggle-active/${v.id}`);
      fetchVehicles();
    } catch (err) {
      console.error('toggle active', err);
      alert('Không thể thay đổi trạng thái');
    }
  };

  const handleSetPrimary = async (id: number) => {
    if (!confirm('Xác nhận đặt phương tiện này làm xe chính?')) return;

    try {
      await authApi.post(`/vehicles/primary/${id}`);
      alert('Đã đặt phương tiện này làm xe chính');
      fetchVehicles();
    } catch (err: any) {
      console.error('handleSetPrimary', err);
      alert('Không thể đặt xe chính');
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
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên, biển số..."
              className="pl-8"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>

          <Select value={vehIsActiveFilter} onValueChange={(v) => setVehIsActiveFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="true">Hoạt động</SelectItem>
              <SelectItem value="false">Ngừng</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Label>Loại xe</Label>
            <Select value={vehTypeFilter} onValueChange={setVehTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tất cả loại xe" />
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

          <Select value={vehUserFilter} onValueChange={(v) => setVehUserFilter(v)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Người dùng" />
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

          <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 / trang</SelectItem>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="20">20 / trang</SelectItem>
            </SelectContent>
          </Select>
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
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Thao tác</TableHead>
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
                      <TableRow
                        key={v.id}
                        className="cursor-pointer hover:bg-muted/50 transition"
                        onClick={() => openEditForm(v)}
                      >
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
                          {v.is_active ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200">Hoạt động</Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-700 border-red-200">Ngừng</Badge>
                          )}
                        </TableCell>
                        <TableCell className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleActive(v, e);
                            }}
                          >
                            {v.is_active ? 'Tắt' : 'Bật'}
                          </Button>

                          {v.is_primary ? (
                            <Button size="sm" disabled>
                              Xe chính
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetPrimary(v.id);
                              }}
                            >
                              Đặt chính
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteVehicle(v);
                            }}
                          >
                            Xóa
                          </Button>
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
    </Card>
  );
}
