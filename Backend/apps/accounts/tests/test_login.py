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


@pytest.mark.django_db
def test_successful_login(client, test_user):
    payload = {
        "username": "testas",
        "password": "slaptazodis1",
    }
    response = client.post("/api/auth/login/", payload, format="json")
    assert response.status_code == status.HTTP_200_OK
    assert "access" in response.data
    assert "refresh" in response.data


@pytest.mark.django_db
def test_login_with_wrong_username(client, test_user):
    payload = {
        "username": "blogasvardas",
        "password": "slaptazodis1",
    }
    response = client.post("/api/auth/login/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "username" in response.data


@pytest.mark.django_db
def test_login_with_wrong_password(client, test_user):
    payload = {
        "username": "testas",
        "password": "blogasslaptazodis",
    }
    response = client.post("/api/auth/login/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.data


@pytest.mark.django_db
def test_login_missing_username(client):
    payload = {
        "username": "",
        "password": "slaptazodis1",
    }
    response = client.post("/api/auth/login/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "username" in response.data


@pytest.mark.django_db
def test_login_missing_password(client):
    payload = {
        "username": "testas",
        "password": "",
    }
    response = client.post("/api/auth/login/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password" in response.data