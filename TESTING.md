# Verification results — 2026-11-18

Executed in this workspace with Node.js 20.19.4. Unit/integration/worker tests use only synthetic fixtures and in-memory storage/Chrome fakes; no database or external service is configured or contacted. Each command names its own test file; no default/full-suite runner was used.

| Command | Result | Scope |
|---|---|---|
| `npm run test:core` | 27 passed | Last4-only cards and legacy first3 compatibility/forbidden fields, URL/schema/settings validation, date-only/DST/month-end/leap-year calculations, cancellation/trial priority, anonymous reminder defaults/recurrence/date edit/timezone, crypto roundtrip/non-extractable key/new IV, wrong password/tamper/KDF bounds, oversized vault rejection, detection confidence and denied permission |
| `npm run test:integration` | 9 passed | Restored-key authentication/generation guard, disabled/re-enabled idle timeout; vault CRUD/link/update/cancel, independent card removal, locked/restart lifecycle, idle expiry, stale writes, failed-write atomicity, encrypted export/import/ID merge/replace, malformed/oversized/prototype imports, alarm catch-up/reconstruction/dedup/snooze |
| `npm run test:security` | 5 passed | Encrypted storage shape + anonymous metadata; MV3/CSP/permission policy; source checks excluding form values/input events/network/logging/injection sinks; generic locked notifications and boundary checks |
| `npm run test:background` | 7 passed | Granted-origin language-only requests; grant revocation before global lock, forget without global lock, deletion failure; fake-Chrome runtime sender validation, foreign/content command rejection, top frame/domain/origin permission/strict hint validation, anonymous version-checked schedules and snooze/dismiss, locked catch-up/startup alarms, explicit dynamic script grants/revocation |
| `npm run test:catalog` | 6 passed | Unique valid preset domains, local-only metadata, name/domain/Vietnamese keyword search, safe identity-only prefill, explicit custom entry and backward-compatible encrypted workspace selection state |
| `npm run test:workspace` | 8 passed | Six-character password boundary and existing passwords; quick-card/service defaults and final validation; encrypted incomplete drafts across close/unlock, unique IVs, tamper/stale-version rejection, lock/idle protection and strict draft schemas |
| `npm run test:i18n` | 4 passed | Static UI phrase coverage, interpolated copy routing, plural/date labels, language preference whitelist and localized worker/detector messages |
| `npm run test:calendar` | 8 passed | Inclusive 30-day bounds, empty/invalid/oversized windows, ended and pending states, monthly/yearly anchors, leap years, deduplication, month ranges and legacy workspace defaults |
| `npm run test:password-entry` | 2 passed | Exact sixth-character completion, no early/overlength submit, creation confirmation and mismatch |
| `npm run test:sessions` | 6 passed | Memory-only wrapped grant/non-extractable device key, expiry/max14/defaults, fixed issue time, metadata/ciphertext tampering, wrong passwords, clock rollback, salt mismatch, revocation and in-flight enable race |
| `npm run test:dashboard` | 2 passed | Real-record distribution, active-card counts, overdue priorities, pending cancellation and four-week boundaries |
| `npm run test:browser:sessions` | Passed | Disposable Chrome profile/extension IndexedDB; six-cell opt-in, automatic reopen/full browser restart, configured14 days/idle off, pointer and keyboard selects, large text, forget, Lock Now and expired-grant rejection |
| `npm run test:browser` with `CARDGUARD_CHROMIUM` pointing to available Chromium | Passed | Actual unpacked MV3 loading in isolated persistent Chromium profile; create/unlock/lock/wrong password, add card/service/link/review, card removal and pending/confirmed cancellation, encrypted Chrome storage, actual file export/import, two extension UI pages/global lock, reload and full browser restart preserving encrypted records, no HTTP(S) requests from extension UI; manually injected isolated website detector fixture whose input `.value` getter throws, fixed allowlisted message with no form value |
| `npm run build` | Passed | TypeScript strict check, production popup/sidepanel/worker, standalone IIFE detector, manifest entry point/icon/CSP checks |
| `npm run format:check` | Passed | All source, focused tests and build/browser scripts |

**84 automated Vitest tests passed** across the recorded revisions, run through eleven file-scoped commands, plus two Chromium workflow scripts. No claims of database-backed integration, an independent security audit or Web Store approval.

