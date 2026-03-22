from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from routes.auth import get_current_user_id

security = HTTPBearer(auto_error=False)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> int:
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return get_current_user_id(credentials.credentials)
