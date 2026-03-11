export const MIN_PASSWORD_LENGTH = 8;

export function getPasswordLengthError(subject = 'La contrasena'): string {
  return `${subject} debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`;
}

export function validatePasswordLength(
  password: string,
  subject = 'La contrasena',
): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return getPasswordLengthError(subject);
  }

  return null;
}
