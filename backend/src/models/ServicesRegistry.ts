import { Service, Container } from 'typedi';
import PrismaDBConnection from '@/prisma/prisma-client';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { OAuthService } from '@/third-party/bdataOAuth';
import { AuthService } from '@/features/core/auth/service';
import { logger } from '@/logging/logger';

@Service()
export class ServiceInitializer {
  public adminService: BaseService<any, any>;
  public adminTokenService: BaseService<any, any>;
  public mngRoleSettingsService: BaseService<any, any>;
  public mngRolesService: BaseService<any, any>;
  public mapRoleSettingsService: BaseService<any, any>;
  public otpService: BaseService<any, any>;
  public menuGroupService: BaseService<any, any>;
  public menuItemService: BaseService<any, any>;
  public translationService: BaseService<any, any>;
  public databaseService: BaseService<any, any>;
  public auditLogService: BaseService<any, any>;
  public themeService: BaseService<any, any>;
  public conversationService: BaseService<any, any>;
  public conversationParticipantService: BaseService<any, any>;
  public messageService: BaseService<any, any>;
  public fileLogService: BaseService<any, any>;

  // Third-party services
  public oauthService: OAuthService;

  // Feature services
  public authService: AuthService;

  private prismaClient: any;

  public async initialize() {
    try {
      // Initialize Prisma client
      if (!this.prismaClient) {
        this.prismaClient = await PrismaDBConnection.getConnection();
      }

      // Initialize and register Prisma-based services
      this.registerPrismaServices();

      // Initialize and register third-party services
      this.registerThirdPartyServices();

      // Initialize and register feature services
      this.registerFeatureServices();

      logger.info('ServiceInitializer ready');
    } catch (err) {
      logger.error('ServiceInitializer failed', { err });
      throw err;
    }
  }

  private registerPrismaServices() {
    logger.debug('Registering Prisma services (core)');
    this.adminService = new BaseService(this.prismaClient.admin, this.prismaClient);
    this.adminTokenService = new BaseService(this.prismaClient.adminToken, this.prismaClient);
    this.mngRoleSettingsService = new BaseService(this.prismaClient.mngRoleSettings, this.prismaClient);
    this.mngRolesService = new BaseService(this.prismaClient.mngRoles, this.prismaClient);
    this.mapRoleSettingsService = new BaseService(this.prismaClient.mapRoleSettings, this.prismaClient);
    this.otpService = new BaseService(this.prismaClient.otp, this.prismaClient);
    this.menuGroupService = new BaseService(this.prismaClient.menuGroup, this.prismaClient);
    this.menuItemService = new BaseService(this.prismaClient.menuItem, this.prismaClient);
    this.translationService = new BaseService(this.prismaClient.translation, this.prismaClient);
    this.databaseService = new BaseService(this.prismaClient.databases, this.prismaClient);
    this.auditLogService = new BaseService(this.prismaClient.auditLog, this.prismaClient);
    this.themeService = new BaseService(this.prismaClient.theme, this.prismaClient);
    this.conversationService = new BaseService(this.prismaClient.conversation, this.prismaClient);
    this.conversationParticipantService = new BaseService(
      this.prismaClient.conversationParticipant,
      this.prismaClient,
    );
    this.messageService = new BaseService(this.prismaClient.message, this.prismaClient);
    this.fileLogService = new BaseService(this.prismaClient.fileLog, this.prismaClient);

    // Expose the raw Prisma client to TypeDI so features can bypass
    // BaseService (e.g. tables without a `deletedAt` soft-delete column,
    // such as `AppSetting`) or inject it directly (e.g. `SettingService`).
    Container.set('prismaClient', this.prismaClient);

    // Register each service with the Container
    Container.set('adminService', this.adminService);
    Container.set('adminTokenService', this.adminTokenService);
    Container.set('mngRoleSettingsService', this.mngRoleSettingsService);
    Container.set('mngRolesService', this.mngRolesService);
    Container.set('mapRoleSettingsService', this.mapRoleSettingsService);
    Container.set('otpService', this.otpService);
    Container.set('menuGroupService', this.menuGroupService);
    Container.set('menuItemService', this.menuItemService);
    Container.set('translationService', this.translationService);
    Container.set('databaseService', this.databaseService);
    Container.set('auditLogService', this.auditLogService);
    Container.set('themeService', this.themeService);
    Container.set('conversationService', this.conversationService);
    Container.set('conversationParticipantService', this.conversationParticipantService);
    Container.set('messageService', this.messageService);
    Container.set('fileLogService', this.fileLogService);
  }

  private registerThirdPartyServices() {
    this.oauthService = new OAuthService();
    Container.set(OAuthService, this.oauthService);
  }

  private registerFeatureServices() {
    this.authService = new AuthService();

    Container.set(AuthService, this.authService);
  }
}
