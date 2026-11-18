import { chromium } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CARDGUARD_CHROMIUM
    ? { executablePath: process.env.CARDGUARD_CHROMIUM }
    : {}),
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  const svg = await readFile("assets/icon.svg", "utf8");
  for (const size of [16, 32, 48, 128]) {
    // Toolbar icons use the full canvas; the store icon retains its outer margin.
    const artwork =
      size === 128
        ? svg
        : svg.replace('viewBox="0 0 128 128"', 'viewBox="16 16 96 96"');
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:100vw;height:100vh}</style>${artwork}`,
    );
    await page.setViewportSize({ width: size, height: size });
    const png = await page.screenshot({
      path: `public/icon${size}.png`,
      omitBackground: true,
    });
    const bounds = await page.evaluate(
      async (data) => {
        const img = new Image();
        img.src = data;
        await img.decode();
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        const pixels = ctx.getImageData(0, 0, img.width, img.height).data;
        let left = img.width,
          right = -1;
        for (let y = 0; y < img.height; y++)
          for (let x = 0; x < img.width; x++)
            if (pixels[(y * img.width + x) * 4 + 3] > 128) {
              left = Math.min(left, x);
              right = Math.max(right, x);
            }
        return { left, right };
      },
      `data:image/png;base64,${png.toString("base64")}`,
    );
    const expectedMargin = size === 128 ? 16 : 0;
    if (
      bounds.left !== expectedMargin ||
      bounds.right !== size - expectedMargin - 1
    )
      throw new Error(
        `Icon ${size}px has unexpected artwork bounds: ${JSON.stringify(bounds)}`,
      );
  }
  await mkdir("release/store-assets", { recursive: true });
  console.log(
    "Local vector icon rendered: 16, 32, 48, 128px transparent PNGs.",
  );
} finally {
  await browser.close();
}
