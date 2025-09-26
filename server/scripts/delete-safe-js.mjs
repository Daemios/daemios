#!/usr/bin/env node
/*
  delete-safe-js.mjs

  Scans server/src for .js files and writes server/js-deletion-report.csv.
  If run with --delete or --confirm it will delete files considered safe.

  Safe criteria (conservative):
  - A same-path .ts counterpart exists (e.g., src/foo/bar.js -> src/foo/bar.ts)
  - The .js file is not explicitly referenced in package.json scripts
  - No other repository files contain the file's repo-relative path

  Usage:
    node server/scripts/delete-safe-js.mjs        # produce CSV only
    node server/scripts/delete-safe-js.mjs --delete  # produce CSV and delete safe files

  NOTE: This is conservative. It will NOT delete files that don't have a same-path
  .ts counterpart. If you want more aggressive rules, edit the script.
*/

import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
// server/scripts -> server
const serverDir = path.resolve(scriptDir, '..');
const repoRoot = path.resolve(serverDir, '..');
const serverSrc = path.join(serverDir, 'src');
const outCsv = path.join(serverDir, 'js-deletion-report.csv');

function normalize(p) {
  return p.replace(/\\/g, '/');
}

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (['node_modules', 'dist', '.git'].includes(ent.name)) continue;
      files.push(...await walk(full));
    } else {
      files.push(full);
    }
  }
  return files;
}

