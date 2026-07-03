"""
Shared helpers for the newsletter scripts (send_newsletter.py, monitor_newsletter.py).
"""

import json
import os
import sys
import time
import urllib.parse
import urllib.request

SUBSCRIBERS_URL = "https://script.google.com/macros/s/AKfycbyaiac7v3g21NgLZ9cZK7xISffYOIhuJHW7xIA0Rrju2IjMBmh7dVThsabM2MNuyO7o1g/exec"

# Google Apps Script redirects to script.googleusercontent.com and can be slow
# on cold starts, so we use a generous timeout and retry with backoff.
FETCH_TIMEOUT_SECONDS = 45
FETCH_RETRIES = 4
FETCH_BACKOFF_SECONDS = (5, 15, 30)


def load_subscribers() -> list[dict]:
    api_key = os.environ.get("SUBSCRIBERS_API_KEY", "")
    if not api_key:
        sys.exit("ERROR: SUBSCRIBERS_API_KEY not set")
    url = f"{SUBSCRIBERS_URL}?key={urllib.parse.quote(api_key)}"

    raw = None
    for attempt in range(1, FETCH_RETRIES + 1):
        try:
            with urllib.request.urlopen(url, timeout=FETCH_TIMEOUT_SECONDS) as r:
                raw = json.loads(r.read())
            break
        except Exception as e:
            if attempt == FETCH_RETRIES:
                sys.exit(f"ERROR: could not fetch subscribers after {FETCH_RETRIES} attempts: {e}")
            wait = FETCH_BACKOFF_SECONDS[attempt - 1]
            print(f"  WARN: fetch attempt {attempt} failed ({e}), retrying in {wait}s...",
                  file=sys.stderr)
            time.sleep(wait)

    if isinstance(raw, dict) and raw.get("error"):
        sys.exit(f"ERROR: API rejected request ({raw['error']}) — verificá SUBSCRIBERS_API_KEY")

    # Deduplicate by email (keep first occurrence)
    seen = set()
    unique = []
    for sub in raw:
        email = sub.get("email", "").strip().lower()
        if email and email not in seen:
            seen.add(email)
            unique.append(sub)
    return unique


def unsubscribe_url(email: str) -> str:
    return f"{SUBSCRIBERS_URL}?action=unsubscribe&email={urllib.parse.quote(email)}"
