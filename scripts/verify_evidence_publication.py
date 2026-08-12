#!/usr/bin/env python3
"""Verify the generated ODDS evidence publication bundle."""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from urllib.parse import unquote, urlsplit

from lxml import html as lxml_html
from PIL import Image
from pypdf import PdfReader


SCRIPT_DIR = Path(__file__).resolve().parent
APP_DIR = SCRIPT_DIR.parent
CALCULATOR_DIR = APP_DIR / "ODDS" if (APP_DIR / "ODDS" / "index.html").exists() else APP_DIR
EVIDENCE_DIR = CALCULATOR_DIR / "evidence"
JOINT_PAGE = APP_DIR / "odds_joint_model.html"
PUBLIC_ORIGIN = "https://pccmtools.org"
CANONICAL_JOINT_URL = "/odds_joint_model.html"
CALCULATOR_URL = "/ODDS/"
EVIDENCE_URL = "/ODDS/evidence/"
LEGACY_JOINT_HTML = "ODDS_joint_model_public_summary.html"
ROBOTS_DIRECTIVE = "noindex, nofollow, noarchive, nosnippet"
COPYRIGHT_NOTICE_TITLE = "© 2026 The ODDS Study Authors. All rights reserved unless otherwise noted."
COPYRIGHT_NOTICE_BODY = (
    "This author-prepared expanded project report is provided to support research "
    "evaluation and external validation of ODDS. It has not undergone external peer "
    "review and is not a journal Version of Record. A related manuscript is being "
    "considered for publication."
)
EXPECTED_SOURCE_TEXT_SHA256 = {
    "comprehensive": "9b30c0e5a72557734a85f8ccd01e4bf39fdb0c3be4215b6a1a622745fa7a7e4c",
    "joint": "2e83968fe072a2e2b5baa1e15b08195a4ed2d859a12b6d6187bf63ec74cb055a",
}

PUBLICATIONS = (
    (
        EVIDENCE_DIR / "index.html",
        9,
        14,
        "comprehensive.pdf",
        {CALCULATOR_URL, CANONICAL_JOINT_URL, "downloads/comprehensive.pdf"},
    ),
    (
        JOINT_PAGE,
        6,
        2,
        "joint.pdf",
        {CALCULATOR_URL, EVIDENCE_URL, f"{EVIDENCE_URL}downloads/joint.pdf"},
    ),
)

PROHIBITED_PUBLIC_EXTENSIONS = {".docx", ".xlsx", ".xls", ".csv", ".sav", ".dta"}
PROHIBITED_PUBLIC_MODEL_EXTENSIONS = {".rds", ".rda", ".rdata", ".rmd", ".qmd", ".ipynb"}
LOCAL_PATH_PATTERN = re.compile(r"(?:file://|/Users/|/private/var/|/var/folders/)", re.IGNORECASE)


def fail(message: str) -> None:
    raise RuntimeError(message)


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def expected_copyright_text() -> str:
    return f"{COPYRIGHT_NOTICE_TITLE} {COPYRIGHT_NOTICE_BODY}"


def normalized_element_text(element) -> str:
    return normalize_space(" ".join(element.itertext()))


def is_publication_link(href: str) -> bool:
    path = unquote(urlsplit(href).path).rstrip("/")
    return path in {EVIDENCE_URL.rstrip("/"), CANONICAL_JOINT_URL}


def parse_header_rules(raw: str) -> dict[str, list[str]]:
    rules: dict[str, list[str]] = {}
    current: str | None = None
    for line in raw.splitlines():
        if line and not line[0].isspace():
            current = line.strip()
            rules[current] = []
        elif current is not None and line.strip():
            rules[current].append(line.strip())
    return rules


def resolve_local_link(page: Path, href: str) -> Path | None:
    parsed = urlsplit(href)
    if parsed.scheme or href.startswith("#") or href.startswith("mailto:"):
        return None
    path = unquote(parsed.path)
    if path in ("/ODDS", CALCULATOR_URL):
        return CALCULATOR_DIR / "index.html"
    if path in ("/ODDS/evidence", EVIDENCE_URL):
        return EVIDENCE_DIR / "index.html"
    if path == CANONICAL_JOINT_URL:
        return JOINT_PAGE
    if path.startswith(EVIDENCE_URL):
        relative = path[len(EVIDENCE_URL) :]
        return (EVIDENCE_DIR / (relative or "index.html")).resolve()
    if path.startswith("/"):
        return (APP_DIR / ".missing-public-route" / path.lstrip("/")).resolve()
    destination = (page.parent / path).resolve()
    if not path or path.endswith("/"):
        destination /= "index.html"
    return destination


