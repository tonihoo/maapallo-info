#!/usr/bin/env python3
"""Give Oskari's English-only sample layers a Finnish and Swedish name.

The sample views insert these layers during the first database migration.
Oskari requires a name in the default language, which for this site is Finnish.
Without fi (and sv) the migration aborts and Tomcat never mounts the map.
"""

import json
import sys
import zipfile
from pathlib import Path

TARGETS = {
    "json/layers/wmslayer-kapsi-mml-fi.json",
    "json/layers/nasa-blue-marble.json",
    "json/layers/nasa-features.json",
    "json/layers/nasa-labels.json",
}


def with_default_names(payload: bytes) -> bytes:
    layer = json.loads(payload)
    locale = layer.setdefault("locale", {})
    english = locale.get("en", {}).get("name")
    if not english:
        raise SystemExit("Sample layer is missing an English name")
    for language in ("fi", "sv", "en"):
        locale.setdefault(language, {})["name"] = locale.get(language, {}).get("name") or english
    return json.dumps(layer, ensure_ascii=False, indent=2).encode() + b"\n"


def patch(jar_path: Path) -> None:
    temporary = jar_path.with_suffix(".jar.tmp")
    seen = set()
    with zipfile.ZipFile(jar_path) as source, zipfile.ZipFile(temporary, "w") as target:
        for entry in source.infolist():
            data = source.read(entry.filename)
            if entry.filename in TARGETS:
                data = with_default_names(data)
                seen.add(entry.filename)
            target.writestr(entry.filename, data, compress_type=entry.compress_type)
    missing = TARGETS - seen
    if missing:
        temporary.unlink(missing_ok=True)
        raise SystemExit(f"Sample layer JSON not found in {jar_path}: {sorted(missing)}")
    temporary.replace(jar_path)


if __name__ == "__main__":
    path = Path(sys.argv[1] if len(sys.argv) > 1 else
                "/usr/local/tomcat/webapps/ROOT/WEB-INF/lib/app-resources-2.4.0.jar")
    patch(path)
