import { slugSchema, type Slug } from "../shared/slug";

export type View = "household" | "settings" | "meal-bank";

export type Route = { slug: Slug; view: View } | null;

export const routeFromPath = (pathname: string): Route => {
  const [first, second, ...rest] = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/");
  const slug = slugSchema.safeParse(first);
  if (!slug.success || rest.length > 0) return null;
  if (second === undefined) return { slug: slug.data, view: "household" };
  if (second === "settings") return { slug: slug.data, view: "settings" };
  if (second === "meal-bank") return { slug: slug.data, view: "meal-bank" };
  return null;
};
