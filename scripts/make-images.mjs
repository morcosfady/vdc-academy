// Grades and optimizes the licensed photos in assets/raw into AVIF + WebP under assets/images.
// One grade for every photo so they feel like one shoot: slightly desaturated, lifted blacks, cool shadows
// (toward ink), warm highlights (toward paper), consistent contrast. Run: node scripts/make-images.mjs
import sharp from "sharp";
import fs from "node:fs";

fs.mkdirSync("assets/images", { recursive: true });

const INK = [10, 29, 35];
const PAPER = [246, 238, 220];

async function grade(buf, w, h, position = "attention") {
  const { data, info } = await sharp(buf).resize(w, h, { fit: "cover", position }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const r = data[i * 3] / 255, g = data[i * 3 + 1] / 255, b = data[i * 3 + 2] / 255;
    const l = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const ws = Math.pow(1 - l, 2) * 0.22; // shadows lean to ink
    const wh = Math.pow(l, 2) * 0.1; // highlights lean to paper
    const px = [r, g, b].map((c, k) => {
      let v = c * 0.74 + l * 0.26; // desaturate
      v = v + (v - 0.5) * 0.1; // gentle contrast
      v = 0.045 + v * 0.955; // lifted blacks
      v = v * (1 - ws) + (INK[k] / 255) * ws;
      v = v * (1 - wh) + (PAPER[k] / 255) * wh;
      return Math.round(Math.min(1, Math.max(0, v)) * 255);
    });
    out[i * 3] = px[0];
    out[i * 3 + 1] = px[1];
    out[i * 3 + 2] = px[2];
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } });
}

async function save(img, name, q = 50) {
  await img.clone().avif({ quality: q, effort: 6 }).toFile(`assets/images/${name}.avif`);
  await img.clone().webp({ quality: q <= 42 ? 54 : 72 }).toFile(`assets/images/${name}.webp`);
  const a = fs.statSync(`assets/images/${name}.avif`).size;
  const w = fs.statSync(`assets/images/${name}.webp`).size;
  console.log(name, `avif ${(a / 1024) | 0} KB`, `webp ${(w / 1024) | 0} KB`);
}

// [name, raw file, width, height, crop position]
const jobs = [
  ["site", "pexels/8961008", 1200, 1500, "centre"],
  ["grad", "pexels/8960944", 1200, 1500, "right"],
  ["team", "pexels/8470778", 1600, 1000, "left"],
  ["screen", "pexels/8961073", 1600, 900, "centre"],
  ["hero-glass", "glass-tower", 1800, 1013, "centre", 40],
  ["panel-steel", "steel-crane", 1200, 900, "centre"],
  ["panel-glass", "glass-tower", 1200, 900, "centre"],
  ["panel-facade", "dusk-facade", 1200, 900, "centre"],
  ["card-steel", "steel-crane", 960, 600, "centre"],
  ["card-glass", "glass-tower", 960, 600, "centre"],
  ["card-facade", "dusk-facade", 960, 600, "top"],
  ["light-crane", "steel-crane", 1400, 1100, "centre"],
];

for (const [name, file, w, h, pos, q] of jobs) {
  const src = fs.existsSync(`assets/raw/${file}.jpg`) ? `assets/raw/${file}.jpg` : null;
  if (!src) {
    console.log("skip", name, "(raw missing)");
    continue;
  }
  await save(await grade(fs.readFileSync(src), w, h, pos), name, q);
}
