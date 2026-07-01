// Auth validation schemas
import z from "zod";

export const PASSWORD_MIN = 8;

export const authSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("A valid email is required")
    .transform((val) => val.toLowerCase()),
  password: z.string().min(PASSWORD_MIN, `Password must be at least ${PASSWORD_MIN} characters`),
});

export type AuthInput = z.infer<typeof authSchema>;
