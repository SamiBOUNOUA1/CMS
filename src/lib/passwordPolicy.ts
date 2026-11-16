/** Minimum length for every password set in the app (users, operators, resets). */
export const MIN_PASSWORD_LENGTH = 10;

/** Returns an error message when the password is not acceptable, otherwise null. */
export function passwordProblem(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }
  if (password.length > 200) return 'Password is too long';
  return null;
}
