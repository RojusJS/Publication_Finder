import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def test_user():
    return User.objects.create_user(
        username="testas",
        email="testas@gmail.com",
        password="slaptazodis1",
    )


@pytest.fixture
def admin_user():
    return User.objects.create_user(
        username="adminas",
        email="adminas@gmail.com",
        password="slaptazodis1",
        is_staff=True,
    )


@pytest.fixture
def auth_client(client, test_user):
    client.force_authenticate(user=test_user)
    return client


@pytest.fixture
def admin_client(client, admin_user):
    client.force_authenticate(user=admin_user)
    return client


@pytest.mark.django_db
def test_me_returns_correct_data(auth_client, test_user):
    response = auth_client.get("/api/auth/me/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["username"] == test_user.username
    assert response.data["email"] == test_user.email
    assert response.data["id"] == test_user.id
    assert "is_staff" in response.data


@pytest.mark.django_db
def test_me_unauthenticated_returns_401(client):
    response = client.get("/api/auth/me/")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


@pytest.mark.django_db
def test_me_is_staff_false_for_regular_user(auth_client):
    response = auth_client.get("/api/auth/me/")
    assert response.data["is_staff"] is False


@pytest.mark.django_db
def test_user_list_accessible_by_admin(admin_client, test_user):
    response = admin_client.get("/api/auth/users/")
    assert response.status_code == status.HTTP_200_OK
    usernames = [u["username"] for u in response.data]
    assert "testas" in usernames


@pytest.mark.django_db
def test_user_list_excludes_superuser(admin_client):
    superuser = User.objects.create_superuser(
        username="superuser",
        email="super@gmail.com",
        password="slaptazodis1",
    )
    response = admin_client.get("/api/auth/users/")
    assert response.status_code == status.HTTP_200_OK
    usernames = [u["username"] for u in response.data]
    assert "superuser" not in usernames


@pytest.mark.django_db
def test_user_list_blocked_for_non_admin(auth_client):
    response = auth_client.get("/api/auth/users/")
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
def test_user_list_blocked_for_unauthenticated(client):
    response = client.get("/api/auth/users/")
    assert response.status_code in [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]


@pytest.mark.django_db
def test_admin_can_delete_user(admin_client, test_user):
    response = admin_client.delete(f"/api/auth/users/{test_user.id}/")
    assert response.status_code == status.HTTP_204_NO_CONTENT
    assert not User.objects.filter(id=test_user.id).exists()


@pytest.mark.django_db
def test_admin_cannot_delete_superuser(admin_client):
    superuser = User.objects.create_superuser(
        username="superuser",
        email="super@gmail.com",
        password="slaptazodis1",
    )
    response = admin_client.delete(f"/api/auth/users/{superuser.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert User.objects.filter(id=superuser.id).exists()


@pytest.mark.django_db
def test_delete_nonexistent_user_returns_404(admin_client):
    response = admin_client.delete("/api/auth/users/99999/")
    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_non_admin_cannot_delete_user(auth_client, test_user):
    other = User.objects.create_user(username="kitas", email="kitas@gmail.com", password="slaptazodis1")
    response = auth_client.delete(f"/api/auth/users/{other.id}/")
    assert response.status_code == status.HTTP_403_FORBIDDEN