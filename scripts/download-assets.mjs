import fs from 'fs';
import path from 'path';
import https from 'https';

const assets = [
  { url: 'https://wordfight.online/images/logo-header.avif', dest: 'public/images/logo-header.avif' },
  { url: 'https://wordfight.online/images/logo/main-logo-3d.avif', dest: 'public/images/logo/main-logo-3d.avif' },
  { url: 'https://wordfight.online/images/icon-leaderboard.avif', dest: 'public/images/icon-leaderboard.avif' },
  { url: 'https://wordfight.online/images/background.avif', dest: 'public/images/background.avif' },
  { url: 'https://wordfight.online/images/vuatiengviet-background-button.webp', dest: 'public/images/vuatiengviet-background-button.webp' },
  { url: 'https://wordfight.online/images/vi-background-button.webp', dest: 'public/images/vi-background-button.webp' },
  { url: 'https://wordfight.online/images/en-background-button.webp', dest: 'public/images/en-background-button.webp' },
  { url: 'https://wordfight.online/images/icon-gems.png', dest: 'public/images/icon-gems.png' },
  { url: 'https://wordfight.online/images/icon-ai.avif', dest: 'public/images/icon-ai.avif' },
  { url: 'https://wordfight.online/og/og-image.jpg', dest: 'public/images/og-image.jpg' }
];

function download(url, dest) {
  return new Promise((resolve) => {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const file = fs.createWriteStream(dest);
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode === 200) {
        res.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log(`[OK] Downloaded ${url} -> ${dest}`);
          resolve(true);
        });
      } else {
        console.log(`[WARN] Status ${res.statusCode} for ${url}`);
        file.close();
        fs.unlinkSync(dest);
        resolve(false);
      }
    }).on('error', (err) => {
      console.log(`[ERR] ${url}: ${err.message}`);
      resolve(false);
    });
  });
}

async function run() {
  for (const a of assets) {
    await download(a.url, a.dest);
  }
}
run();
