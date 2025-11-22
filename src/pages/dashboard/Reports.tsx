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

  // Màu sắc cho biểu đồ conflicts
  const CONFLICT_COLORS = {
    assigned: 'hsl(142, 76%, 36%)', // Green
    failed: 'hsl(0, 84%, 60%)', // Red
    pending: 'hsl(45, 93%, 47%)', // Yellow
  };

  // Màu sắc cho biểu đồ revenue
  const REVENUE_COLORS = {
    parking_revenue: 'hsl(217, 91%, 60%)', // Blue
    monthly_pass_revenue: 'hsl(142, 76%, 36%)', // Green
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
      {reportData && (
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Tổng doanh thu"
              value={formatCurrency(reportData.revenue.total_revenue)}
              icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Doanh thu đỗ xe"
              value={formatCurrency(reportData.revenue.parking_revenue)}
              icon={<Car className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Doanh thu thẻ tháng"
              value={formatCurrency(reportData.revenue.monthly_pass_revenue)}
              icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            />
            <StatCard
              title="Tổng đặt chỗ"
              value={reportData.usage.total_reservations.toString()}
              icon={<Users className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          {/* Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê sử dụng</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-2xl font-bold">{reportData.usage.total_reservations}</div>
                  <div className="text-sm text-muted-foreground">Tổng đặt chỗ</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {reportData.usage.confirmed}
                  </div>
                  <div className="text-sm text-muted-foreground">Đã xác nhận</div>
                  <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mt-1">
                    {getUsagePercentage(reportData.usage.confirmed, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {reportData.usage.checked_in}
                  </div>
                  <div className="text-sm text-muted-foreground">Đã vào</div>
                  <div className="text-xs font-semibold text-green-600 dark:text-green-400 mt-1">
                    {getUsagePercentage(reportData.usage.checked_in, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {reportData.usage.checked_out}
                  </div>
                  <div className="text-sm text-muted-foreground">Đã ra</div>
                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mt-1">
                    {getUsagePercentage(reportData.usage.checked_out, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {reportData.usage.cancelled}
                  </div>
                  <div className="text-sm text-muted-foreground">Đã hủy</div>
                  <div className="text-xs font-semibold text-orange-600 dark:text-orange-400 mt-1">
                    {getUsagePercentage(reportData.usage.cancelled, reportData.usage.total_reservations)}%
                  </div>
                </div>
                <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                    {reportData.usage.expired}
                  </div>
                  <div className="text-sm text-muted-foreground">Hết hạn</div>
                  <div className="text-xs font-semibold text-red-600 dark:text-red-400 mt-1">
                    {getUsagePercentage(reportData.usage.expired, reportData.usage.total_reservations)}%
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conflicts Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Thống kê xung đột</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{reportData.conflicts.total_requests}</div>
                  <div className="text-sm text-muted-foreground">Tổng yêu cầu</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{reportData.conflicts.assigned}</div>
                  <div className="text-sm text-muted-foreground">Đã gán</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{reportData.conflicts.failed}</div>
                  <div className="text-sm text-muted-foreground">Thất bại</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{reportData.conflicts.pending}</div>
                  <div className="text-sm text-muted-foreground">Đang chờ</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Charts */}
      {reportData && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Phân tích doanh thu</CardTitle>
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

          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Tỷ lệ trạng thái đặt chỗ</CardTitle>
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

          <Card className="overflow-hidden md:col-span-2">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Thống kê xung đột</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loading ? (
                <div className="h-72 flex items-center justify-center text-muted-foreground">Đang tải...</div>
              ) : (
                <div className="w-full min-w-[300px]">
                  <ChartContainer
                    config={{
                      assigned: { label: 'Đã gán', color: CONFLICT_COLORS.assigned },
                      failed: { label: 'Thất bại', color: CONFLICT_COLORS.failed },
                      pending: { label: 'Đang chờ', color: CONFLICT_COLORS.pending },
                    }}
                    className="h-72 w-full"
                  >
                    <BarChart
                      data={[
                        {
                          name: 'Xung đột',
                          assigned: reportData.conflicts.assigned,
                          failed: reportData.conflicts.failed,
                          pending: reportData.conflicts.pending,
                        },
                      ]}
                      margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                    >
                      <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar dataKey="assigned" fill={CONFLICT_COLORS.assigned} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="failed" fill={CONFLICT_COLORS.failed} radius={[8, 8, 0, 0]} />
                      <Bar dataKey="pending" fill={CONFLICT_COLORS.pending} radius={[8, 8, 0, 0]} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </BarChart>
                  </ChartContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Report Info */}
      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>Thông tin báo cáo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div>
                <div className="text-sm text-muted-foreground">Bãi đỗ xe</div>
                <div className="text-lg font-semibold">{reportData.parking_lot_name || 'Tất cả bãi đỗ'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Thời gian tạo báo cáo</div>
                <div className="text-lg font-semibold">
                  {new Date(reportData.generated_at).toLocaleString('vi-VN')}
                </div>
              </div>
              {reportData.date_from && (
                <div>
                  <div className="text-sm text-muted-foreground">Từ ngày</div>
                  <div className="text-lg font-semibold">
                    {new Date(reportData.date_from).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              )}
              {reportData.date_to && (
                <div>
                  <div className="text-sm text-muted-foreground">Đến ngày</div>
                  <div className="text-lg font-semibold">
                    {new Date(reportData.date_to).toLocaleDateString('vi-VN')}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
