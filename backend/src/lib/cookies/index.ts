export const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  // In production, `sameSite: 'none'` requires HTTPS (`secure: true`) which we set above.
  sameSite: process.env.NODE_ENV === 'production' ? ('none' as const) : ('lax' as const),
  path: '/',
  // Host-only cookies — never set Domain=.parent.tld so admin/collector/customer subdomains stay isolated.
};

export default cookieOptions;
