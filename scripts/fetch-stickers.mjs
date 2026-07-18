import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { STICKER_CODEPOINTS } from '../src/stickers/map.js';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const outputDirectory = join(projectDirectory, 'src/assets/stickers');
const sourceRoot = 'https://raw.githubusercontent.com/googlefonts/noto-emoji/main/svg';

await mkdir(outputDirectory, { recursive: true });

let downloaded = 0;
let skipped = 0;

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}

for (const codepoint of STICKER_CODEPOINTS) {
  const destination = join(outputDirectory, `${codepoint}.svg`);
  if (await exists(destination)) {
    skipped += 1;
    continue;
  }

  const response = await fetch(`${sourceRoot}/emoji_u${codepoint}.svg`);
  if (!response.ok) {
    throw new Error(`Could not fetch Noto Emoji ${codepoint}: ${response.status}`);
  }
  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
  downloaded += 1;
}

const licenceDestination = join(outputDirectory, 'LICENSE');
if (!(await exists(licenceDestination))) {
  const response = await fetch(`${sourceRoot}/LICENSE`);
  if (!response.ok) throw new Error(`Could not fetch the Noto Emoji licence: ${response.status}`);
  await writeFile(licenceDestination, Buffer.from(await response.arrayBuffer()));
}

console.log(`Noto Emoji stickers: ${downloaded} downloaded, ${skipped} already present.`);
