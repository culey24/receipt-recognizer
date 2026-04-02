import logging
import os
from logging.handlers import RotatingFileHandler
from pathlib import Path

def setup_logger(name: str, log_folder: str = "logs", level=logging.INFO):
    """
    Hàm khởi tạo logger dùng chung cho toàn hệ thống.
    """
    # 1. Tạo thư mục logs nếu chưa có
    log_path = Path(log_folder)
    log_path.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger(name)
    
    # Nếu logger đã có handler rồi thì không thêm nữa (tránh trùng lặp log)
    if not logger.handlers:
        logger.setLevel(level)

        # 2. Định dạng log: Thời gian - Tên Module - Cấp độ - Thông điệp
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

        # 3. Handler 1: Ghi ra Console (Màn hình)
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)

        # 4. Handler 2: Ghi ra File (Tự động xoay file khi đạt 5MB, giữ tối đa 3 file)
        file_handler = RotatingFileHandler(
            log_path / "ocr_system.log", 
            maxBytes=5*1024*1024, 
            backupCount=3,
            encoding='utf-8'
        )
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)

    return logger