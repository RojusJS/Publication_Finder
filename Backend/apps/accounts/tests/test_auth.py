import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

from apps.projects.models import Project, SavedPublication, SearchHistory
from conftest import PASSWORD

pytestmark = pytest.mark.django_db
User = get_user_model()
COOKIE = "pf_refresh"


def register(client, **overrides):
    payload = {"username": "jonas", "email": "Jonas@Example.com", "password": PASSWORD, "password2": PASSWORD}
    payload.update(overrides)
    return client.post("/api/auth/register/", payload, format="json")


def test_register_creates_user_and_starts_session(api_client):
    response = register(api_client)
    assert response.status_code == 201
    body = response.json()
    assert body["access"]
    assert body["user"]["username"] == "jonas"
    assert "password" not in body["user"]
    cookie = response.cookies[COOKIE]
    assert cookie["httponly"]
    assert cookie["path"] == "/api/auth/"
    user = User.objects.get(username="jonas")
    assert user.check_password(PASSWORD)
    assert user.email == "Jonas@example.com"


@pytest.mark.parametrize("overrides, field", [
    ({"password2": "Different-Horse-42"}, "password2"),
    ({"password": "short", "password2": "short"}, "password"),
    ({"password": "1234567890123", "password2": "1234567890123"}, "password"),
    ({"password": "password1234", "password2": "password1234"}, "password"),
    ({"email": ""}, "email"),
    ({"email": "not-an-email"}, "email"),
    ({"username": ""}, "username"),
    ({"username": "bad name!"}, "username"),
])
def test_register_validation(api_client, overrides, field):
    response = register(api_client, **overrides)
    assert response.status_code == 400
    assert field in response.json()["fields"]


def test_register_rejects_duplicate_username_and_email_case_insensitively(api_client, make_user):
    make_user("Jonas", email="jonas@example.com")
    assert "username" in register(api_client, email="other@example.com").json()["fields"]
    assert "email" in register(api_client, username="other", email="JONAS@example.com").json()["fields"]


def test_login_with_username_or_email(api_client, make_user):
    make_user("ada", email="ada@example.com")
    by_username = api_client.post("/api/auth/login/", {"username": "ada", "password": PASSWORD}, format="json")
    assert by_username.status_code == 200
    assert by_username.json()["user"]["username"] == "ada"
    by_email = api_client.post("/api/auth/login/", {"username": "ADA@example.com", "password": PASSWORD}, format="json")
    assert by_email.status_code == 200


def test_login_errors_do_not_reveal_whether_user_exists(api_client, make_user):
    make_user("ada")
    wrong_password = api_client.post("/api/auth/login/", {"username": "ada", "password": "nope"}, format="json")
    unknown_user = api_client.post("/api/auth/login/", {"username": "nobody", "password": "nope"}, format="json")
    assert wrong_password.status_code == unknown_user.status_code == 400
    assert wrong_password.json() == unknown_user.json()
    assert wrong_password.json()["code"] == "invalid_credentials"


def test_inactive_user_cannot_login(api_client, make_user):
    make_user("ada", is_active=False)
    response = api_client.post("/api/auth/login/", {"username": "ada", "password": PASSWORD}, format="json")
    assert response.status_code == 400


def test_refresh_uses_cookie_and_logout_blacklists_it(api_client):
    register(api_client)
    refreshed = api_client.post("/api/auth/refresh/")
    assert refreshed.status_code == 200
    assert refreshed.json()["access"]

    logout = api_client.post("/api/auth/logout/")
    assert logout.status_code == 204
    assert logout.cookies[COOKIE].value == ""
    assert BlacklistedToken.objects.count() == 1


def test_refresh_without_or_with_invalid_cookie(api_client):
    missing = api_client.post("/api/auth/refresh/")
    assert missing.status_code == 401
    assert missing.json()["code"] == "not_authenticated"
    api_client.cookies[COOKIE] = "garbage"
    invalid = api_client.post("/api/auth/refresh/")
    assert invalid.status_code == 401
    assert invalid.json()["code"] == "session_expired"


