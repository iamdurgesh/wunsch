import sharp from "sharp";

// Reproducible share artwork, without revealing the questionnaire's surprise.
const artwork = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<defs><radialGradient id="glow"><stop stop-color="#46554e"/><stop offset="1" stop-color="#202d2c"/></radialGradient></defs>
<rect width="1200" height="630" fill="#182524"/>
<circle cx="960" cy="315" r="310" fill="url(#glow)"/>
<rect x="28" y="28" width="1144" height="574" rx="24" fill="none" stroke="#67766a" stroke-opacity=".45"/>
<g fill="none" stroke="#d5bc82" stroke-opacity=".3"><circle cx="957" cy="306" r="168"/><circle cx="957" cy="306" r="201" stroke-dasharray="3 14"/><path d="M822 454C702 558 690 414 757 429S795 546 674 529" stroke-width="2" stroke-dasharray="5 9"/></g>
<g fill="#d5bc82"><path d="M1059 107l5 14 14 5-14 5-5 14-5-14-14-5 14-5z"/><circle cx="796" cy="189" r="4"/><circle cx="1103" cy="423" r="5"/></g>
<text x="957" y="410" text-anchor="middle" font-family="Georgia, serif" font-size="280" fill="#e6cd96">?</text>
<text x="88" y="135" font-family="Helvetica, Arial, sans-serif" font-size="19" letter-spacing="4" fill="#d5bc82">EIN KLEINER FALL FÜR SIE …</text>
<text x="84" y="253" font-family="Georgia, serif" font-size="69" fill="#faf4e6">Ich brauche mal</text>
<text x="84" y="334" font-family="Georgia, serif" font-size="69" fill="#faf4e6">Ihre Spürnase.</text>
<text x="89" y="412" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#c2cdc3">Ein kleines Rätsel. Und Sie könnten</text>
<text x="89" y="450" font-family="Helvetica, Arial, sans-serif" font-size="26" fill="#c2cdc3">der entscheidende Hinweis sein.</text>
<rect x="88" y="496" width="252" height="54" rx="27" fill="#e6cd96"/>
<text x="117" y="531" font-family="Helvetica, Arial, sans-serif" font-size="21" fill="#253431">Neugierig geworden?</text>
</svg>`;
await sharp(Buffer.from(artwork))
  .png()
  .toFile(new URL("../public/share-banner.png", import.meta.url).pathname);
