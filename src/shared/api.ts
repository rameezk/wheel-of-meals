export const notFound = {
  error: "not_found",
  message: "That link opens nothing here.",
} as const;

export const failure = {
  error: "failed",
  message: "Something went wrong. Try again.",
} as const;
