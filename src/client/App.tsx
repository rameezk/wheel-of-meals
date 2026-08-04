import { slugSchema, type Slug } from "../shared/slug";
import { HouseholdPage } from "./HouseholdPage";
import { LandingPage } from "./LandingPage";

const slugFromPath = (pathname: string): Slug | null => {
  const parsed = slugSchema.safeParse(pathname.replace(/^\/+|\/+$/g, ""));
  return parsed.success ? parsed.data : null;
};

export const App = () => {
  const slug = slugFromPath(window.location.pathname);

  return slug ? <HouseholdPage slug={slug} /> : <LandingPage />;
};
