import {
  getTemplate,
  getDraftOptions,
  CopyTemplate,
} from '../copywriting-templates';

function assertTrue(cond: any, label: string): void {
  if (!cond) {
    console.error(`FAIL ${label}: got ${JSON.stringify(cond)}`);
    process.exit(1);
  }
}

(() => {
  // Hero headline templates differ by register
  const brandHero = getTemplate('brand', 'hero', 'headline') as CopyTemplate;
  const productHero = getTemplate('product', 'hero', 'headline') as CopyTemplate;
  assertTrue(brandHero != null, 'brand hero headline template exists');
  assertTrue(productHero != null, 'product hero headline template exists');
  assertTrue(brandHero.wordCountMax <= productHero.wordCountMax || brandHero.wordCountMax === 8, 'brand keeps headlines short');
  assertTrue(brandHero.voicePrompt !== productHero.voicePrompt, 'brand and product voice prompts differ');

  // Unknown slot returns null (not undefined - explicit contract)
  assertTrue(getTemplate('brand', 'hero', 'no_such_slot') === null, 'unknown slot returns null');

  // getDraftOptions returns 2-3 options
  const brandOptions = getDraftOptions('brand', 'hero', 'headline', { productName: 'Atelier' });
  assertTrue(brandOptions.length >= 2 && brandOptions.length <= 3, 'brand draft options count 2-3');
  brandOptions.forEach((o, i) => {
    const wc = o.split(/\s+/).filter(Boolean).length;
    assertTrue(wc <= 12, `brand option ${i} respects word ceiling: got ${wc} for "${o}"`);
  });

  // Product CTA template
  const productCta = getTemplate('product', 'hero', 'primary_cta');
  assertTrue(productCta != null, 'product hero primary_cta template exists');
  const ctaOptions = getDraftOptions('product', 'hero', 'primary_cta', { productName: 'Acme' });
  assertTrue(ctaOptions.length >= 2, 'product CTA has 2+ options');
  assertTrue(
    ctaOptions.some((o) => /start|get|try/i.test(o)),
    'product CTA options use action verbs (start/get/try)'
  );

  console.log('copywriting-templates PASS');
})();
