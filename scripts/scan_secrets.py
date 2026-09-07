#!/usr/bin/env python3
"""
Sentinel NER — Automated Secret Scanner
Scans source files for hardcoded secrets, private keys, access tokens, and sensitive credentials.
Returns non-zero exit code if potential secrets are detected.
"""

import os
import re
import sys
from pathlib import Path

# Paths/directories to ignore
IGNORED_DIRS = {
    ".git",
    "node_modules",
    ".next",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    ".ruff_cache",
    ".mypy_cache",
    "dist",
    "build",
    ".agent",
    ".agents",
    ".gemini",
    ".prd",
    ".techstack",
    "scratch",
    "storage",
    "coverage",
    "playwright-report",
    "test-results",
}

IGNORED_FILES = {
    ".env",
    ".env.local",
    ".env.development",
    ".env.test",
    ".env.production",
    ".env.example",
    "package-lock.json",
    "scan_secrets.py",
}

# Regex patterns for secret detection
PATTERNS = [
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID"),
    (r"(?i)aws_secret_access_key\s*=\s*['\"][0-9a-zA-Z/+]{40}['\"]", "AWS Secret Access Key"),
    (r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----", "Private Key Header"),
    (r"(?i)(?:api_key|apikey|secret_key|private_key)\s*=\s*['\"][a-zA-Z0-9_\-]{24,}['\"]", "Hardcoded API/Secret Key"),
    (r"mongodb(?:\+srv)?:\/\/(?!\*\*\*:\*\*\*)[a-zA-Z0-9_\-\.%]+:[a-zA-Z0-9_\-\.%]+@", "MongoDB Connection String with Credentials"),
    (r"ghp_[a-zA-Z0-9]{36}", "GitHub Personal Access Token"),
]

# Tokens indicating dummy examples, test fixtures, or sanitized placeholders
DUMMY_INDICATORS = {
    "example",
    "dev-secret-key",
    "dummy",
    "fake",
    "mock",
    "test",
    "user:pass",
    "admin:pass",
    "secretpass",
    "leaker_user",
    "***:***",
}

def scan_file(filepath: Path) -> list[tuple[int, str, str]]:
    findings = []
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
        for line_idx, line in enumerate(content.splitlines(), start=1):
            stripped = line.strip()
            # Exclude code comments explaining formats
            if stripped.startswith(("#", "//", "/*", "*", "<!--")):
                continue

            # Exclude lines containing known test fixtures or placeholders
            lower_line = line.lower()
            if any(indicator in lower_line for indicator in DUMMY_INDICATORS):
                continue

            for pattern, desc in PATTERNS:
                if re.search(pattern, line):
                    findings.append((line_idx, desc, stripped[:60]))
    except Exception as e:
        print(f"Warning: could not read {filepath}: {e}", file=sys.stderr)
    return findings

def main():
    workspace_root = Path(__file__).resolve().parent.parent
    print(f"[SCAN] [Sentinel NER] Scanning for hardcoded secrets across {workspace_root}...")

    total_findings = 0
    scanned_files = 0

    for root, dirs, files in os.walk(workspace_root):
        # Prune ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS]
        
        for file in files:
            if file in IGNORED_FILES or file.endswith((".png", ".jpg", ".jpeg", ".ico", ".woff", ".woff2")):
                continue
            
            filepath = Path(root) / file
            findings = scan_file(filepath)
            scanned_files += 1

            if findings:
                total_findings += len(findings)
                rel_path = filepath.relative_to(workspace_root)
                print(f"\n[ALERT] Potential secret(s) found in {rel_path}:")
                for line_idx, desc, snippet in findings:
                    print(f"   Line {line_idx}: {desc} -> {snippet}...")

    print(f"\n[SUMMARY] Scan complete: {scanned_files} files checked.")
    if total_findings > 0:
        print(f"[FAILED] {total_findings} potential secret(s) detected. Fix before committing.")
        sys.exit(1)
    else:
        print("[PASSED] No hardcoded secrets detected.")
        sys.exit(0)

if __name__ == "__main__":
    main()
