import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def valid_payload():
    return {
        "username": "testas",
        "email": "testas@gmail.com",
        "password": "slaptazodis1",
        "password2": "slaptazodis1",
    }

@pytest.mark.django_db
def test_successful_registration(client, valid_payload):
    response = client.post("/api/auth/register/", valid_payload, format="json")
    assert response.status_code == status.HTTP_201_CREATED
    assert User.objects.filter(username="testas").exists()

@pytest.mark.django_db
def test_user_saved_in_db(client, valid_payload):
    client.post("/api/auth/register/", valid_payload, format="json")
    user = User.objects.get(username="testas")
    assert user.email == "testas@gmail.com"
    assert user.date_joined is not None

@pytest.mark.django_db
def test_password_is_hashed(client, valid_payload):
    client.post("/api/auth/register/", valid_payload, format="json")
    user = User.objects.get(username="testas")
    assert user.password != "slaptazodis1"
    assert user.check_password("slaptazodis1")

@pytest.mark.django_db
def test_passwords_do_not_match(client):
    payload = {
        "username": "testas",
        "email": "testas@gmail.com",
        "password": "slaptazodis1",
        "password2": "kitasslaptazodis1",
    }
    response = client.post("/api/auth/register/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "password2" in response.data

@pytest.mark.django_db
def test_duplicate_username(client, valid_payload):
    client.post("/api/auth/register/", valid_payload, format="json")
    response = client.post("/api/auth/register/", valid_payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_password_too_short(client):
    payload = {
        "username": "testas",
        "email": "testas@gmail.com",
        "password": "trumpas",
        "password2": "trumpas",
    }
    response = client.post("/api/auth/register/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_missing_email(client):
    payload = {
        "username": "testas",
        "email": "",
        "password": "slaptazodis1",
        "password2": "slaptazodis1",
    }
    response = client.post("/api/auth/register/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_missing_username(client):
    payload = {
        "username": "",
        "email": "testas@gmail.com",
        "password": "slaptazodis1",
        "password2": "slaptazodis1",
    }
    response = client.post("/api/auth/register/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_missing_password(client):
    payload = {
        "username": "testas",
        "email": "testas@gmail.com",
        "password": "",
        "password2": "",
    }
    response = client.post("/api/auth/register/", payload, format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST

@pytest.mark.django_db
def test_response_contains_expected_fields(client, valid_payload):
    response = client.post("/api/auth/register/", valid_payload, format="json")
    assert "id" in response.data
    assert "username" in response.data
    assert "email" in response.data