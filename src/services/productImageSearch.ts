/**
 * Busca de fotos para produtos (hortifruti).
 * Usa a API aberta do Wikimedia Commons — sem chave, sem custo,
 * com CORS habilitado (origin=*), direto do navegador.
 */

export interface ProductImageOption {
  url: string;
  title: string;
}

// Palavras que não ajudam na busca de foto (embalagem/unidade)
const NOISE_WORDS = new Set([
  'kg', 'cx', 'un', 'saco', 'bandeja', 'duzia', 'dúzia', 'especial', 'comum',
  'nacional', 'lavada', 'selecionada', 'mista', 'verde', 'italiana', 'extra',
  '1a', '2a', 'tipo', 'folhas', 'mistura',
]);

/** Simplifica "Tomate Italiano 1A" -> "tomate" | "Maçã Gala" -> "maçã gala" */
function buildQuery(name: string): string {
  const words = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[\s\-\/]+/)
    .filter((w) => w.length > 1 && !NOISE_WORDS.has(w) && !/^\d/.test(w));
  // No máximo 2 palavras principais para não perder relevância
  return words.slice(0, 2).join(' ') || name;
}

export async function searchProductImages(
  productName: string,
  max = 4
): Promise<ProductImageOption[]> {
  const q = buildQuery(productName);
  if (!q) return [];

  const url =
    'https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*' +
    '&generator=search&gsrnamespace=6&gsrlimit=10&prop=imageinfo' +
    '&iiprop=url|mime&iiurlwidth=480' +
    `&gsrsearch=${encodeURIComponent(q + ' filetype:bitmap')}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return [];

    const json = await res.json();
    const pages: any[] = Object.values(json?.query?.pages || {});
    // "index" é a ordem de relevância da busca
    pages.sort((a, b) => (a.index ?? 99) - (b.index ?? 99));

    const seen = new Set<string>();
    const options: ProductImageOption[] = [];
    for (const page of pages) {
      const info = page?.imageinfo?.[0];
      const thumb = info?.thumburl || info?.url;
      if (!thumb || info?.mime === 'image/svg+xml' || info?.mime === 'image/gif') continue;
      if (seen.has(thumb)) continue;
      seen.add(thumb);
      options.push({
        url: thumb,
        title: String(page.title || '').replace(/^File:/, ''),
      });
      if (options.length >= max) break;
    }
    return options;
  } catch {
    return [];
  }
}
