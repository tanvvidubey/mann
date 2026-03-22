from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db, UserModel, init_db
from routes.deps import get_current_user
from models import ProfileResponse, ProfileUpdate

router = APIRouter(prefix="/api/profile", tags=["profile"])


def _profile_from_user(u: UserModel) -> ProfileResponse:
    hobbies = u.hobbies if isinstance(u.hobbies, list) else None
    return ProfileResponse(
        name=u.name,
        email=u.email,
        bio=getattr(u, "bio", None) or None,
        hobbies=hobbies,
        likes=getattr(u, "likes", None) or None,
        dislikes=getattr(u, "dislikes", None) or None,
        other_details=getattr(u, "other_details", None) or None,
        email_verified=bool(getattr(u, "email_verified", 0)),
    )


@router.get("", response_model=ProfileResponse)
def get_profile(
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    init_db()
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _profile_from_user(user)


@router.patch("", response_model=ProfileResponse)
def update_profile(
    body: ProfileUpdate,
    user_id: int = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    init_db()
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if body.name is not None:
        user.name = body.name
    if body.bio is not None:
        user.bio = body.bio
    if body.hobbies is not None:
        user.hobbies = body.hobbies
    if body.likes is not None:
        user.likes = body.likes
    if body.dislikes is not None:
        user.dislikes = body.dislikes
    if body.other_details is not None:
        user.other_details = body.other_details
    db.commit()
    db.refresh(user)
    return _profile_from_user(user)
