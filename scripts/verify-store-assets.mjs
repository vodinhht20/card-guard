import { readFile, readdir } from "node:fs/promises";
const root = "release/store-assets";
async function png(path, width, height, alpha = false) {
  const data = await readFile(path);
  if (
    data.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    data.readUInt32BE(16) !== width ||
    data.readUInt32BE(20) !== height ||
    data[24] !== 8 ||
    data[25] !== (alpha ? 6 : 2)
  )
    throw new Error(`Invalid store PNG: ${path}`);
}
for (const lang of ["vi", "en"]) {
  const screenshots = (await readdir(`${root}/${lang}`)).filter((name) =>
    /^\d\d-.+-1280x800\.png$/.test(name),
  );
  if (screenshots.length !== 5)
    throw new Error(`Expected 5 ${lang} screenshots`);
  for (const file of screenshots)
    await png(`${root}/${lang}/${file}`, 1280, 800);
  await png(`${root}/${lang}/promo-440x280.png`, 440, 280);
  await png(`${root}/${lang}/marquee-1400x560.png`, 1400, 560);
}
for (const size of [16, 32, 48, 128])
  await png(`${root}/icon${size}.png`, size, size, true);
console.log(
  "Store graphics verified: 10 RGB screenshots, 4 RGB promos/marquees, 4 RGBA icons at exact dimensions.",
);