## Browser-test boundaries

Browser testing opens `popup.html` / `sidepanel.html` as extension pages to automate shared UI. It does not prove actual toolbar popup window dimensions or a native side-panel open gesture on every supported Chrome version. The separate website fixture tests detector behavior with a mocked runtime; it does not exercise a real host permission prompt. Grant/deny/origin checks are covered by worker/core fakes. No real payment forms, real card numbers or personal browser profile are used.

Visual QA inspected popup and 440px sidepanel screenshots generated under `test-results/`. A view adjustment resets scroll when changing sections and checks the compact overview, six-cell unlock, service picker and upgraded settings. Important counts and labels use larger text; navigation stays accessible while scrolling.

## Manual release checks still required

Use RELEASE_CHECKLIST.md for real OS notification delivery/disabled permissions/sleep behavior, Chrome 120 and stable compatibility, native toolbar/side-panel interactions, real website permission prompts/revocation/SPAs, assistive technology and independent security review. VI/EN copy covers primary views, settings, unlock, validation messages and notifications; browser language checks are described below. Future recurrence is precomputed for 730 days; opening vault renews the horizon. The worker never unwraps keys or decrypts the vault to extend it indefinitely; opening an authenticated UI renews the schedule.

## UI revision verification

The browser workflow additionally creates a vault using exactly 6 characters, closes the popup page mid-card entry and mid-service entry, unlocks and verifies the exact partial digits, selected card, custom service name and trial date are restored. It checks session storage contains no plaintext card/service names or password. Manual service creation uses one Save action; optional fields remain accessible. Main UI theme is blue in light and dark modes.

## Popular-service picker revision

Focused catalog and workspace tests cover the new selection path and old draft defaults. Browser smoke searches and selects Netflix, restores that selection and date after closing/reopening the popup page, switches to Spotify using accent-free Vietnamese keywords, then checks no-result/custom fallback and saves a custom service. No new remote requests or permissions are introduced.

## Current interface/session revision

Both Chromium scripts passed against the final production bundle. Main smoke uses pointer-operated React Aria dropdowns (including near the viewport edge), custom calendars and last4-only entry. The session smoke additionally selects font size using the keyboard. Opening a dropdown is asserted not to change its selected value; this covers a regression where pointer release could select a newly overlapping option. Unit/integration/worker tests are memory/fake-only. Browser tests access only extension-origin IndexedDB inside a temporary profile, removed after completion, never a user's database/profile.

Six-character passwords use six visual cells with a single accessible masked input; the longer-password UI mode and submit buttons are removed. Login automatically submits the sixth character; creation waits for matching six-character confirmation. Remembered grants are deliberately opt-in, profile-local and bounded; browser tests verify logical expiry/revocation, not hardware protection or resistance to a compromised browser/profile. Charts use synthetic fixture data or actual local records, never production demo records.

The production build and strict TypeScript/no-unused check passed. Vite emits an advisory about the shared UI bundle exceeding 500 kB after adding bundled accessible controls; this is a local extension asset, with no CDN/runtime download. Native toolbar-window and OS checks above remain manual.

The simplified interface revision removes the header, puts lock/sidepanel actions in Settings, shortens labels and refreshes card faces. Browser smoke covers automatic create/unlock without submit clicks, focus moving to confirmation, mismatch feedback, wrong-password retry and last4-only card display. Screenshots include `cards.png` and `unlock.png`.

## Monthly calendar revision

Focused checks: `test:calendar` (8), `test:workspace` (8), `test:catalog` (6), strict/no-unused TypeScript, formatter and production package validation. Tests use only synthetic fixtures and in-memory fakes, with no database/network. The expanded `test:browser` checks the inclusive upcoming panel, switching months/year, February 29, empty months, day filtering/detail links, keyboard focus, return-to-current-month and restoring the selected month/day after closing/reopening. A fixed synthetic date makes this calendar fixture deterministic. Calendar screenshot: `test-results/calendar.png`. Native toolbar-window interaction still requires the existing manual platform checks.

## Typography, localization and store-art revision

