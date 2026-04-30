// app/(auth)/login/page.tsx
// Pagina de login standalone.

import { LoginForm } from '@/components/auth/LoginForm';

export const metadata = {
  title: 'Iniciar sesion - GCX Dashboard',
};

export default function LoginPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0f172a' }}
    >
      <div
        className="w-full max-w-sm px-8 py-10 bg-white shadow-2xl"
        style={{ borderRadius: 16 }}
      >
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#07185d', fontFamily: 'Inter, system-ui, sans-serif' }}
          >
            GCX Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Acceso a informacion financiera corporativa
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