def verify_html(page: Path, expected_tables: int, expected_images: int, required_links: set[str]) -> dict:
    raw = page.read_text(encoding="utf-8")
    if LOCAL_PATH_PATTERN.search(raw):
        fail(f"Local filesystem path found in {page.name}")
    if LEGACY_JOINT_HTML in raw:
        fail(f"Legacy joint-model URL found in {page.name}")
    root = lxml_html.fromstring(raw)
    robots_meta = root.xpath(
        '//meta[translate(@name, "ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")="robots"]/@content'
    )
    if robots_meta != [ROBOTS_DIRECTIVE]:
        fail(f"{page.name}: missing exact robots meta directive")
    copyright_nodes = root.xpath(
        '//*[contains(concat(" ", normalize-space(@class), " "), " publication-copyright ")]'
    )
    if len(copyright_nodes) != 1:
        fail(f"{page.name}: expected one publication copyright notice")
    if normalized_element_text(copyright_nodes[0]) != expected_copyright_text():
        fail(f"{page.name}: publication copyright wording changed")
    if not root.xpath(
        '//main/*[last()][self::footer and contains(concat(" ", normalize-space(@class), " "), " publication-footer ")]'
    ):
        fail(f"{page.name}: publication copyright footer is not the final page element")
    expected_canonical = (
        f"{PUBLIC_ORIGIN}{EVIDENCE_URL}"
        if page == EVIDENCE_DIR / "index.html"
        else f"{PUBLIC_ORIGIN}{CANONICAL_JOINT_URL}"
    )
    canonical_links = root.xpath('//link[@rel="canonical"]/@href')
    if canonical_links != [expected_canonical]:
        fail(f"{page.name}: incorrect canonical URL")
    tables = root.xpath("//table")
    images = root.xpath("//img")
    if len(tables) != expected_tables:
        fail(f"{page.name}: expected {expected_tables} tables; found {len(tables)}")
    if len(images) != expected_images:
        fail(f"{page.name}: expected {expected_images} images; found {len(images)}")
    ids = [value for value in root.xpath("//*[@id]/@id") if value]
    duplicates = sorted({value for value in ids if ids.count(value) > 1})
    if duplicates:
        fail(f"{page.name}: duplicate IDs: {', '.join(duplicates)}")
    if any(not image.get("alt", "").strip() for image in images):
        fail(f"{page.name}: image without alternative text")
    if any(not table.xpath(".//th") for table in tables):
        fail(f"{page.name}: table without header cells")
    if any(not table.get("aria-label", "").strip() for table in tables):
        fail(f"{page.name}: table without an accessible label")

    broken: list[str] = []
    hrefs = {link.get("href", "") for link in root.xpath("//a[@href]")}
    missing_links = sorted(required_links - hrefs)
    if missing_links:
        fail(f"{page.name}: missing required links: {', '.join(missing_links)}")
    for link in root.xpath("//a[@href]"):
        href = link.get("href", "")
        if href.startswith("#") and href != "#":
            if href[1:] not in ids:
                broken.append(href)
            continue
        local = resolve_local_link(page, href)
        if local is not None:
            try:
                local.relative_to(APP_DIR.resolve())
            except ValueError:
                broken.append(href)
                continue
            if not local.exists():
                broken.append(href)
    if broken:
        fail(f"{page.name}: broken local links: {', '.join(sorted(set(broken)))}")

    for image in images:
        source = resolve_local_link(page, image.get("src", ""))
        if source is None or not source.exists():
            fail(f"{page.name}: missing image {image.get('src')}")
        with Image.open(source) as bitmap:
            if bitmap.width <= 0 or bitmap.height <= 0:
                fail(f"{page.name}: invalid image {image.get('src')}")
            if bitmap.getexif():
                fail(f"{page.name}: image metadata was not stripped from {image.get('src')}")

    citation_links = root.xpath('//a[contains(concat(" ", normalize-space(@class), " "), " citation-link ")]')
    reference_links = root.xpath('//a[contains(concat(" ", normalize-space(@class), " "), " reference-link ")]')
    if page == EVIDENCE_DIR / "index.html":
        if root.xpath('//p[contains(concat(" ", normalize-space(@class), " "), " source-site-link ")]'):
            fail("Comprehensive report still displays the removed source-site link")
        publication_date = root.xpath(
            'string(//p[contains(concat(" ", normalize-space(@class), " "), " publication-date ")])'
        ).strip()
        if publication_date != "August 12, 2026":
            fail("Comprehensive report does not display the August 12, 2026 publication date")
        if len(citation_links) < 17 or len(reference_links) < 17:
            fail("Comprehensive report is missing expected citation links")
        if any(urlsplit(link.get("href", "")).scheme not in {"http", "https"} for link in reference_links):
            fail("Comprehensive report contains an invalid external citation link")
        for table_number, table in enumerate(tables[:2], 1):
            classes = set(table.get("class", "").split())
            if {"featured-table", f"featured-table-{table_number}"} - classes:
                fail(f"Revised Table {table_number} styling is missing")

    return {
        "html": str(page.relative_to(APP_DIR)),
        "tables": len(tables),
        "figures": len(images),
        "citationLinks": len(citation_links),
        "referenceLinks": len(reference_links),
    }


