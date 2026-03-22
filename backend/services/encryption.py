import base64
import hashlib
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC


def derive_key_from_pin(pin: str, salt: bytes = None) -> tuple[bytes, bytes]:
    """Derive a Fernet-compatible key from user PIN. Returns (key, salt)."""
    if salt is None:
        salt = base64.urlsafe_b64encode(hashlib.sha256(pin.encode()).digest()[:16])
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=480000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(pin.encode()))
    return key, salt


def get_fernet(pin: str, salt: bytes = None) -> tuple[Fernet, bytes]:
    """Get Fernet instance and salt for a user PIN."""
    key, salt = derive_key_from_pin(pin, salt)
    return Fernet(key), salt


def encrypt_content(content: str, pin: str, salt: bytes = None) -> tuple[str, str]:
    """Encrypt journal content. Returns (encrypted_b64, salt_b64)."""
    f, salt = get_fernet(pin, salt)
    encrypted = f.encrypt(content.encode("utf-8"))
    return base64.urlsafe_b64encode(encrypted).decode("ascii"), base64.urlsafe_b64encode(salt).decode("ascii")


def decrypt_content(encrypted_b64: str, pin: str, salt_b64: str) -> str:
    """Decrypt journal content."""
    salt = base64.urlsafe_b64decode(salt_b64.encode("ascii"))
    f, _ = get_fernet(pin, salt)
    encrypted = base64.urlsafe_b64decode(encrypted_b64.encode("ascii"))
    return f.decrypt(encrypted).decode("utf-8")
