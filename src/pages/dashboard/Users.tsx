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
import { ScrollArea } from '@/components/ui/scroll-area';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  is_active: string;
  created_at: string;
  deleted_at?: string | null;
}

interface Vehicle {
  id: number;
  license_plate: string;
  vehicle_type: 'motorbike' | 'car_4_seat' | 'car_7_seat' | 'light_truck';
  is_active?: boolean;
  is_primary?: boolean;
}

export default function Users() {
  const [Users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [trashed, setTrashed] = useState<string>('without');

  // --- Create dialog state ---
  const [openCreate, setOpenCreate] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'resident',
  });

  // --- Detail dialog + edit state ---
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editPayload, setEditPayload] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'resident',
  });

  // --- Vehicles under detail (separate API) ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehPage, setVehPage] = useState(1);
  const [vehLimit, setVehLimit] = useState(5);
  const [vehTotalPages, setVehTotalPages] = useState(1);
  const [vehLoading, setVehLoading] = useState(false);
  const [vehIsActiveFilter, setVehIsActiveFilter] = useState<string>('all');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(t);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, limit]);

  // Fetch list when page/limit/search/status change
  useEffect(() => {
    fetchUsers();
  }, [page, limit, debouncedSearch, trashed]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit, trashed };
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await authApi.get('/users', {
        params,
      });

      const data = res.data.data || [];
      setUsers(data);
      const total = res.data.pagination?.total || res.data.total || data.length;
      setTotalPages(Math.max(1, Math.ceil(total / limit)));
    } catch (err) {
      console.error('fetchUsers error', err);
      // optionally show toast
    } finally {
      setLoading(false);
    }
  };

  // --- Create new User ---
  const handleCreateUser = async () => {
    try {
      if (!newUser.name || !newUser.email || !newUser.password) {
        alert('Vui lòng nhập tên, email và mật khẩu');
        return;
      }
      await authApi.post('/users', newUser, {});
      alert('Tạo người dùng thành công');
      setOpenCreate(false);
      setNewUser({ name: '', email: '', phone: '', password: '', role: 'resident' });
      fetchUsers();
    } catch (err: any) {
      console.error('create error', err);
      alert(err.response?.data?.message || 'Không thể tạo người dùng');
    }
  };

  // --- Fetch User detail ---
  const fetchUserDetail = async (id: number) => {
    try {
      setDetailLoading(true);
      const res = await authApi.get(`/users/${id}`, {});
      const d = res.data.data;
      setSelectedUser(d);
      // prepare edit payload
      setEditPayload({
        name: d.name || '',
        email: d.email || '',
        phone: d.phone || '',
        role: (d as any).role || 'resident',
      });
      setOpenDetail(true);
      // also fetch vehicles separately
      fetchVehiclesForUser(id, 1, vehLimit, vehIsActiveFilter);
    } catch (err) {
      console.error('fetchUserDetail', err);
      alert('Không thể tải chi tiết người dùng');
    } finally {
      setDetailLoading(false);
    }
  };

  // --- Vehicles for user (separate API) ---
  const fetchVehiclesForUser = async (userId: number, p = 1, l = 5, activeFilter = 'all') => {
    try {
      setVehLoading(true);
      const params: any = { page: p, limit: l, user_id: userId };
      if (activeFilter !== 'all') params.is_active = activeFilter === 'true';
      const res = await authApi.get('/vehicles', {
        params,
      });
      const data = res.data.data || [];
      setVehicles(data);
      const total = res.data.pagination?.total || res.data.total || data.length;
      setVehTotalPages(Math.max(1, Math.ceil(total / l)));
      setVehPage(p);
    } catch (err) {
      console.error('fetchVehiclesForUser', err);
      // ignore
    } finally {
      setVehLoading(false);
    }
  };

  // --- Update User (PATCH) ---
  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    try {
      await authApi.patch(`/users/${selectedUser.id}`, editPayload, {});
      alert('Cập nhật thành công');
      // reload detail + list
      await fetchUserDetail(selectedUser.id);
      fetchUsers();
      setEditMode(false);
    } catch (err: any) {
      console.error('update User', err);
      alert(err.response?.data?.message || 'Không thể cập nhật');
    }
  };

  // --- Delete User (soft delete) ---
  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    if (!confirm('Bạn có chắc muốn xóa (xóa mềm) người dùng này?')) return;
    try {
      await authApi.delete(`/users/${selectedUser.id}`, {});
      alert('Đã xóa (xóa mềm)');
      setOpenDetail(false);
      fetchUsers();
    } catch (err) {
      console.error('delete User', err);
      alert('Không thể xóa người dùng');
    }
  };

  // --- Restore User ---
  const handleRestoreUser = async (id: number) => {
    if (!confirm('Khôi phục người dùng này?')) return;
    try {
      await authApi.post(`/users/restore/${id}`, {}, {});
      alert('Đã khôi phục người dùng');
      fetchUsers(); // cập nhật lại danh sách
    } catch (err) {
      console.error('restore from list', err);
      alert('Không thể khôi phục người dùng');
    }
  };

  const pagedData = useMemo(() => Users, [Users]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <div className="flex justify-between items-center w-full">
          <CardTitle>Quản lý người dùng</CardTitle>

          {/* Create dialog */}
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Thêm người dùng
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Thêm người dùng mới</DialogTitle>
              </DialogHeader>

              <div className="grid gap-3 py-4">
                <div>
                  <Label>Họ và tên</Label>
                  <Input value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Số điện thoại</Label>
                  <Input value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
                </div>

                <div>
                  <Label>Mật khẩu</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button onClick={handleCreateUser}>Tạo</Button>
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
              placeholder="Tìm tên, email, sđt..."
              className="pl-8"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>

          <Select value={trashed} onValueChange={setTrashed}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trạng thái xóa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="without">Chưa xóa</SelectItem>
              <SelectItem value="only">Đã xóa mềm</SelectItem>
              <SelectItem value="with">Tất cả</SelectItem>
            </SelectContent>
          </Select>

          <Select value={limit.toString()} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 / trang</SelectItem>
              <SelectItem value="10">10 / trang</SelectItem>
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
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        Không tìm thấy người dùng
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedData.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer hover:bg-muted/50 transition"
                        onClick={() => fetchUserDetail(r.id)}
                      >
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell className="flex items-center gap-2">
                          {r.deleted_at ? (
                            <>
                              <Badge className="bg-red-50 text-red-700">Đã xóa</Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation(); // tránh mở dialog chi tiết
                                  handleRestoreUser(r.id);
                                }}
                              >
                                Khôi phục
                              </Button>
                            </>
                          ) : (
                            <Badge className="bg-green-50 text-green-700">Còn hoạt động</Badge>
                          )}
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
            setSelectedUser(null);
            setEditMode(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Chi tiết người dùng</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="text-center py-10 text-muted-foreground">Đang tải...</div>
          ) : selectedUser ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                {/* Info / Edit form */}
                {!editMode ? (
                  <div className="space-y-2">
                    <div>
                      <strong>Họ tên:</strong> {selectedUser.name}
                    </div>
                    <div>
                      <strong>Email:</strong> {selectedUser.email}
                    </div>
                    <div>
                      <strong>Điện thoại:</strong> {selectedUser.phone}
                    </div>
                    <div>
                      <strong>Ngày tạo:</strong> {new Date(selectedUser.created_at).toLocaleString()}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditMode(true);
                        }}
                      >
                        Sửa
                      </Button>
                      <Button size="sm" variant="destructive" onClick={handleDeleteUser}>
                        Xóa
                      </Button>
                      <Button size="sm" onClick={() => fetchUserDetail(selectedUser.id)}>
                        Làm mới
                      </Button>
                    </div>
                  </div>
                ) : (
                  // Edit form
                  <div className="space-y-3">
                    <div>
                      <Label>Họ tên</Label>
                      <Input
                        value={editPayload.name}
                        onChange={(e) => setEditPayload({ ...editPayload, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input
                        value={editPayload.email}
                        onChange={(e) => setEditPayload({ ...editPayload, email: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label>Số điện thoại</Label>
                      <Input
                        value={editPayload.phone}
                        onChange={(e) => setEditPayload({ ...editPayload, phone: e.target.value })}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleUpdateUser}>Lưu</Button>
                      <Button variant="outline" onClick={() => setEditMode(false)}>
                        Hủy
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Vehicles area */}
              <div>
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">Phương tiện</h4>
                  <div className="flex items-center gap-2">
                    <Select
                      value={vehIsActiveFilter}
                      onValueChange={(v) => {
                        setVehIsActiveFilter(v);
                        if (selectedUser) fetchVehiclesForUser(selectedUser.id, 1, vehLimit, v);
                      }}
                    >
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả</SelectItem>
                        <SelectItem value="true">Hoạt động</SelectItem>
                        <SelectItem value="false">Ngừng</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={vehLimit.toString()}
                      onValueChange={(v) => {
                        setVehLimit(Number(v));
                        if (selectedUser) fetchVehiclesForUser(selectedUser.id, 1, Number(v), vehIsActiveFilter);
                      }}
                    >
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
                </div>

                {vehLoading ? (
                  <div className="py-6 text-center text-muted-foreground">Đang tải phương tiện...</div>
                ) : vehicles.length === 0 ? (
                  <div className="py-6 text-center text-muted-foreground">Không có phương tiện</div>
                ) : (
                  <ScrollArea className="max-h-[50vh]">
                    <Table className="mt-2">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Biển số</TableHead>
                          <TableHead>Loại</TableHead>
                          <TableHead>Trạng thái</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vehicles
                          ?.slice() // sao chép mảng
                          .sort((a, b) => {
                            if (a.is_primary && !b.is_primary) return -1; // a là xe chính => lên đầu
                            if (!a.is_primary && b.is_primary) return 1; // b là xe chính => lên đầu
                            return 0; // giữ nguyên
                          })
                          .map((v) => (
                            <TableRow key={v.id}>
                              <TableCell>{v.license_plate}</TableCell>
                              <TableCell>
                                {v.vehicle_type === 'motorbike'
                                  ? 'Xe máy'
                                  : v.vehicle_type === 'car_4_seat'
                                    ? 'Xe 4 chỗ'
                                    : v.vehicle_type === 'car_7_seat'
                                      ? 'Xe 7 chỗ'
                                      : v.vehicle_type === 'light_truck'
                                        ? 'Xe tải nhẹ'
                                        : '-'}
                              </TableCell>
                              <TableCell>
                                {v.is_active ? (
                                  <Badge className="bg-green-50 text-green-700">Hoạt động</Badge>
                                ) : (
                                  <Badge className="bg-red-50 text-red-700">Ngừng</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                {v.is_primary ? <Badge className="bg-blue-50 text-blue-700">Xe chính</Badge> : ''}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}

                {/* Vehicles pagination */}
                <div className="flex items-center justify-center gap-2 mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={vehPage === 1}
                    onClick={() =>
                      selectedUser &&
                      fetchVehiclesForUser(selectedUser.id, Math.max(1, vehPage - 1), vehLimit, vehIsActiveFilter)
                    }
                  >
                    ←
                  </Button>
                  {Array.from({ length: vehTotalPages }, (_, i) => i + 1).map((p) => (
                    <Button
                      key={p}
                      variant={p === vehPage ? 'default' : 'outline'}
                      size="sm"
                      onClick={() =>
                        selectedUser && fetchVehiclesForUser(selectedUser.id, p, vehLimit, vehIsActiveFilter)
                      }
                    >
                      {p}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={vehPage === vehTotalPages}
                    onClick={() =>
                      selectedUser &&
                      fetchVehiclesForUser(
                        selectedUser.id,
                        Math.min(vehTotalPages, vehPage + 1),
                        vehLimit,
                        vehIsActiveFilter,
                      )
                    }
                  >
                    →
                  </Button>
                </div>
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
    </Card>
  );
}
