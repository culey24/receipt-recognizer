from pydantic import BaseModel
from typing import List

class OCRWord(BaseModel):
    text: str                   # the text detected inside the ocr of course
    confidence: float           # from 0.0 to 1.0
    box: List[int]              # [x, y, width, height] for FRONTEND detecting

class OCRResult(BaseModel):
    words: List[OCRWord]
    raw_text: str
    average_confidence: float