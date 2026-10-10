// Grades and optimizes the licensed photos in assets/raw into AVIF + WebP under assets/images.
// Dark treatment = duotone from Bay BIM ink to a pale steel blue. Light treatment keeps the photo natural.
import sharp from "sharp";
import fs from "node:fs";

fs.mkdirSync("assets/images", { recursive: true });

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const INK = hex("#050f14");
const MID = hex("#2b5f8a");
const HIGH = hex("#bcd9f2");

async function duotone(buf, w, h) {
  const { data, info } = await sharp(buf).resize(w, h, { fit: "cover" }).greyscale().normalise().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(info.width * info.height * 3);
  for (let i = 0; i < info.width * info.height; i++) {
    const l = Math.pow(data[i] / 255, 1.15);
    const [a, b, t] = l < 0.55 ? [INK, MID, l / 0.55] : [MID, HIGH, (l - 0.55) / 0.45];
    for (let c = 0; c < 3; c++) out[i * 3 + c] = Math.round(a[c] + (b[c] - a[c]) * t);
  }
  return sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } });
}

async function save(img, name) {
  await img.clone().avif({ quality: 48, effort: 6 }).toFile(`assets/images/${name}.avif`);
  await img.clone().webp({ quality: 72 }).toFile(`assets/images/${name}.webp`);
  const a = fs.statSync(`assets/images/${name}.avif`).size;
  const w = fs.statSync(`assets/images/${name}.webp`).size;
  console.log(name, `avif ${(a / 1024) | 0} KB`, `webp ${(w / 1024) | 0} KB`);
}

// crop a landscape band out of a portrait photo
const band = (file, top, width, height) => sharp(`assets/raw/${file}.jpg`).extract({ left: 0, top, width: 2400, height: Math.round((2400 * height) / width) });

const jobs = [
  ["hero-glass", "glass-tower", 900, 2000, 1125, "dark"],
  ["panel-steel", "steel-crane", 1500, 1200, 900, "dark"],
  ["panel-glass", "glass-tower", 1700, 1200, 900, "dark"],
  ["panel-facade", "dusk-facade", 450, 1200, 900, "dark"],
  ["card-steel", "steel-crane", 1500, 640, 360, "dark"],
  ["card-glass", "glass-tower", 1700, 640, 360, "dark"],
  ["card-facade", "dusk-facade", 450, 640, 360, "dark"],
  ["light-crane", "steel-crane", 1250, 1400, 1100, "light"],
];

for (const [name, file, top, w, h, mode] of jobs) {
  const buf = await band(file, top, w, h).toBuffer();
  if (mode === "dark") await save(await duotone(buf, w, h), name);
  else await save(sharp(buf).resize(w, h).modulate({ saturation: 0.55 }), name);
}
