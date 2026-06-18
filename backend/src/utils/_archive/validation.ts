export function isPhoneNumber(value: any) {
  const regex = /^\+959\d{7,9}$/;
  const isValid = regex.test(value);
  if (!isValid) {
    throw new Error('Invalid Phone Number Format');
  }

  return value;
}