def verify_pdf(path: Path, required_urls: set[str]) -> dict:
    reader = PdfReader(path)
    if len(reader.pages) < 1:
        fail(f"{path.name}: no pages")
    metadata_text = " ".join(str(value) for value in (reader.metadata or {}).values())
    if LOCAL_PATH_PATTERN.search(metadata_text):
        fail(f"{path.name}: local path in metadata")
    local_uris: list[str] = []
    uris: list[str] = []
    extracted: list[str] = []
    for page in reader.pages:
        extracted.append(page.extract_text() or "")
        for reference in page.get("/Annots", []):
            action = reference.get_object().get("/A")
            if action and "/URI" in action:
                uri = str(action["/URI"])
                uris.append(uri)
                if LOCAL_PATH_PATTERN.search(uri):
                    local_uris.append(uri)
    if local_uris:
        fail(f"{path.name}: local file hyperlink found")
    if LOCAL_PATH_PATTERN.search(" ".join(extracted)):
        fail(f"{path.name}: local filesystem path in visible text")
    if expected_copyright_text() not in normalize_space(extracted[-1]):
        fail(f"{path.name}: copyright notice is missing from the final PDF page")
    if any(LEGACY_JOINT_HTML in uri for uri in uris):
        fail(f"{path.name}: legacy joint-model hyperlink found")
    normalized_uris = {urlsplit(uri).path for uri in uris}
    missing_urls = sorted(required_urls - normalized_uris)
    if missing_urls:
        fail(f"{path.name}: missing required hyperlinks: {', '.join(missing_urls)}")
    return {
        "pdf": path.name,
        "pages": len(reader.pages),
        "bytes": path.stat().st_size,
        "hyperlinks": len(uris),
    }


def verify_discovery_controls() -> None:
    calculator_page = CALCULATOR_DIR / "index.html"
    calculator_root = lxml_html.fromstring(calculator_page.read_text(encoding="utf-8"))
    calculator_notices = calculator_root.xpath(
        '//*[contains(concat(" ", normalize-space(@class), " "), " odds-copyright-notice ")]'
    )
    if len(calculator_notices) != 1:
        fail("Calculator is missing its copyright notice")
    if normalized_element_text(calculator_notices[0]) != expected_copyright_text():
        fail("Calculator copyright wording changed")

    calculator_publication_links = [
        link for link in calculator_root.xpath("//a[@href]") if is_publication_link(link.get("href", ""))
    ]
    if len(calculator_publication_links) != 1:
        fail("Calculator must contain exactly one reviewer-publication link")
    calculator_publication_link = calculator_publication_links[0]
    if calculator_publication_link.get("href") != CANONICAL_JOINT_URL:
        fail("Calculator may link only to the joint-model technical summary")
    if "nofollow" not in calculator_publication_link.get("rel", "").lower().split():
        fail("Calculator joint-model link must use rel=nofollow")
    if normalize_space(calculator_publication_link.text_content()) != "Joint-model technical summary":
        fail("Calculator joint-model link label changed")
    if not calculator_publication_link.xpath(
        'ancestor::details[contains(concat(" ", normalize-space(@class), " "), " about-tool ")]'
    ):
        fail("Calculator joint-model link must remain inside the collapsed About section")

    excluded_pages = {
        calculator_page.resolve(),
        (EVIDENCE_DIR / "index.html").resolve(),
        JOINT_PAGE.resolve(),
    }
    for page in APP_DIR.rglob("*.html"):
        if page.resolve() in excluded_pages:
            continue
        root = lxml_html.fromstring(page.read_text(encoding="utf-8"))
        links = [href for href in root.xpath("//a[@href]/@href") if is_publication_link(href)]
        if links:
            fail(f"Publicly indexed page links to reviewer publication: {page.relative_to(APP_DIR)}")

    sitemap = APP_DIR / "sitemap.xml"
    if sitemap.exists():
        sitemap_text = sitemap.read_text(encoding="utf-8")
        if EVIDENCE_URL in sitemap_text or CANONICAL_JOINT_URL in sitemap_text:
            fail("Reviewer publication appears in sitemap.xml")

    robots = APP_DIR / "robots.txt"
    if robots.exists():
        for line in robots.read_text(encoding="utf-8").splitlines():
            normalized = line.strip().lower()
            if normalized.startswith("disallow:") and (
                EVIDENCE_URL.lower() in normalized or CANONICAL_JOINT_URL.lower() in normalized
            ):
                fail("robots.txt blocks a reviewer publication route")

    if CALCULATOR_DIR != APP_DIR:
        headers_path = APP_DIR / "_headers"
        if not headers_path.exists():
            fail("Cloudflare Pages _headers file is missing")
        rules = parse_header_rules(headers_path.read_text(encoding="utf-8"))
        expected_header = f"X-Robots-Tag: {ROBOTS_DIRECTIVE}"
        for route in (f"{EVIDENCE_URL}*", CANONICAL_JOINT_URL):
            if expected_header not in rules.get(route, []):
                fail(f"Missing X-Robots-Tag rule for {route}")

        function_path = APP_DIR / "functions" / "odds_joint_model.html.js"
        function_text = function_path.read_text(encoding="utf-8")
        if "X-Robots-Tag" not in function_text or ROBOTS_DIRECTIVE not in function_text:
            fail("Joint-model Pages Function is missing its X-Robots-Tag header")


