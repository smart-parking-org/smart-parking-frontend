import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';

interface Resident {
  id: string;
  name: string;
  apartment: string;
  vehicles: string[];
  violations: number;
}

const DATA: Resident[] = [
  { id: 'R001', name: 'Nguyễn Văn A', apartment: 'A-1205', vehicles: ['43A-123.45'], violations: 0 },
  { id: 'R002', name: 'Trần Thị B', apartment: 'B-0902', vehicles: ['43B-888.88', '43D-222.11'], violations: 2 },
  { id: 'R003', name: 'Lê C', apartment: 'C-0507', vehicles: ['43C-777.66'], violations: 1 },
  { id: 'R004', name: 'Phạm D', apartment: 'A-0303', vehicles: ['43E-999.00'], violations: 0 },
];

export default function Residents() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DATA;
    return DATA.filter((r) => [r.name, r.apartment, r.id, ...r.vehicles].some((v) => v.toLowerCase().includes(q)));
  }, [query]);

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
              placeholder="Tìm tên, căn hộ, biển số..."
              className="pl-8 w-72"
            />
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mã</TableHead>
                <TableHead>Họ tên</TableHead>
                <TableHead>Căn hộ</TableHead>
                <TableHead>Phương tiện</TableHead>
                <TableHead className="text-right">Vi phạm</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.id}</TableCell>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.apartment}</TableCell>
                  <TableCell className="space-x-1">
                    {r.vehicles.map((v) => (
                      <Badge key={v} variant="secondary">
                        {v}
                      </Badge>
                    ))}
                  </TableCell>
                  <TableCell className="text-right">
                    {r.violations > 0 ? (
                      <Badge variant="destructive">{r.violations}</Badge>
                    ) : (
                      <Badge variant="outline">0</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
