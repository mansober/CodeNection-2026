from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()
# Always run a password verification, including for an unknown email, so the
# most common invalid-login paths have comparable work.
DUMMY_HASH = password_hash.hash("not-a-real-santai-password")


def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(password: str, encoded: str | None) -> bool:
    candidate = encoded or DUMMY_HASH
    try:
        valid = password_hash.verify(password, candidate)
    except (TypeError, ValueError):
        return False
    return encoded is not None and valid
