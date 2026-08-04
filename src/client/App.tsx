import { useEffect, useState } from "react";
import { slugSchema, type Slug } from "../shared/slug";
import { HouseholdPage } from "./HouseholdPage";
import { LandingPage } from "./LandingPage";

type Route = { slug: Slug; settings: boolean } | null;

const routeFromPath = (pathname: string): Route => {
  const [first, second, ...rest] = pathname
    .replace(/^\/+|\/+$/g, "")
    .split("/");
  const slug = slugSchema.safeParse(first);
  if (!slug.success || rest.length > 0) return null;
  if (second === undefined) return { slug: slug.data, settings: false };
  if (second === "settings") return { slug: slug.data, settings: true };
  return null;
};

export const App = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const follow = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", follow);
    return () => window.removeEventListener("popstate", follow);
  }, []);

  const go = (path: string) => {
    window.history.pushState({}, "", path);
    setPathname(path);
  };

  const route = routeFromPath(pathname);

  return route ? (
    <HouseholdPage slug={route.slug} settings={route.settings} onGo={go} />
  ) : (
    <LandingPage onGo={go} />
  );
};
