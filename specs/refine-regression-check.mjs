import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const fail = (message) => {
  throw new Error(message);
};

const fontsCss = read("src/styles/fonts.css");
const indexCss = read("src/styles/index.css");
const invitation = read("src/app/components/WeddingInvitation.tsx");
const gallery = read("src/app/components/wedding/GallerySection.tsx");

if (!existsSync(join(root, "src/imports/fonts/NotoSansThai-Variable.woff2"))) {
  fail("Noto Sans Thai font file is missing.");
}

if (!fontsCss.includes("font-family: 'Noto Sans Thai'")) {
  fail("fonts.css must declare Noto Sans Thai as its own family.");
}

if (!indexCss.includes("'TT Interphases', 'Noto Sans Thai', sans-serif")) {
  fail("Global font stack must include Noto Sans Thai after TT Interphases.");
}

if (invitation.includes('objectPosition: "bottom center"')) {
  fail("Hero desktop crop must not pin the image to bottom center.");
}

if (!gallery.includes("--stamp-notch") || !gallery.includes("inset 0 0 0 1px")) {
  fail("Gallery stamp edge should use the refined notch variables and inner border.");
}

console.log("refine regression checks passed");
