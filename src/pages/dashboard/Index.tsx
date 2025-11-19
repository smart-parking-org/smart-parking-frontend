import QRScanner from '@/components/QRScanner';
export default function Dashboard() {
  return (
    <div className="h-full w-full flex items-center justify-center overflow-auto p-3 sm:p-6">
      <QRScanner />
    </div>
  );
}