async function readPackageScripts() {
  try {
    const pkgPath = path.join(serverDir, 'package.json');
    const raw = await fs.readFile(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    return Object.values(pkg.scripts || {}).join('\n');
  } catch (e) {
    return '';
  }
}

function csvEscape(s) {
  if (s == null) return '';
  return '"' + String(s).replace(/"/g, '""') + '"';
}

async function main() {
  try {
    console.log('Scanning server/src for .js files...');
    console.log('repoRoot=', repoRoot);
    console.log('serverDir=', serverDir);
    console.log('serverSrc=', serverSrc);
    if (!existsSync(serverSrc)) {
      throw new Error('server/src not found at ' + serverSrc);
    }
  } catch (err) {
    console.error('Fatal error during startup:', err && err.message ? err.message : err);
    throw err;
  }

  try {
  // Only scan server directory to keep the scan bounded and conservative.
  const allFiles = await walk(serverDir);
  const textFiles = allFiles.filter(f => !f.includes('node_modules') && !f.includes(path.sep + 'dist' + path.sep));
  const jsFiles = textFiles.filter(f => f.startsWith(serverSrc) && f.endsWith('.js'));

    const scriptsText = await readPackageScripts();

    const rows = [];

    for (const js of jsFiles) {
      const ts = js.slice(0, -3) + '.ts';
      const relFromRepo = normalize(path.relative(repoRoot, js));
      const basename = path.basename(js);
      const hasTs = existsSync(ts);

      // search for explicit references to the repo-relative path in other files
      let referencedElsewhere = 0;
      for (const f of textFiles) {
        if (f === js) continue;
        try {
          const content = await fs.readFile(f, 'utf8');
          if (content.includes(relFromRepo)) referencedElsewhere += 1;
          // quick heuristics: import/require lines mentioning the basename.js
          else if (/\b(import|require)\b[\s\S]{0,120}?['\"]([^'\"]*${basename})['\"]/.test(content)) {
            if (content.includes(basename)) referencedElsewhere += 1;
          }
        } catch (e) {
          // ignore unreadable files
        }
      }

      const referencedByScripts = scriptsText.includes(relFromRepo) || scriptsText.includes(basename);

      const safe = hasTs && !referencedElsewhere && !referencedByScripts && !/\\bapp\\.js$/.test(js);

      rows.push({
        file: normalize(js),
        tsCounterpart: hasTs ? normalize(ts) : '',
        referencedByScripts: referencedByScripts ? 'yes' : 'no',
        referencedElsewhere: referencedElsewhere,
        safeToDelete: safe ? 'yes' : 'no',
        note: hasTs ? 'same-path .ts found' : 'no same-path .ts'
      });
    }

    // write CSV
    const header = ['file','tsCounterpart','referencedByScripts','referencedElsewhere','safeToDelete','note'];
    const lines = [header.map(csvEscape).join(',')];
    for (const r of rows) {
      lines.push([r.file, r.tsCounterpart, r.referencedByScripts, String(r.referencedElsewhere), r.safeToDelete, r.note].map(csvEscape).join(','));
    }
    await fs.writeFile(outCsv, lines.join('\n'), 'utf8');
    console.log('Wrote report to', outCsv);

    const doDelete = process.argv.includes('--delete') || process.argv.includes('--confirm');
    if (!doDelete) {
      console.log('Run with --delete to actually delete the safe files.');
      const safeCount = rows.filter(r => r.safeToDelete === 'yes').length;
      console.log(`${safeCount} files marked safe-to-delete.`);
      return;
    }

    // perform deletion
    const safeRows = rows.filter(r => r.safeToDelete === 'yes');
    if (safeRows.length === 0) {
      console.log('No safe files to delete.');
      return;
    }

    console.log('Deleting safe files...');
    for (const r of safeRows) {
      try {
        await fs.unlink(path.join(repoRoot, r.file));
        console.log('Deleted', r.file);
      } catch (e) {
        console.error('Failed to delete', r.file, e.message);
      }
    }
    console.log('Deletion complete.');
  } catch (err) {
    console.error('Error during scan/generate/delete phase:', err && err.stack ? err.stack : err);
    throw err;
  }

  for (const js of jsFiles) {
    const ts = js.slice(0, -3) + '.ts';
    const relFromRepo = normalize(path.relative(repoRoot, js));
    const basename = path.basename(js);
    const hasTs = existsSync(ts);

    // search for explicit references to the repo-relative path in other files
    let referencedElsewhere = 0;
    for (const f of textFiles) {
      if (f === js) continue;
      try {
        const content = await fs.readFile(f, 'utf8');
        if (content.includes(relFromRepo)) referencedElsewhere += 1;
        // quick heuristics: import/require lines mentioning the basename.js
        else if (/\b(import|require)\b[\s\S]{0,120}?['\"]([^'\"]*${basename})['\"]/.test(content)) {
          if (content.includes(basename)) referencedElsewhere += 1;
        }
      } catch (e) {
        // ignore unreadable files
      }
    }

    const referencedByScripts = scriptsText.includes(relFromRepo) || scriptsText.includes(basename);

    const safe = hasTs && !referencedElsewhere && !referencedByScripts && !/\\bapp\\.js$/.test(js);

    rows.push({
      file: normalize(js),
      tsCounterpart: hasTs ? normalize(ts) : '',
      referencedByScripts: referencedByScripts ? 'yes' : 'no',
      referencedElsewhere: referencedElsewhere,
      safeToDelete: safe ? 'yes' : 'no',
      note: hasTs ? 'same-path .ts found' : 'no same-path .ts'
    });
  }

  // write CSV
  const header = ['file','tsCounterpart','referencedByScripts','referencedElsewhere','safeToDelete','note'];
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    lines.push([r.file, r.tsCounterpart, r.referencedByScripts, String(r.referencedElsewhere), r.safeToDelete, r.note].map(csvEscape).join(','));
  }
  await fs.writeFile(outCsv, lines.join('\n'), 'utf8');
  console.log('Wrote report to', outCsv);

  const doDelete = process.argv.includes('--delete') || process.argv.includes('--confirm');
  if (!doDelete) {
    console.log('Run with --delete to actually delete the safe files.');
    const safeCount = rows.filter(r => r.safeToDelete === 'yes').length;
    console.log(`${safeCount} files marked safe-to-delete.`);
    return;
  }

  // perform deletion
  const safeRows = rows.filter(r => r.safeToDelete === 'yes');
  if (safeRows.length === 0) {
    console.log('No safe files to delete.');
    return;
  }

  console.log('Deleting safe files...');
  for (const r of safeRows) {
    try {
      await fs.unlink(path.join(repoRoot, r.file));
      console.log('Deleted', r.file);
    } catch (e) {
      console.error('Failed to delete', r.file, e.message);
    }
  }
  console.log('Deletion complete.');
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
