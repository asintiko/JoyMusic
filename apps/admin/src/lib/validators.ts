import { z } from "zod";

const emailSchema = z.email();

export function isEmail(value: string): boolean {
  return emailSchema.safeParse(value.trim()).success;
}

export type FieldError = "required" | "email" | "passwordShort" | "tooShort" | "tooLong" | null;

export function validateEmail(value: string): FieldError {
  if (!value.trim()) return "required";
  return isEmail(value) ? null : "email";
}

export function validatePassword(value: string, min = 8): FieldError {
  if (!value) return "required";
  return value.length < min ? "passwordShort" : null;
}

export function validateText(value: string, min: number, max: number): FieldError {
  const length = value.trim().length;
  if (length === 0) return "required";
  if (length < min) return "tooShort";
  if (length > max) return "tooLong";
  return null;
}

export function validateUrl(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
