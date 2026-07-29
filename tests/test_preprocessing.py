import numpy as np
from PIL import Image

from weed_api.preprocessing import preprocess_pil


def test_preprocess_shape_and_range():
    image = Image.new("RGB", (640, 480), color=(120, 200, 60))
    batch = preprocess_pil(image, image_size=224)

    assert batch.shape == (1, 224, 224, 3)
    assert batch.dtype == np.float32
    assert batch.min() >= 0.0 and batch.max() <= 1.0
