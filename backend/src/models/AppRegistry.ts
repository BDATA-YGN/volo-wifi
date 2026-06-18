import { ReceiptTemplate, Printers } from '@/generated/prisma/client';
import { Service, Container } from 'typedi';
import PrismaDBConnection from '@/prisma/prisma-client';
import { BaseService } from '@/third-party/bdataMysql/BaseService';
import { logger } from '@/logging/logger';

/** App-level Prisma services (directories, printers, receipts, etc.). */
@Service()
export class AppServiceInitializer {
  // Printer services
  public receiptService: BaseService<ReceiptTemplate, any>;
  public printerService: BaseService<Printers, any>;

  private prismaClient: any;

  public async initialize() {
    try {
      if (!this.prismaClient) {
        this.prismaClient = await PrismaDBConnection.getConnection();
      }

      this.registerPrismaServices();

      logger.info('AppServiceInitializer ready');
    } catch (err) {
      logger.error('AppServiceInitializer failed', { err });
      throw err;
    }
  }

  private registerPrismaServices() {
    logger.debug('Registering Prisma services (app)');
    this.receiptService = new BaseService(this.prismaClient.ReceiptTemplate, this.prismaClient);
    this.printerService = new BaseService(this.prismaClient.Printers, this.prismaClient);

    Container.set('receiptService', this.receiptService);
    Container.set('printerService', this.printerService);

    logger.debug('App services registered successfully');
  }
}
