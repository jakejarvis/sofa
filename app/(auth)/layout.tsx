import { Suspense } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <Suspense>{children}</Suspense>
      </div>
    </main>
  );
}
