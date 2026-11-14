from whitenoise.storage import CompressedManifestStaticFilesStorage


class StaticFilesStorage(CompressedManifestStaticFilesStorage):
    """Production static files: compressed + fingerprinted names (cache forever).

    manifest_strict = False: if a template asks for a path that isn't a file in the
    manifest, return the plain URL instead of crashing. Jazzmin's admin base template
    does this on every page: {% static 'vendor/bootswatch' %} is a *folder* its JS
    appends theme files to. With the default (strict) setting every logged-in admin
    page returned 500 in production. The plain files are still collected and served.
    """

    manifest_strict = False