Focused unit/worker/security checks: `test:i18n` 4, `test:background` 7, `test:security` 5, with memory/fake-only storage. The main browser smoke and remembered-session browser also passed after localization/font changes. `build:store-assets` uses an isolated profile, imports an encrypted synthetic fixture through the real UI and checks English views/settings tabs/card form/calendar, persistent language and 16/18px font selection, wrong-password copy and absence of external requests. The large-font layout regression checks 320/400px widths in VI/EN dark mode for horizontal overflow and wrapped/overflowing navigation/tab labels. React Aria transient live announcements from the prior locale are excluded from current-visible-copy scanning.

Store screenshots/promos are PNG RGB at their documented dimensions; icons are RGBA. `scripts/verify-store-assets.mjs` checks dimensions and counts. Graphics use actual UI capture plus local vector/HTML layout. No real profile, card details or production database are accessed. Native platform/manual release checks remain outstanding.

## Calendar row, reminder selection and toolbar icon fix

Focused `tests/reminderPreferences.test.ts`, `tests/calendar.test.ts` and `tests/i18n.test.ts`: 20 passed. The updated reminder-array schema regression in `tests/core.test.ts` passed using the `reminder offsets` name filter (remaining tests skipped). Selection preserves legacy offsets, requires at least one and caps at ten; the obsolete comma-separated input parser and copy were removed.

The production browser smoke passed. `build:store-assets` also verified the reminder input is absent and a selected offset survives save/reload, plus calendar date/name bounds at 320/400 px with 16/18 px VI/EN text. Actual large-text captures: `test-results/calendar-large-dark-vi-320.png` and `test-results/calendar-large-dark-vi-400.png`. Toolbar PNG generation checks nontransparent artwork reaches both horizontal canvas edges at 16/32/48 px; store 128 px retains its 16 px margin. Native Chrome toolbar appearance still needs visual confirmation after reloading the installed extension.

## Toolbar foreground enlargement

The shield/card artwork now uses a larger solid white shield and thicker contrasting details. Icon rendering and production build passed; generated white-foreground widths measured 12/26/38 px at toolbar sizes 16/32/48 px. The 16 px and 128 px images were visually inspected. Store imagery was regenerated and its browser checks passed; both ZIPs were rebuilt and compared byte-for-byte with their source files. Native toolbar appearance remains a manual check after Reload.

## Giao diện, quyền website và nút lưu thẻ (1.1.0)

- Unit test phạm vi: `npx vitest run tests/detectionEnhancements.test.ts tests/background.test.ts tests/serviceCatalog.test.ts tests/security.test.ts tests/i18n.test.ts tests/workspace.test.ts`. Toàn bộ dùng memory/mock; không database.
- Browser phạm vi: `npm run test:browser:enhancements` sau build. Có thể đặt `CARDGUARD_CHROMIUM` tới Chromium sẵn có. Profile tạm, HTML giả, runtime/permission mock cho kiểm tra UI; không thay đổi profile thật. Kiểm tra logo/font/ảnh/phiên bản, từ chối/cấp/thu hồi quyền, nhận diện field, không đọc giá trị và không submit, field xuất hiện sau 30 giây, lỗi mở panel và cleanup. Prompt cấp quyền Chrome thật và từng cổng thanh toán thực tế vẫn cần kiểm tra thủ công.

## Lịch và thống kê sao lưu (1.2.0)

- Unit test giới hạn: `npx vitest run tests/calendar.test.ts tests/calendarPresentation.test.ts tests/i18n.test.ts`. Các phép đếm/lọc/nhóm ngày và định dạng số tiền dùng dữ liệu giả, không truy cập database.
- UI giới hạn: `npm run test:browser:calendar` sau build; dùng profile tạm và backup giả. Kiểm tra lịch rỗng, thống kê, lọc/tìm, đổi tháng, chọn ngày bằng bàn phím, mở/thêm dịch vụ, sáng/tối, chiều rộng 320/400/880px, tiếng Anh/chữ lớn và khoảng cách số–nhãn trong phần sao lưu. Bổ sung kiểm tra kích thước popup không đổi qua 5 tab, biểu đồ 4 tuần thẳng hàng, cột 0 có chiều cao tô 0, trang chính sách mở khi chưa đăng nhập, nội dung Việt/Anh và mục lục, không tải mạng bên ngoài.
