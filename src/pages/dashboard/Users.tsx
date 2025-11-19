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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role?: string;
  is_active: boolean;
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
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);
  const [trashed, setTrashed] = useState<string>('without');
  const perPage = 10;

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
  const [editPayload, setEditPayload] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'resident',
  });
  const roleOptions = [
    { label: 'Quản trị viên', value: 'admin' },
    { label: 'Nhân viên', value: 'staff' },
    { label: 'Cư dân', value: 'resident' },
  ];

  // --- Vehicles under detail (separate API) ---
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehPage, setVehPage] = useState(1);
  const vehLimit = 5; // Fixed limit for vehicles in detail modal
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
  }, [debouncedSearch]);

  // Fetch list when page/search/status change
  useEffect(() => {
    fetchUsers();
  }, [page, debouncedSearch, trashed]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: perPage, trashed };
      if (debouncedSearch) params.search = debouncedSearch;

      const res = await authApi.get('/users', {
        params,
      });

      const data = res.data.data || [];
      setUsers(data);
      const total = res.data.pagination?.total || res.data.total || data.length;
      setTotalPages(Math.max(1, Math.ceil(total / perPage)));
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
    } catch (err: any) {
      console.error('update User', err);
      alert(err.response?.data?.message || 'Không thể cập nhật');
    }
  };

  // --- Delete User (soft delete) ---
  const performDeleteUser = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa (xóa mềm) người dùng này?')) return;
    try {
      await authApi.delete(`/users/${id}`, {});
      alert('Đã xóa (xóa mềm)');
      if (selectedUser?.id === id) {
      setOpenDetail(false);
        setSelectedUser(null);
      }
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

  const handleToggleUserActive = async (user: User) => {
    const nextState = !user.is_active;
    if (
      !confirm(nextState ? 'Mở khóa tài khoản này?' : 'Khóa tài khoản này? Người dùng sẽ không thể đăng nhập.')
    )
      return;
    try {
      await authApi.patch(`/users/${user.id}`, {
        is_active: nextState,
      });
      alert(nextState ? 'Đã mở khóa tài khoản' : 'Đã khóa tài khoản');
      if (selectedUser?.id === user.id) {
        await fetchUserDetail(user.id);
      } else {
        fetchUsers();
      }
    } catch (err: any) {
      console.error('toggle active error', err);
      alert(err.response?.data?.message || 'Không thể cập nhật trạng thái');
    }
  };

  const handleRefreshAll = () => {
    fetchUsers();
    if (selectedUser) {
      fetchUserDetail(selectedUser.id);
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
                  <Label>Vai trò</Label>
                  <Select value={newUser.role} onValueChange={(v) => setNewUser({ ...newUser, role: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
        <div className="w-full space-y-3 rounded-xl border bg-muted/20 p-4">
          <div className="text-sm font-medium text-muted-foreground">Bộ lọc tìm kiếm</div>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1 min-w-[250px]">
              <Label className="text-sm text-muted-foreground">Từ khóa</Label>
              <div className="relative">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nhập tên, email hoặc số điện thoại..."
              className="pl-8"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              </div>
          </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground">Tình trạng tài khoản</Label>
          <Select value={trashed} onValueChange={setTrashed}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Tình trạng tài khoản" />
            </SelectTrigger>
            <SelectContent>
                  <SelectItem value="without">Đang hoạt động</SelectItem>
                  <SelectItem value="only">Đã bị xóa</SelectItem>
                  <SelectItem value="with">Bao gồm tất cả</SelectItem>
            </SelectContent>
          </Select>
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-sm text-muted-foreground"> </Label>
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
                    <TableHead>Họ tên</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Điện thoại</TableHead>
                    <TableHead>Vai trò</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Không tìm thấy người dùng
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedData.map((r) => (
                      <TableRow key={r.id} className="hover:bg-muted/50 transition">
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.email}</TableCell>
                        <TableCell>{r.phone}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              r.role === 'admin'
                                ? 'border-purple-200 text-purple-700 bg-purple-50'
                                : r.role === 'staff'
                                  ? 'border-blue-200 text-blue-700 bg-blue-50'
                                  : 'border-gray-200 text-gray-700 bg-gray-50'
                            }
                          >
                            {r.role === 'admin'
                              ? 'Quản trị viên'
                              : r.role === 'staff'
                                ? 'Nhân viên'
                                : r.role === 'resident'
                                  ? 'Cư dân'
                                  : '-'}
                          </Badge>
                        </TableCell>
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
                          ) : r.is_active ? (
                            <Badge className="bg-green-50 text-green-700">Còn hoạt động</Badge>
                          ) : (
                            <Badge className="bg-yellow-50 text-yellow-700">Đã khóa</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => fetchUserDetail(r.id)}
                            >
                              Chi tiết
                            </Button>
                            {!r.deleted_at && (
                              <Button
                                size="sm"
                                variant={r.is_active ? 'secondary' : 'default'}
                                onClick={() => handleToggleUserActive(r)}
                              >
                                {r.is_active ? 'Khóa' : 'Mở khóa'}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600"
                              onClick={() => performDeleteUser(r.id)}
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
            setSelectedUser(null);
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
            <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Thông tin cá nhân</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Họ tên *</Label>
                          <Input
                          id="name"
                            value={editPayload.name}
                            onChange={(e) => setEditPayload({ ...editPayload, name: e.target.value })}
                          placeholder="Nhập họ và tên"
                          />
                        </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                          <Input
                          id="email"
                          type="email"
                            value={editPayload.email}
                            onChange={(e) => setEditPayload({ ...editPayload, email: e.target.value })}
                          placeholder="Nhập địa chỉ email"
                          />
                        </div>
                      <div className="space-y-2">
                        <Label htmlFor="phone">Số điện thoại</Label>
                          <Input
                          id="phone"
                            value={editPayload.phone}
                            onChange={(e) => setEditPayload({ ...editPayload, phone: e.target.value })}
                          placeholder="Nhập số điện thoại"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="role">Vai trò</Label>
                    <Select
                          value={editPayload.role}
                          onValueChange={(v) => setEditPayload({ ...editPayload, role: v })}
                        >
                          <SelectTrigger id="role">
                            <SelectValue placeholder="Chọn vai trò" />
                      </SelectTrigger>
                      <SelectContent>
                            {roleOptions.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

                  <div className="border-t pt-4 space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Thông tin hệ thống</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Trạng thái tài khoản</Label>
                        <Input
                          value={selectedUser.is_active ? 'Đang hoạt động' : 'Đã bị khóa'}
                          disabled
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Ngày tạo</Label>
                        <Input
                          value={new Date(selectedUser.created_at).toLocaleString('vi-VN', {
                            dateStyle: 'long',
                            timeStyle: 'short',
                          })}
                          disabled
                          readOnly
                          className="bg-muted"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => fetchUserDetail(selectedUser.id)}>
                      Làm mới
                    </Button>
                    <Button onClick={handleUpdateUser}>Lưu thay đổi</Button>
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