def main() -> None:
    manifest_path = EVIDENCE_DIR / "build-manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if not manifest.get("pdfs_generated"):
        fail("Build manifest does not record generated PDFs")
    if manifest.get("robots_directive") != ROBOTS_DIRECTIVE:
        fail("Build manifest does not record the robots directive")
    if manifest.get("copyright_notice") != f"{COPYRIGHT_NOTICE_TITLE}\n{COPYRIGHT_NOTICE_BODY}":
        fail("Build manifest does not record the exact copyright notice")
    if not all(item.get("wording_verified") for item in manifest.get("publications", [])):
        fail("Build manifest does not record verified source wording")
    manifest_urls = {item.get("public_url") for item in manifest.get("publications", [])}
    if manifest_urls != {EVIDENCE_URL, CANONICAL_JOINT_URL}:
        fail("Build manifest does not record the canonical publication URLs")
    for item in manifest.get("publications", []):
        if item.get("source_text_sha256") != EXPECTED_SOURCE_TEXT_SHA256.get(item.get("key")):
            fail(f"Visible wording hash changed for {item.get('key', 'unknown')} publication")
    if (EVIDENCE_DIR / LEGACY_JOINT_HTML).exists() or (APP_DIR / LEGACY_JOINT_HTML).exists():
        fail("Legacy joint-model HTML remains in the deployment bundle")

    routes_path = APP_DIR / "_routes.json"
    if routes_path.exists():
        routes = json.loads(routes_path.read_text(encoding="utf-8"))
        if CANONICAL_JOINT_URL not in routes.get("include", []):
            fail("Canonical joint-model URL is not included in Pages Function routes")
        if not (APP_DIR / "functions" / "odds_joint_model.html.js").exists():
            fail("Canonical joint-model Pages Function is missing")

    prohibited_extensions = set(PROHIBITED_PUBLIC_EXTENSIONS)
    if CALCULATOR_DIR != APP_DIR:
        prohibited_extensions.update(PROHIBITED_PUBLIC_MODEL_EXTENSIONS)
    prohibited = sorted(
        path for path in APP_DIR.rglob("*") if path.is_file() and path.suffix.lower() in prohibited_extensions
    )
    if prohibited:
        fail("Prohibited source files in public evidence bundle")

    verify_discovery_controls()

    results = []
    pdf_links = {
        "comprehensive.pdf": {CANONICAL_JOINT_URL},
        "joint.pdf": {CALCULATOR_URL, EVIDENCE_URL, CANONICAL_JOINT_URL},
    }
    for page, table_count, figure_count, pdf_name, required_links in PUBLICATIONS:
        results.append(verify_html(page, table_count, figure_count, required_links))
        results.append(verify_pdf(EVIDENCE_DIR / "downloads" / pdf_name, pdf_links[pdf_name]))

    print("Evidence publication verification: PASS")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Evidence publication verification: FAIL\n{error}", file=sys.stderr)
        raise
