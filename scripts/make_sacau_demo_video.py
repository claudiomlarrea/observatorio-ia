#!/usr/bin/env python3
"""Compat: regenera el video de pantallas reales vía Node/Puppeteer."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    script = ROOT / "scripts" / "capture_sacau_demo_video.mjs"
    return subprocess.call(["node", str(script)], cwd=ROOT)


if __name__ == "__main__":
    sys.exit(main())
