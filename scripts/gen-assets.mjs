import sharp from "sharp";
import { mkdir } from "node:fs/promises";

const icons = [
  [512, "public/icons/icon-512.png"],
  [192, "public/icons/icon-192.png"],
  [180, "public/icons/apple-touch-icon.png"],
  [32, "src/app/icon.png"],
];

for (const [size, out] of icons) {
  await sharp("public/icons/icon-1024.png")
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(out);
}

await sharp("public/icons/icon-1024.png")
  .resize(512, 512)
  .flatten({ background: "#E8452C" })
  .png()
  .toFile("public/icons/icon-maskable-512.png");

const photos = {
  "public/images/burger.png": 900,
  "public/images/fries.png": 900,
  "public/images/chicken.png": 900,
  "public/images/pizza.png": 900,
  "public/images/tost.png": 900,
  "public/images/cola.png": 900,
  "public/images/dessert.png": 900,
  "public/images/avatar.png": 800,
  "public/images/banner.png": 1800,
};

for (const [file, width] of Object.entries(photos)) {
  const out = file.replace(/\.png$/, ".webp");
  await sharp(file).resize({ width, withoutEnlargement: true }).webp({ quality: 84 }).toFile(out);
}

await mkdir("public/og", { recursive: true });
await sharp("public/images/banner.png")
  .resize(1200, 630, { fit: "cover" })
  .jpeg({ quality: 88 })
  .toFile("public/og/cover.jpg");

console.log("assets generated");
