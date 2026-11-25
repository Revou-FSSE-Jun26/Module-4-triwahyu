"use client";

import { useEffect, useState, type FormEvent } from "react";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseInput } from "@/components/shared/BaseInput";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { isApiError } from "@/lib/errors";
import { notify } from "@/lib/toast";
import { validateEmail, validateName } from "@/lib/validation";

/** Profile update form, pre-populated from AuthContext (REQ-USER-4). */
export function ProfileForm() {
  const { user, loading, api, setUser, logout } = useAuth();
  const handleError = useErrorHandler();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Pre-populate once the profile is available.
  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  if (loading || !user) return <p role="status">Loading your profile…</p>;

  const unchanged = name.trim() === user.name && email.trim().toLowerCase() === user.email;

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const found = { name: validateName(name), email: validateEmail(email) };
    setErrors(found);
    if (found.name || found.email) return;

    setSubmitting(true);
    try {
      setUser(await api.users.updateMe({ name: name.trim(), email: email.trim() }));
      notify.success("Profile updated.");
    } catch (error) {
      if (isApiError(error) && error.statusCode === 409) setErrors({ email: error.message });
      else handleError(error);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4">
      <BaseInput label="Name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} required />
      <BaseInput
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        hint="Your password can't be changed from this page."
        required
      />
      <div className="flex flex-wrap gap-3">
        <BaseButton type="submit" disabled={submitting || unchanged}>
          {submitting ? "Saving…" : "Save changes"}
        </BaseButton>
        <BaseButton variant="destructive" onClick={() => logout()}>
          Log out
        </BaseButton>
      </div>
    </form>
  );
}
