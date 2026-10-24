// Generates the site's illustrations with Gemini's image model and saves them as compressed webp.
// Run: npx tsx --env-file=.env.local scripts/make-images.ts [name ...]
import sharp from "sharp";

const MODEL = "gemini-3.1-flash-image";
const STYLE =
  "Warm, modern editorial illustration with soft grain and gentle gradients. Palette: soft peach, apricot, warm amber and honey gold, with a few deep brown accents. " +
  "Calm, hopeful, uncluttered. Absolutely no text, letters, numbers, labels, logos, brands or real drug packaging. No people's faces.";

const IMAGES: Record<string, { ratio: string; width: number; prompt: string }> = {
  hero: {
    ratio: "16:9",
    width: 1600,
    prompt:
      "A wooden apothecary shelf of plain, unlabeled vintage glass medicine bottles in soft shadow. One bottle on the right glows warm amber from within, " +
      "and thin golden threads of light flow out of it toward small, abstract floating shapes suggesting cells and proteins. " +
      "Keep the left 40% of the image calm and mostly empty soft peach (space for a headline).",
  },
  agent: {
    ratio: "16:9",
    width: 1400,
    prompt:
      "A small glowing amber lantern travelling along a dotted path on a hand-drawn explorer's map. The path branches toward four little buildings: " +
      "a library of books, a laboratory with flasks, an archive of filing drawers, and a shelf of plain medicine bottles. The dotted path loops back, " +
      "suggesting the traveller chooses where to go next. " +
      "The map is purely pictorial: no captions, no labels, no words, no compass letters anywhere.",
  },
  results: {
    ratio: "16:9",
    width: 1400,
    prompt:
      "An elegant hourglass on a desk. Instead of sand, tiny plain unlabeled medicine capsules and small curled pages of old research papers fall through it. " +
      "Soft morning light, a sense of looking back in time.",
  },
};

async function make(name: string) {
  const img = IMAGES[name];
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY! },
    body: JSON.stringify({
      contents: [{ parts: [{ text: `${img.prompt}\n\nStyle: ${STYLE}` }] }],
      generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: img.ratio } },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(data).slice(0, 300)}`);
  const part = data.candidates?.[0]?.content?.parts?.find((p: { inlineData?: unknown }) => p.inlineData);
  if (!part) throw new Error("no image returned");
  const out = `public/images/${name}.webp`;
  const info = await sharp(Buffer.from(part.inlineData.data, "base64")).resize({ width: img.width }).webp({ quality: 74 }).toFile(out);
  console.log(name, `${Math.round(info.size / 1024)} KB`, JSON.stringify(data.usageMetadata));
}

(async () => {
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(IMAGES);
  for (const n of names) await make(n).catch((e) => console.error(n, "failed:", e.message));
})();
