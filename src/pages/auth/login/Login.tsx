import { useState } from 'react';
import { useNavigate } from 'react-router';

export default function Login() {
  const [email, setEmail] = useState('admin@gmail.com');
  const [password, setPassword] = useState('123456');
  const navigate = useNavigate();

  const handleSubmit = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    console.log('Login attempt:', { email, password });
    if (email === 'admin@gmail.com' && password === '123456') {
      navigate('/dashboard');
    } else {
      alert('Email hoặc mật khẩu không đúng');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-blue-300 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-blue-200 via-gray-50 to-blue-300 rounded-lg shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto flex flex-col items-center justify-center mb-4">
            <img src="../logo.svg" alt="" />
            <h1 className="text-2xl font-bold text-primary tracking-wide">SMART PARKING</h1>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <a href="#" className="text-xs text-primary hover:text-blue-800 hover:font-semibold">
                Forgot password?
              </a>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-blue-500 outline-none transition-colors"
              placeholder="Enter your password"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold text-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
