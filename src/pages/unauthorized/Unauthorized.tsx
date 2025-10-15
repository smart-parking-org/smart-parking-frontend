import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };
  return (
    <div>
      <h1>Bạn không có quyền truy cập!</h1>
      <Button onClick={handleLogout}>Thoát</Button>
    </div>
  );
}
