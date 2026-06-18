import { Service, Container } from 'typedi';
import { CustomException } from '@/utils/exception';
import { JwtService } from '@/utils/jwt';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { AdminToken } from '@/generated/prisma/client';
import PrismaDBConnection from '@/prisma/prisma-client';
import { assertOrgMembershipAllowsConsoleAccess } from '@/features/wifi/shared/org-membership-auth';

const prisma = PrismaDBConnection.getConnection();

@Service()
export class AuthService {
  private adminTokenService = Container.get<BaseService<AdminToken, any>>('adminTokenService');
  private adminService = Container.get<BaseService<AdminToken, any>>('adminService');
  private jwtService = Container.get(JwtService);

  public validateToken = async (token: string) => {

    const record = await this.adminTokenService.findWithCustomKey("token", token);

    if(!record) {
      throw new CustomException(401, "INVALID_TOKEN", "Invalid Token");
    }

    if(!await this.jwtService.isValid(token)) {
      await this.adminTokenService.update(record.id, { isValid: false });
      throw new CustomException(401, "INVALID TOKEN", "Invalid Token");
    }

    const user = await this.adminService.findById(record.adminId, { role: true }, { isActive: true });

    if (user?.isBlocked) {
      throw new CustomException(403, 'ACCOUNT_BLOCKED', 'This account has been blocked.');
    }

    await assertOrgMembershipAllowsConsoleAccess(prisma, record.adminId, user);

    return { userId: record.adminId, user };
  }
}

