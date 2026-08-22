import fs from 'fs';
const css = fs.readFileSync('docs/research/style1.css', 'utf-8');
const keyframeMatches = css.match(/@keyframes\s+[\w-]+\s*\{[^}]*(\{[^}]*\}[^}]*)*\}/g);
if (keyframeMatches) {
  console.log(`Found ${keyframeMatches.length} keyframes`);
  fs.writeFileSync('docs/research/extracted-keyframes.css', keyframeMatches.join('\n\n'));
}

const rootMatch = css.match(/:root\s*\{[^}]+\}/);
if (rootMatch) {
  console.log('Found :root variables');
  fs.writeFileSync('docs/research/extracted-root.css', rootMatch[0]);
}

const darkMatch = css.match(/\.dark\s*\{[^}]+\}/);
if (darkMatch) {
  console.log('Found .dark variables');
  fs.appendFileSync('docs/research/extracted-root.css', '\n\n' + darkMatch[0]);
}
