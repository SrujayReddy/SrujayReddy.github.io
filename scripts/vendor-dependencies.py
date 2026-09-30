#!/usr/bin/env python3
"""Reproduce the checked-in ESM dependencies without npm or a deployment build.

Run with --check to verify the local files against the checksum-pinned sources.
All sources are downloaded and verified before any local files are replaced.
"""

import argparse
import hashlib
from pathlib import Path
import re
import urllib.request


DESTINATION = Path(__file__).resolve().parent.parent / "assets" / "vendor"
SOURCES = (
    (
        "three-0.169.0.mjs",
        "https://esm.sh/three@0.169.0/es2022/three.mjs",
        "6a3cf8b43c7efb867c62ef5a40e1eb38a5b6b70fb1b2678189df0dac965eabb4",
    ),
    (
        "gsap-3.12.5.mjs",
        "https://esm.sh/gsap@3.12.5/es2022/gsap.mjs",
        "654d45e19cce5345aebdf41d05a3ebe3ee65dc940a6a4cab421d2bbdd319d990",
    ),
    (
        "ScrollTrigger-3.12.5.mjs",
        "https://esm.sh/gsap@3.12.5/es2022/ScrollTrigger.mjs",
        "a1544e57312ce20a62b4e2fe359803916e56e781113a2734519aae9f40eef616",
    ),
    (
        "lenis-1.1.14.mjs",
        "https://esm.sh/lenis@1.1.14/es2022/lenis.mjs",
        "a22526a8c17746c5e7e7f96918c43edfde1c8b862b0866a2995b589620c1eb8f",
    ),
    (
        "three-LICENSE.txt",
        "https://cdn.jsdelivr.net/npm/three@0.169.0/LICENSE",
        "4c40a1ef62450b857c3b2aaf294936304cd552d965fbcd9d32d4c5bcf4ba4454",
    ),
    (
        "lenis-LICENSE.txt",
        "https://cdn.jsdelivr.net/npm/lenis@1.1.14/LICENSE",
        "bba15b1137346a73ed8c35e7f20961a69e0ed842d956a50339240c3e7b08c089",
    ),
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Verify without writing")
    args = parser.parse_args()

    artifacts = {}
    for filename, url, checksum in SOURCES:
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
        actual = hashlib.sha256(data).hexdigest()
        if actual != checksum:
            raise SystemExit(f"Upstream checksum mismatch for {filename}: {actual}")
        if filename.endswith(".mjs"):
            # Keep code and license notices intact; omit unshipped debug maps.
            data = re.sub(rb"\n//# sourceMappingURL=[^\r\n]*\s*$", b"\n", data)
        elif filename.endswith(".txt"):
            # Match Git text normalization on every checkout.
            data = data.replace(b"\r\n", b"\n")
        artifacts[filename] = data

    if args.check:
        mismatches = [
            filename for filename, data in artifacts.items()
            if not (DESTINATION / filename).is_file()
            or (DESTINATION / filename).read_bytes() != data
        ]
        if mismatches:
            raise SystemExit("Vendor files differ: " + ", ".join(mismatches))
        print(f"Verified {len(artifacts)} pinned vendor files.")
        return

    DESTINATION.mkdir(parents=True, exist_ok=True)
    for filename, data in artifacts.items():
        (DESTINATION / filename).write_bytes(data)
        print(f"Vendored {filename}: {len(data):,} bytes")


if __name__ == "__main__":
    main()
