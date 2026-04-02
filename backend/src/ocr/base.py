"""
OCR Interface
YOU must implement the following methods:
- preprocess(self, image: np.ndarray) -> np.ndarray:
- detect_text(self, processed_image: np.ndarray) -> List[OCRWord]:
- postprocess(self, raw_data: List[OCRWord]) -> OCRResult:
Then, to use the OCR interface, you need to create a subclass of OCRInterface and implement the above methods.
Then, you can use the OCRInterface to run the OCR processing pipeline.
Example:
class MyOCR(OCRInterface):
    def preprocess(self, image: np.ndarray) -> np.ndarray:
        return image
    def detect_text(self, processed_image: np.ndarray) -> List[OCRWord]:
        return []
    def postprocess(self, raw_data: List[OCRWord]) -> OCRResult:
        return OCRResult(words=[], raw_text="", average_confidence=0.0)
Directories:
- backend/src/ocr/tesseract: for Tesseract OCR
    ...
"""
import numpy as np
from typing import List, Dict
from abc import ABC, abstractmethod
from src.utils.logger import setup_logger
from src.ocr.ocr_schema import OCRResult, OCRWord

class OCRInterface(ABC):
    def __init__(self):
        self.logger = setup_logger(self.__class__.__name__)
    
    def run(self, image: np.ndarray) -> OCRResult:
        """
        OCR processing pipeline
        INPUT: numpy array of the input image
        OUTPUT: an OCRResult object
        """
        preprocessed = self.preprocess(image=image)
        words = self.detect_text(processed_image=preprocessed)
        ocr_result = self.postprocess(raw_data=words)
        return ocr_result

    @abstractmethod
    def preprocess(self, image: np.ndarray) -> np.ndarray: 
        """
        Clean the image
        INPUT: numpy array of the input image
        OUTPUT: numpy array of the preprocessed image
        """
        pass

    @abstractmethod 
    def detect_text(self, processed_image: np.ndarray) -> List[OCRWord]:
        """
        Detect the text bounding boxes
        INPUT: numpy array of the preprocessed image
        OUTPUT: a list of OCRWord objects
        Example:
        [
            OCRWord(text="Hello, world!", confidence=0.95, box=[100, 100, 200, 200]),
        ]
        """
        pass

    @abstractmethod
    def postprocess(self, raw_data: List[OCRWord]) -> OCRResult:
        """
        Reformatting, using LLM
        INPUT: a list of OCRWord objects
        OUTPUT: an OCRResult object
        Example:
        OCRResult(words=[OCRWord(text="Hello, world!", confidence=0.95, box=[100, 100, 200, 200])], raw_text="Hello, world!", average_confidence=0.95)
        """
        pass