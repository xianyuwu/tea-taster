import re


def sanitize_string(value: str, max_len: int = 500) -> str:
    return value.strip()[:max_len]


def validate_filename(filename: str) -> bool:
    if not filename or ".." in filename or "/" in filename or "\\" in filename:
        return False
    return bool(re.match(r"^[a-zA-Z0-9._-]+$", filename))


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def is_allowed_image(ext: str) -> bool:
    return ext.lower() in ALLOWED_EXTENSIONS
