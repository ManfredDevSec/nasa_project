from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"
    verbose_name = "Accounts"

    def ready(self):
        # Registers the Swagger auth scheme (ExpiringTokenScheme) before the schema is built.
        from . import authentication  # noqa: F401
