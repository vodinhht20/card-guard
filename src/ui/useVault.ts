import { type WorkspaceSnapshot } from "../core/workspace";
import { useCallback, useEffect, useRef, useState } from "react";
import { chromeVaultStorage, VaultSession } from "../core/repository";
import {
  RememberedSession,
  IndexedDbRememberStore,
} from "../core/rememberedSession";
import { parseEnvelope } from "../core/crypto";
import {
  buildSchedule,
  opaque,
  scheduleSchema,
  type Reminder,
} from "../core/reminders";
import type { Vault } from "../core/schema";
export function useVault() {
  const session = useRef(
    new VaultSession(chromeVaultStorage, (fn) =>
      navigator.locks.request("cardguard-vault-write", fn),
    ),
  );
  const remembered = useRef(
    new RememberedSession(new IndexedDbRememberStore()),
  );
  const [vault, setVault] = useState<Vault | null>(null),
    [workspace, setWorkspace] = useState<WorkspaceSnapshot | null>(null),
    [exists, setExists] = useState<boolean | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const expiry = useRef<number | null>(null),
    working = useRef(false),
    draftRevision = useRef(0),
    draftWrites = useRef<Promise<void>>(Promise.resolve());
  const draftKey = `workspace:${document.body.classList.contains("popup") ? "popup" : "sidepanel"}`;
  const clearUI = useCallback(() => {
    session.current.lock();
    setVault(null);
    setError("");
    expiry.current = null;
    setSessionExpiresAt(null);
  }, []);
  const forgetSession = useCallback(async () => {
    const response = await chrome.runtime.sendMessage({
      type: "FORGET_SESSION",
    });
    if (!response?.ok) throw new Error("Không thể hủy phiên ghi nhớ.");
    expiry.current = null;
    setSessionExpiresAt(null);
  }, []);
  const lock = useCallback(() => {
    clearUI();
    void chrome.runtime.sendMessage({ type: "LOCK_ALL" }).then(
      (result) => {
        if (!result?.ok) setError("Không thể hủy phiên ghi nhớ. Hãy thử lại.");
      },
      () => setError("Không thể hủy phiên ghi nhớ. Hãy thử lại."),
    );
  }, [clearUI]);
  const refresh = useCallback(async (value: Vault, prepared?: Reminder[]) => {
    const old = scheduleSchema.parse(
      (await chrome.storage.local.get("reminders")).reminders ?? [],
    );
    const items = prepared ?? (await buildSchedule(value, old)),
      version = session.current.version;
    if (!version) return;
    const result = await chrome.runtime.sendMessage({
      type: "SCHEDULE",
      items,
      version: await opaque(version),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    if (!result?.ok) throw new Error("SCHEDULE");
  }, []);
  const accept = useCallback(
    async (value: Vault, expiresAt: number | null) => {
      let restored: WorkspaceSnapshot | null = null;
      try {
        const raw = (await chrome.storage.session.get(draftKey))[draftKey];
        if (raw) restored = await session.current.restoreWorkspace(raw);
      } catch {
        await chrome.storage.session.remove(draftKey);
      }
      if (!session.current.unlocked) return;
      expiry.current = expiresAt;
      setSessionExpiresAt(expiresAt);
      setWorkspace(restored);
      setVault(value);
      setExists(true);
      await refresh(value).catch(() =>
        setError(
          "Vault đã mở; chưa cập nhật được lịch nhắc. Mở lại để thử lại.",
        ),
      );
    },
    [draftKey, refresh],
  );
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        await chrome.storage.local.setAccessLevel({
          accessLevel: "TRUSTED_CONTEXTS",
        });
        const raw = await chromeVaultStorage.read();
        if (raw) {
          const restored = await remembered.current.restore(parseEnvelope(raw));
          if (active && restored) {
            const value = await session.current.unlockWithKey(restored.key);
            if (active) await accept(value, restored.expiresAt);
          }
        }
        if (active) setExists(!!raw);
      } catch {
        if (active) {
          session.current.lock();
          setExists(true);
          setError("Không thể tự mở phiên. Hãy nhập mật khẩu để tiếp tục.");
        }
      }
    })();
    const check = () => {
      if (
        session.current.expired() ||
        (expiry.current !== null && Date.now() >= expiry.current)
      )
        lock();
    };
    const activity = () => {
      check();
      session.current.touch();
    };
    const timer = setInterval(check, 5000);
    const change = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === "session" && changes.lockSignal) clearUI();
      if (area === "local" && changes.vault) {
        setExists(!!changes.vault.newValue);
        if (
          session.current.unlocked &&
          changes.vault.newValue?.ciphertext !== session.current.version
        )
          clearUI();
      }
    };
    chrome.storage.onChanged.addListener(change);
    window.addEventListener("pointerdown", activity);
    window.addEventListener("keydown", activity);
    window.addEventListener("focus", check);
    window.addEventListener("pagehide", clearUI);
    document.addEventListener("visibilitychange", check);
    return () => {
      active = false;
      clearInterval(timer);
      chrome.storage.onChanged.removeListener(change);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("focus", check);
      window.removeEventListener("pagehide", clearUI);
      document.removeEventListener("visibilitychange", check);
      session.current.lock();
    };
  }, [accept, clearUI, lock]);
  const run = async (fn: () => Promise<void>) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } finally {
      working.current = false;
      setBusy(false);
    }
  };
  const unlock = async (
    password: string,
    create: boolean,
    rememberMe = false,
  ) =>
    run(async () => {
      try {
        const value = create
          ? await session.current.create(password)
          : await session.current.unlock(password);
        let expiresAt: number | null = null;
        if (rememberMe) {
          expiresAt = await remembered.current.enable(
            parseEnvelope(await chromeVaultStorage.read()),
            password,
            value.settings.rememberDays,
          );
          if (!session.current.unlocked) {
            await remembered.current.revoke();
            return;
          }
        } else await remembered.current.revoke();
        if (session.current.unlocked) await accept(value, expiresAt);
      } catch {
        clearUI();
        setError(
          "Không thể mở khóa. Mật khẩu sai, phiên không khả dụng hoặc dữ liệu không hợp lệ.",
        );
      }
    });
  const save = async (value: Vault) =>
    run(async () => {
      try {
        const old = scheduleSchema.parse(
            (await chrome.storage.local.get("reminders")).reminders ?? [],
          ),
          prepared = await buildSchedule(value, old),
          next = await session.current.save(value);
        if (
          expiry.current !== null &&
          next.settings.rememberDays !== vault?.settings.rememberDays
        ) {
          const end = await remembered.current.configure(
            next.settings.rememberDays,
          );
          expiry.current = end;
          setSessionExpiresAt(end);
          if (end === null) {
            lock();
            return;
          }
        }
        if (session.current.unlocked) setVault(next);
        await refresh(next, prepared).catch(() =>
          setError("Đã lưu vault; chưa cập nhật lịch nhắc. Mở lại để thử lại."),
        );
      } catch (e) {
        if (!session.current.unlocked) setVault(null);
        throw e;
      }
    });
  const remember = useCallback(
    (value: WorkspaceSnapshot) => {
      const revision = ++draftRevision.current;
      const result = draftWrites.current
        .catch(() => undefined)
        .then(async () => {
          if (revision !== draftRevision.current || !session.current.unlocked)
            return;
          const encrypted = await session.current.protectWorkspace(value);
          if (revision === draftRevision.current)
            await chrome.storage.session.set({ [draftKey]: encrypted });
        });
      draftWrites.current = result;
      return result;
    },
    [draftKey],
  );
  return {
    vault,
    workspace,
    remember,
    exists,
    busy,
    error,
    unlock,
    save,
    lock,
    sessionExpiresAt,
    forgetSession,
  };
}
