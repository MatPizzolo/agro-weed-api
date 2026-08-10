/**
 * Metadatos de las 8 especies DeepWeeds (binomiales según Olsen et al. 2019).
 * `id` es la etiqueta exacta del modelo (src/weed_api/labels.py).
 * `es` es el titular: nombre común verificado en Argentina o, si no existe,
 * el nombre científico — no se inventan nombres vernáculos.
 */

export interface Species {
  id: string;
  es: string;
  scientific: string;
  blurb: string;
  image: string;
}

export const PLACEHOLDER_IMAGE = "/species/placeholder.svg";

export const SPECIES: Species[] = [
  {
    id: "Chinee apple",
    es: "Ziziphus mauritiana",
    scientific: "Ziziphus mauritiana",
    blurb: "Árbol espinoso de fruto pequeño; invasor agresivo de pasturas tropicales.",
    image: "/species/chinee-apple.jpg",
  },
  {
    id: "Lantana",
    es: "Lantana",
    scientific: "Lantana camara",
    blurb: "Arbusto de flores multicolores; tóxica para el ganado e invasora de pasturas.",
    image: "/species/lantana.jpg",
  },
  {
    id: "Parkinsonia",
    es: "Cina-cina",
    scientific: "Parkinsonia aculeata",
    blurb: "Árbol espinoso de ramas verdes; forma matorrales densos junto al agua.",
    image: "/species/parkinsonia.jpg",
  },
  {
    id: "Parthenium",
    es: "Parthenium hysterophorus",
    scientific: "Parthenium hysterophorus",
    blurb: "Hierba anual de flores blancas pequeñas; alergénica y muy competitiva.",
    image: "/species/parthenium.jpg",
  },
  {
    id: "Prickly acacia",
    es: "Vachellia nilotica",
    scientific: "Vachellia nilotica",
    blurb: "Acacia espinosa; invade pastizales y compite con las forrajeras.",
    image: "/species/prickly-acacia.jpg",
  },
  {
    id: "Rubber vine",
    es: "Cryptostegia grandiflora",
    scientific: "Cryptostegia grandiflora",
    blurb: "Enredadera de látex tóxico; cubre y asfixia la vegetación nativa.",
    image: "/species/rubber-vine.jpg",
  },
  {
    id: "Siam weed",
    es: "Chromolaena odorata",
    scientific: "Chromolaena odorata",
    blurb: "Arbusto de crecimiento muy rápido; forma matas densas que desplazan pasturas.",
    image: "/species/siam-weed.jpg",
  },
  {
    id: "Snake weed",
    es: "Stachytarpheta spp.",
    scientific: "Stachytarpheta spp.",
    blurb: "Hierba de espigas azul-violáceas; común en pasturas degradadas.",
    image: "/species/snake-weed.jpg",
  },
];

export function speciesByLabel(label: string): Species | undefined {
  return SPECIES.find((s) => s.id === label);
}
