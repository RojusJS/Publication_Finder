import pytest
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from apps.projects.models import SharedPublication


@pytest.fixture
def client():
    return APIClient()


@pytest.fixture
def sender():
    return User.objects.create_user(username="siuntejas", email="siuntejas@gmail.com", password="slaptazodis1")


@pytest.fixture
def recipient():
    return User.objects.create_user(username="gavejas", email="gavejas@gmail.com", password="slaptazodis1")


@pytest.fixture
def recipient_client(client, recipient):
    client.force_authenticate(user=recipient)
    return client


@pytest.fixture
def shared_pub(sender, recipient):
    return SharedPublication.objects.create(
        sender=sender,
        recipient=recipient,
        publication_data={"title": "Test Publication", "year": 2023},
        message="Skaityk šitą",
        viewed=False,
    )


@pytest.mark.django_db
def test_shared_publications_list_returns_received(recipient_client, shared_pub):
    response = recipient_client.get("/api/projects/shared-publications/")
    assert response.status_code == status.HTTP_200_OK
    assert len(response.data) == 1
    assert response.data[0]["publication_data"]["title"] == "Test Publication"
    assert response.data[0]["sender"]["username"] == "siuntejas"


@pytest.mark.django_db
def test_mark_shared_publication_viewed(recipient_client, shared_pub):
    response = recipient_client.post(f"/api/projects/shared-publications/{shared_pub.id}/viewed/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["status"] == "viewed"
    shared_pub.refresh_from_db()
    assert shared_pub.viewed is True


@pytest.mark.django_db
def test_unread_count_decreases_after_viewed(recipient_client, sender, recipient):
    SharedPublication.objects.create(sender=sender, recipient=recipient, publication_data={"title": "A"}, viewed=False)
    SharedPublication.objects.create(sender=sender, recipient=recipient, publication_data={"title": "B"}, viewed=False)

    response = recipient_client.get("/api/projects/shared-publications/unread-count/")
    assert response.status_code == status.HTTP_200_OK
    assert response.data["count"] == 2

    pub = SharedPublication.objects.filter(recipient=recipient).first()
    recipient_client.post(f"/api/projects/shared-publications/{pub.id}/viewed/")

    response = recipient_client.get("/api/projects/shared-publications/unread-count/")
    assert response.data["count"] == 1
