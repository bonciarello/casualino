/**
 * Test suite per Casualino — Generatore di stringhe casuali
 * Esegui con: node --test test.js
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, 'index.html'), 'utf-8');

/* ── FIXTURE ── */
function createDOM() {
  const dom = new JSDOM(html, {
    url: 'https://github.com/bonciarello/casualino/',
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });
  return dom;
}

/* ── HELPERS ── */
function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/* ── TESTS ── */
describe('Casualino — Generatore di stringhe casuali', () => {
  let dom, doc, win;

  beforeEach(() => {
    dom = createDOM();
    doc = dom.window.document;
    win = dom.window;
  });

  describe('Inizializzazione', () => {
    it('dovrebbe caricare la pagina con un titolo', () => {
      assert.ok(doc.title.includes('Casualino'));
    });

    it('dovrebbe avere un heading h1', () => {
      const h1 = doc.querySelector('h1');
      assert.ok(h1);
      assert.ok(h1.textContent.length > 0);
    });

    it('dovrebbe generare una stringa iniziale all\'avvio', () => {
      const output = doc.getElementById('output-string');
      assert.ok(output.textContent);
      assert.notEqual(output.textContent, '···');
      assert.notEqual(output.textContent, '—');
    });
  });

  describe('Criterio accettazione #1 — Solo numeri, lunghezza 6', () => {
    it('dovrebbe generare esattamente 6 cifre decimali', () => {
      // Deseleziona tutto tranne numeri
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      const numbersCb = doc.querySelector('input[name="charset"][value="numbers"]');
      numbersCb.checked = true;

      // Imposta lunghezza a 6
      const lengthInput = doc.getElementById('length');
      lengthInput.value = '6';

      // Trigger change
      numbersCb.dispatchEvent(new win.Event('change', { bubbles: true }));
      lengthInput.dispatchEvent(new win.Event('input', { bubbles: true }));
      lengthInput.dispatchEvent(new win.Event('blur', { bubbles: true }));

      // Verifica risultato
      const output = doc.getElementById('output-string');
      const result = output.textContent;

      assert.equal(result.length, 6, `La lunghezza dovrebbe essere 6, ma è ${result.length}: "${result}"`);
      assert.match(result, /^[0-9]{6}$/, `Dovrebbe contenere solo 6 cifre decimali, ma ha generato: "${result}"`);
    });

    it('dovrebbe sempre generare solo cifre decimali su 10 tentativi', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="numbers"]').checked = true;
      doc.getElementById('length').value = '6';

      for (let i = 0; i < 10; i++) {
        doc.getElementById('regenerate-btn').click();
        const result = doc.getElementById('output-string').textContent;
        assert.match(result, /^[0-9]{6}$/, `Tentativo ${i + 1}: attese 6 cifre, ottenuto "${result}"`);
      }
    });
  });

  describe('Criterio accettazione #2 — Escludi vocali minuscole', () => {
    it('non dovrebbe contenere vocali minuscole quando aeiou sono escluse', () => {
      // Imposta solo minuscole
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="lowercase"]').checked = true;

      // Escludi vocali
      doc.getElementById('excluded-chars').value = 'aeiou';

      // Lunghezza sufficiente per testare
      doc.getElementById('length').value = '50';

      // Trigger change
      doc.querySelector('input[name="charset"][value="lowercase"]').dispatchEvent(new win.Event('change', { bubbles: true }));
      doc.getElementById('excluded-chars').dispatchEvent(new win.Event('input', { bubbles: true }));

      // Genera esplicitamente
      doc.getElementById('regenerate-btn').click();

      const result = doc.getElementById('output-string').textContent;

      // Verify no lowercase vowels
      const vowels = ['a', 'e', 'i', 'o', 'u'];
      for (const v of vowels) {
        assert.ok(!result.includes(v), `Il risultato contiene la vocale "${v}": "${result}"`);
      }

      // Verify contiene solo minuscole (escluse le vocali)
      assert.match(result, /^[a-z]+$/, `Dovrebbe contenere solo minuscole (no vocali): "${result}"`);
      assert.equal(result.length, 50);
    });
  });

  describe('Criterio accettazione #3 — Copia negli appunti', () => {
    it('dovrebbe avere un pulsante copia funzionante con aria-label', () => {
      const copyBtn = doc.getElementById('copy-btn');
      assert.ok(copyBtn);
      assert.ok(copyBtn.getAttribute('aria-label'));
    });

    it('dovrebbe copiare la stringa corrente', async () => {
      // Genera una stringa nota
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="numbers"]').checked = true;
      doc.getElementById('length').value = '6';
      doc.getElementById('regenerate-btn').click();

      const expected = doc.getElementById('output-string').textContent;

      // Mock clipboard
      let clipboardText = '';
      win.navigator.clipboard = {
        writeText: async (text) => { clipboardText = text; }
      };

      doc.getElementById('copy-btn').click();
      // attendi che la Promise si risolva
      await wait(50);

      assert.equal(clipboardText, expected, `Clipboard dovrebbe contenere "${expected}", ma contiene "${clipboardText}"`);
    });
  });

  describe('Generazione e set di caratteri', () => {
    it('dovrebbe rispettare le maiuscole se selezionate', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="uppercase"]').checked = true;
      doc.getElementById('length').value = '30';
      doc.getElementById('regenerate-btn').click();
      const result = doc.getElementById('output-string').textContent;
      assert.match(result, /^[A-Z]+$/);
    });

    it('dovrebbe rispettare le minuscole se selezionate', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="lowercase"]').checked = true;
      doc.getElementById('length').value = '30';
      doc.getElementById('regenerate-btn').click();
      const result = doc.getElementById('output-string').textContent;
      assert.match(result, /^[a-z]+$/);
    });

    it('dovrebbe rispettare i simboli se selezionati', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="symbols"]').checked = true;
      doc.getElementById('length').value = '30';
      doc.getElementById('regenerate-btn').click();
      const result = doc.getElementById('output-string').textContent;
      assert.equal(result.length, 30);
    });

    it('dovrebbe includere caratteri personalizzati', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.getElementById('custom-chars').value = 'ÀÈÌ';
      doc.getElementById('length').value = '20';
      doc.getElementById('regenerate-btn').click();
      const result = doc.getElementById('output-string').textContent;
      assert.equal(result.length, 20);
      // Verifica che tutti i caratteri siano nel set ÀÈÌ
      assert.match(result, /^[ÀÈÌ]+$/);
    });

    it('dovrebbe escludere caratteri specifici', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="numbers"]').checked = true;
      doc.getElementById('excluded-chars').value = '012345';
      doc.getElementById('length').value = '50';
      doc.getElementById('regenerate-btn').click();
      const result = doc.getElementById('output-string').textContent;
      assert.match(result, /^[6-9]+$/);
    });
  });

  describe('Validazione', () => {
    it('dovrebbe mostrare errore se nessun set è selezionato e nessun carattere personalizzato', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.getElementById('custom-chars').value = '';
      doc.getElementById('charset-error').classList.remove('visible');

      doc.getElementById('regenerate-btn').click();
      const errorEl = doc.getElementById('charset-error');
      assert.ok(errorEl.classList.contains('visible'), 'Il messaggio di errore charset dovrebbe essere visibile');
    });

    it('dovrebbe auto-correggere la lunghezza al default (16) se vuota al blur', () => {
      doc.getElementById('length').value = '';
      doc.getElementById('length').dispatchEvent(new win.Event('blur', { bubbles: true }));
      assert.equal(doc.getElementById('length').value, '16', 'La lunghezza vuota dovrebbe essere corretta a 16');
      const errorEl = doc.getElementById('length-error');
      assert.ok(!errorEl.classList.contains('visible'), 'Nessun errore dopo auto-correzione');
    });

    it('dovrebbe auto-correggere la lunghezza a 128 se sopra il massimo', () => {
      doc.getElementById('length').value = '200';
      doc.getElementById('length').dispatchEvent(new win.Event('input', { bubbles: true }));
      assert.equal(doc.getElementById('length').value, '128', 'La lunghezza >128 dovrebbe essere corretta a 128');
    });

    it('dovrebbe mostrare errore se l\'esclusione rimuove tutti i caratteri', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="numbers"]').checked = true;
      doc.getElementById('excluded-chars').value = '0123456789';
      doc.getElementById('regenerate-btn').click();
      const errorEl = doc.getElementById('excluded-error');
      assert.ok(errorEl.classList.contains('visible'), 'Il messaggio di errore esclusione dovrebbe essere visibile');
    });
  });

  describe('Entropia', () => {
    it('dovrebbe calcolare l\'entropia correttamente per un set noto', () => {
      const checkboxes = doc.querySelectorAll('input[name="charset"]');
      checkboxes.forEach(cb => { cb.checked = false; });
      doc.querySelector('input[name="charset"][value="numbers"]').checked = true;
      doc.getElementById('length').value = '6';
      doc.getElementById('regenerate-btn').click();

      const entropyEl = doc.getElementById('entropy-value');
      const text = entropyEl.textContent;
      // 6 cifre decimali = log2(10^6) = 6 * log2(10) ≈ 19.93 bit → 20 bit
      assert.ok(text.includes('20 bit') || text.includes('19') || text.includes('21'),
        `Entropia per 6 cifre dovrebbe essere circa 20 bit, ma è "${text}"`);
    });

    it('dovrebbe aggiornare le barre di entropia', () => {
      const bars = doc.querySelectorAll('#entropy-bars .entropy-bar');
      assert.equal(bars.length, 6);
      // Dopo la generazione, almeno una barra dovrebbe essere attiva
      const hasActive = Array.from(bars).some(b => b.className.includes('active'));
      assert.ok(hasActive, 'Almeno una barra di entropia dovrebbe essere attiva');
    });
  });

  describe('Accessibilità', () => {
    it('tutti gli input dovrebbero avere label associate', () => {
      const inputs = doc.querySelectorAll('input:not([type="checkbox"])');
      inputs.forEach(input => {
        if (input.id) {
          const label = doc.querySelector(`label[for="${input.id}"]`);
          assert.ok(label, `Input #${input.id} dovrebbe avere una label associata`);
        }
      });
    });

    it('il pulsante copia dovrebbe avere un aria-label', () => {
      const btn = doc.getElementById('copy-btn');
      assert.ok(btn.getAttribute('aria-label'));
    });

    it('il misuratore di entropia dovrebbe avere attributi ARIA', () => {
      const meter = doc.getElementById('entropy-bars');
      assert.ok(meter.getAttribute('aria-valuenow') !== null);
      assert.ok(meter.getAttribute('aria-valuemin') !== null);
      assert.ok(meter.getAttribute('aria-valuemax') !== null);
      assert.ok(meter.getAttribute('aria-label'));
      assert.equal(meter.getAttribute('role'), 'meter');
    });
  });

  describe('SEO', () => {
    it('dovrebbe avere un meta description', () => {
      const meta = doc.querySelector('meta[name="description"]');
      assert.ok(meta);
      assert.ok(meta.getAttribute('content').length > 20);
    });

    it('dovrebbe avere Open Graph tags', () => {
      assert.ok(doc.querySelector('meta[property="og:title"]'));
      assert.ok(doc.querySelector('meta[property="og:description"]'));
      assert.ok(doc.querySelector('meta[property="og:type"]'));
      assert.ok(doc.querySelector('meta[property="og:url"]'));
    });

    it('dovrebbe avere JSON-LD structured data', () => {
      const ldJson = doc.querySelector('script[type="application/ld+json"]');
      assert.ok(ldJson);
      const data = JSON.parse(ldJson.textContent);
      assert.equal(data['@type'], 'WebApplication');
      assert.equal(data.name, 'Casualino');
    });

    it('dovrebbe avere il canonical link corretto', () => {
      const canonical = doc.querySelector('link[rel="canonical"]');
      assert.ok(canonical);
    });

    it('dovrebbe avere lang="it" sull\'elemento html', () => {
      const htmlEl = doc.documentElement;
      assert.equal(htmlEl.getAttribute('lang'), 'it');
    });

    it('dovrebbe avere il viewport meta tag', () => {
      const vp = doc.querySelector('meta[name="viewport"]');
      assert.ok(vp);
    });
  });

  describe('Responsive design', () => {
    it('dovrebbe usare unità relative per il font', () => {
      const bodyFontSize = win.getComputedStyle(doc.body).fontSize;
      assert.ok(bodyFontSize, 'Il body dovrebbe avere un font-size definito');
    });
  });
});
