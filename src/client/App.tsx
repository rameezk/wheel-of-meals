import { useEffect, useState } from "react";
import type { Households } from "./households";
import { HouseholdPage } from "./HouseholdPage";
import { LandingPage } from "./LandingPage";
import { routeFromPath } from "./route";

type AppProps = { households: Households };

export const App = ({ households }: AppProps) => {
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
    <HouseholdPage
      slug={route.slug}
      view={route.view}
      onGo={go}
      households={households}
    />
  ) : (
    <LandingPage households={households} onGo={go} />
  );
};
