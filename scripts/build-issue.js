#!/usr/bin/env node
/* ============================================================================
   The Encrypted Chart - issue builder (runs inside GitHub Actions, no token).
   Reads issues/<NN>.json + the repo's pillar-template.html / index.html /
   sitemap.xml, regenerates the three deploy files in place. The workflow
   commits them as Brad Lieberman <brad@liebermancenter.com>.

   Usage:  node scripts/build-issue.js issues/12.json
   ========================================================================== */
const fs = require("fs");
const path = require("path");

const issueFile = process.argv[2];
if (!issueFile) { console.error("Usage: node scripts/build-issue.js issues/<NN>.json"); process.exit(1); }

const ROOT = process.cwd();
const read = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const write = (f, c) => fs.writeFileSync(path.join(ROOT, f), c);
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const D = JSON.parse(read(issueFile));
const NEW = {
  num: parseInt(D.issue_number, 10),
  slug: D.slug,
  date_human: D.date_human,
  lastmod: String(D.date_iso || "").slice(0, 10),
  read_time: D.read_time,
  title: D.title,
  deck: D.deck
};
if (!NEW.num || !NEW.slug) throw new Error("issue JSON missing issue_number or slug");

// ---- 1) pillar [slug].html -------------------------------------------------
const tokens = {
  TITLE: D.title, DECK: D.deck, SLUG: D.slug, ISSUE_NUMBER: String(NEW.num),
  KICKER_CATEGORY: D.kicker_category, DATE_HUMAN: D.date_human, DATE_ISO: D.date_iso,
  READ_TIME: D.read_time, ARTICLE_BODY: D.article_body_html, FOOTNOTES: D.footnotes_html
};
let pillar = read("pillar-template.html");
for (const [k, v] of Object.entries(tokens)) {
  pillar = pillar.replace(new RegExp("\\{\\{\\s*" + k + "\\s*\\}\\}", "g"), () => v);
}
const leftover = pillar.match(/\{\{\s*[A-Z_]+\s*\}\}/);
if (leftover) throw new Error("Unsubstituted token in pillar: " + leftover[0]);

// ---- 2) index.html (promote NEW, demote current latest) --------------------
const index = read("index.html");
const oldNum = parseInt(
  index.match(/<!-- LATEST_ISSUE_NUMBER_START -->([\s\S]*?)<!-- LATEST_ISSUE_NUMBER_END -->/)[1]
       .match(/Issue No\.\s*(\d+)/)[1], 10);
if (oldNum !== NEW.num - 1)
  throw new Error(`Current latest is Issue ${oldNum}; expected ${NEW.num - 1}. Refusing to apply Issue ${NEW.num} (guards against double-publish / out-of-order).`);

const oldCardInner = index.match(/<!-- LATEST_ISSUE_CARD_START -->([\s\S]*?)<!-- LATEST_ISSUE_CARD_END -->/)[1];
const oldSlug  = oldCardInner.match(/href="([^"]+)"/)[1];
const oldDate  = oldCardInner.match(/issue-card-kicker">([^<]+)</)[1].split("·")[0].trim();
const oldTitle = oldCardInner.match(/issue-card-title">([\s\S]*?)<\/h3>/)[1].trim();

const archMatch  = index.match(/(\n[ \t]*)(<a class="archive-item"[\s\S]*?<\/a>)/);
const archIndent = archMatch[1], archTpl = archMatch[2];
const tplSlug  = archTpl.match(/href="([^"]+)"/)[1];
const tplNum   = archTpl.match(/archive-issue">Issue No\.\s*(\d+)/)[1];
const tplDate  = (archTpl.match(/<\/span>\s*([^<]+?)\s*<\/div>/) || [])[1];
const tplTitle = archTpl.match(/archive-title">([\s\S]*?)<\/div>/)[1];

let demoted = archTpl.split(tplSlug).join(oldSlug)
  .replace("Issue No. " + tplNum, () => "Issue No. " + oldNum)
  .replace(tplTitle, () => oldTitle);
if (tplDate) demoted = demoted.replace(tplDate, () => oldDate);

const newCard = oldCardInner
  .replace(/href="[^"]*"/, () => `href="/${NEW.slug}"`)
  .replace(/(issue-card-kicker">)[^<]*/, (m, p) => p + `${NEW.date_human} · ${NEW.read_time}`)
  .replace(/(issue-card-title">)[\s\S]*?(<\/h3>)/, (m, a, b) => a + NEW.title + b)
  .replace(/(issue-card-deck">)[\s\S]*?(<\/p>)/, (m, a, b) => a + NEW.deck + b);

const newIndex = index
  .replace(`<h2>Issue No. ${oldNum}.</h2>`, () => `<h2>Issue No. ${NEW.num}.</h2>`)
  .replace(oldCardInner, () => newCard)
  .replace(archIndent + archTpl, () => archIndent + demoted + archIndent + archTpl);
if (newIndex === index) throw new Error("index.html unchanged - aborting.");

// ---- 3) sitemap.xml --------------------------------------------------------
const sitemap = read("sitemap.xml");
const oldUrlRe = new RegExp(`<url>\\s*<loc>https://encryptedchart\\.com/${reEsc(oldSlug.replace(/^\//, ""))}</loc>[\\s\\S]*?</url>`);
const oldUrlBlock = sitemap.match(oldUrlRe)[0];
const newUrlBlock = oldUrlBlock
  .split(oldSlug.replace(/^\//, "")).join(NEW.slug)
  .replace(/<lastmod>[^<]*<\/lastmod>/, () => `<lastmod>${NEW.lastmod}</lastmod>`);
const newSitemap = sitemap
  .replace(oldUrlBlock, () => newUrlBlock + "\n  " + oldUrlBlock)
  .replace(/(<loc>https:\/\/encryptedchart\.com\/<\/loc>\s*<lastmod>)[^<]*/, (m, p) => p + NEW.lastmod);

// ---- write -----------------------------------------------------------------
write(`${NEW.slug}.html`, pillar);
write("index.html", newIndex);
write("sitemap.xml", newSitemap);
console.log(`Built Issue ${NEW.num}: ${NEW.slug}.html + index.html + sitemap.xml`);
