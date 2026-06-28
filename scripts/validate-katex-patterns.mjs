/**
 * Validates all common JUPEB LaTeX patterns render correctly in KaTeX.
 */
import katex from 'katex';
import 'katex/contrib/mhchem';

const tests = [
  { tex: String.raw`\ce{H2SO4}`, desc: 'sulfuric acid' },
  { tex: String.raw`\ce{Fe^{2+}}`, desc: 'iron(II) ion' },
  { tex: String.raw`1s^{2}2s^{2}2p^{6}`, desc: 'electronic config' },
  { tex: String.raw`6.02 \times 10^{23}`, desc: 'scientific notation' },
  { tex: String.raw`\ce{[Co(NH3)6]F3}`, desc: 'coordination compound' },
  { tex: String.raw`\frac{1}{2}`, desc: 'fraction' },
  { tex: String.raw`\ce{MgSO4.7H2O}`, desc: 'hydrated salt' },
  { tex: String.raw`\ce{^{238}U}`, desc: 'nuclear notation' },
  { tex: String.raw`\alpha + \beta`, desc: 'greek letters' },
  { tex: String.raw`\ce{NaCl(aq)}`, desc: 'aqueous state' },
  { tex: String.raw`\ce{SO4^{2-}}`, desc: 'sulfate ion' },
  { tex: String.raw`[Ar]3d^{10}4s^{2}`, desc: 'noble gas config' },
  { tex: String.raw`\ce{H2(g)}`, desc: 'hydrogen gas' },
  { tex: String.raw`\sqrt{x}`, desc: 'square root' },
  { tex: String.raw`\int_{0}^{1} x^2 \, dx`, desc: 'integral' },
  { tex: String.raw`\ce{^{234}_{91}Pa}`, desc: 'isotope notation' },
  { tex: String.raw`\ce{C6H12O6}`, desc: 'glucose' },
  { tex: String.raw`\ce{CH3COOH}`, desc: 'acetic acid' },
  { tex: String.raw`\rightarrow`, desc: 'reaction arrow' },
  { tex: String.raw`\ce{NaOH(aq)} + \ce{HCl(aq)} \rightarrow \ce{NaCl(aq)} + \ce{H2O(l)}`, desc: 'full reaction' },
  { tex: String.raw`\Delta H`, desc: 'enthalpy' },
  { tex: String.raw`E = mc^{2}`, desc: 'einstein' },
  { tex: String.raw`\frac{-b \pm \sqrt{b^{2} - 4ac}}{2a}`, desc: 'quadratic formula' },
  { tex: String.raw`\ce{Cr2O7^{2-}}`, desc: 'dichromate' },
  { tex: String.raw`\ce{MnO4-}`, desc: 'permanganate' },
  { tex: String.raw`\ce{NH4+}`, desc: 'ammonium' },
  { tex: String.raw`\ce{CO3^{2-}}`, desc: 'carbonate' },
  { tex: String.raw`\ce{C2H5OH}`, desc: 'ethanol' },
];

let pass = 0, fail = 0;
console.log('Testing ' + tests.length + ' JUPEB LaTeX patterns against KaTeX...\n');
for (const { tex, desc } of tests) {
  try {
    katex.renderToString(tex, { throwOnError: true });
    console.log('  PASS  ' + desc);
    pass++;
  } catch (e) {
    console.log('  FAIL  ' + desc + ': ' + e.message.substring(0, 80));
    fail++;
  }
}
console.log('\n' + '='.repeat(50));
console.log('Result: ' + pass + ' passed, ' + fail + ' failed out of ' + tests.length);
process.exit(fail > 0 ? 1 : 0);
