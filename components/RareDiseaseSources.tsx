// Footnote for the "about 7,000 rare diseases" figure, shown at the end of pages that use it.
const SOURCES = [
  { label: "NIH Record: Rare diseases are a public health issue (2021)", href: "https://nihrecord.nih.gov/2021/04/16/rare-diseases-are-public-health-issue" },
  { label: "NIH testimony to the US Congress", href: "https://www.nih.gov/node/2501" },
  { label: "Becker's Hospital Review: NIH center has brought 44 drugs for rare diseases to market", href: "https://beckershospitalreview.com/patient-safety-outcomes/this-nih-center-has-brought-44-drugs-for-rare-diseases-to-market-and-isnt-slowing-down.html" },
];

export function Star() {
  return <a href="#sources" className="star" aria-label="See sources">*</a>;
}

export function RareDiseaseSources() {
  return (
    <section id="sources" className="sources small muted">
      <p>
        <strong>* Sources:</strong> about 7,000 rare diseases are known, and only about 5% of them have an approved
        treatment, according to the US National Institutes of Health (NIH).
      </p>
      <ul>
        {SOURCES.map((s) => (
          <li key={s.href}><a href={s.href} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
        ))}
      </ul>
    </section>
  );
}
