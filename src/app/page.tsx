import { getSiteContent } from "@/lib/content";
import { Maintenance } from "@/components/site/Maintenance";
import { SiteJourney } from "@/components/site/SiteJourney";

/**
 * The public site: the 3D journey, or the "back soon" screen while
 * maintenance mode is on (you can still see the site at /preview).
 */
export default async function Home() {
  const site = await getSiteContent();
  if (site.journey.maintenance) return <Maintenance site={site} />;
  return <SiteJourney site={site} />;
}
