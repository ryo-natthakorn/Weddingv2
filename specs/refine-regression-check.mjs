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
const sourceFiles = [
  "src/app/components/WeddingInvitation.tsx",
  "src/app/components/wedding/GallerySection.tsx",
  "src/app/components/wedding/GiftSection.tsx",
  "src/app/components/wedding/IntroAnimation.tsx",
  "src/app/components/wedding/LangToggle.tsx",
  "src/app/components/wedding/MusicPlayer.tsx",
  "src/app/components/wedding/NameIntroWithCountdown.tsx",
  "src/app/components/wedding/RSVPSection.tsx",
  "src/app/components/wedding/SongSection.tsx",
];

if (!existsSync(join(root, "src/imports/fonts/NotoSansThai-Variable.woff2"))) {
  fail("Noto Sans Thai font file is missing.");
}

if (!fontsCss.includes("font-family: 'Noto Sans Thai'")) {
  fail("fonts.css must declare Noto Sans Thai as its own family.");
}

if (!indexCss.includes("'TT Interphases', 'Noto Sans Thai', sans-serif")) {
  fail("Global font stack must include Noto Sans Thai after TT Interphases.");
}

const oldInlineStackFile = sourceFiles.find((path) =>
  read(path).includes("'TT Interphases', sans-serif"),
);
if (oldInlineStackFile) {
  fail(`${oldInlineStackFile} still hardcodes TT Interphases without Noto Sans Thai fallback.`);
}

if (invitation.includes('objectPosition: "bottom center"')) {
  fail("Hero desktop crop must not pin the image to bottom center.");
}

console.log("refine regression checks passed");
