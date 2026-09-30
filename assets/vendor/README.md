# Browser dependencies

These are the same pinned Three.js 0.169.0, GSAP 3.12.5 (including
ScrollTrigger), and Lenis 1.1.14 ESM modules previously served by esm.sh.
Serving the final modules here removes the external connection and the CDN
wrapper-module round trip. Each file is standalone and preserves the original
exports and executable code. Only the source-map comment is removed because
the upstream debug maps are not shipped.

GitHub Pages serves these committed files directly; deployment needs no build.
To reproduce them with Python 3 from the repository root:

```sh
python3 scripts/vendor-dependencies.py
python3 scripts/vendor-dependencies.py --check
```

Both commands fetch the exact sources and verify their SHA-256 checksums before
using them. `--check` compares the resulting bytes without writing files. If an
upstream artifact changes, the script stops; review the change before updating
the checksum or dependency version. No npm installation is needed.

The original Three.js and Lenis MIT licenses are included alongside the modules.
GSAP's original copyright and license notices, including ScrollTrigger and
Observer notices, are retained at the end of its modules. GSAP 3.12.5 identifies
its license as the GreenSock standard license at
<https://gsap.com/standard-license>; it is not MIT-licensed.
