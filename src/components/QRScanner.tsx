import { useState } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, CheckCircle2, XCircle, Loader2, LogIn, LogOut } from 'lucide-react';
import { reservationApi } from '@/config/axios';

export default function QRAdminScanner() {
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [typeScan, setTypeScan] = useState<'checkin' | 'checkout' | null>(null);

  const handleQRScanned = async (result: any) => {
    const qrCode = result?.[0]?.rawValue || result;

    if (!qrCode || isProcessing || !typeScan) return;

    setScannedCode(qrCode);
    setMessage(`Đã quét mã QR. Đang xử lý ${typeScan === 'checkin' ? 'check-in' : 'check-out'}...`);
    setIsProcessing(true);
    setIsScanning(false); // Tạm dừng quét

    try {
      if (qrCode) {
        if (typeScan === 'checkin') {
          const response = await reservationApi.post('/reservations/demo/check-in', {
            reservation_code: qrCode,
          });

          if (response.data.success) {
            setMessage('Check-in thành công!');
            setTimeout(() => {
              resetScanner();
            }, 2000);
          } else {
            throw new Error(response.data.message || 'Không thể check-in');
          }
        } else {
          const response = await reservationApi.post('/reservations/demo/check-out', {
            reservation_code: qrCode,
          });

          if (response.data.success) {
            setMessage('Check-out thành công!');
            setTimeout(() => {
              resetScanner();
            }, 2000);
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
  };

  const handleStartCheckIn = () => {
    setTypeScan('checkin');
    setIsScanning(true);
    setMessage('Đã chọn chế độ Check-in. Đưa mã QR vào khung để quét.');
  };

  const handleStartCheckOut = () => {
    setTypeScan('checkout');
    setIsScanning(true);
    setMessage('Đã chọn chế độ Check-out. Đưa mã QR vào khung để quét.');
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
              {isScanning && typeScan && (
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
              {/* Overlay khi chưa chọn chế độ */}
              {!typeScan && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
                  <div className="text-center text-white p-4">
                    <QrCode className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Chưa chọn chế độ quét</p>
                    <p className="text-sm opacity-75">Vui lòng chọn Check-in hoặc Check-out để bắt đầu</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hiển thị mã QR đã quét */}
          {scannedCode && (
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
          {typeScan && (
            <div className="flex gap-3 justify-center">
              {isScanning ? (
                <>
                  <Button onClick={handleManualStop} variant="destructive" size="lg">
                    <XCircle className="h-4 w-4 mr-2" />
                    Dừng quét
                  </Button>
                  <Button
                    onClick={() => {
                      setIsScanning(false);
                      setTypeScan(null);
                      setMessage('');
                    }}
                    variant="outline"
                    size="lg"
                  >
                    Đổi chế độ
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    setIsScanning(true);
                    setMessage(`Đã chọn chế độ ${typeScan === 'checkin' ? 'Check-in' : 'Check-out'}. Đưa mã QR vào khung để quét.`);
                  }}
                  disabled={isProcessing}
                  size="lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Tiếp tục quét
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
