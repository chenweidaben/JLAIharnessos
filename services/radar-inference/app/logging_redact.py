# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
"""PII / patient-identifier redaction for logs and error bodies.

Design rules (contract section 3 & 7):
  * Never log a raw ``file_ref`` path that may embed a patient identifier.
  * Server-side error handlers must never return a traceback to the caller.
  * A global logging filter scrubs any token explicitly registered as sensitive.
"""
from __future__ import annotations

import hashlib
import logging
import os
import threading
from pathlib import PurePath

_LOCK = threading.Lock()
_SENSITIVE: set[str] = set()


def register_sensitive(token: str) -> None:
    """Mark a string as patient-identifying so it is scrubbed from all logs."""
    if token:
        with _LOCK:
            _SENSITIVE.add(token)


def unregister_all() -> None:
    with _LOCK:
        _SENSITIVE.clear()


def _scrub(text: str) -> str:
    with _LOCK:
        tokens = list(_SENSITIVE)
    for tok in tokens:
        if tok and tok in text:
            text = text.replace(tok, "***REDACTED***")
    return text


class RedactionFilter(logging.Filter):
    """Logging filter that replaces registered sensitive tokens with a placeholder."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            if isinstance(record.msg, str):
                record.msg = _scrub(record.msg)
            if record.args:
                record.args = tuple(_scrub(a) if isinstance(a, str) else a for a in record.args)
        except Exception:
            # Never let redaction break logging itself.
            pass
        return True


def safe_ref(file_ref: str | None) -> str:
    """Return a log-safe representation of a file reference.

    Preserves only the extension and a short content fingerprint so operators
    can correlate jobs without exposing directories or patient identifiers.
    """
    if not file_ref:
        return "[file:none]"
    try:
        # join all suffixes so ".nii.gz" is preserved as one extension
        suffixes = PurePath(file_ref).suffixes
        ext = "".join(suffixes) if suffixes else "bin"
        h = hashlib.sha256(file_ref.encode("utf-8", "ignore")).hexdigest()[:8]
        return f"[file:{ext}:len={len(file_ref)}:fp={h}]"
    except Exception:
        return "[file:redacted]"


def setup_logging(level: int = logging.INFO) -> None:
    """Configure root logging with the redaction filter installed."""
    root = logging.getLogger()
    root.setLevel(level)
    has_redaction = any(isinstance(f, RedactionFilter) for f in root.filters)
    if not has_redaction:
        root.addFilter(RedactionFilter())
    fmt = "%(asctime)s %(levelname)s %(name)s :: %(message)s"
    has_stream = any(isinstance(h, logging.StreamHandler) for h in root.handlers)
    if not has_stream:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter(fmt))
        root.addHandler(handler)


def sanitize_error_message(exc: BaseException) -> str:
    """Return a generic, non-sensitive, non-traceback error message."""
    # Deliberately do not include the exception class or args in production
    # error bodies; only a stable, scrubbed phrase.
    return "internal error processing request"
