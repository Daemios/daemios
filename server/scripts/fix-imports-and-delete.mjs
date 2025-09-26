#!/usr/bin/env node
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const scriptDir = path.dirname(__filename);
const serverDir = path.resolve(scriptDir, '..');
const srcDir = path.join(serverDir, 'src');

function normalize(p){return p.replace(/\\/g,'/');}

async function walk(dir){
  const ents = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const ent of ents){
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()){ if (['node_modules','dist','.git'].includes(ent.name)) continue; files.push(...await walk(full)); }
    else files.push(full);
  }
  return files;
}

function tryResolveTs(importerDir, importPath){
  // importPath may be relative like '../lib/prisma.js' or './routes/open.js'
  const withoutExt = importPath.replace(/\.js$/,'');
  const candidateTs = path.resolve(importerDir, withoutExt + '.ts');
  if (existsSync(candidateTs)) return {newPath: withoutExt, reason: 'same-path ts'};

  // fallback: find any .ts file with same basename under server/src
  const base = path.basename(withoutExt);
  // search srcDir for base + .ts
  const matches = [];
  const all = require('fs').readdirSync(srcDir, { withFileTypes: true });
  // simple recursive search
  function findRec(d){
    for (const ent of require('fs').readdirSync(d, { withFileTypes: true })){
      const f = path.join(d, ent.name);
      if (ent.isDirectory()){ if (['node_modules','dist','.git'].includes(ent.name)) continue; findRec(f); }
      else if (ent.isFile() && ent.name === base + '.ts') matches.push(f);
    }
  }
  findRec(srcDir);
  if (matches.length === 1){
    const rel = path.relative(importerDir, matches[0]).replace(/\\/g, '/');
    let relNoExt = rel.replace(/\.ts$/, '');
    if (!relNoExt.startsWith('.')) relNoExt = './' + relNoExt;
    return { newPath: relNoExt, reason: 'mapped to unique ts ' + matches[0] };
  }
  return null;
}

async function main(){
  console.log('Fixing import paths in server/src...');
  const files = (await walk(srcDir)).filter(f => f.endsWith('.ts') || f.endsWith('.js'));
  const importRegex = /(import\s+[\s\S]*?from\s+|require\(|import\()\s*['"]([^'"]+\.js)['"]/g;
  let edits = 0;
  for (const f of files){
    let src = await fs.readFile(f, 'utf8');
    const dir = path.dirname(f);
    let changed = false;
    src = src.replace(importRegex, (m, pre, p1) => {
      try{
        const candidate = tryResolveTs(dir, p1);
        if (candidate){
          changed = true; edits++;
          return pre + '"' + candidate.newPath + '"';
        }
        // otherwise just remove .js extension
        const noExt = p1.replace(/\.js$/,'');
        changed = true; edits++;
        return pre + '"' + noExt + '"';
      }catch(e){
        return m;
      }
    });
    if (changed){
      await fs.writeFile(f, src, 'utf8');
      console.log('Patched', normalize(path.relative(serverDir,f)));
    }
  }
  console.log('Edits applied:', edits);

  // run delete-safe-js.mjs with --delete
  console.log('Running delete-safe-js.mjs --delete');
  const { spawn } = await import('child_process');
  const proc = spawn(process.execPath, [path.join(serverDir,'scripts','delete-safe-js.mjs'), '--delete'], { stdio: 'inherit' });
  proc.on('exit', (code) => {
    console.log('delete-safe-js exit code', code);
  });
}

main().catch(e => { console.error(e); process.exitCode = 1; });
