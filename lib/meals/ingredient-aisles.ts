import type { Aisle } from './recipes';

// Substring keywords → aisle. First match wins (order matters for specificity).
const RULES: Array<[Aisle, string[]]> = [
  ['lacteos', ['leche', 'yogur', 'yogurt', 'queso', 'parmesano', 'mozzarella', 'cheddar', 'mantequilla', 'manteca', 'nata', 'crema', 'kefir', 'huevo', 'huevos', 'requeson', 'requesón', 'mascarpone', 'ricotta', 'philadelphia']],
  ['carniceria', ['pollo', 'pavo', 'ternera', 'cerdo', 'lomo', 'chorizo', 'jamon', 'jamón', 'bacon', 'panceta', 'salchicha', 'longaniza', 'pechuga', 'muslo', 'solomillo', 'carne picada', 'butifarra', 'chuleta', 'costilla']],
  ['pescaderia', ['salmon', 'salmón', 'atun', 'atún', 'merluza', 'bacalao', 'gamba', 'gambas', 'langostino', 'mejillon', 'mejillón', 'calamar', 'pulpo', 'sardina', 'boquerón', 'boqueron', 'lubina', 'dorada', 'rape', 'rodaballo']],
  ['frutas_verduras', ['ajo', 'cebolla', 'tomate', 'pimiento', 'lechuga', 'patata', 'zanahoria', 'apio', 'puerro', 'calabacin', 'calabacín', 'berenjena', 'brocoli', 'brócoli', 'coliflor', 'espinaca', 'rucula', 'rúcula', 'limon', 'limón', 'lima', 'naranja', 'manzana', 'platano', 'plátano', 'pera', 'fresa', 'frambuesa', 'arandano', 'arándano', 'aguacate', 'piña', 'mango', 'kiwi', 'uva', 'sandía', 'sandia', 'melón', 'melon', 'jengibre', 'perejil', 'cilantro', 'albahaca', 'menta', 'champiñón', 'champinon', 'seta', 'rábano', 'rabano', 'judía', 'judia', 'guisante']],
  ['panaderia', ['pan', 'baguette', 'chapata', 'bollo', 'croissant', 'tostada', 'pan rallado', 'panko']],
  ['congelados', ['congelad', 'helado', 'sorbete']],
  ['bebidas', ['agua', 'refresco', 'cerveza', 'vino', 'cava', 'zumo', 'caldo', 'leche de coco', 'leche de almendra']],
  ['limpieza', ['detergente', 'lavavajillas', 'limpiador', 'lejía', 'lejia', 'estropajo', 'bayeta', 'papel higienico', 'papel higiénico']],
  ['despensa', ['aceite', 'oliva', 'sal', 'pimienta', 'azucar', 'azúcar', 'harina', 'levadura', 'vinagre', 'soja', 'arroz', 'pasta', 'espagueti', 'macarron', 'macarrón', 'fideo', 'cuscús', 'cuscus', 'quinoa', 'lenteja', 'garbanzo', 'alubia', 'frijol', 'judia blanca', 'maíz', 'maiz', 'tomate frito', 'tomate triturado', 'caldo en polvo', 'comino', 'curry', 'pimentón', 'pimenton', 'oregano', 'orégano', 'tomillo', 'romero', 'laurel', 'canela', 'nuez moscada', 'cacao', 'chocolate', 'miel', 'mermelada', 'cacahuete', 'almendra', 'nuez', 'pasa', 'galleta', 'cereal', 'avena', 'mostaza', 'ketchup', 'mayonesa', 'salsa']],
];

export function inferAisle(name: string): Aisle {
  const n = name.trim().toLowerCase();
  if (!n) return 'otros';
  for (const [aisle, keywords] of RULES) {
    for (const kw of keywords) {
      if (n.includes(kw)) return aisle;
    }
  }
  return 'otros';
}

export interface CommonIngredient {
  name: string;
  quantity: number | null;
  unit: string | null;
}

// Quick-add chips: the most reusable ingredients across most recipes.
export const COMMON_INGREDIENTS: CommonIngredient[] = [
  { name: 'Aceite de oliva', quantity: 2, unit: 'cda' },
  { name: 'Sal', quantity: null, unit: 'al gusto' },
  { name: 'Pimienta', quantity: null, unit: 'al gusto' },
  { name: 'Ajo', quantity: 2, unit: 'diente' },
  { name: 'Cebolla', quantity: 1, unit: 'unidad' },
  { name: 'Tomate', quantity: 2, unit: 'unidad' },
  { name: 'Huevos', quantity: 2, unit: 'unidad' },
  { name: 'Mantequilla', quantity: 30, unit: 'g' },
  { name: 'Limón', quantity: 1, unit: 'unidad' },
  { name: 'Pasta', quantity: 200, unit: 'g' },
  { name: 'Arroz', quantity: 200, unit: 'g' },
  { name: 'Pollo', quantity: 400, unit: 'g' },
];
