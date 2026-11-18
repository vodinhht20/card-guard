import { describe, expect, it } from "vitest";
import { passwordEntryState } from "../src/core/passwordEntry";
describe("six-cell automatic submission", () => {
  it("waits until exactly six characters for unlock", () => {
    for (const code of ["", "1", "12345", "1234567"])
      expect(passwordEntryState(code, "", false)).toBe("incomplete");
    expect(passwordEntryState("abc123", "", false)).toBe("ready");
  });
  it("waits for confirmation when creating and rejects mismatches", () => {
    expect(passwordEntryState("abc123", "", true)).toBe("incomplete");
    expect(passwordEntryState("abc123", "abc12", true)).toBe("incomplete");
    expect(passwordEntryState("abc123", "abc124", true)).toBe("mismatch");
    expect(passwordEntryState("abc123", "abc123", true)).toBe("ready");
  });
});
