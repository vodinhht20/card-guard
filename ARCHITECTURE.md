# Architecture

```
Popup / Side panel (React, independent in-memory VaultSession)
  ├── strict Zod models → actions → encrypted repository → storage.local.vault
  ├── Web Crypto AES-GCM / PBKDF2 (never key/password in messages)
  ├── encrypted backup preview → validated merge/replace → same repository
  └── anonymous reminder projection + ciphertext version hash
        ↓ strict internal message, extension sender path validation
MV3 worker → serialized scheduler → generic notifications / two Chrome alarms / badge
  └── storage.local: anonymous reminder metadata only; no key, no decryption

Optional HTTPS origin grant → dynamic isolated top-frame content IIFE
  └── conservative bounded heading/button + URL-path rule adapter
        → user clicks suggestion → sender origin + permission validation
        → temporary trusted session hint → side panel review → explicit vault save
```

## Source map

- `src/core/schema.ts`: strict domain models/settings/history; bounded records and text, URLs, date-only validation.
- `src/core/crypto.ts`: versioned authenticated encryption envelope; import cost bounds.
- `src/core/repository.ts`: atomic storage adapter, stale-version checking, exclusive mutation, idle/generation locks.
- `src/core/actions.ts`: pure card/service updates and independent cancellation/removal state.
- `src/core/dates.ts`: local calendar arithmetic, anchor-based recurring dates and priorities.
- `src/core/reminders.ts`: anonymous IDs, schedule projection, 730-day recurrence horizon, timezone rebasing, worker I/O adapter and catch-up dedup.
- `src/core/detection.ts`: adapter interface + conservative generic plugin; strict content message and origin validation.
- `src/core/backup.ts`: size/schema/authentication validation; deterministic ID merge and replace.
- `src/background/`: worker listeners and dynamic script permissions registration. Listener registration happens synchronously; async tasks serialized. Alarms reconstructed on cold start/startup/installation and periodic ticks.
- `src/content/`: no storage, keys, form value reads or network; card controls inspect only field metadata. Bundled separately as a self-contained IIFE so Chrome dynamic scripting does not require ES module imports.
- `src/ui/`: shared popup/sidepanel React entry, React Aria dialog focus/escape, custom select/date controls, CRUD/preview, dashboard/calendar/settings, dictionary VI/EN and theme.
- `tests/`: synthetic-only unit/integration/security/worker fake tests. `scripts/browser-test.mjs`: isolated Chromium profile UI smoke.

## Decisions

No backend, framework runtime fetch, remote fonts/assets or CDN. Local CSS equivalents used instead of Tailwind/shadcn to keep dependencies small and CSP straightforward. Lucide icons are bundled SVG components. UUID identity prevents fragment-based card collisions. Whole-vault encryption deliberately favors correctness/privacy over partial-record querying; limits 2,000 cards / 5,000 subscriptions / 500 history entries, 50,000 planned reminders and 5 MB imported file. There is no database.

Storage envelope updates are serialized via Web Locks in trusted extension origin. Each write checks current encrypted version; a conflicting context must unlock/reload rather than overwrite. The worker serializes schedule updates and compares vault ciphertext hash, preserving delivered/snooze state from its latest projection. Per-reminder actions are applied by worker to latest state, not client-side read-modify-write. Vault and schedule use separate writes; projection failure is reported and repaired on unlock.

Date-only values remain YYYY-MM-DD. Day counts use UTC calendar day difference; notifications use local 09:00 Date constructors to respect DST. Recurrence derives every occurrence from original anchor, clamping only that month's day. Worker detects IANA timezone changes and rebases existing calendar timestamps, leaving snooze as an absolute delay.

Backups use the same v1 envelope but independent user-provided password and random salt. Import has no mutation until full decryption/schema validation and explicit user preview confirmation. Unsupported versions fail closed; no speculative migration for nonexistent historical versions.

## Chrome API references

