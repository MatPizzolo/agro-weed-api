"""Metadatos de las clases DeepWeeds (binomiales según Olsen et al. 2019).

El orden replica el orden canónico de `weed_api.labels.LABELS`.
Los nombres comunes en español solo se incluyen cuando son verificables
en Argentina; no se inventan nombres vernáculos.
"""

from weed_api.api.schemas import SpeciesInfo

SPECIES: list[SpeciesInfo] = [
    SpeciesInfo(
        label="Chinee apple",
        scientific="Ziziphus mauritiana",
        blurb="Árbol espinoso de fruto pequeño; invasor agresivo de pasturas tropicales.",
    ),
    SpeciesInfo(
        label="Lantana",
        scientific="Lantana camara",
        common_es="Lantana",
        blurb="Arbusto de flores multicolores; tóxica para el ganado e invasora de pasturas.",
    ),
    SpeciesInfo(
        label="Parkinsonia",
        scientific="Parkinsonia aculeata",
        common_es="Cina-cina",
        blurb="Árbol espinoso de ramas verdes; forma matorrales densos junto al agua.",
    ),
    SpeciesInfo(
        label="Parthenium",
        scientific="Parthenium hysterophorus",
        blurb="Hierba anual de flores blancas pequeñas; alergénica y muy competitiva.",
    ),
    SpeciesInfo(
        label="Prickly acacia",
        scientific="Vachellia nilotica",
        blurb="Acacia espinosa; invade pastizales y compite con las forrajeras.",
    ),
    SpeciesInfo(
        label="Rubber vine",
        scientific="Cryptostegia grandiflora",
        blurb="Enredadera de látex tóxico; cubre y asfixia la vegetación nativa.",
    ),
    SpeciesInfo(
        label="Siam weed",
        scientific="Chromolaena odorata",
        blurb="Arbusto de crecimiento muy rápido; forma matas densas que desplazan pasturas.",
    ),
    SpeciesInfo(
        label="Snake weed",
        scientific="Stachytarpheta spp.",
        blurb="Hierba de espigas azul-violáceas; común en pasturas degradadas.",
    ),
    SpeciesInfo(
        label="Negative",
        blurb="Ninguna de las 8 malezas del modelo.",
    ),
]
