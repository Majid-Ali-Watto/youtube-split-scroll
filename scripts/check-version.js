// Fails when manifest.json, package.json and (in CI) the pushed git tag
// disagree on the version, so a release can't ship a mismatched build.
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8')).version;
const pkg = JSON.parse(readFileSync('package.json', 'utf8')).version;
const tag = process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME.replace(/^v/, '') : null;

const problems = [];
if (manifest !== pkg) problems.push(`manifest.json (${manifest}) != package.json (${pkg})`);
if (tag && tag !== manifest) problems.push(`tag v${tag} != manifest.json (${manifest})`);

if (problems.length) {
    console.error(`Version mismatch:\n  ${problems.join('\n  ')}`);
    process.exit(1);
}
console.log(`Version ${manifest} OK${tag ? ` (tag v${tag})` : ''}`);
