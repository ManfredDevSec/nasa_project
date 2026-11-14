from sightline.exceptions import ConflictError


class NoBaselineError(ConflictError):
    """A scored check needs the astronaut's pre-flight baseline (docs/02 §4, docs/04 case 14).

    Raised anywhere during a request it becomes 409 {"error": {"code": "NO_BASELINE", ...}}.
    It's a plain exception with no DB or request side effects, so the engine stays pure.
    """

    error_code = "NO_BASELINE"
    default_detail = "This astronaut has no baseline yet. Do the pre-flight baseline tests first."
