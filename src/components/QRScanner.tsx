import { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { QrCode, Camera, CheckCircle2, XCircle, Loader2, LogIn, LogOut, MapPin, Car, User, CreditCard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { reservationApi } from '@/config/axios';

interface ParkingLot {
  id: number;
  name: string;
  gate_pos_x: number;
  gate_pos_y: number;
}

interface Gate {
  id: number;
  parking_lot_id: number;
  gate_code: string;
  gate_type: string;
  position_x: number;
  position_y: number;
  is_active: boolean;
}

export default function QRAdminScanner() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [typeScan, setTypeScan] = useState<'checkin' | 'checkout' | null>(null);
  
  // Parking lot và gate states (chỉ dùng cho check-in)
  const [parkingLots, setParkingLots] = useState<ParkingLot[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [selectedParkingLotId, setSelectedParkingLotId] = useState<number | null>(null);
  const [selectedGateId, setSelectedGateId] = useState<number | null>(null);
  const [loadingLots, setLoadingLots] = useState(false);
  const [loadingGates, setLoadingGates] = useState(false);
  const [checkInData, setCheckInData] = useState<any>(null);
  const [checkOutData, setCheckOutData] = useState<any>(null);

  // Fetch parking lots
  useEffect(() => {
    const fetchParkingLots = async () => {
      try {
        setLoadingLots(true);
        const res = await reservationApi.get('/parking-lots');
        const data = Array.isArray(res.data) ? res.data : res.data.data || [];
        setParkingLots(data);
      } catch (err) {
        console.error('Lỗi tải danh sách bãi đỗ:', err);
        setMessage('Lỗi: Không thể tải danh sách bãi đỗ');
      } finally {
        setLoadingLots(false);
      }
    };

    fetchParkingLots();
  }, []);

  // Fetch gates when parking lot is selected
  useEffect(() => {
    const fetchGates = async () => {
      if (!selectedParkingLotId) {
        setGates([]);
        setSelectedGateId(null);
        return;
      }

      try {
        setLoadingGates(true);
        const res = await reservationApi.get(`/parking-lots/${selectedParkingLotId}/gates`);
        if (res.data.success) {
          setGates(res.data.data || []);
        } else {
          setGates([]);
        }
        setSelectedGateId(null); // Reset gate selection when parking lot changes
      } catch (err) {
        console.error('Lỗi tải danh sách cổng:', err);
        setMessage('Lỗi: Không thể tải danh sách cổng');
        setGates([]);
      } finally {
        setLoadingGates(false);
      }
    };

    fetchGates();
  }, [selectedParkingLotId]);

  const handleQRScanned = async (result: any) => {
    const qrCode = result?.[0]?.rawValue || result;

    if (!qrCode || isProcessing || !typeScan) return;

    // Kiểm tra điều kiện cho check-in
    if (typeScan === 'checkin' && (!selectedParkingLotId || !selectedGateId)) {
      setMessage('Lỗi: Vui lòng chọn bãi đỗ và cổng trước khi quét mã check-in');
      setIsScanning(false);
      return;
    }

    setScannedCode(qrCode);
    setMessage(`Đã quét mã QR. Đang xử lý ${typeScan === 'checkin' ? 'check-in' : 'check-out'}...`);
    setIsProcessing(true);
    setIsScanning(false); // Tạm dừng quét

    try {
      if (qrCode) {
        if (typeScan === 'checkin') {
          const response = await reservationApi.post('/reservations/demo/check-in', {
            reservation_code: qrCode,
            gate_id: selectedGateId,
          });

          if (response.data.success) {
            setMessage('Check-in thành công!');
            setCheckInData(response.data.data); // Lưu thông tin check-in
            // Không reset ngay, để hiển thị thông tin
          } else {
            throw new Error(response.data.message || 'Không thể check-in');
          }
        } else {
          const response = await reservationApi.post('/reservations/demo/check-out', {
            reservation_code: qrCode,
          });

          if (response.data.success) {
            const data = response.data.data;
            
            // ✅ Nếu cần xác nhận offline payment
            if (data.requires_confirmation && data.payment_method === 'offline') {
              setMessage(`Đã quét QR thành công. Số tiền: ${data.amount_formatted}. Vui lòng xác nhận thanh toán.`);
              setCheckOutData(data); // Lưu để hiển thị và xác nhận
            } else {
              setMessage('Check-out thành công!');
              setTimeout(() => {
                resetScanner();
              }, 2000);
            }
          } else {
            throw new Error(response.data.message || 'Không thể check-out');
          }
        }
      } else {
        throw new Error('Không thể xác định đặt chỗ từ mã QR');
      }
    } catch (err: any) {
      console.error('QR scan error:', err);
      const errorMessage = err.response?.data?.message || err.message || `Không thể thực hiện ${typeScan === 'checkin' ? 'check-in' : 'check-out'}`;
      setMessage(`Lỗi: ${errorMessage}`);

      setTimeout(() => {
        resetScanner();
      }, 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setScannedCode(null);
    setMessage('');
    setIsProcessing(false);
    setIsScanning(false);
    setTypeScan(null);
    setSelectedParkingLotId(null);
    setSelectedGateId(null);
    setGates([]);
    setCheckInData(null);
    setCheckOutData(null);
  };

  const handleConfirmOfflinePayment = async () => {
    if (!checkOutData) return;

    setIsProcessing(true);
    try {
      const response = await reservationApi.post('/reservations/demo/check-out/confirm', {
        reservation_code: checkOutData.reservation.reservation_code,
      });

      if (response.data.success) {
        setMessage('Xác nhận thanh toán thành công! Check-out đã hoàn tất.');
        setTimeout(() => {
          resetScanner();
        }, 2000);
      } else {
        throw new Error(response.data.message || 'Không thể xác nhận thanh toán');
      }
    } catch (err: any) {
      console.error('Confirm payment error:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Không thể xác nhận thanh toán';
      setMessage(`Lỗi: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getVehicleTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      motorbike: 'Xe máy',
      car_4_seat: 'Xe 4 chỗ',
      car_7_seat: 'Xe 7 chỗ',
      light_truck: 'Xe tải nhẹ',
    };
    return typeLabels[type] || type;
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('vi-VN');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const handleStartCheckIn = () => {
    setTypeScan('checkin');
    setIsScanning(false); // Chưa cho quét ngay, cần chọn bãi và cổng trước
    setMessage('Vui lòng chọn bãi đỗ và cổng trước khi quét mã check-in.');
  };

  const handleStartCheckOut = () => {
    setTypeScan('checkout');
    setIsScanning(true);
    setMessage('Đã chọn chế độ Check-out. Đưa mã QR vào khung để quét.');
  };

  const handleStartScanning = () => {
    if (typeScan === 'checkin') {
      if (!selectedParkingLotId || !selectedGateId) {
        setMessage('Lỗi: Vui lòng chọn bãi đỗ và cổng trước khi quét mã check-in');
        return;
      }
      setMessage(`Đã chọn chế độ Check-in. Đưa mã QR vào khung để quét.`);
    }
    setIsScanning(true);
  };

  const handleManualStop = () => {
    setIsScanning(false);
    setMessage('Đã dừng quét');
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <QrCode className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle>Quét mã QR Check-in/Check-out</CardTitle>
              <CardDescription>
                Chọn chế độ quét và sử dụng camera để quét mã QR code của khách hàng
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div
              className={`p-3 sm:p-4 rounded-lg flex items-start gap-3 ${
                message.includes('thành công')
                  ? 'bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-400 border border-green-200 dark:border-green-800'
                  : message.includes('Lỗi')
                    ? 'bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800'
                    : 'bg-blue-50 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
              }`}
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin shrink-0 mt-0.5" />
              ) : message.includes('thành công') ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              ) : message.includes('Lỗi') ? (
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <Camera className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <p className="text-sm flex-1">{message}</p>
            </div>
          )}
          {/* Vùng quét QR */}
          <div className="relative w-full max-w-[220px] sm:max-w-xs mx-auto">
            <div
              className="relative w-full aspect-square overflow-hidden rounded-xl border-4 shadow-lg"
              style={{ borderColor: 'hsl(var(--primary))' }}
            >
              {isScanning ? (
                <Scanner
                  onScan={(result) => handleQRScanned(result)}
                  classNames={{
                    container: 'w-full h-full',
                    video: 'w-full h-full object-cover',
                  }}
                  constraints={{
                    facingMode: 'environment',
                  }}
                />
              ) : (
                <div className="w-full h-full bg-black/50 flex items-center justify-center">
                  <div className="text-center text-white p-4">
                    <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Camera đã dừng</p>
                  </div>
                </div>
              )}

              {/* Overlay với hướng dẫn khi đang quét */}
              {isScanning && typeScan && (typeScan === 'checkout' || (typeScan === 'checkin' && selectedParkingLotId && selectedGateId)) && (
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-end items-center p-3 sm:p-5 bg-gradient-to-t from-black/70 via-transparent to-transparent">
                  <div className="text-center space-y-2">
                    <div className="w-48 h-48 border-2 border-white/30 rounded-lg mx-auto mb-4" />
                    <p className="text-white font-medium text-sm">
                      Đưa mã QR vào khung để quét {typeScan === 'checkin' ? 'Check-in' : 'Check-out'}
                    </p>
                    <p className="text-white/70 text-xs">Đảm bảo mã QR rõ ràng và đầy đủ trong khung</p>
                  </div>
                </div>
              )}
              {/* Overlay khi chưa chọn chế độ hoặc check-in chưa chọn đủ bãi/cổng */}
              {(!typeScan || (typeScan === 'checkin' && (!selectedParkingLotId || !selectedGateId))) && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="text-center text-white p-4">
                    <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    {!typeScan ? (
                      <>
                        <p className="text-lg font-medium mb-2">Chưa chọn chế độ quét</p>
                        <p className="text-sm opacity-75">Vui lòng chọn Check-in hoặc Check-out để bắt đầu</p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-medium mb-2">Chưa sẵn sàng quét</p>
                        <p className="text-sm opacity-75">Vui lòng chọn bãi đỗ và cổng trước khi quét</p>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chọn bãi đỗ và cổng (chỉ hiện khi check-in) */}
          {typeScan === 'checkin' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parking-lot">Chọn bãi đỗ *</Label>
                  <Select
                    value={selectedParkingLotId ? String(selectedParkingLotId) : ''}
                    onValueChange={(value) => setSelectedParkingLotId(Number(value))}
                    disabled={loadingLots || isProcessing}
                  >
                    <SelectTrigger id="parking-lot">
                      <SelectValue placeholder={loadingLots ? 'Đang tải...' : 'Chọn bãi đỗ'} />
                    </SelectTrigger>
                    <SelectContent>
                      {parkingLots.map((lot) => (
                        <SelectItem key={lot.id} value={String(lot.id)}>
                          {lot.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gate">Chọn cổng *</Label>
                  <Select
                    value={selectedGateId ? String(selectedGateId) : ''}
                    onValueChange={(value) => setSelectedGateId(Number(value))}
                    disabled={!selectedParkingLotId || loadingGates || isProcessing}
                  >
                    <SelectTrigger id="gate">
                      <SelectValue
                        placeholder={
                          !selectedParkingLotId
                            ? 'Chọn bãi đỗ trước'
                            : loadingGates
                              ? 'Đang tải...'
                              : 'Chọn cổng'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {gates.map((gate) => (
                        <SelectItem key={gate.id} value={String(gate.id)}>
                          {gate.gate_code} ({gate.gate_type === 'entrance' ? 'Vào' : gate.gate_type === 'exit' ? 'Ra' : 'Cả hai'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedParkingLotId && selectedGateId && !isScanning && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={handleStartScanning} disabled={isProcessing} size="lg">
                    <Camera className="h-4 w-4 mr-2" />
                    Bắt đầu quét Check-in
                  </Button>
                  <Button
                    onClick={() => {
                      setTypeScan(null);
                      setMessage('');
                      resetScanner();
                    }}
                    variant="outline"
                    size="lg"
                    disabled={isProcessing}
                  >
                    Đổi chế độ
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Hiển thị mã QR đã quét */}
          {scannedCode && !checkInData && (
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium mb-1">Mã QR đã quét:</p>
                    <p className="text-sm font-mono break-all bg-background p-2 rounded border">{scannedCode}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hiển thị thông tin check-in thành công */}
          {checkInData && checkInData.reservation && (
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <CardTitle className="text-green-800 dark:text-green-200">Check-in thành công!</CardTitle>
                    <CardDescription className="text-green-700 dark:text-green-300">
                      Thông tin đặt chỗ đã được cập nhật
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Mã đặt chỗ */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <CreditCard className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <Label className="text-sm font-semibold text-green-800 dark:text-green-200">Mã đặt chỗ</Label>
                  </div>
                  <p className="text-lg font-mono font-bold text-green-900 dark:text-green-100">
                    {checkInData.reservation.reservation_code}
                  </p>
                </div>

                <Separator />

                {/* Thông tin bãi đỗ và cổng */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <Label className="text-sm font-semibold">Bãi đỗ</Label>
                    </div>
                    <p className="text-base font-medium">{checkInData.parking_lot?.name || 'N/A'}</p>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-purple-600" />
                      <Label className="text-sm font-semibold">Cổng</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-medium">{checkInData.gate?.gate_code || 'N/A'}</p>
                      {checkInData.gate?.gate_type && (
                        <Badge variant="outline" className="text-xs">
                          {checkInData.gate.gate_type === 'entrance'
                            ? 'Vào'
                            : checkInData.gate.gate_type === 'exit'
                              ? 'Ra'
                              : 'Cả hai'}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Thông tin chỗ đỗ */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="h-5 w-5 text-orange-600" />
                    <Label className="text-sm font-semibold">Chỗ đỗ được phân bổ</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Mã chỗ đỗ</p>
                      <p className="text-lg font-bold">{checkInData.allocated_slot?.slot_code || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Loại xe</p>
                      <Badge variant="outline" className="text-sm">
                        {getVehicleTypeLabel(
                          checkInData.allocated_slot?.vehicle_type ||
                            checkInData.reservation.vehicle_snapshot?.vehicle_type ||
                            '',
                        )}
                      </Badge>
                    </div>
                    {checkInData.distance_from_gate_meters && (
                      <div className="col-span-2">
                        <p className="text-xs text-muted-foreground mb-1">Khoảng cách từ cổng</p>
                        <p className="text-sm font-medium">
                          {checkInData.distance_from_gate_meters.toFixed(2)} mét
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Thông tin xe */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="h-5 w-5 text-indigo-600" />
                    <Label className="text-sm font-semibold">Thông tin phương tiện</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Biển số</p>
                      <p className="text-base font-semibold">
                        {checkInData.reservation.vehicle_snapshot?.license_plate ||
                          checkInData.reservation.vehicle_snapshot?.plate ||
                          'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Loại xe</p>
                      <Badge variant="outline" className="text-sm">
                        {getVehicleTypeLabel(
                          checkInData.reservation.vehicle_snapshot?.vehicle_type || '',
                        )}
                      </Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Thông tin người dùng */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-5 w-5 text-teal-600" />
                    <Label className="text-sm font-semibold">Thông tin người đặt</Label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tên</p>
                      <p className="text-base font-medium">
                        {checkInData.reservation.user_snapshot?.name || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Số điện thoại</p>
                      <p className="text-base font-medium">
                        {checkInData.reservation.user_snapshot?.phone || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Email</p>
                      <p className="text-base font-medium">
                        {checkInData.reservation.user_snapshot?.email || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Thông tin thời gian */}
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Thời gian check-in</p>
                      <p className="text-sm font-medium">
                        {checkInData.reservation.check_in_at
                          ? formatDateTime(checkInData.reservation.check_in_at)
                          : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Thời gian kết thúc dự kiến</p>
                      <p className="text-sm font-medium">
                        {checkInData.reservation.end_time
                          ? formatDateTime(checkInData.reservation.end_time)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Nút đóng */}
                <div className="flex justify-end pt-2">
                  <Button onClick={resetScanner} variant="outline" size="sm">
                    Đóng
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Hiển thị thông tin thanh toán offline và nút xác nhận */}
          {checkOutData && checkOutData.requires_confirmation && (
            <Card className="mt-4 border-2 border-orange-200 dark:border-orange-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Xác nhận thanh toán offline
                </CardTitle>
                <CardDescription>
                  Vui lòng xác nhận đã nhận được tiền từ khách hàng
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mã đặt chỗ:</span>
                    <span className="font-medium font-mono">{checkOutData.reservation?.reservation_code}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Biển số xe:</span>
                    <span className="font-medium">
                      {checkOutData.reservation?.vehicle_snapshot?.license_plate || 'N/A'}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Số tiền cần thanh toán:</span>
                    <span className="text-2xl font-bold text-primary">{checkOutData.amount_formatted}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Trạng thái thanh toán:</span>
                    <Badge variant={checkOutData.payment_status === 'PAID' ? 'default' : 'secondary'}>
                      {checkOutData.payment_status === 'PAID' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                    </Badge>
                  </div>
                </div>
                <Separator />
                <div className="flex gap-2">
                  <Button
                    onClick={handleConfirmOfflinePayment}
                    className="flex-1"
                    disabled={isProcessing}
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang xử lý...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Xác nhận đã nhận tiền
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCheckOutData(null);
                      setMessage('');
                    }}
                    size="lg"
                    disabled={isProcessing}
                  >
                    Hủy
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Nút chọn chế độ quét */}
          {!typeScan && !isScanning && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button onClick={handleStartCheckIn} disabled={isProcessing} size="lg" className="flex-1 max-w-xs">
                <LogIn className="h-5 w-5 mr-2" />
                Quét Check-in
              </Button>
              <Button
                onClick={handleStartCheckOut}
                disabled={isProcessing}
                size="lg"
                variant="outline"
                className="flex-1 max-w-xs"
              >
                <LogOut className="h-5 w-5 mr-2" />
                Quét Check-out
              </Button>
            </div>
          )}

          {/* Nút điều khiển khi đang quét */}
          {typeScan && isScanning && (
            <div className="flex gap-3 justify-center">
              <Button onClick={handleManualStop} variant="destructive" size="lg">
                <XCircle className="h-4 w-4 mr-2" />
                Dừng quét
              </Button>
              <Button
                onClick={() => {
                  setIsScanning(false);
                  setTypeScan(null);
                  setMessage('');
                  resetScanner();
                }}
                variant="outline"
                size="lg"
              >
                Đổi chế độ
              </Button>
            </div>
          )}

          {/* Nút điều khiển cho check-out khi chưa quét */}
          {typeScan === 'checkout' && !isScanning && (
            <div className="flex gap-3 justify-center">
              <Button
                onClick={handleStartScanning}
                disabled={isProcessing}
                size="lg"
              >
                <Camera className="h-4 w-4 mr-2" />
                Bắt đầu quét Check-out
              </Button>
              <Button
                onClick={() => {
                  setTypeScan(null);
                  setMessage('');
                  resetScanner();
                }}
                variant="outline"
                size="lg"
              >
                Đổi chế độ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
