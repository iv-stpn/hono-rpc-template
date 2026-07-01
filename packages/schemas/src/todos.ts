// Todo validation schemas
import z from "zod";

export const TITLE_MAX = 280;

export const todoTitleSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer`)
    .transform((val) => val.trim()),
});

export const todoUpdateSchema = z
  .object({
    title: z
      .string()
      .min(1, "Title must be a non-empty string")
      .max(TITLE_MAX, `Title must be ${TITLE_MAX} characters or fewer`)
      .transform((val) => val.trim())
      .optional(),
    done: z.boolean().optional(),
  })
  .refine((data) => data.title !== undefined || data.done !== undefined, {
    message: "Nothing to update",
  });
