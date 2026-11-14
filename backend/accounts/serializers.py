from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from crew.models import Astronaut

from . import services
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """The `user` object in docs/03 A1/A3. Only email and names are editable (PATCH /auth/me/)."""

    display_name = serializers.CharField(read_only=True)
    astronaut_id = serializers.IntegerField(read_only=True, allow_null=True)

    class Meta:
        model = User
        fields = ["id", "username", "role", "display_name", "astronaut_id", "email", "first_name", "last_name"]
        read_only_fields = ["id", "username", "role", "display_name", "astronaut_id"]


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False, style={"input_type": "password"})


class LoginResponseSerializer(serializers.Serializer):
    token = serializers.CharField()
    user = UserSerializer()


class TokenSerializer(serializers.Serializer):
    token = serializers.CharField()


def _check_new_password(password, user):
    """Django's password rules (AUTH_PASSWORD_VALIDATORS) as a DRF field error."""
    try:
        password_validation.validate_password(password, user)
    except DjangoValidationError as exc:
        raise serializers.ValidationError(list(exc.messages))
    return password


class PasswordChangeSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, trim_whitespace=False, style={"input_type": "password"})
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, style={"input_type": "password"})

    def validate_old_password(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("Current password is wrong.")
        return value

    def validate_new_password(self, value):
        return _check_new_password(value, self.context["request"].user)


class AdminUserSerializer(serializers.ModelSerializer):
    """User management by admins (/auth/users/). Same user object plus account status.

    Create with `password` to set it directly, or without one to email an invite link
    (then `email` is required). Role/astronaut rules match User.clean().
    """

    display_name = serializers.CharField(read_only=True)
    astronaut_id = serializers.PrimaryKeyRelatedField(
        source="astronaut", queryset=Astronaut.objects.all(), allow_null=True, required=False
    )
    password = serializers.CharField(
        write_only=True, required=False, trim_whitespace=False, style={"input_type": "password"},
        help_text="Optional. Leave out to email the user an invite link to set their own password.",
    )

    class Meta:
        model = User
        fields = [
            "id", "username", "role", "display_name", "astronaut_id", "email", "first_name", "last_name",
            "is_active", "last_login", "date_joined", "password",
        ]
        read_only_fields = ["id", "display_name", "last_login", "date_joined"]

    def _current(self, attrs, field, default=None):
        if field in attrs:
            return attrs[field]
        return getattr(self.instance, field) if self.instance else default

    def validate(self, attrs):
        role = self._current(attrs, "role", User.Role.CREW)
        astronaut = self._current(attrs, "astronaut")
        errors = {}

        if role in User.ROLES_WITH_ASTRONAUT and astronaut is None:
            errors["astronaut_id"] = ["Crew and Medical officer accounts must link to an astronaut."]
        elif role == User.Role.FLIGHT_SURGEON and astronaut is not None:
            errors["astronaut_id"] = ["Flight surgeon accounts cannot link to an astronaut."]
        elif astronaut is not None:
            taken = User.objects.filter(astronaut=astronaut).exclude(pk=getattr(self.instance, "pk", None)).first()
            if taken:
                errors["astronaut_id"] = [f"This astronaut already has an account ({taken.username})."]

        if self.instance is None and not attrs.get("password") and not attrs.get("email"):
            errors["email"] = ["Give an email (we send an invite link) or a password."]

        if "password" in attrs:
            probe = User(
                username=self._current(attrs, "username", ""),
                email=self._current(attrs, "email", ""),
                first_name=self._current(attrs, "first_name", ""),
                last_name=self._current(attrs, "last_name", ""),
            )
            try:
                _check_new_password(attrs["password"], probe)
            except serializers.ValidationError as exc:
                errors["password"] = exc.detail

        # Don't let an admin lock themselves out.
        me = self.context["request"].user
        if self.instance is not None and self.instance.pk == me.pk:
            if attrs.get("is_active") is False:
                errors["is_active"] = ["You can't deactivate your own account."]
            if "role" in attrs and attrs["role"] != User.Role.ADMIN and not me.is_superuser:
                errors["role"] = ["You can't remove your own admin role."]

        if errors:
            raise serializers.ValidationError(errors)
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password", None)
        user = User(**validated_data)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save()
        if not password:
            services.send_invite_email(user)
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        deactivated = validated_data.get("is_active") is False
        user = super().update(instance, validated_data)
        if password:
            user.set_password(password)
            user.save(update_fields=["password"])
        if password or deactivated:
            services.revoke_tokens(user)  # old sessions end
        return user


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True, trim_whitespace=False, style={"input_type": "password"})

    def validate(self, attrs):
        user = services.user_from_reset_link(attrs["uid"], attrs["token"])
        if user is None:
            raise serializers.ValidationError({"token": ["This reset link is invalid or has expired."]})
        try:
            _check_new_password(attrs["new_password"], user)
        except serializers.ValidationError as exc:
            raise serializers.ValidationError({"new_password": exc.detail})
        attrs["user"] = user
        return attrs
