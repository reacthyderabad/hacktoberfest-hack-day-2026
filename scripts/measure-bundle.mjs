/**
 * Measure what `@elah/*` costs a consumer, reproducibly.
 *
 *   node scripts/measure-bundle.mjs        (run `npm run build:packages` first)
 *
 * Two measurements, because they answer different questions:
 *
 *  A) "dist" — the tsc ESM output exactly as published to npm: raw bytes of
 *     every `dist/**\/*.js`, and the gzip of their concatenation. This is what
 *     `npm pack` ships. It is NOT what a browser downloads: nothing is minified
 *     and nothing is tree-shaken, so it overstates runtime cost badly.
 *
 *  B) "bundle" — the package barrel run through esbuild with `--bundle --minify
 *     --format=esm`, then gzipped. Host-owned libraries (react, react-dom,
 *     lucide-react) are external because the app ships its own copy. This is the
 *     number a consumer should budget for, and the one the README badges quote.
 *
 * Both are printed so the two are never confused again: the 0.2.1 figures in
 * BUNDLE_STRATEGY.md were method A, and the badges presented them as if they
 * were B.
 *
 * mediabunny is shown separately. It is a runtime dependency of @elah/core but
 * every import of it is a dynamic `import()` inside the demuxer and the export
 * worker, so a bundler that code-splits dynamic imports (Vite, webpack, Next)
 * puts it in its own chunk, loaded only when the app first decodes or exports.
 * The "+ mediabunny" row is the cost if a bundler cannot split it.
 *
 * esbuild is resolved from @elah/cli's devDependencies; nothing is installed.
 */
import { createRequire } from 'node:module'
import { readdirSync, statSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(ROOT, 'packages/cli/package.json'))
const esbuild = require('esbuild')

const PKGS = ['core', 'react', 'timeline', 'editor']
const HOST = ['react', 'react-dom', 'react/jsx-runtime', 'lucide-react']
const CODEC = ['mediabunny']
const SMALL = ['immer', 'zustand', 'clsx', 'tailwind-merge']

function walk(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    const s = statSync(p)
    if (s.isDirectory()) walk(p, out)
    else if (n.endsWith('.js') && !n.endsWith('.test.js')) out.push(p)
  }
  return out
}
const kib = (b) => (b / 1024).toFixed(1).padStart(7) + ' KiB'
const gz = (buf) => gzipSync(buf, { level: 9 }).length

async function bundle(entry, external) {
  const r = await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
    external,
    loader: { '.css': 'empty' },
  })
  const code = r.outputFiles[0].contents
  return { raw: code.length, gz: gz(code) }
}

console.log('A) tsc dist output, as published to npm (unminified, not tree-shaken)')
let distRaw = 0
let distFiles = []
for (const p of PKGS) {
  const files = walk(join(ROOT, 'packages', p, 'dist'))
  const raw = files.reduce((n, f) => n + statSync(f).size, 0)
  const g = gz(Buffer.concat(files.map((f) => readFileSync(f))))
  distRaw += raw
  distFiles = distFiles.concat(files)
  console.log(`  @elah/${p.padEnd(9)} ${String(files.length).padStart(3)} files  raw ${kib(raw)}  gz ${kib(g)}`)
}
console.log(`  all four        ${String(distFiles.length).padStart(3)} files  raw ${kib(distRaw)}  gz ${kib(gz(Buffer.concat(distFiles.map((f) => readFileSync(f)))))}`)

console.log('\nB) esbuild bundle of each barrel, minified + gzipped (react, react-dom, lucide-react external)')
for (const p of PKGS) {
  const entry = join(ROOT, 'packages', p, 'dist/index.js')
  const others = PKGS.filter((q) => q !== p).map((q) => `@elah/${q}`)
  const own = await bundle(entry, [...HOST, ...others, ...CODEC, ...SMALL])
  const withDeps = await bundle(entry, [...HOST, ...others, ...CODEC])
  console.log(`  @elah/${p.padEnd(9)} own code ${kib(own.gz)} gz  | with its small deps ${kib(withDeps.gz)} gz`)
}

const full = join(ROOT, 'packages/editor/dist/index.js')
const f1 = await bundle(full, [...HOST, ...CODEC, ...SMALL])
const f2 = await bundle(full, [...HOST, ...CODEC])
const f3 = await bundle(full, [...HOST])
console.log('\n   Full SDK (@elah/editor with core + react + timeline bundled in):')
console.log(`  @elah/* code only          ${kib(f1.gz)} gz  (${kib(f1.raw)} raw)`)
console.log(`  + immer, zustand, clsx,    ${kib(f2.gz)} gz  (${kib(f2.raw)} raw)   <- what a browser downloads, codec split out`)
console.log(`    tailwind-merge`)
console.log(`  + mediabunny               ${kib(f3.gz)} gz  (${kib(f3.raw)} raw)   <- only if the bundler cannot code-split the lazy import`)

console.log('\nC) the runtime libraries on their own')
for (const lib of [...SMALL, ...CODEC]) {
  const r = await esbuild.build({
    stdin: { contents: `export * from '${lib}'`, resolveDir: ROOT },
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser',
    write: false,
    logLevel: 'silent',
  })
  const code = r.outputFiles[0].contents
  console.log(`  ${lib.padEnd(14)} ${kib(gz(code))} gz  (${kib(code.length)} raw)`)
}
