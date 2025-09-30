import { Button } from '@/components/ui/button';
import { authApi } from '@/config/axios';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router';

export default function Unauthorized() {
  const navigate = useNavigate();
  const { logout: logoutContext } = useAuth();
  async function logout() {
    try {
      await authApi.post(
        '/auth/logout',
        {},
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    } catch (error) {
      console.error(error);
    } finally {
      logoutContext();
      navigate('/login', { replace: true });
    }
  }
  return (
    <div>
      <h1>Bạn không có quyền truy cập!</h1>
      <Button
        onClick={() => {
          logout();
        }}
      >
        Thoát
      </Button>
    </div>
  );
}
