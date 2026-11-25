import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="mx-auto w-full max-w-md border-3 border-ink bg-paper p-5 shadow-hard-lg sm:p-8">
      <h1 className="mb-6 text-3xl font-black tracking-tight">Sign in</h1>
      {/* useSearchParams needs a Suspense boundary during static rendering */}
      <Suspense fallback={<p>Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
