from fastapi import Request
from slowapi import Limiter


def get_rate_limit_key(request: Request) -> str:
    # ponytail: trusts first X-Forwarded-For hop; fine behind Traefik-only ingress.
    # Move to a per-user key (and shared storage) when running >1 backend replica.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_rate_limit_key)
