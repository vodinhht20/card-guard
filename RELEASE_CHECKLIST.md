# Chrome Web Store / release checklist

- [ ] Rerun file-scoped core/integration/security/background/workspace tests, production build and formatter check from clean `npm ci`.
- [ ] Load dist on Chrome 120 minimum and current stable; verify toolbar popup size/scroll, true side panel gesture opening, no service-worker errors and icon.
- [ ] Create vault, card, multiple services per domain, link/edit dates, archive/delete, prevent linked card deletion.
- [ ] Confirm separate requested cancellation, confirmed cancellation and card removal; removal keeps reminders.
- [ ] Test manual HTTPS billing link, no new tab for CRUD.
- [ ] Test real OS notifications/permission disabled, 7/3/1/0 settings, snooze/dismiss/details, missed alarms after browser restart/sleep, no storm, badge and locked generic text.
- [ ] Test DST and changing device timezone, including precomputed future recurrence and horizon renewal.
- [ ] Test optional host prompt accept/deny, reload detector, medium/high/low signals, dismiss, confirm-only save, revoke removes resident hints, multiple tabs, SPA and iframe limitations.
- [ ] Verify no full PAN/CVV/input values in content messages, local/session storage or console with synthetic sentinel values and DevTools; inspect network under granted origins.
- [ ] Backup independent password, wrong password, corrupted/truncated/oversized files, unknown schema, duplicate IDs, merge/replace preview and storage quota failure.
- [ ] Test inactivity, suspended UI, closing popup, reload/browser restart, Lock Now across multiple contexts and stale concurrent edits.
- [ ] Accessibility: keyboard focus trap/Escape/return focus, screen reader labels, contrast, 320px side panel, light/dark, VI/EN. Review localized VI/EN copy and native accessibility behavior.
- [ ] Review manifest permission explanations, dependency lockfile and vulnerability advisories; security audit before public distribution.
- [ ] Prepare store screenshots/description, support contact, privacy policy URL and data-use disclosures matching PRIVACY.md.
- [ ] Zip **contents of dist/** (not node_modules/source/test artifacts); verify no secrets and remote executable code.
- [ ] Submit for independent Chrome Web Store review. Do not claim approval or PCI-DSS certification without assessment.

Automated browser smoke does not replace these manual platform checks. Unchecked items remain release gates, not claimed passing results.

- [ ] In the native toolbar popup, click outside during partial card/service entry after the encrypted-draft saved indicator; reopen/unlock and verify form, selected card, optional section and values. Confirm password/file inputs are intentionally cleared and drafts clear on Chrome restart.

- [ ] Verify six-cell password typing/paste/show-hide and automatic submission with confirmation/retry; last4-only entry and older backup compatibility; longer vault passwords are not supported by the current six-cell UI.
- [ ] Opt-in/opt-out remembered unlock, default7/max14, browser restart, expiry, fixed issue-time config changes, idle off/on, forget and Lock Now across UI contexts. Verify persisted profile-key risk disclosure matches behavior.
- [ ] Check custom selects/calendars with pointer and keyboard near viewport edges, modal focus, larger text and dashboard charts in native popup and sidepanel.

- [ ] Monthly reminder view in native popup/sidepanel: 30-day list, month/year and arrows, day event counts/filter/detail, keyboard and larger text, encrypted navigation restore.

- [ ] Review prepared `release/store-assets/` listing/graphics, supply publisher support and public privacy URL, verify screenshot accuracy before uploading.
