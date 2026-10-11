from django.contrib.auth import get_user_model
from django.db.models import Q


def find_active_user(identifier):
    """Find an active user by exact username, or by a *unique* case-insensitive
    username/e-mail match. Returns ``None`` when nothing (or more than one
    account) matches."""
    User = get_user_model()
    identifier = (identifier or "").strip()
    if not identifier:
        return None
    user = User.objects.filter(username=identifier, is_active=True).first()
    if user:
        return user
    matches = list(
        User.objects.filter(Q(username__iexact=identifier) | Q(email__iexact=identifier), is_active=True)[:2]
    )
    return matches[0] if len(matches) == 1 else None
