"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput } from "@/components/shared/BaseInput";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { isApiError } from "@/lib/errors";
import { notify } from "@/lib/toast";
import { validateEmail } from "@/lib/validation";

/** Only same-site paths are allowed as a post-login destination (prevents open redirects). */
export function safeNext(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { api, token, login, logout } = useAuth();
  const handleError = useErrorHandler();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const expired = params.get("expired") === "1";
  const next = safeNext(params.get("next"));

  // An expired link clears the stale session; an existing valid session skips the form.
  useEffect(() => {
    if (expired) {
      logout({ redirect: false });
      notify.error("Your session has expired. Please sign in again.");
    } else if (token) router.replace(next);
  }, [expired, token, next, logout, router]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = { email: validateEmail(email), password: password ? undefined : "Password is required." };
    setErrors(found);
    if (found.email || found.password) return;

    setSubmitting(true);
    try {
      login(await api.auth.login({ email: email.trim(), password }));
      router.replace(next);
    } catch (error) {
      if (isApiError(error) && error.statusCode === 401) setErrors({ form: "Invalid email or password." });
      else handleError(error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {params.get("registered") === "1" ? (
        <p role="status" className="border-3 border-ink bg-tag p-3 text-sm font-bold">
          Account created. Sign in to continue.
        </p>
      ) : null}
      {errors.form ? (
        <p role="alert" className="border-3 border-danger p-3 text-sm font-bold text-danger">
          {errors.form}
        </p>
      ) : null}
      <BaseInput label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} required />
      <BaseInput label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} required />
      <BaseButton type="submit" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </BaseButton>
      <p className="text-sm">
        New to RevoTask?{" "}
        <Link href="/register" className="font-bold underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
