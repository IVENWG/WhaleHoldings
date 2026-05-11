/**
 * Copies database CSV files from the repo root database/ directory
 * into app/frontend/dist/ for GitHub Pages static deployment.
 *
 * Generates:
 *  - manifest.json for each quarter (list of fund names)
 *  - metadata.json with build info
 *  - index.json with investor list and bilingual metadata
 *
 * Run AFTER `vite build` so dist/ already exists.
 */

import {
  cpSync,
  mkdirSync,
  existsSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from "fs";
import { resolve, join } from "path";

// Helper to parse CSV values like "29.27M" into numbers
function parseValue(v) {
  if (!v || v === "N/A") return 0;
  const cleaned = v.replace(/[,$]/g, "");
  const match = cleaned.match(/^(-?[\d.]+)([BMK])?$/i);
  if (!match) return parseFloat(cleaned) || 0;
  const num = parseFloat(match[1]);
  const suffix = (match[2] || "").toUpperCase();
  if (suffix === "B") return num * 1_000_000_000;
  if (suffix === "M") return num * 1_000_000;
  if (suffix === "K") return num * 1_000;
  return num;
}

// Robust CSV parser for hedge_funds.csv
function parseHedgeFunds(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];
  
  // Header
  const header = parseCSVLine(lines[0]);
  
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};
    header.forEach((h, i) => {
      obj[h] = values[i] || "";
    });
    return obj;
  });
}

function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Simple CSV parser for fund holdings to get total value
function getFundTotalValue(content) {
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length <= 1) return 0;
  const header = parseCSVLine(lines[0]);
  const valueIdx = header.indexOf("Value");
  if (valueIdx === -1) return 0;

  let total = 0;
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values[valueIdx]) {
      total += parseValue(values[valueIdx]);
    }
  }
  return total;
}

const repoRoot = resolve(import.meta.dirname, "../../..");
const sourceDir = resolve(repoRoot, "database");
const distDir = resolve(import.meta.dirname, "../dist");
const targetDir = distDir; // Files at the root of gh-pages

if (!existsSync(distDir)) {
  console.error("dist/ directory not found. Run `vite build` first.");
  process.exit(1);
}

// --- Static CSV files ---
const staticFiles = [
  "hedge_funds.csv",
  "excluded_hedge_funds.csv",
  "stocks.csv",
  "non_quarterly.csv",
  "models.csv",
];

for (const file of staticFiles) {
  const src = resolve(sourceDir, file);
  if (existsSync(src)) {
    cpSync(src, resolve(targetDir, file));
    console.log(`  ${file}`);
  }
}

// --- GICS hierarchy ---
const gicsSrc = resolve(sourceDir, "GICS");
if (existsSync(gicsSrc)) {
  const gicsDest = resolve(targetDir, "GICS");
  mkdirSync(gicsDest, { recursive: true });
  cpSync(resolve(gicsSrc, "hierarchy.csv"), resolve(gicsDest, "hierarchy.csv"));
  console.log(`  GICS/hierarchy.csv`);
}

// --- Quarterly data directories ---
const quarters = readdirSync(sourceDir).filter((entry) => {
  const fullPath = resolve(sourceDir, entry);
  return statSync(fullPath).isDirectory() && /^\d{4}Q[1-4]$/.test(entry);
});

quarters.sort(); // chronological order
const latestQuarter = quarters.length > 0 ? quarters[quarters.length - 1] : "N/A";

for (const quarter of quarters) {
  const qSrc = resolve(sourceDir, quarter);
  const qDest = resolve(targetDir, quarter);
  if (!existsSync(qDest)) mkdirSync(qDest, { recursive: true });

  const csvFiles = readdirSync(qSrc).filter((f) => f.endsWith(".csv"));
  for (const csv of csvFiles) {
    cpSync(resolve(qSrc, csv), resolve(qDest, csv));
  }

  const fundNames = csvFiles.map((f) => f.replace(".csv", ""));
  writeFileSync(resolve(qDest, "manifest.json"), JSON.stringify(fundNames, null, 2));
  console.log(`  ${quarter}/ (${fundNames.length} funds)`);
}

// --- index.json (Investor List) ---
const hfContent = readFileSync(resolve(sourceDir, "hedge_funds.csv"), "utf-8");
const hedgeFunds = parseHedgeFunds(hfContent);
const indexData = hedgeFunds.map(hf => {
  const fundFileName = hf.Fund.replace(/ /g, "_") + ".csv";
  let totalValue = 0;
  let reportPeriod = latestQuarter;

  // Try to get value from latest quarter
  if (latestQuarter !== "N/A") {
    const latestPath = resolve(sourceDir, latestQuarter, fundFileName);
    if (existsSync(latestPath)) {
      totalValue = getFundTotalValue(readFileSync(latestPath, "utf-8"));
    }
  }

  return {
    cik: hf.CIK,
    name: hf.Fund,
    nameZh: hf.Fund_zh || hf.Fund,
    manager: hf.Manager,
    managerZh: hf.Manager_zh || hf.Manager,
    total_value: totalValue,
    report_period: reportPeriod,
    description: hf.Description || "",
    descriptionZh: hf.Description_zh || "",
    popularity: parseInt(hf.Popularity || "0", 10)
  };
});

// Sorting Logic: Priority: 1. popularity (0-100), 2. total_value
indexData.sort((a, b) => {
  if (b.popularity !== a.popularity) {
    return b.popularity - a.popularity;
  }
  return b.total_value - a.total_value;
});

writeFileSync(resolve(targetDir, "index.json"), JSON.stringify(indexData, null, 2));
console.log(`  index.json (${indexData.length} investors)`);

// --- metadata.json ---
const metadata = {
  latestQuarter,
  buildDate: new Date().toISOString().slice(0, 10),
  fundCount: indexData.length,
  quarters: quarters,
};

writeFileSync(resolve(targetDir, "metadata.json"), JSON.stringify(metadata, null, 2));
console.log(`  metadata.json (${latestQuarter})`);

console.log("\nDeployment files generated in dist/");
