import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

const revenueData = [
  { month: 'Jan', revenue: 42 },
  { month: 'Feb', revenue: 51 },
  { month: 'Mar', revenue: 48 },
  { month: 'Apr', revenue: 61 },
  { month: 'May', revenue: 74 },
  { month: 'Jun', revenue: 69 },
];

const utilData = [
  { month: 'Jan', utilization: 62 },
  { month: 'Feb', utilization: 66 },
  { month: 'Mar', utilization: 64 },
  { month: 'Apr', utilization: 72 },
  { month: 'May', utilization: 78 },
  { month: 'Jun', utilization: 75 },
];

export default function Reports() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Báo cáo & Phân tích</h1>
        <p className="text-muted-foreground">Doanh thu, chỉ số sử dụng và xung đột.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Doanh thu theo tháng (triệu VND)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ revenue: { label: 'Doanh thu', color: 'hsl(var(--chart-1))' } }} className="h-72">
              <LineChart data={revenueData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tỷ lệ lấp đầy (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ utilization: { label: 'Lấp đầy', color: 'hsl(var(--chart-2))' } }}
              className="h-72"
            >
              <LineChart data={utilData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="utilization" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Xung đột & Sự cố gần đây</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Loại</TableHead>
                <TableHead>Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>2025-06-01 08:12</TableCell>
                <TableCell>Đặt chỗ chồng chéo</TableCell>
                <TableCell>B7 và B8 bị đặt trùng khung giờ</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2025-06-02 17:40</TableCell>
                <TableCell>Đỗ sai quy định</TableCell>
                <TableCell>Xe 43B-888.88 chắn lối C2</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>2025-06-03 10:05</TableCell>
                <TableCell>Quá thời hạn</TableCell>
                <TableCell>Đặt chỗ A5 quá hạn 20 phút</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
