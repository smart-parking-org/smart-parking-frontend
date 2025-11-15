import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import {
  getRevenueReport,
  getUtilizationReport,
  getReportSummary,
  getConflictsReport,
  getConflictsChartData,
  type RevenueData,
  type UtilizationData,
  type ReportSummary,
  type ConflictData,
  type ConflictChartData,
} from '@/services/reportApi';
import { reservationApi } from '@/config/axios';

export default function Reports() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [utilizationData, setUtilizationData] = useState<UtilizationData[]>([]);
  const [conflicts, setConflicts] = useState<ConflictData[]>([]);
  const [conflictsChartData, setConflictsChartData] = useState<ConflictChartData[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [parkingLotId, setParkingLotId] = useState<number | undefined>(undefined);
  const [parkingLots, setParkingLots] = useState<Array<{ id: number; name: string }>>([]);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    fetchParkingLots();
    fetchReports();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [parkingLotId, dateFrom, dateTo]);

  const fetchParkingLots = async () => {
    try {
      const res = await reservationApi.get('/parking-lots');
      setParkingLots(res.data.data || res.data || []);
    } catch (error) {
      console.error('Error fetching parking lots:', error);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (parkingLotId) params.parking_lot_id = parkingLotId;
      if (dateFrom) params.from_date = dateFrom;
      if (dateTo) params.to_date = dateTo;

      const [revenue, utilization, summaryData, conflictsData, conflictsChart] = await Promise.all([
        getRevenueReport(params),
        getUtilizationReport(params),
        getReportSummary(params),
        getConflictsReport({ ...params, per_page: 10 }),
        getConflictsChartData(params),
      ]);

      setRevenueData(revenue);
      setUtilizationData(utilization);
      setSummary(summaryData);
      setConflicts(conflictsData.data);
      setConflictsChartData(conflictsChart);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Báo cáo & Phân tích</h1>
          <p className="text-muted-foreground">Doanh thu và chỉ số sử dụng bãi đỗ xe.</p>
        </div>
        <Button onClick={fetchReports} disabled={loading} variant="outline" className="w-full sm:w-auto">
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Làm mới
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Bộ lọc</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Bãi đỗ xe</label>
              <Select
                value={parkingLotId?.toString() || 'all'}
                onValueChange={(value) => setParkingLotId(value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tất cả bãi đỗ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả bãi đỗ</SelectItem>
                  {parkingLots.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id.toString()}>
                      {lot.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Từ ngày</label>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Đến ngày</label>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {summary && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Tổng doanh thu"
            value={formatCurrency(summary.total_revenue)}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Tổng giao dịch"
            value={summary.total_payments.toString()}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Tỷ lệ sử dụng TB"
            value={`${summary.average_utilization.toFixed(1)}%`}
            icon={<Users className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="Xung đột đặt chỗ"
            value={summary.total_conflicts.toString()}
            icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />}
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Doanh thu theo tháng (triệu VND)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground">Đang tải...</div>
            ) : revenueData.length > 0 ? (
              <div className="w-full min-w-[300px]">
                <ChartContainer
                  config={{ revenue: { label: 'Doanh thu', color: 'hsl(var(--chart-1))' } }}
                  className="h-72 w-full"
                >
                  <LineChart data={revenueData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="revenue" stroke="var(--chart-1)" strokeWidth={2} dot={false} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">Không có dữ liệu</div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Tỷ lệ lấp đầy (%)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground">Đang tải...</div>
            ) : utilizationData.length > 0 ? (
              <div className="w-full min-w-[300px]">
                <ChartContainer
                  config={{ utilization: { label: 'Lấp đầy', color: 'hsl(var(--chart-2))' } }}
                  className="h-72 w-full"
                >
                  <LineChart data={utilizationData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="utilization" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">Không có dữ liệu</div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden md:col-span-2 xl:col-span-1">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Tỷ lệ xung đột theo tháng (%)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loading ? (
              <div className="h-72 flex items-center justify-center text-muted-foreground">Đang tải...</div>
            ) : conflictsChartData.length > 0 ? (
              <div className="w-full min-w-[300px]">
                <ChartContainer
                  config={{ conflict_rate: { label: 'Tỷ lệ xung đột', color: 'hsl(var(--chart-3))' } }}
                  className="h-72 w-full"
                >
                  <LineChart data={conflictsChartData} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} />
                    <YAxis tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="conflict_rate" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </LineChart>
                </ChartContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">Không có dữ liệu</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
