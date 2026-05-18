from fastapi import Request
from slowapi import Limiter


def get_rate_limit_key(request: Request) -> str:
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=get_rate_limit_key)
