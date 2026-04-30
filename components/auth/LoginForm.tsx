// components/auth/LoginForm.tsx
// Formulario cliente de login

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, User, Eye, EyeOff } from 'lucide-react';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesion');
        return;
      }
      router.push(redirect);
      router.refresh();
    } catch {
      setError('Error de red. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
          Usuario
        </label>
        <div className="relative">
          <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="username"
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            className="w-full pl-10 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#07185d] focus:border-transparent"
            placeholder="admin"
          />
        </div>
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
          Contraseña
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full pl-10 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#07185d] focus:border-transparent"
            placeholder="********"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600 border border-red-100">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-70"
        style={{ backgroundColor: '#07185d' }}
      >
        {loading ? 'Verificando...' : 'Iniciar sesion'}
      </button>
    </form>
  );
}
