"""JWT issuing and the httpOnly refresh-token cookie.

The short-lived access token is returned in the response body and kept in
memory by the SPA. The long-lived refresh token is only ever stored in an
httpOnly cookie scoped to ``/api/auth/`` so page scripts cannot read it.
"""
from django.conf import settings
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
from rest_framework_simplejwt.tokens import RefreshToken


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return str(refresh.access_token), str(refresh)


def set_refresh_cookie(response, refresh_token):
    config = settings.AUTH_REFRESH_COOKIE
    response.set_cookie(
        config["NAME"],
        refresh_token,
        max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        path=config["PATH"],
        domain=config["DOMAIN"],
        secure=config["SECURE"],
        httponly=True,
        samesite=config["SAMESITE"],
    )
    return response


def clear_refresh_cookie(response):
    config = settings.AUTH_REFRESH_COOKIE
    response.delete_cookie(config["NAME"], path=config["PATH"], domain=config["DOMAIN"], samesite=config["SAMESITE"])
    return response


def refresh_token_from_request(request):
    token = request.COOKIES.get(settings.AUTH_REFRESH_COOKIE["NAME"])
    if not token and isinstance(request.data, dict):
        # Non-browser API clients may send the token in the body instead.
        token = request.data.get("refresh")
    return token or None


def blacklist_all_tokens(user):
    """Invalidate every refresh token of ``user`` (password change, account deletion)."""
    for token in OutstandingToken.objects.filter(user=user):
        BlacklistedToken.objects.get_or_create(token=token)
