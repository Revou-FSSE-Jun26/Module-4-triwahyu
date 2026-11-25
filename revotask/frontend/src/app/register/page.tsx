import type { Metadata } from "next";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = { title: "Create account" };

export default function RegisterPage() {
  return (
    <main className="mx-auto w-full max-w-md border-3 border-ink bg-paper p-5 shadow-hard-lg sm:p-8">
      <h1 className="mb-6 text-3xl font-black tracking-tight">
        Create your account
      </h1>
      <RegisterForm />
    </main>
  );
}
