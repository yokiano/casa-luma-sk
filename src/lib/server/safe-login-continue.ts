/** Allow only same-origin internal tool paths for login continuation. */
export const getSafeContinueTo = (continueTo: string | null) => {
  if (!continueTo || continueTo.includes('\\') || /[\u0000-\u001f\u007f]/.test(continueTo)) return '/tools';
  if (!/^\/(?:tools|mgmt-dashboard)(?:\/|\?|$)/.test(continueTo) || continueTo.startsWith('//')) return '/tools';

  if (
    continueTo === '/tools/login' ||
    continueTo.startsWith('/tools/login?')
  ) {
    return '/tools';
  }

  return continueTo;
};
