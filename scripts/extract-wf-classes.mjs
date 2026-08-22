import fs from 'fs';
const css = fs.readFileSync('docs/research/style1.css', 'utf-8');
const wfRules = css.match(/(\.wf-[\w-]+|\.btn-wf-[\w-]+|glass-card)[^{]*\{[^}]+\}/g);
if (wfRules) {
  console.log(`Found ${wfRules.length} special wf- rules`);
  fs.writeFileSync('docs/research/extracted-wf-classes.css', wfRules.join('\n\n'));
}
