import { brandConfig } from "@/config/brand.config";

export function MapSection() {
  const mapSrc = brandConfig.integrations.googleMapsEmbed;

  if (!mapSrc) return null;

  return (
    <section className="py-20 bg-muted">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <iframe
          src={mapSrc}
          width="100%"
          height="400"
          className="rounded-lg border-0"
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title={`${brandConfig.business.name} location`}
        />
      </div>
    </section>
  );
}
