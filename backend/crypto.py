import os
from cryptography.fernet import Fernet

_key = os.getenv("ENCRYPTION_KEY")
_fernet = Fernet(_key.encode()) if _key else None


def encrypt_token(token: str) -> str:
    if not _fernet:
        raise RuntimeError("ENCRYPTION_KEY not configured")
    return _fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted: str) -> str:
    if not _fernet:
        raise RuntimeError("ENCRYPTION_KEY not configured")
    return _fernet.decrypt(encrypted.encode()).decode()
