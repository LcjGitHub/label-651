export const ADMIN_USER_ID = 9;
export const NO_PERM_USER_ID = 10;
export const REGULAR_USER_ID = 2;

export const authHeaders = (userId: number) => ({
  'x-user-id': String(userId),
});
