import { hashSync } from 'bcrypt';
import { BCRYPT_ROUNDS } from '@/utils/password';

/** Default dev sign-in password: `developer` (stored as bcrypt). */
const DEV_PASSWORD = 'asdfasdf';

export const adminsData = [
  {
    fullName: 'Developer',
    username: 'developer',
    email: 'developer@bdata.com',
    password: hashSync(DEV_PASSWORD, BCRYPT_ROUNDS),
    roleId: 3,
    isActive: true,
    isSuper: true,
    isVerified: true,
    createdBy: 'system',
    updatedBy: null,
  },
];
