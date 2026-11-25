// Client-side validation is a convenience; the server stays authoritative (FE-08, BE-04).
export type FieldErrors<T extends string = string> = Partial<Record<T, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateName = (value: string): string | undefined => {
  const name = value.trim();
  if (!name) return "Name is required.";
  if (name.length > 100) return "Name must be 100 characters or fewer.";
};

export const validateEmail = (value: string): string | undefined => {
  const email = value.trim();
  if (!email) return "Email is required.";
  if (!EMAIL.test(email)) return "Enter a valid email address.";
  if (email.length > 255) return "Email must be 255 characters or fewer.";
};

export const validatePassword = (value: string): string | undefined => {
  if (value.length < 8) return "Password must be at least 8 characters.";
  if (value.length > 128) return "Password must be 128 characters or fewer.";
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return "Password needs at least one letter and one number.";
};

export const validateRequired = (label: string, max: number) => (value: string) => {
  const text = value.trim();
  if (!text) return `${label} is required.`;
  if (text.length > max) return `${label} must be ${max} characters or fewer.`;
};

export type RegisterValues = { name: string; email: string; password: string; confirm: string };

export function validateRegister(values: RegisterValues): FieldErrors<keyof RegisterValues> {
  const errors: FieldErrors<keyof RegisterValues> = {
    name: validateName(values.name),
    email: validateEmail(values.email),
    password: validatePassword(values.password),
    confirm: values.confirm === values.password ? undefined : "Passwords do not match.",
  };
  return Object.fromEntries(Object.entries(errors).filter(([, message]) => message)) as typeof errors;
}
