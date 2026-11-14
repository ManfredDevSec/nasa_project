"""python manage.py export_postman [--out DIR]   (docs/06 T13)

Builds a Postman collection (v2.1, also imports into Thunder Client / Insomnia / Bruno) from the
live OpenAPI schema, plus two environments (local, live). Regenerate after changing the API;
core/test_postman.py fails if the committed files are out of date.

Workflow in Postman: pick an environment → run Auth / "Log in" → the token and your astronaut id
are saved into collection variables → every other request is authorised.
"""
import json
import re
import uuid
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand
from drf_spectacular.generators import SchemaGenerator

NAME = "SightLine API"
SCHEMA_URL = "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
FOLDER_ORDER = ["Health", "Auth", "Mission", "Crew", "Vision checks", "Daily logs", "Cabin logs", "Reports", "Users (admin)"]
PATH_VARIABLES = {"/astronauts/{id}": "astronaut_id", "/checks/{id}": "check_id", "/auth/users/{id}": "user_id"}
ENVIRONMENTS = {
    "local": "http://localhost:8000",
    "live": "https://sightline-api-zfb8.onrender.com",
}
COLLECTION_VARIABLES = [
    ("base_url", "http://localhost:8000", "Overridden by the selected environment."),
    ("username", "osei", "Demo login (see README). Try adjei (Medical Officer) or surgeon."),
    ("password", "sightline-demo", "Local demo password. Ask for the live one."),
    ("token", "", "Filled in by Auth / Log in."),
    ("astronaut_id", "1", "Filled in by Auth / Log in (your own astronaut)."),
    ("check_id", "1", ""),
    ("user_id", "1", ""),
]
LOGIN_SCRIPT = [
    "// Save the token (and your astronaut) for every other request.",
    "const body = pm.response.json();",
    "if (body.token) {",
    "  pm.collectionVariables.set('token', body.token);",
    "  if (body.user && body.user.astronaut_id) pm.collectionVariables.set('astronaut_id', body.user.astronaut_id);",
    "}",
]


def _stable_id(*parts):
    return str(uuid.uuid5(uuid.NAMESPACE_URL, "sightline/" + "/".join(parts)))


def _url(path, query_params):
    for prefix, variable in PATH_VARIABLES.items():
        path = path.replace(prefix, prefix.replace("{id}", "{{" + variable + "}}"))
    path = re.sub(r"(?<!\{)\{(\w+)\}(?!\})", r"{{\1}}", path)  # any other {param} not already {{wrapped}}
    segments = path.strip("/").split("/") + ([""] if path.endswith("/") else [])
    url = {"raw": "{{base_url}}" + path, "host": ["{{base_url}}"], "path": segments}
    if query_params:
        url["query"] = [{"key": p["name"], "value": "", "disabled": True, "description": p.get("description", "")}
                        for p in query_params]
        url["raw"] += "?" + "&".join(f"{p['name']}=" for p in query_params)
    return url


def _body(path, operation):
    content = operation.get("requestBody", {}).get("content", {}).get("application/json")
    if not content:
        return None
    examples = content.get("examples") or {}
    value = next(iter(examples.values()))["value"] if examples else {}
    if path.endswith("/auth/login/"):
        value = {"username": "{{username}}", "password": "{{password}}"}
    value = {k: v for k, v in value.items() if k != "taken_at"} if isinstance(value, dict) else value  # default: now
    raw = json.dumps(value, indent=2, ensure_ascii=False)
    raw = raw.replace('"astronaut": 1', '"astronaut": {{astronaut_id}}')
    return {"mode": "raw", "raw": raw, "options": {"raw": {"language": "json"}}}


def _request(path, method, operation):
    query = [p for p in operation.get("parameters", []) if p.get("in") == "query"]
    request = {
        "method": method.upper(),
        "header": [],
        "url": _url(path, query),
        "description": operation.get("description", ""),
    }
    body = _body(path, operation)
    if body:
        request["header"].append({"key": "Content-Type", "value": "application/json"})
        request["body"] = body
    if operation.get("security") == [{}]:  # public endpoint (login, password reset, health)
        request["auth"] = {"type": "noauth"}
    item = {"id": _stable_id(method, path), "name": operation.get("summary", f"{method.upper()} {path}"), "request": request}
    if path.endswith("/auth/login/"):
        item["event"] = [{"listen": "test", "script": {"type": "text/javascript", "exec": LOGIN_SCRIPT}}]
    return item


def build_collection(schema):
    folders = {}
    for path, operations in schema["paths"].items():
        for method, operation in operations.items():
            if method not in ("get", "post", "put", "patch", "delete"):
                continue
            tag = (operation.get("tags") or ["Other"])[0]
            folders.setdefault(tag, []).append(_request(path, method, operation))
    order = FOLDER_ORDER + sorted(set(folders) - set(FOLDER_ORDER))
    return {
        "info": {
            "_postman_id": _stable_id("collection"),
            "name": NAME,
            "description": (
                "Generated from the OpenAPI schema by `python manage.py export_postman`. Pick the local or live "
                "environment, run Auth → Log in, then any request. Full docs: /api/docs/ and docs/03_API_SPECIFICATION.md."
            ),
            "schema": SCHEMA_URL,
        },
        "auth": {"type": "bearer", "bearer": [{"key": "token", "value": "{{token}}", "type": "string"}]},
        "variable": [{"key": k, "value": v, "description": d} for k, v, d in COLLECTION_VARIABLES],
        "item": [{"name": tag, "item": folders[tag]} for tag in order if tag in folders],
    }


def build_environment(name, base_url):
    return {
        "id": _stable_id("environment", name),
        "name": f"SightLine {name}",
        "values": [{"key": "base_url", "value": base_url, "type": "default", "enabled": True}],
        "_postman_variable_scope": "environment",
    }


def render_files():
    """{filename: text} for everything the command writes."""
    schema = SchemaGenerator().get_schema(request=None, public=True)
    files = {"SightLine.postman_collection.json": build_collection(schema)}
    for name, base_url in ENVIRONMENTS.items():
        files[f"SightLine-{name}.postman_environment.json"] = build_environment(name, base_url)
    return {name: json.dumps(data, indent=2, ensure_ascii=False) + "\n" for name, data in files.items()}


class Command(BaseCommand):
    help = "Export a Postman / Thunder Client collection (and local + live environments) from the API schema."

    def add_arguments(self, parser):
        parser.add_argument("--out", default=str(Path(settings.BASE_DIR).parent / "docs" / "api"),
                            help="Output folder (default: docs/api).")

    def handle(self, *args, out, **options):
        folder = Path(out)
        folder.mkdir(parents=True, exist_ok=True)
        for name, text in render_files().items():
            (folder / name).write_text(text)
            self.stdout.write(f"wrote {folder / name}")
