"""Definición del modelo: transfer learning sobre ResNet50 (ImageNet).

DeepWeeds reporta buenos resultados con ResNet50 / InceptionV3; acá se usa
ResNet50 como base congelada + cabeza de clasificación para las 8 especies.
"""

from weed_api.config import settings
from weed_api.labels import NUM_CLASSES


def build_model(image_size: int | None = None):
    """Construye el modelo Keras (base preentrenada + cabeza densa).

    Import de tensorflow adentro para no pagar el arranque en quien solo
    importe utilidades del paquete.
    """
    import tensorflow as tf

    size = image_size or settings.image_size

    base = tf.keras.applications.ResNet50(
        include_top=False,
        weights="imagenet",
        input_shape=(size, size, 3),
        pooling="avg",
    )
    base.trainable = False  # fase 1: solo se entrena la cabeza

    inputs = tf.keras.Input(shape=(size, size, 3))
    x = base(inputs, training=False)
    x = tf.keras.layers.Dropout(0.2)(x)
    outputs = tf.keras.layers.Dense(NUM_CLASSES, activation="softmax")(x)

    model = tf.keras.Model(inputs, outputs, name="weed_classifier")
    model.compile(
        optimizer="adam",
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"],
    )
    return model
