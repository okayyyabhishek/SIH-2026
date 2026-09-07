# Sentinel NER — Cryptographic Warning Ledger Specification (Stage 8)

## 1. Overview & Purpose

The Sentinel NER **Warning Ledger** is an append-only, cryptographically chained, audit-grade event store.
It permanently records every critical decision point in the disaster management pipeline, creating an immutable link from initial telemetry to final ground outcome:

$$\text{Evidence} \longrightarrow \text{Risk} \longrightarrow \text{Consequence} \longrightarrow \text{Recommendation} \longrightarrow \text{Human Review} \longrightarrow \text{Authorization} \longrightarrow \text{Warning} \longrightarrow \text{Dispatch} \longrightarrow \text{Acknowledgement} \longrightarrow \text{Ground Outcome}$$

The Warning Ledger does not overwrite historical records. If an action or warning is modified, cancelled, or superseded, a new block is appended to the chain.

---

## 2. Cryptographic Block Chaining Model

Each district maintains an independent, strictly ordered event chain.
Each ledger entry incorporates:
1. `sequence_number`: Monotonically increasing 1-indexed integer.
2. `prev_event_hash`: The SHA-256 hash of the immediately preceding block in the district chain.
3. `current_event_hash`: The SHA-256 hash of the current block header and canonical payload.

### Hash Computation Formula
The current block hash is computed as:

$$\text{Header} = \text{sequence\_number} \parallel \text{district\_id} \parallel \text{event\_type} \parallel \text{actor\_user\_id} \parallel \text{actor\_role} \parallel \text{recorded\_at} \parallel \text{prev\_event\_hash}$$

$$\text{PayloadHash} = \text{SHA256}(\text{CanonicalJSON}(\text{payload}))$$

$$\text{current\_event\_hash} = \text{SHA256}(\text{Header} \parallel \text{PayloadHash})$$

### Canonical JSON Representation
To ensure cross-platform cryptographic determinism, JSON serialization adheres to RFC 8785:
- Object keys are sorted lexicographically (`sort_keys=True`).
- No extraneous whitespace (`separators=(',', ':')`).
- UTF-8 character encoding without escaping forward slashes.

### Genesis Block Specification
The root of each district ledger is initialized with a well-known Genesis Block:
- `sequence_number`: `1`
- `prev_event_hash`: `0000000000000000000000000000000000000000000000000000000000000000` (64 zeros)
- `event_type`: `ACTION_CREATED` or `DISTRICT_LEDGER_GENESIS`
- `actor_user_id`: `system:genesis`

---

## 3. Data Schema

### WarningLedgerEntry Schema
```typescript
interface WarningLedgerEntry {
  id: string;                      // e.g. led-aiz-000001
  sequence_number: number;         // 1, 2, 3...
  district_id: string;             // e.g. dst-aizawl
  event_type: LedgerEventType;     // ACTION_CREATED, WARNING_AUTHORIZED, etc.
  actor_user_id: string;           // Authenticated user ID
  actor_role: string;              // Role at time of action
  payload_json_canonical: string;  // Deterministic JSON string
  prev_event_hash: string;         // SHA-256 hex string (64 chars)
  current_event_hash: string;      // SHA-256 hex string (64 chars)
  recorded_at: string;             // ISO-8601 UTC timestamp
  warning_id?: string;             // Optional foreign key to warning
  action_id?: string;              // Optional foreign key to action
  payload: Record<string, any>;    // Structured event payload
}
```

### Auditable Event Types (`LedgerEventType`)
1. `ACTION_CREATED`: Action recommendation synthesized and queued.
2. `ACTION_REVIEWED`: Technical review conducted with engineering notes.
3. `ACTION_APPROVED`: Certified authority approved action.
4. `ACTION_REJECTED`: Certified authority rejected action with justification.
5. `ACTION_CANCELLED`: Action cancelled prior to execution.
6. `ACTION_STARTED`: Field crew dispatched; execution commenced.
7. `ACTION_COMPLETED`: Ground inspection finished; outcome verified.
8. `ACTION_FAILED`: Field intervention aborted due to impassable terrain.
9. `WARNING_CREATED`: Warning advisory drafted.
10. `WARNING_REVIEWED`: Operational warning text reviewed.
11. `WARNING_AUTHORIZED`: Warning signed off by statutory authority.
12. `WARNING_REJECTED`: Warning proposal rejected.
13. `WARNING_DISPATCH_REQUESTED`: Warning queued for provider transport.
14. `WARNING_DISPATCHED`: Warning sent to recipient channels.
15. `WARNING_DELIVERY_FAILED`: External delivery error recorded truthfully.
16. `WARNING_ACKNOWLEDGED`: Recipient affirmed formal receipt.
17. `WARNING_ESCALATED`: Warning escalated to higher incident group.
18. `WARNING_CANCELLED`: Warning rescinded before expiry.
19. `WARNING_EXPIRED`: Warning reached time-to-live expiration.

---

## 4. Live Cryptographic Tamper Detection (`verify_chain`)

The `WarningLedgerService.verify_chain(repo, district_id)` algorithm validates the entire district chain from genesis to head:

1. **Monotonicity Check:** Verifies that `sequence_number` starts at 1 and increments by exactly 1 without gaps or re-ordering.
2. **Genesis Block Check:** Verifies that block #1 references `prev_event_hash = "0" * 64`.
3. **Block Linkage Check:** For every block $i > 1$, verifies that $\text{prev\_event\_hash}_i == \text{current\_event\_hash}_{i-1}$.
4. **Data Integrity Check:** Recomputes the SHA-256 hash from the stored header and canonical payload and verifies that it exactly equals the recorded `current_event_hash`.

If any historical record is maliciously modified (e.g. changing an authorization decision or modifying a warning headline), the verification algorithm flags:
- `is_valid = False`
- `corrupted_sequence_number = i`
- `message = "Data tampering detected in entry sequence #{i}: recorded hash does not match computed payload hash"`

This tamper-evident architecture guarantees forensic integrity suitable for post-disaster audits and judicial inquiry.
