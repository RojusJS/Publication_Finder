from django.contrib.auth import authenticate, get_user_model, password_validation
from django.contrib.auth.validators import UnicodeUsernameValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from apps.core.exceptions import APIError

User = get_user_model()


def _validate_password(password, user):
    try:
        password_validation.validate_password(password, user=user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages)) from None
    return password


def _check_unique_email(email, exclude_pk=None):
    queryset = User.objects.filter(email__iexact=email)
    if exclude_pk is not None:
        queryset = queryset.exclude(pk=exclude_pk)
    if queryset.exists():
        raise serializers.ValidationError("An account with this e-mail already exists.")


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "is_staff", "is_superuser", "date_joined")
        read_only_fields = fields


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(min_length=3, max_length=150, validators=[UnicodeUsernameValidator()])
    email = serializers.EmailField(max_length=254)
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    password2 = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_username(self, value):
        value = value.strip()
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_email(self, value):
        value = User.objects.normalize_email(value.strip())
        _check_unique_email(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Passwords do not match."})
        candidate = User(username=attrs["username"], email=attrs["email"])
        try:
            _validate_password(attrs["password"], candidate)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError({"password": exc.detail}) from None
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
        )


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=254, help_text="Username or e-mail address")
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate(self, attrs):
        identifier = attrs["username"].strip()
        username = identifier
        if "@" in identifier and not User.objects.filter(username=identifier).exists():
            matches = list(User.objects.filter(email__iexact=identifier).values_list("username", flat=True)[:2])
            if len(matches) == 1:
                username = matches[0]
        user = authenticate(self.context.get("request"), username=username, password=attrs["password"])
        if user is None:
            # Same message whether the account exists or not (no user enumeration).
            raise APIError("Incorrect username or password.", code="invalid_credentials")
        attrs["user"] = user
        return attrs


class ProfileUpdateSerializer(serializers.Serializer):
    email = serializers.EmailField(max_length=254)

    def validate_email(self, value):
        value = User.objects.normalize_email(value.strip())
        _check_unique_email(value, exclude_pk=self.context["request"].user.pk)
        return value


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_current_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value

    def validate_new_password(self, value):
        return _validate_password(value, self.context["request"].user)


class DeleteAccountSerializer(serializers.Serializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False, max_length=128)

    def validate_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Password is incorrect.")
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    project_count = serializers.IntegerField(read_only=True)
    publication_count = serializers.IntegerField(read_only=True)
    search_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "date_joined", "last_login", "is_active", "is_staff", "is_superuser",
            "project_count", "publication_count", "search_count",
        )
        read_only_fields = fields
