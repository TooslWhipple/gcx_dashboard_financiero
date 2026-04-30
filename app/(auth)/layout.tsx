// app/(auth)/layout.tsx
// Layout publico para paginas de autenticacion (login). Sin AppShell.

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
