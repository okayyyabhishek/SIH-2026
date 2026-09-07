"""
Sentinel NER — Stage 8 Cryptographically Chained Warning Ledger Service
Provides append-only, tamper-evident audit ledger entries for complete
forecast-to-intervention accountability.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, Optional
from uuid import uuid4

from src.schemas.warning_ledger import (
    LedgerEventType,
    LedgerVerificationResult,
    WarningLedgerEntry,
)

GENESIS_HASH = "0" * 64


class WarningLedgerService:
    """
    Manages the append-only, cryptographically chained Warning Ledger.
    Every operational decision, warning review, dispatch, and outcome is recorded here.
    """

    @staticmethod
    def calculate_payload_hash(payload: Dict[str, Any]) -> str:
        """Computes deterministic SHA-256 digest of arbitrary payload dictionary."""
        canonical_json = json.dumps(payload, sort_keys=True, default=str)
        return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()

    @staticmethod
    def calculate_entry_hash(
        sequence_number: int,
        timestamp_iso: str,
        event_type: str,
        actor_user_id: str,
        prev_event_hash: str,
        payload_hash: str,
    ) -> str:
        """
        Computes SHA-256 digest over canonical sequence block:
        {sequence_number}|{timestamp_iso}|{event_type}|{actor_user_id}|{prev_event_hash}|{payload_hash}
        """
        raw = f"{sequence_number}|{timestamp_iso}|{event_type}|{actor_user_id}|{prev_event_hash}|{payload_hash}"
        return hashlib.sha256(raw.encode("utf-8")).hexdigest()

    @classmethod
    async def record_event(
        cls,
        repo: Any,
        district_id: str,
        event_type: LedgerEventType,
        actor_user_id: str,
        actor_role: str,
        payload: Dict[str, Any],
        warning_id: Optional[str] = None,
        action_id: Optional[str] = None,
    ) -> WarningLedgerEntry:
        """
        Appends a new immutable ledger block to the district's cryptographic chain.
        Sequence numbers strictly increment and each block links to previous hash.
        """
        latest = await repo.get_latest_ledger_entry(district_id)

        if latest:
            sequence_number = latest["sequence_number"] + 1
            prev_event_hash = latest["event_hash"]
        else:
            sequence_number = 1
            prev_event_hash = GENESIS_HASH

        now = datetime.now(timezone.utc)
        now = now.replace(microsecond=(now.microsecond // 1000) * 1000)
        timestamp_iso = now.isoformat()
        payload_hash = cls.calculate_payload_hash(payload)

        event_hash = cls.calculate_entry_hash(
            sequence_number=sequence_number,
            timestamp_iso=timestamp_iso,
            event_type=event_type.value if hasattr(event_type, "value") else str(event_type),
            actor_user_id=actor_user_id,
            prev_event_hash=prev_event_hash,
            payload_hash=payload_hash,
        )

        entry_data = {
            "id": f"ledg-{uuid4().hex[:12]}",
            "sequence_number": sequence_number,
            "timestamp": now,
            "timestamp_iso": timestamp_iso,
            "event_type": event_type.value if hasattr(event_type, "value") else str(event_type),
            "district_id": district_id,
            "warning_id": warning_id,
            "action_id": action_id,
            "actor_user_id": actor_user_id,
            "actor_role": actor_role,
            "payload": payload,
            "prev_event_hash": prev_event_hash,
            "event_hash": event_hash,
        }

        saved_dict = await repo.append_ledger_entry(entry_data)
        return WarningLedgerEntry(**saved_dict)

    @classmethod
    async def verify_chain(cls, repo: Any, district_id: str) -> LedgerVerificationResult:
        """
        Validates the entire cryptographic chain for a district from genesis to the latest entry.
        Detects any sequence omission, data tampering, or unauthorized modification.
        """
        entries_dicts = await repo.list_all_ledger_entries_for_district(district_id)

        if not entries_dicts:
            return LedgerVerificationResult(
                district_id=district_id,
                total_entries=0,
                is_valid=True,
                genesis_hash=GENESIS_HASH,
                latest_hash=GENESIS_HASH,
                message=f"Empty chain for district {district_id}. Valid genesis state.",
            )

        expected_prev_hash = GENESIS_HASH

        for idx, entry in enumerate(entries_dicts):
            expected_seq = idx + 1
            if entry["sequence_number"] != expected_seq:
                return LedgerVerificationResult(
                    district_id=district_id,
                    total_entries=len(entries_dicts),
                    is_valid=False,
                    corrupted_sequence_number=entry["sequence_number"],
                    corrupted_entry_id=entry["id"],
                    genesis_hash=GENESIS_HASH,
                    latest_hash=entries_dicts[-1]["event_hash"],
                    message=f"Sequence gap detected: expected {expected_seq}, found {entry['sequence_number']}",
                )

            if entry["prev_event_hash"] != expected_prev_hash:
                return LedgerVerificationResult(
                    district_id=district_id,
                    total_entries=len(entries_dicts),
                    is_valid=False,
                    corrupted_sequence_number=entry["sequence_number"],
                    corrupted_entry_id=entry["id"],
                    genesis_hash=GENESIS_HASH,
                    latest_hash=entries_dicts[-1]["event_hash"],
                    message=f"Broken chain at sequence {entry['sequence_number']}: prev_hash mismatch",
                )

            # Recompute entry hash
            ts = entry.get("timestamp")
            if isinstance(ts, datetime) and ts.tzinfo is None:
                ts = ts.replace(tzinfo=timezone.utc)
            timestamp_iso = entry.get("timestamp_iso") or (ts.isoformat() if hasattr(ts, "isoformat") else str(ts))
            payload_hash = cls.calculate_payload_hash(entry.get("payload", {}))
            recomputed = cls.calculate_entry_hash(
                sequence_number=entry["sequence_number"],
                timestamp_iso=timestamp_iso,
                event_type=entry["event_type"],
                actor_user_id=entry["actor_user_id"],
                prev_event_hash=entry["prev_event_hash"],
                payload_hash=payload_hash,
            )

            if entry["event_hash"] != recomputed:
                return LedgerVerificationResult(
                    district_id=district_id,
                    total_entries=len(entries_dicts),
                    is_valid=False,
                    corrupted_sequence_number=entry["sequence_number"],
                    corrupted_entry_id=entry["id"],
                    genesis_hash=GENESIS_HASH,
                    latest_hash=entries_dicts[-1]["event_hash"],
                    message=f"Data tampering detected at sequence {entry['sequence_number']}: entry_hash recomputation failed",
                )

            expected_prev_hash = entry["event_hash"]

        return LedgerVerificationResult(
            district_id=district_id,
            total_entries=len(entries_dicts),
            is_valid=True,
            genesis_hash=GENESIS_HASH,
            latest_hash=entries_dicts[-1]["event_hash"],
            message=f"Cryptographic chain integrity verified successfully across {len(entries_dicts)} entries.",
        )
