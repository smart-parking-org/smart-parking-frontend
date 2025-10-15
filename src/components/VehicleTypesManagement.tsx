import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Search } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { authApi } from '@/config/axios';

interface VehicleType {
  id: number;
  name: string;
  code: string;
  description: string;
  is_active: boolean;
}

export default function VehicleTypesManagement() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [isActive, setIsActive] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [vehicleTypes, setVehicleTypes] = useState<VehicleType[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (debouncedSearch !== search) return;
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchVehicleTypes();
  }, [page, limit, debouncedSearch, isActive]);

  const fetchVehicleTypes = async () => {
    try {
      setLoading(true);

      const params: any = {
        page,
        limit,
      };

      if (debouncedSearch) {
        params.search = debouncedSearch;
      }

      if (isActive !== 'all') {
        params.is_active = isActive === 'true';
      }

      const res = await authApi.get('/vehicle-types', {
        params,
      });

      const data = res.data.data || [];
      setVehicleTypes(data);

      const total = res.data.pagination?.total || res.data.total || data.length;
      setTotalPages(Math.ceil(total / limit));
    } catch (error) {
      console.error('Failed to fetch vehicle types:', error);
    } finally {
      setLoading(false);
    }
  };

  const pagedData = useMemo(() => {
    return vehicleTypes;
  }, [vehicleTypes]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3">
        <CardTitle>Danh sách loại phương tiện</CardTitle>
        <div className="flex gap-3 flex-wrap items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder="Tìm tên, mã loại xe..."
              className="pl-8"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
          <Select
            value={isActive}
            onValueChange={(value) => {
              setIsActive(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="true">Hoạt động</SelectItem>
              <SelectItem value="false">Ngừng hoạt động</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={limit.toString()}
            onValueChange={(value) => {
              setLimit(Number(value));
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / trang</SelectItem>
              <SelectItem value="20">20 / trang</SelectItem>
              <SelectItem value="50">50 / trang</SelectItem>
              <SelectItem value="100">100 / trang</SelectItem>
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
                    <TableHead>Tên phương tiện</TableHead>
                    <TableHead>Mã phương tiện</TableHead>
                    <TableHead>Mô tả</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        Không tìm thấy!
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedData.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell>{r.code}</TableCell>
                        <TableCell>{r.description}</TableCell>
                        <TableCell>
                          {r.is_active ? (
                            <Badge className="bg-green-50 text-green-700 border-green-200">Hoạt động</Badge>
                          ) : (
                            <Badge className="bg-red-50 text-red-700 border-red-200">Ngừng</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right"></TableCell>
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
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              >
                ←
              </Button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPage(p)}
                  className={p === page ? 'bg-primary text-white' : ''}
                >
                  {p}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
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
