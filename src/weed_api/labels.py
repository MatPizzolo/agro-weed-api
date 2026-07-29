"""Etiquetas del dataset DeepWeeds (8 especies + negativo).

Fuente compartida por entrenamiento e inferencia: el orden de esta lista
define el índice de cada clase en la salida del modelo. NO reordenar sin
reentrenar.
"""

# Orden canónico del dataset DeepWeeds.
LABELS: list[str] = [
    "Chinee apple",
    "Lantana",
    "Parkinsonia",
    "Parthenium",
    "Prickly acacia",
    "Rubber vine",
    "Siam weed",
    "Snake weed",
    "Negative",  # ninguna maleza de interés
]

NUM_CLASSES: int = len(LABELS)


def label_for_index(index: int) -> str:
    """Devuelve el nombre de la especie para un índice de clase."""
    return LABELS[index]
