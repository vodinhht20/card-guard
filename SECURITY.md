# CardGuard security model

## Trust boundaries

- Trusted popup/side panel: full schema validation and Web Crypto. Runtime vault keys are non-extractable and never messaged. Passwords are never persisted. UI contexts unlock separately unless the user opts into the local remembered grant described below. Storage changes invalidate stale contexts; Web Locks serialize atomic envelope writes.
- Worker: never decrypts or holds keys. Validates sender extension ID/protocol/host/path and strict message schemas. Accepts only anonymous schedule, refresh, reminder actions, lock and grant-revocation commands from trusted UI. Schedule version hash prevents an older UI overwriting a newer vault's schedule; prior worker delivery state wins on rebuild.
- Content script: only on user-approved optional HTTPS grants (individual origin or all HTTPS sites), top frame only, no vault imports/access. Strict allowlist message contains domain, confidence, type/kind, optional fixed day count. Worker verifies sender frame and origin against current permission. No externally_connectable or web-accessible resources.
- Website: untrusted; suggestion is never proof of registration. No card data, request interception, payment token, form values or credential inspection. No listeners on payment fields.

## Cryptography and persistence

Web Crypto PBKDF2-SHA256 600,000 iterations with random 16-byte salt derives AES-256-GCM non-extractable key. Each write has random 12-byte IV. AES-GCM tag authenticates ciphertext and AAD binds format/KDF/header. Import accepts only v1, fixed algorithms, bounded KDF work (600,000–2,000,000), validated salt/IV lengths and strict decoded schema. Backup file size 5 MB. Future schema versions require an explicit migration; unknown versions are rejected without mutation.

All records/settings/notes/history encrypted in one `chrome.storage.local.vault` object. No partial plaintext commits. Merge validates all references/unique IDs, existing IDs win; replace requires explicit preview confirmation. Atomic single-item writes preserve old vault on failures. Cross-context serialization is local to this extension origin. Schedule is a derived projection committed separately; an OS/storage failure after vault commit may leave an older reminder projection until unlock/rebuild. UI reports this distinctly.

`setAccessLevel(TRUSTED_CONTEXTS)` called in worker and UI before vault access. Content scripts do not use storage APIs. `storage.session` holds temporary website hints, a global lock signal and AES-GCM encrypted UI snapshots per popup/sidepanel. Drafts bind salt, a separate AAD domain, format version and vault ciphertext hash; stale snapshots are discarded after a vault change. Drafts never include passwords, key material or backup files. No decrypted vault or raw vault key is stored; opt-in IndexedDB key persistence is described below. No sync, localStorage, eval, remote JS, console user-data logging, telemetry or runtime network APIs. MV3 CSP `connect-src 'none'`, local scripts/styles, no inline event attributes/HTML injection. Input rendering uses React text nodes.

Free text is bounded and rejects obvious PAN-shaped digit sequences. Schemas reject unknown properties including cvv/pan/otp. This is defense in depth, not a guarantee against a user encoding a secret in arbitrary notes; UI instructs users not to store secrets. New and edited cards require only four ASCII last digits. Optional legacy first3 remains readable for existing records/backups but is removed when that card is edited and saved. UI never requests it. Card identity is secure UUID, not digit fragments. Monetary values use validated decimal strings and no floating point financial calculations.

## Threat limitations

A compromised browser, extension debugger, OS, malware, screen capture or another party with the unlock password can read an open vault. Non-extractable CryptoKey is not hardware isolation. JavaScript strings/objects and garbage collection cannot guarantee memory zeroization. Lock drops references and unmounts sensitive UI; in-flight crypto may retain transient buffers until completion. Unlock completion is discarded after explicit locking via generation guards. Auto-lock runs on a timer and checks expiry again before activity/focus/save; suspension limits exact timing. Closing a UI drops its in-memory session; a valid opt-in grant can automatically unlock a new context, including after browser restart. Without a grant, password entry is required.

