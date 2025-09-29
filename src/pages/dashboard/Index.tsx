import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Line, LineChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { DollarSign, TrendingUp, Car, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';

const chartData = [
  { month: 'Jan', occupancy: 62, entries: 210 },
  { month: 'Feb', occupancy: 66, entries: 230 },
  { month: 'Mar', occupancy: 64, entries: 245 },
  { month: 'Apr', occupancy: 72, entries: 280 },
  { month: 'May', occupancy: 78, entries: 320 },
  { month: 'Jun', occupancy: 75, entries: 305 },
];

export default function Index() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bảng điều khiển</h1>
        <p className="text-muted-foreground mt-1">Tổng quan vận hành bãi đỗ xe.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Tỷ lệ lấp đầy"
          value="72%"
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          change="+3% so với hôm qua"
        />
        <StatCard
          title="Doanh thu hôm nay"
          value="12.5 triệu"
          icon={<DollarSign className="h-4 w-4 text-primary" />}
          change="+12%"
        />
        <StatCard title="Lượt vào hôm nay" value="312" icon={<Car className="h-4 w-4 text-primary" />} change="+5%" />
        <StatCard
          title="Xung đột"
          value="3"
          icon={<AlertTriangle className="h-4 w-4 text-primary" />}
          change="Cần xử lý"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lưu lượng & Lấp đầy</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                occupancy: { label: 'Lấp đầy (%)', color: 'hsl(var(--chart-1))' },
                entries: { label: 'Lượt vào', color: 'hsl(var(--chart-2))' },
              }}
              className="h-72"
            >
              <LineChart data={chartData} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="occupancy" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="entries" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                <ChartLegend content={<ChartLegendContent />} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vi phạm gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>5 vi phạm mới nhất</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Đối tượng</TableHead>
                  <TableHead className="text-right">Mô tả</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>08:12</TableCell>
                  <TableCell>43A-123.45</TableCell>
                  <TableCell className="text-right">Đỗ sai B3</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>10:05</TableCell>
                  <TableCell>A-1205</TableCell>
                  <TableCell className="text-right">Quá hạn 20 phút</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>14:20</TableCell>
                  <TableCell>43B-888.88</TableCell>
                  <TableCell className="text-right">Chắn lối C2</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>17:40</TableCell>
                  <TableCell>43C-777.66</TableCell>
                  <TableCell className="text-right">Không đăng ký</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>19:02</TableCell>
                  <TableCell>B-0902</TableCell>
                  <TableCell className="text-right">Đặt chỗ chồng chéo</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
