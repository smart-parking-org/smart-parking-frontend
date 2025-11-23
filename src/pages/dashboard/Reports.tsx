import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { CartesianGrid, Bar, BarChart, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RefreshCw, TrendingUp, Users, DollarSign, Car } from 'lucide-react';
import { StatCard } from '@/components/StatCard';
import {
  getRevenueReportNew,
  type RevenueReportData,
} from '@/services/reportApi';
import { reservationApi } from '@/config/axios';

export default function Reports() {
  const [reportData, setReportData] = useState<RevenueReportData | null>(null);
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
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await getRevenueReportNew(params);
      setReportData(data);
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

  // Tính tỷ lệ phần trăm cho usage
  const getUsagePercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return ((value / total) * 100).toFixed(1);
  };

  // Màu sắc cho biểu đồ usage
  const USAGE_COLORS = {
    confirmed: 'hsl(217, 91%, 60%)', // Blue
    checked_in: 'hsl(142, 76%, 36%)', // Green
    checked_out: 'hsl(262, 83%, 58%)', // Purple
    cancelled: 'hsl(25, 95%, 53%)', // Orange
    expired: 'hsl(0, 84%, 60%)', // Red
  };

  // Màu sắc cho biểu đồ revenue
  const REVENUE_COLORS = {
    parking_revenue: 'hsl(217, 91%, 60%)', // Blue
    monthly_pass_revenue: 'hsl(142, 76%, 36%)', // Green
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden px-2 sm:px-4 py-4 space-y-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Báo cáo & Phân tích</h1>
            <p className="text-sm text-muted-foreground mt-1">Doanh thu và chỉ số sử dụng bãi đỗ xe</p>
          </div>
          <Button onClick={fetchReports} disabled={loading} variant="outline" size="sm" className="flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
        </div>

        {/* Compact Filters */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-muted-foreground">Bộ lọc</label>
          <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg border bg-muted/30">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Bãi đỗ xe</Label>
              <Select
                value={parkingLotId?.toString() || 'all'}
                onValueChange={(value) => setParkingLotId(value === 'all' ? undefined : parseInt(value))}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
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
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Từ ngày</Label>
              <Input 
                type="date" 
                value={dateFrom} 
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px] h-8 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">Đến ngày</Label>
              <Input 
                type="date" 
                value={dateTo} 
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px] h-8 text-xs"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {reportData && (
        <>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/20 dark:to-emerald-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(reportData.revenue.total_revenue)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Tổng doanh thu</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/20 dark:to-blue-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-400">
                  {formatCurrency(reportData.revenue.parking_revenue)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Doanh thu đỗ xe</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/20 dark:to-green-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="text-xl font-bold text-green-700 dark:text-green-400">
                  {formatCurrency(reportData.revenue.monthly_pass_revenue)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Doanh thu thẻ tháng</div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500 bg-gradient-to-br from-purple-50 to-purple-100/50 dark:from-purple-950/20 dark:to-purple-900/10">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="text-xl font-bold text-purple-700 dark:text-purple-400">
                  {reportData.usage.total_reservations}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Tổng đặt chỗ</div>
              </CardContent>
            </Card>
          </div>

          {/* Usage Statistics */}
          <Card className="border-l-4 border-l-indigo-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thống kê sử dụng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/50 dark:to-slate-800/50 border border-slate-200 dark:border-slate-700">
                  <div className="text-xl sm:text-2xl font-bold text-slate-700 dark:text-slate-300">
                    {reportData.usage.total_reservations}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Tổng đặt chỗ</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/20 border-l-4 border-l-blue-500 shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {reportData.usage.confirmed}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Đã xác nhận</div>
                  <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    {getUsagePercentage(reportData.usage.confirmed, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/20 border-l-4 border-l-green-500 shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                    {reportData.usage.checked_in}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Đã vào</div>
                  <div className="text-[10px] font-semibold text-green-600 dark:text-green-400 mt-1">
                    {getUsagePercentage(reportData.usage.checked_in, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/20 border-l-4 border-l-purple-500 shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {reportData.usage.checked_out}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Đã ra</div>
                  <div className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mt-1">
                    {getUsagePercentage(reportData.usage.checked_out, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/20 border-l-4 border-l-orange-500 shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {reportData.usage.cancelled}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Đã hủy</div>
                  <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 mt-1">
                    {getUsagePercentage(reportData.usage.cancelled, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/30 dark:to-red-900/20 border-l-4 border-l-red-500 shadow-sm">
                  <div className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">
                    {reportData.usage.expired}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">Hết hạn</div>
                  <div className="text-[10px] font-semibold text-red-600 dark:text-red-400 mt-1">
                    {getUsagePercentage(reportData.usage.expired, reportData.usage.total_reservations)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

        </>
      )}

      {/* Charts */}
      {reportData && (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          <Card className="overflow-hidden border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Phân tích doanh thu</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="h-72 flex items-center justify-center text-muted-foreground">Đang tải...</div>
              ) : (
                <div className="w-full min-w-[300px]">
                  <ChartContainer
                    config={{
                      parking_revenue: { label: 'Doanh thu đỗ xe', color: REVENUE_COLORS.parking_revenue },
                      monthly_pass_revenue: { label: 'Doanh thu thẻ tháng', color: REVENUE_COLORS.monthly_pass_revenue },
                    }}
                    className="h-72 w-full"
                  >
                    <BarChart
                      data={[
                        {
                          name: 'Doanh thu',
                          parking_revenue: reportData.revenue.parking_revenue,
                          monthly_pass_revenue: reportData.revenue.monthly_pass_revenue,
                        },
                      ]}
                      margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => formatCurrency(value)}
                      />
                      <Bar dataKey="parking_revenue" fill={REVENUE_COLORS.parking_revenue} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="monthly_pass_revenue" fill={REVENUE_COLORS.monthly_pass_revenue} radius={[8, 8, 0, 0]} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-l-4 border-l-purple-500">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tỷ lệ trạng thái đặt chỗ</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="h-72 flex items-center justify-center text-muted-foreground">Đang tải...</div>
              ) : reportData.usage.total_reservations > 0 ? (
                <div className="w-full min-w-[300px] h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Đã xác nhận', value: reportData.usage.confirmed, color: USAGE_COLORS.confirmed },
                          { name: 'Đã vào', value: reportData.usage.checked_in, color: USAGE_COLORS.checked_in },
                          { name: 'Đã ra', value: reportData.usage.checked_out, color: USAGE_COLORS.checked_out },
                          { name: 'Đã hủy', value: reportData.usage.cancelled, color: USAGE_COLORS.cancelled },
                          { name: 'Hết hạn', value: reportData.usage.expired, color: USAGE_COLORS.expired },
                        ].filter((item) => item.value > 0)}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => {
                          if (percent < 0.05) return ''; // Ẩn label nếu quá nhỏ
                          return `${name}: ${(percent * 100).toFixed(1)}%`;
                        }}
                        outerRadius={90}
                        innerRadius={30}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {[
                          { name: 'Đã xác nhận', value: reportData.usage.confirmed, color: USAGE_COLORS.confirmed },
                          { name: 'Đã vào', value: reportData.usage.checked_in, color: USAGE_COLORS.checked_in },
                          { name: 'Đã ra', value: reportData.usage.checked_out, color: USAGE_COLORS.checked_out },
                          { name: 'Đã hủy', value: reportData.usage.cancelled, color: USAGE_COLORS.cancelled },
                          { name: 'Hết hạn', value: reportData.usage.expired, color: USAGE_COLORS.expired },
                        ]
                          .filter((item) => item.value > 0)
                          .map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                          ))}
                      </Pie>
                      <ChartTooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0];
                            const percentage = getUsagePercentage(data.value as number, reportData.usage.total_reservations);
                            return (
                              <div className="rounded-lg border bg-background p-2 shadow-sm">
                                <div className="grid gap-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ backgroundColor: data.payload.color }}
                                    />
                                    <span className="font-medium">{data.name}</span>
                                  </div>
                                  <div className="text-sm">
                                    <span className="font-semibold">{data.value}</span>
                                    <span className="text-muted-foreground"> ({percentage}%)</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        formatter={(value, entry: any) => (
                          <span style={{ color: entry.color, fontSize: '12px' }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-72 flex items-center justify-center text-muted-foreground">Không có dữ liệu</div>
              )}
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
