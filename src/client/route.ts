import { slugSchema, type Slug } from "../shared/slug";

export type View = "household" | "settings";

export type Route = { slug: Slug; view: View } | null;

export const routeFromPath = (pathname: string): Route => {
  const [first, second, ...rest] = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/");
  const slug = slugSchema.safeParse(first);
  if (!slug.success || rest.length > 0) return null;
  if (second === undefined) return { slug: slug.data, view: "household" };
  if (second === "settings") return { slug: slug.data, view: "settings" };
  return null;
};
