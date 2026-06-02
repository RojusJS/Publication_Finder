from django.contrib.auth.models import User
from rest_framework import serializers


class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, min_length=10)
    password2 = serializers.CharField(write_only=True, min_length=10)
    class Meta:
        model = User
        fields = ("email", "username", "password", "password2")
    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password2": "Slaptažodžiai nesutampa"})
        return attrs
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Naudotojas su šiuo el. pašto adresu jau egzistuoja")
        return value
    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(required=True, allow_blank=False)
    password = serializers.CharField(write_only=True, required=True, allow_blank=False)
    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                {"username": "Prisijungimo vardas neteisingas"}
            )
        if not user.check_password(password):
            raise serializers.ValidationError(
                {"password": "Slaptažodis neteisingas"}
            )
        attrs["user"] = user
        return attrs

class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "date_joined", "is_staff")