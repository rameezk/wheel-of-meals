import type { z } from "zod";

export const readBody = async (request: Request): Promise<unknown> => {
  try {
    return await request.json();
  } catch {
    return null;
  }
};

export const firstIssue = (error: z.ZodError, fallback: string) =>
  error.issues[0]?.message ?? fallback;
