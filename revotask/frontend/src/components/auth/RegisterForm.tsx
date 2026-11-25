"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput } from "@/components/shared/BaseInput";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { isApiError } from "@/lib/errors";
import { validateRegister, type RegisterValues } from "@/lib/validation";

type Errors = Partial<Record<keyof RegisterValues, string>>;
const empty: RegisterValues = { name: "", email: "", password: "", confirm: "" };

export function RegisterForm() {
  const router = useRouter();
  const { api } = useAuth();
  const handleError = useErrorHandler();
  const [values, setValues] = useState<RegisterValues>(empty);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const update = (field: keyof RegisterValues) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setValues((current) => ({ ...current, [field]: event.target.value }));

  // Validate one field on blur so users get feedback before submitting (FE-08).
  const validateField = (field: keyof RegisterValues) => () =>
    setErrors((current) => ({ ...current, [field]: validateRegister(values)[field] }));

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = validateRegister(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setSubmitting(true);
    try {
      await api.auth.register({ name: values.name.trim(), email: values.email.trim(), password: values.password });
      router.push("/login?registered=1");
    } catch (error) {
      if (isApiError(error) && error.statusCode === 409) setErrors({ email: error.message });
      else if (isApiError(error) && error.details) {
        setErrors(Object.fromEntries(Object.entries(error.details).map(([k, v]) => [k, v[0]])) as Errors);
      } else handleError(error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <BaseInput label="Name" autoComplete="name" value={values.name} onChange={update("name")} onBlur={validateField("name")} error={errors.name} required />
      <BaseInput label="Email" type="email" autoComplete="email" value={values.email} onChange={update("email")} onBlur={validateField("email")} error={errors.email} required />
      <BaseInput label="Password" type="password" autoComplete="new-password" value={values.password} onChange={update("password")} onBlur={validateField("password")} error={errors.password} hint="At least 8 characters with a letter and a number." required />
      <BaseInput label="Confirm password" type="password" autoComplete="new-password" value={values.confirm} onChange={update("confirm")} onBlur={validateField("confirm")} error={errors.confirm} required />
      <BaseButton type="submit" disabled={submitting}>
        {submitting ? "Creating account…" : "Create account"}
      </BaseButton>
      <p className="text-sm">
        Already registered?{" "}
        <Link href="/login" className="font-bold underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
