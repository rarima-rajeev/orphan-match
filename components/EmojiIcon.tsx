// Colourful emoji icon tiles used in tables on the How it works and Results pages.
export type Icon = { e: string; tone: string };

export function Head({ icon, children }: { icon: Icon; children: React.ReactNode }) {
  return <span className="col-head"><span className={`head-icon tone-${icon.tone}`} aria-hidden="true">{icon.e}</span>{children}</span>;
}

export function Label({ icon, children }: { icon: Icon; children: React.ReactNode }) {
  return <span className="metric-label"><span className={`metric-icon tone-${icon.tone}`} aria-hidden="true">{icon.e}</span>{children}</span>;
}
