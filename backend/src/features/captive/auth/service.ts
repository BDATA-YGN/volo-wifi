import { Service } from 'typedi';
import PrismaDBConnection from '@/prisma/prisma-client';
import type { Credential } from '@/generated/prisma/client';

const prisma = PrismaDBConnection.getConnection();

@Service()
export class CaptiveClientAuthService {
  public validateCredential = async (credentialId: string): Promise<Credential | null> => {
    try {
      const credential = await prisma.credential.findFirst({
        where: { id: credentialId, deletedAt: null },
        include: { plan: true, station: true },
      });
      return credential;
    } catch {
      return null;
    }
  };
}
