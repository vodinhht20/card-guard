export const PASSWORD_CODE_LENGTH = 6;
export function passwordEntryState(
  password: string,
  confirmation: string,
  creating: boolean,
): "incomplete" | "mismatch" | "ready" {
  if (
    password.length !== PASSWORD_CODE_LENGTH ||
    (creating && confirmation.length !== PASSWORD_CODE_LENGTH)
  )
    return "incomplete";
  return creating && password !== confirmation ? "mismatch" : "ready";
}
