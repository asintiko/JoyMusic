import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("..", import.meta.url));

const ignoredDirectories = new Set([
  "node_modules",
  "dist",
  ".next",
  "out",
  "release",
  ".turbo",
  ".git",
  ".claude",
  "coverage",
  "playwright-report",
  "test-results",
  "drizzle",
]);

const ignoredFiles = new Set(["next-env.d.ts"]);

const scriptExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const scriptKinds = new Map([
  [".ts", ts.ScriptKind.TS],
  [".tsx", ts.ScriptKind.TSX],
  [".js", ts.ScriptKind.JS],
  [".jsx", ts.ScriptKind.JSX],
  [".mjs", ts.ScriptKind.JS],
  [".cjs", ts.ScriptKind.JS],
]);

function* walk(directory) {
  for (const entry of readdirSync(directory)) {
    if (ignoredDirectories.has(entry) || ignoredFiles.has(entry)) continue;
    const path = join(directory, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) yield* walk(path);
    else yield path;
  }
}

function commentsInScript(path, text) {
  const extension = extname(path);
  const sourceFile = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    scriptKinds.get(extension),
  );
  const found = new Set();

  const record = (position) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(position);
    found.add(line + 1);
  };

  const inspectToken = (node) => {
    const start = node.getFullStart();
    for (const range of ts.getLeadingCommentRanges(text, start) ?? []) record(range.pos);
    for (const range of ts.getTrailingCommentRanges(text, node.getEnd()) ?? []) record(range.pos);
  };

  const visit = (node) => {
    const children = node.getChildren(sourceFile);
    if (children.length === 0) inspectToken(node);
    else children.forEach(visit);
  };

  visit(sourceFile);
  return [...found].sort((a, b) => a - b);
}

function commentsInStylesheet(text) {
  const lines = [];
  text.split("\n").forEach((line, index) => {
    if (line.includes("/*")) lines.push(index + 1);
  });
  return lines;
}

function commentsInMarkup(text) {
  const lines = [];
  text.split("\n").forEach((line, index) => {
    if (line.includes("<!--")) lines.push(index + 1);
  });
  return lines;
}

const violations = [];

for (const path of walk(root)) {
  const extension = extname(path);
  const text = readFileSync(path, "utf8");
  let lines = [];
  if (scriptExtensions.has(extension)) lines = commentsInScript(path, text);
  else if (extension === ".css") lines = commentsInStylesheet(text);
  else if (extension === ".html") lines = commentsInMarkup(text);
  else continue;
  for (const line of lines) violations.push(`${relative(root, path).split(sep).join("/")}:${line}`);
}

if (violations.length > 0) {
  console.error(`Comments are not allowed in source files (${violations.length}):`);
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log("No comments found in source files.");