Anonymous metadata exposes schedule timing/frequency and granted site origins, explained in PRIVACY.md and UI. Notifications are always generic, including when unlocked. Crash after persisting delivered state but before OS delivery may lose a notice; at-most-once catch-up policy avoids storms. Precomputed recurring horizon is 730 days and must be renewed by unlock. No automatic payments/cancellation; removal of a card never marks subscription cancelled.

## Reporting

Report security issues privately to the project maintainer. Include reproduction with synthetic records only; do not attach real card data, passwords, tokens, vault exports or screenshots of payment forms. There is no configured reporting backend or telemetry destination.

The current unlock/create UI accepts exactly six characters and submits automatically; it no longer offers a longer-password mode, per the latest product requirement. Backup encryption passwords retain a minimum of 6 and maximum 256. Stored vault passwords are never rewritten automatically; older longer passwords cannot be entered through this six-cell UI. The KDF and encryption algorithms are unchanged. Partial card fragments and incomplete service fields can be restored from encrypted drafts, but final record validation still requires valid last4 digits, domain, dates and references.

## Opt-in remembered unlock (product requirement update)

The user may persist a grant for 1–14 days, default seven, measured from the original opt-in time. It is not a sliding expiry. Changing duration rewraps authenticated metadata from that original time; expired grants cannot be extended. Clock rollback, invalid metadata, changed vault salt or failed authentication revoke the grant. This is a software deadline, not trusted hardware time, and it does not protect against an attacker modifying the extension or OS clock/state.

Trusted UI derives a transient extractable vault key only for Web Crypto `wrapKey`, verifies the password against the vault and wraps it using an independently generated non-extractable AES-GCM device CryptoKey. The extension-origin IndexedDB stores that device CryptoKey via structured clone, wrapped ciphertext, random IV, salt, issued time, expiry and duration. AAD binds version, salt and all expiry metadata. Transient raw key buffers are not written or messaged. Restoration unwraps to a non-extractable key and authenticates the current vault before adoption. Passwords never enter the grant; encrypted backups exclude grants and device keys.

The non-extractable device key is not hardware-bound or backed by an OS secret store. Another person using the same Chrome profile can open the remembered vault. Profile theft, malicious extensions with sufficient capabilities, browser/OS compromise or debugger access may allow use of the stored key. Non-extractability prevents ordinary Web Crypto export, not use by a compromised trusted context. Opt-in trades password prompts for this local-profile access risk.

Lock Now and idle expiry send a trusted command immediately to the worker, which deletes the IndexedDB grant before broadcasting a global lock. A persistent revocation revision and atomic IndexedDB transaction reject an in-flight grant write after revocation. The worker only deletes grant records; it never unwraps/decrypts them. Hủy phiên ghi nhớ revokes future auto unlock while retaining the current unlocked UI. Closing the popup preserves a valid grant but drops the memory session. Idle time is tracked only while a UI context is running; fixed grant expiry is rechecked at next open and periodically while open. Users may disable idle lock with zero minutes. Successful deletion is required; device/storage failures cannot guarantee erasure.

## Non-sensitive display preferences

`uiLanguage` and `uiTextSize` are whitelisted plaintext copies of display settings in trusted local storage, allowing the locked UI to retain language and font size. They contain no records, credential or grant. Generic notifications use the language copy without decrypting the vault. A strict UI_LANGUAGE content request returns only vi/en after sender, frame, HTTPS-origin and current permission checks. It never opens the side panel or exposes records; content scripts still do not use storage APIs.

## Card field controls (1.1.0)

The card button matches only field metadata (type, name, ID, autocomplete). It never reads field values or submits forms. A click emits a strict card suggestion containing only the current domain and fixed metadata; users enter last4 in the trusted UI. Observation is debounced and scans are bounded to 300 inputs / 12 controls, including fields added later by SPAs. Controls and listeners stop on permission revocation. Cross-origin frames and website shadow roots are not traversed. Local logos/font/illustration do not add runtime network access.