Side Panel opening is tied to a user gesture; UI obtains its window ID before the click and invokes open directly: [Chrome Side Panel API](https://developer.chrome.com/docs/extensions/reference/api/sidePanel). Host grants use declared optional permissions: [Chrome Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions), with top-frame dynamic registration through [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting). Alarm state is reconstructed rather than assuming persistence on older Chrome versions: [Alarms API](https://developer.chrome.com/docs/extensions/reference/api/alarms). Content-script storage exposure is restricted through [Storage API access levels](https://developer.chrome.com/docs/extensions/reference/api/storage).

## UI continuation and quick entry

`src/core/workspace.ts` validates incomplete draft models separately from final records, applies quick-entry defaults and encrypts/restores workspace snapshots with the current in-memory vault key. A separate AES-GCM AAD domain binds salt/version/vault hash. Trusted session storage holds only ciphertext, IV, schema version and vault hash; each UI surface has its own snapshot. Writes are ordered and superseded revisions skipped. Reopening requires a password unless an opt-in remembered grant authenticates the vault. Closing UI drops the runtime key; the separate remembered grant is described below. Only successfully completed snapshot writes are recoverable.

New cards require network/last4; nickname defaults to network plus last4. New manual services accept a domain or HTTPS URL, default name to domain and preselect only a sole active card. Optional details remain editable. A compact inline summary permits one manual save action; detected suggestions keep explicit preview/confirmation. No real date is inferred from platform name or detection duration.

`src/core/serviceCatalog.ts` provides a static allowlist and pure accent-insensitive search/prefill helpers. `src/ui/ServicePresetPicker.tsx` renders local shortcuts and custom entry, with no external logos or requests. Workspace draft schema includes optional-compatible entry mode/search fields; legacy snapshots default to manual entry. Preset identity never creates a subscription until the normal save action.

## Remembered sessions and interface

`src/core/rememberedSession.ts` owns the bounded authenticated grant, Web Crypto wrap/unwrap and extension-origin IndexedDB store. The device CryptoKey is non-extractable but persistently usable within this Chrome profile, not OS/hardware isolated. Grant issuance and configuration atomically check a persistent revision to prevent resurrection after revocation. Trusted worker LOCK_ALL/FORGET_SESSION deletes the grant durably; only LOCK_ALL also broadcasts the UI lock. No plaintext password, raw vault key, decrypted record or grant passes through runtime messages. `useVault` restores grants, adopts keys with repository generation guards and handles expiry/idle/global locking. Stored settings remain backward compatible via schema defaults.

`src/ui/Gate.tsx` presents a six-cell password control backed by one accessible password input, with automatic submission on the sixth character and confirmation before creation. The longer-password UI mode is removed. `passwordEntry.ts` isolates completion/mismatch validation for unit tests. Header/branding blocks and unused styles are removed; lock and side-panel actions live in Settings. `controls.tsx` bundles React Aria select, segmented date/calendar and accessible overlays; calendar values remain YYYY-MM-DD. `dashboard.ts` computes real-record status distribution and four calendar-week buckets for the larger overview. Settings use tabs, readable controls, theme/text/chart preferences, expiry/idle controls, reminder presets and encrypted data tools.

Official API references: [React Aria Select](https://react-aria.adobe.com/Select), [DatePicker](https://react-aria.adobe.com/DatePicker), [Modal](https://react-aria.adobe.com/Modal), [Web Crypto wrapKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/wrapKey), [CryptoKey](https://developer.mozilla.org/en-US/docs/Web/API/CryptoKey).

## Monthly reminder view

`src/core/calendar.ts` computes bounded date windows (maximum 366 days), inclusive range filtering and anchor-based recurring occurrences, sharing `targetDate`/`nextRenewal` with reminders. Each service/date is deduplicated. Trial expiry and renewal events have explicit labels; ended records follow existing reminder exclusions. The UI queries only the next 30 days and one selected month, not the entire multi-year history. `CalendarView.tsx` uses React Aria Calendar with local custom month/year selectors, date counts, keyboard navigation and a per-day/month agenda. Calendar navigation is part of the encrypted workspace snapshot with nullable defaults for older snapshots; it introduces no plaintext schedule metadata or network requests.

## Typography and localization

Body text inherits a 16px root (18px large); Chrome extension user-agent body sizing is explicitly overridden. Titles/key figures remain distinct. Navigation uses short visible labels with full accessible names; settings tabs use responsive rows. `ui/Locale.tsx` supplies React Aria locale and the shared dictionary before/after unlock, with non-sensitive local preference copies. Static phrases and interpolated numeric/date labels have translation regression checks. `core/locale.ts` provides independent, key-free worker/detector copy. Manifest metadata has Chrome `_locales/vi` and `_locales/en` catalogs.

`assets/icon.svg` is the local vector icon source. Build scripts render icons and compose store art from actual extension screenshots using only disposable synthetic data. Store graphics/listing drafts are packaged separately from the extension ZIP. No images or demo fixture data are loaded into the production vault.
