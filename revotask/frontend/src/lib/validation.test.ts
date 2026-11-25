import { describe, expect, it } from "vitest";
import { validateEmail, validateName, validatePassword, validateRegister, validateRequired } from "./validation";

// REQ-AUTH-5: client-side validation for the register form.
describe("field validators", () => {
  it.each(["", "   "])("rejects blank name %j", (value) => expect(validateName(value)).toMatch(/required/));
  it("accepts a normal name", () => expect(validateName("Ada Lovelace")).toBeUndefined());

  it.each(["", "nope", "a@b", "a b@c.io"])("rejects email %j", (value) => expect(validateEmail(value)).toBeDefined());
  it("accepts a valid email", () => expect(validateEmail(" ada@example.com ")).toBeUndefined());

  it.each([
    ["short1", /at least 8/],
    ["onlyletters", /letter and one number/],
    ["12345678", /letter and one number/],
  ])("rejects password %j", (value, message) => expect(validatePassword(value)).toMatch(message));
  it("accepts a strong password", () => expect(validatePassword("Passw0rd1")).toBeUndefined());

  it("enforces required text with a maximum", () => {
    const title = validateRequired("Title", 5);
    expect(title("")).toBe("Title is required.");
    expect(title("toolong")).toBe("Title must be 5 characters or fewer.");
    expect(title("ok")).toBeUndefined();
  });
});

describe("validateRegister", () => {
  const valid = { name: "Ada", email: "ada@example.com", password: "Passw0rd1", confirm: "Passw0rd1" };

  it("returns no errors for valid input", () => expect(validateRegister(valid)).toEqual({}));
  it("reports every invalid field at once", () => {
    const errors = validateRegister({ name: "", email: "x", password: "short", confirm: "other" });
    expect(Object.keys(errors).sort()).toEqual(["confirm", "email", "name", "password"]);
  });
  it("flags a mismatched confirmation", () => {
    expect(validateRegister({ ...valid, confirm: "Different1" }).confirm).toBe("Passwords do not match.");
  });
});