def test_access_token_authenticates_requests(api_client):
    access = register(api_client).json()["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")
    me = api_client.get("/api/auth/me/")
    assert me.status_code == 200
    assert me.json()["username"] == "jonas"
    assert set(me.json()) == {"id", "username", "email", "is_staff", "is_superuser", "date_joined"}


def test_me_requires_authentication(api_client):
    response = api_client.get("/api/auth/me/")
    assert response.status_code == 401
    assert response.json()["code"] == "not_authenticated"


def test_update_email(auth_client, user, make_user):
    make_user("taken", email="taken@example.com")
    assert auth_client.patch("/api/auth/me/", {"email": "TAKEN@example.com"}, format="json").status_code == 400
    response = auth_client.patch("/api/auth/me/", {"email": "new@example.com"}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.email == "new@example.com"


def test_change_password_revokes_other_sessions(api_client, client_for):
    register(api_client)
    other_session = api_client.cookies[COOKIE].value
    user = User.objects.get(username="jonas")
    client = client_for(user)
    bad = client.post("/api/auth/me/password/", {"current_password": "wrong", "new_password": "Brand-New-Pass-77"}, format="json")
    assert bad.status_code == 400
    weak = client.post("/api/auth/me/password/", {"current_password": PASSWORD, "new_password": "123"}, format="json")
    assert weak.status_code == 400
    ok = client.post("/api/auth/me/password/", {"current_password": PASSWORD, "new_password": "Brand-New-Pass-77"}, format="json")
    assert ok.status_code == 200
    assert ok.json()["access"]
    user.refresh_from_db()
    assert user.check_password("Brand-New-Pass-77")

    from rest_framework.test import APIClient
    stale = APIClient()
    stale.cookies[COOKIE] = other_session
    assert stale.post("/api/auth/refresh/").status_code == 401


def test_delete_account_requires_password(auth_client, user):
    assert auth_client.delete("/api/auth/me/", {"password": "wrong"}, format="json").status_code == 400
    assert auth_client.delete("/api/auth/me/", {"password": PASSWORD}, format="json").status_code == 204
    assert not User.objects.filter(pk=user.pk).exists()


# -- administration ---------------------------------------------------------

def test_admin_user_list_counts_and_search(client_for, make_user):
    admin = make_user("admin", is_staff=True)
    member = make_user("member")
    project = Project.objects.create(user=member, name="P")
    SavedPublication.objects.create(project=project, openalex_id="https://openalex.org/W1", title="T")
    SearchHistory.objects.create(user=member, query="q")
    client = client_for(admin)
    data = client.get("/api/auth/users/", {"q": "mem"}).json()
    assert data["count"] == 1
    row = data["results"][0]
    assert (row["project_count"], row["publication_count"], row["search_count"]) == (1, 1, 1)


def test_non_admin_cannot_list_users(auth_client):
    assert auth_client.get("/api/auth/users/").status_code == 403


def test_admin_delete_rules(client_for, make_user):
    staff = make_user("staff", is_staff=True)
    other_staff = make_user("staff2", is_staff=True)
    superuser = User.objects.create_superuser("root", "root@example.com", PASSWORD)
    regular = make_user("regular")
    client = client_for(staff)
    assert client.delete(f"/api/auth/users/{staff.id}/").status_code == 403
    assert client.delete(f"/api/auth/users/{superuser.id}/").status_code == 403
    assert client.delete(f"/api/auth/users/{other_staff.id}/").status_code == 403
    assert client.delete(f"/api/auth/users/{regular.id}/").status_code == 204
    assert client_for(superuser).delete(f"/api/auth/users/{other_staff.id}/").status_code == 204


def test_only_superuser_can_toggle_staff(client_for, make_user):
    staff = make_user("staff", is_staff=True)
    regular = make_user("regular")
    superuser = User.objects.create_superuser("root", "root@example.com", PASSWORD)
    assert client_for(staff).post(f"/api/auth/users/{regular.id}/toggle-staff/").status_code == 403
    response = client_for(superuser).post(f"/api/auth/users/{regular.id}/toggle-staff/")
    assert response.status_code == 200
    assert response.json()["is_staff"] is True
    assert client_for(superuser).post(f"/api/auth/users/{superuser.id}/toggle-staff/").status_code == 403


def test_health_endpoint(api_client):
    response = api_client.get("/api/health/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
