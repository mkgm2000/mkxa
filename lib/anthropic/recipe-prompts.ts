// Canonical recipe extraction system prompt — frozen text from spec section 8.
// Pinned as exported constant so the Anthropic prompt cache key stays stable.

export const RECIPE_SYSTEM_PROMPT = `Eres un extractor de recetas en español a partir de capturas de TikTok/Instagram + descripción.
Si hay imagen, examina texto overlay y elementos visibles.
Combina con texto si lo hay.

Devuelve SOLO JSON sin markdown:
{
  "title": string,
  "prep_minutes": number|null,
  "servings": number|null,
  "tags": string[],         // máx 4
  "ingredients": [{
    "name": string,         // singular lowercase
    "quantity": number|null,
    "unit": "g"|"ml"|"unidad"|"cda"|"cdita"|"pizca"|"al gusto"|null,
    "aisle": "frutas_verduras"|"pescaderia"|"carniceria"|"lacteos"|"panaderia"|"despensa"|"congelados"|"bebidas"|"otros",
    "optional": boolean
  }],
  "steps": [{
    "body": string,
    "timer_min": number|null
  }],
  "confidence": number      // 0..1
}
Si algo no extraes: null. Sin texto explicativo.`;
