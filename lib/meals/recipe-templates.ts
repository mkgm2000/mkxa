import type { RecipeIngredient, RecipeStep } from './recipes';

export interface RecipeTemplate {
  id: string;
  emoji: string;
  title: string;
  tags: string[];
  prep_minutes: number;
  servings: number;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
}

const ing = (
  name: string,
  quantity: number | null,
  unit: string | null,
  aisle: RecipeIngredient['aisle'],
): RecipeIngredient => ({ name, quantity, unit, aisle });

const step = (position: number, body: string, timer_min: number | null = null): RecipeStep => ({
  position, body, timer_min,
});

export const RECIPE_TEMPLATES: RecipeTemplate[] = [
  {
    id: 'pasta-pomodoro',
    emoji: '🍝',
    title: 'Pasta al pomodoro',
    tags: ['pasta', 'rápido', 'italiano'],
    prep_minutes: 20,
    servings: 2,
    ingredients: [
      ing('Pasta seca', 200, 'g', 'despensa'),
      ing('Tomate triturado', 400, 'g', 'despensa'),
      ing('Ajo', 2, 'diente', 'frutas_verduras'),
      ing('Aceite de oliva', 2, 'cda', 'despensa'),
      ing('Albahaca fresca', null, 'al gusto', 'frutas_verduras'),
      ing('Sal', null, 'al gusto', 'despensa'),
      ing('Parmesano', 30, 'g', 'lacteos'),
    ],
    steps: [
      step(1, 'Pon abundante agua con sal a hervir. Añade la pasta cuando hierva.', 10),
      step(2, 'Sofríe el ajo laminado en aceite a fuego bajo 1 minuto.'),
      step(3, 'Añade el tomate y deja reducir 8 minutos a fuego medio.', 8),
      step(4, 'Escurre la pasta, mézclala con la salsa y termina con albahaca y parmesano.'),
    ],
  },
  {
    id: 'pollo-horno-patatas',
    emoji: '🍗',
    title: 'Pollo al horno con patatas',
    tags: ['horno', 'fácil', 'familiar'],
    prep_minutes: 60,
    servings: 4,
    ingredients: [
      ing('Pollo entero troceado', 1200, 'g', 'carniceria'),
      ing('Patatas', 800, 'g', 'frutas_verduras'),
      ing('Cebolla', 1, 'unidad', 'frutas_verduras'),
      ing('Limón', 1, 'unidad', 'frutas_verduras'),
      ing('Romero fresco', null, 'al gusto', 'frutas_verduras'),
      ing('Aceite de oliva', 4, 'cda', 'despensa'),
      ing('Sal', null, 'al gusto', 'despensa'),
      ing('Pimienta', null, 'al gusto', 'despensa'),
    ],
    steps: [
      step(1, 'Precalienta el horno a 200°C.'),
      step(2, 'Pela y corta las patatas en gajos. Trocea la cebolla.'),
      step(3, 'Coloca pollo y verduras en bandeja, riega con aceite, zumo de limón y especias.'),
      step(4, 'Hornea 50 minutos, dando la vuelta a media cocción.', 50),
    ],
  },
  {
    id: 'ensalada-quinoa',
    emoji: '🥗',
    title: 'Ensalada de quinoa y aguacate',
    tags: ['sano', 'frío', 'vegetariano'],
    prep_minutes: 25,
    servings: 2,
    ingredients: [
      ing('Quinoa', 150, 'g', 'despensa'),
      ing('Aguacate', 1, 'unidad', 'frutas_verduras'),
      ing('Tomate cherry', 200, 'g', 'frutas_verduras'),
      ing('Pepino', 1, 'unidad', 'frutas_verduras'),
      ing('Limón', 1, 'unidad', 'frutas_verduras'),
      ing('Aceite de oliva', 2, 'cda', 'despensa'),
      ing('Menta fresca', null, 'al gusto', 'frutas_verduras'),
      ing('Sal', null, 'al gusto', 'despensa'),
    ],
    steps: [
      step(1, 'Lava y cuece la quinoa 15 minutos en agua con sal.', 15),
      step(2, 'Pica el pepino, los tomates y el aguacate.'),
      step(3, 'Mezcla todo con la quinoa y aliña con limón, aceite, sal y menta.'),
    ],
  },
  {
    id: 'bowl-arroz-salmon',
    emoji: '🍣',
    title: 'Bowl de arroz y salmón',
    tags: ['pescado', 'asiático', 'sano'],
    prep_minutes: 30,
    servings: 2,
    ingredients: [
      ing('Arroz basmati', 200, 'g', 'despensa'),
      ing('Salmón fresco', 300, 'g', 'pescaderia'),
      ing('Aguacate', 1, 'unidad', 'frutas_verduras'),
      ing('Pepino', 1, 'unidad', 'frutas_verduras'),
      ing('Salsa de soja', 3, 'cda', 'despensa'),
      ing('Sésamo', 1, 'cda', 'despensa'),
      ing('Jengibre', 10, 'g', 'frutas_verduras'),
      ing('Aceite de oliva', 1, 'cda', 'despensa'),
    ],
    steps: [
      step(1, 'Cuece el arroz 15 minutos según paquete.', 15),
      step(2, 'Marca el salmón en sartén caliente 2 min por lado.', 4),
      step(3, 'Lamina aguacate y pepino. Ralla el jengibre.'),
      step(4, 'Sirve en bowl: arroz, salmón troceado, vegetales, soja y sésamo.'),
    ],
  },
  {
    id: 'tortilla-francesa',
    emoji: '🍳',
    title: 'Tortilla francesa',
    tags: ['rápido', 'desayuno', 'básico'],
    prep_minutes: 8,
    servings: 1,
    ingredients: [
      ing('Huevos', 3, 'unidad', 'lacteos'),
      ing('Mantequilla', 10, 'g', 'lacteos'),
      ing('Sal', null, 'al gusto', 'despensa'),
      ing('Pimienta', null, 'al gusto', 'despensa'),
    ],
    steps: [
      step(1, 'Bate los huevos con sal y pimienta.'),
      step(2, 'Derrite la mantequilla en sartén antiadherente a fuego medio.'),
      step(3, 'Vierte los huevos, espera 30s y enrolla con espátula.', 1),
    ],
  },
  {
    id: 'salmon-plancha',
    emoji: '🐟',
    title: 'Salmón a la plancha con verdura',
    tags: ['pescado', 'sano', 'rápido'],
    prep_minutes: 20,
    servings: 2,
    ingredients: [
      ing('Salmón en filetes', 300, 'g', 'pescaderia'),
      ing('Calabacín', 1, 'unidad', 'frutas_verduras'),
      ing('Pimiento rojo', 1, 'unidad', 'frutas_verduras'),
      ing('Limón', 1, 'unidad', 'frutas_verduras'),
      ing('Aceite de oliva', 2, 'cda', 'despensa'),
      ing('Sal', null, 'al gusto', 'despensa'),
      ing('Pimienta', null, 'al gusto', 'despensa'),
    ],
    steps: [
      step(1, 'Corta calabacín y pimiento en bastones. Saltéalos en sartén con aceite.', 8),
      step(2, 'Sazona el salmón y márcalo a la plancha 3 min por lado.', 6),
      step(3, 'Sirve con un chorrito de limón.'),
    ],
  },
  {
    id: 'hummus-casero',
    emoji: '🫘',
    title: 'Hummus casero',
    tags: ['frío', 'vegetariano', 'snack'],
    prep_minutes: 10,
    servings: 4,
    ingredients: [
      ing('Garbanzos cocidos', 400, 'g', 'despensa'),
      ing('Tahini', 2, 'cda', 'despensa'),
      ing('Ajo', 1, 'diente', 'frutas_verduras'),
      ing('Limón', 1, 'unidad', 'frutas_verduras'),
      ing('Aceite de oliva', 3, 'cda', 'despensa'),
      ing('Comino', 1, 'cdita', 'despensa'),
      ing('Sal', null, 'al gusto', 'despensa'),
      ing('Pimentón', null, 'al gusto', 'despensa'),
    ],
    steps: [
      step(1, 'Escurre y enjuaga los garbanzos.'),
      step(2, 'Tritura todo en procesador hasta cremoso. Añade agua si hace falta.'),
      step(3, 'Sirve con aceite y pimentón por encima.'),
    ],
  },
  {
    id: 'crema-calabaza',
    emoji: '🎃',
    title: 'Crema de calabaza',
    tags: ['cuchara', 'invierno', 'vegetariano'],
    prep_minutes: 35,
    servings: 4,
    ingredients: [
      ing('Calabaza', 600, 'g', 'frutas_verduras'),
      ing('Cebolla', 1, 'unidad', 'frutas_verduras'),
      ing('Patata', 1, 'unidad', 'frutas_verduras'),
      ing('Caldo de verduras', 500, 'ml', 'despensa'),
      ing('Nata para cocinar', 100, 'ml', 'lacteos'),
      ing('Aceite de oliva', 2, 'cda', 'despensa'),
      ing('Sal', null, 'al gusto', 'despensa'),
      ing('Nuez moscada', null, 'al gusto', 'despensa'),
    ],
    steps: [
      step(1, 'Pela y trocea calabaza, cebolla y patata.'),
      step(2, 'Sofríe la cebolla en una olla con aceite 5 minutos.', 5),
      step(3, 'Añade el resto de verduras y el caldo. Cuece 20 minutos.', 20),
      step(4, 'Tritura, añade nata y sazona al gusto.'),
    ],
  },
];
