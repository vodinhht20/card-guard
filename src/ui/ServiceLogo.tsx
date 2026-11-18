import { findServicePreset } from "../core/serviceCatalog";
export function ServiceLogo({
  domain,
  name,
}: {
  domain: string;
  name: string;
}) {
  const preset = findServicePreset(domain);
  return (
    <span className="service-avatar" aria-hidden="true">
      {preset ? (
        <img src={`/services/${preset.id}.svg`} alt="" width="26" height="26" />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  );
}
