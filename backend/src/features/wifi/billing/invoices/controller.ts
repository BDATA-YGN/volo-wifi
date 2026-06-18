import { Response } from 'express';
import { Prisma } from '@/generated/prisma/client';
import Container from 'typedi';
import { PrismaClient } from '@/generated/prisma/client';
import { AuthenticatedRequest } from '@/interfaces/express.interface';
import { asyncController } from '@/utils/async-controller';
import { responseError, responseSuccess } from '@/utils/api-response';
import { isUndefinedOrUndefinedString } from '@/utils/string-utils';
import {
  BillingInvoicesRecordPaymentSchema,
  BillingInvoicesUpdateSchema,
} from './schema';

const orgSummarySelect = {
  id: true,
  code: true,
  name: true,
  currency: true,
  isActive: true,
} satisfies Prisma.OrgSelect;

const invoiceListSelect = {
  id: true,
  orgId: true,
  invoiceNo: true,
  status: true,
  billingCycle: true,
  billingPeriodFrom: true,
  billingPeriodTo: true,
  pricingSource: true,
  currency: true,
  subtotalAmount: true,
  taxAmount: true,
  totalAmount: true,
  dueDate: true,
  issuedAt: true,
  paidAt: true,
  notes: true,
  createdAt: true,
  updatedAt: true,
  org: { select: orgSummarySelect },
  _count: { select: { items: true, payments: true } },
} satisfies Prisma.OrgInvoiceSelect;

const invoiceDetailSelect = {
  ...invoiceListSelect,
  taxRate: true,
  licenseId: true,
  items: {
    orderBy: [{ stationSize: { sortOrder: 'asc' } }],
    select: {
      id: true,
      description: true,
      quantity: true,
      unitPrice: true,
      lineSubtotal: true,
      taxRate: true,
      taxAmount: true,
      lineTotal: true,
      stationSize: {
        select: { id: true, code: true, name: true, sortOrder: true },
      },
    },
  },
  payments: {
    orderBy: { paymentDate: 'desc' },
    select: {
      id: true,
      amount: true,
      currency: true,
      paymentDate: true,
      paymentMethod: true,
      refNo: true,
      note: true,
      createdAt: true,
      receivedByAdmin: {
        select: { id: true, fullName: true, username: true },
      },
    },
  },
} satisfies Prisma.OrgInvoiceSelect;

type InvoiceListRow = Prisma.OrgInvoiceGetPayload<{ select: typeof invoiceListSelect }>;
type InvoiceDetailRow = Prisma.OrgInvoiceGetPayload<{ select: typeof invoiceDetailSelect }>;

function parsePagination(query: AuthenticatedRequest['query']) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
}

function decimalToString(value: Prisma.Decimal | null | undefined): string | null {
  if (value == null) return null;
  return value.toString();
}

function sumPayments(
  payments: { amount: Prisma.Decimal }[]
): number {
  return payments.reduce((sum, row) => sum + Number(row.amount), 0);
}

function enrichInvoiceListRow(row: InvoiceListRow, paidAmount: number) {
  const total = Number(row.totalAmount);
  const balanceDue = Math.max(0, total - paidAmount);

  return {
    ...row,
    subtotalAmount: decimalToString(row.subtotalAmount),
    taxAmount: decimalToString(row.taxAmount),
    totalAmount: decimalToString(row.totalAmount),
    paidAmount: paidAmount.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    isOverdue:
      row.status !== 'PAID' &&
      row.status !== 'CANCELLED' &&
      row.dueDate < new Date() &&
      balanceDue > 0,
  };
}

function enrichInvoiceDetail(row: InvoiceDetailRow) {
  const paidAmount = sumPayments(row.payments);
  const total = Number(row.totalAmount);
  const balanceDue = Math.max(0, total - paidAmount);

  return {
    ...row,
    subtotalAmount: decimalToString(row.subtotalAmount),
    taxRate: decimalToString(row.taxRate),
    taxAmount: decimalToString(row.taxAmount),
    totalAmount: decimalToString(row.totalAmount),
    paidAmount: paidAmount.toFixed(2),
    balanceDue: balanceDue.toFixed(2),
    isOverdue:
      row.status !== 'PAID' &&
      row.status !== 'CANCELLED' &&
      row.dueDate < new Date() &&
      balanceDue > 0,
    items: row.items.map((item) => ({
      ...item,
      unitPrice: decimalToString(item.unitPrice),
      lineSubtotal: decimalToString(item.lineSubtotal),
      taxRate: decimalToString(item.taxRate),
      taxAmount: decimalToString(item.taxAmount),
      lineTotal: decimalToString(item.lineTotal),
    })),
    payments: row.payments.map((payment) => ({
      ...payment,
      amount: decimalToString(payment.amount),
    })),
  };
}

function buildInvoiceWhere(query: AuthenticatedRequest['query']): Prisma.OrgInvoiceWhereInput {
  const orgId = typeof query.orgId === 'string' ? query.orgId.trim() : '';
  const status = typeof query.status === 'string' ? query.status.trim().toUpperCase() : '';
  const search = typeof query.search === 'string' ? query.search.trim() : '';

  const where: Prisma.OrgInvoiceWhereInput = {};

  if (orgId) where.orgId = orgId;
  if (status) where.status = status as Prisma.EnumInvoiceStatusFilter['equals'];

  if (search) {
    where.OR = [
      { invoiceNo: { contains: search, mode: 'insensitive' } },
      { org: { name: { contains: search, mode: 'insensitive' } } },
      { org: { code: { contains: search, mode: 'insensitive' } } },
    ];
  }

  return where;
}

async function loadPaidAmountsByInvoice(
  prisma: PrismaClient,
  invoiceIds: string[]
): Promise<Map<string, number>> {
  if (!invoiceIds.length) return new Map();

  const groups = await prisma.orgInvoicePayment.groupBy({
    by: ['invoiceId'],
    where: { invoiceId: { in: invoiceIds } },
    _sum: { amount: true },
  });

  return new Map(
    groups.map((row) => [row.invoiceId, Number(row._sum.amount ?? 0)])
  );
}

/** menus.wifi.billing.invoices @route /wifi/billing/invoices */
export class BillingInvoicesController {
  private get prisma(): PrismaClient {
    return Container.get<PrismaClient>('prismaClient');
  }

  public listOrDetails = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const invoiceId = !isUndefinedOrUndefinedString(req.params?.id)
        ? String(req.params.id)
        : '';

      if (invoiceId) {
        const invoice = await this.prisma.orgInvoice.findUnique({
          where: { id: invoiceId },
          select: invoiceDetailSelect,
        });

        if (!invoice) {
          return responseError(res, 404, {
            code: 'NOT_FOUND',
            message: 'Invoice not found.',
          });
        }

        return responseSuccess(res, {
          message: 'Success',
          data: enrichInvoiceDetail(invoice),
        });
      }

      const orgId = typeof req.query.orgId === 'string' ? req.query.orgId.trim() : '';

      if (!orgId && req.query.summary === 'orgs') {
        const licenses = await this.prisma.orgLicense.findMany({
          select: { orgId: true, org: { select: orgSummarySelect } },
          orderBy: { org: { name: 'asc' } },
        });

        const orgs = await Promise.all(
          licenses.map(async ({ orgId: oid, org }) => {
            const [invoiceCount, outstanding] = await Promise.all([
              this.prisma.orgInvoice.count({ where: { orgId: oid } }),
              this.prisma.orgInvoice.aggregate({
                where: {
                  orgId: oid,
                  status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
                },
                _sum: { totalAmount: true },
              }),
            ]);

            return {
              org,
              invoiceCount,
              outstandingAmount: decimalToString(outstanding._sum.totalAmount) ?? '0',
            };
          })
        );

        return responseSuccess(res, {
          message: 'Success',
          data: { orgs },
        });
      }

      const where = buildInvoiceWhere(req.query);
      const { page, limit, skip, take } = parsePagination(req.query);

      const [rows, total, statusGroups] = await Promise.all([
        this.prisma.orgInvoice.findMany({
          where,
          select: invoiceListSelect,
          orderBy: [{ billingPeriodFrom: 'desc' }, { createdAt: 'desc' }],
          skip,
          take,
        }),
        this.prisma.orgInvoice.count({ where }),
        this.prisma.orgInvoice.groupBy({
          by: ['status'],
          where: orgId ? { orgId } : {},
          _count: { _all: true },
        }),
      ]);

      const paidMap = await loadPaidAmountsByInvoice(
        this.prisma,
        rows.map((row) => row.id)
      );

      const enriched = rows.map((row) =>
        enrichInvoiceListRow(row, paidMap.get(row.id) ?? 0)
      );

      const statusCounts = Object.fromEntries(
        statusGroups.map((row) => [row.status, row._count._all])
      );

      const openInvoices = await this.prisma.orgInvoice.findMany({
        where: {
          ...where,
          status: { in: ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        select: { id: true, totalAmount: true },
      });
      const openPaidMap = await loadPaidAmountsByInvoice(
        this.prisma,
        openInvoices.map((row) => row.id)
      );
      const outstandingTotal = openInvoices.reduce((sum, row) => {
        const paid = openPaidMap.get(row.id) ?? 0;
        return sum + Math.max(0, Number(row.totalAmount) - paid);
      }, 0);

      responseSuccess(res, {
        message: 'Success',
        data: { invoices: enriched },
        meta: {
          total,
          page,
          limit,
          pages: Math.max(1, Math.ceil(total / limit)),
          statusCounts,
          outstandingTotal: outstandingTotal.toFixed(2),
        },
      });
    }),
  ];

  public createOrUpdate = [
    asyncController(async (req: AuthenticatedRequest, res: Response): Promise<void> => {
      const invoiceId = (req.params?.id as string) ?? null;
      if (!invoiceId || invoiceId === 'all') {
        return responseError(res, 400, {
          code: 'INVOICE_ID_REQUIRED',
          message: 'Invoice id is required.',
        });
      }

      const existing = await this.prisma.orgInvoice.findUnique({
        where: { id: invoiceId },
        include: { payments: true },
      });

      if (!existing) {
        return responseError(res, 404, {
          code: 'NOT_FOUND',
          message: 'Invoice not found.',
        });
      }

      if (req.body?.amount !== undefined) {
        const { error, value } = BillingInvoicesRecordPaymentSchema.validate(req.body, {
          abortEarly: false,
          allowUnknown: false,
        });

        if (error) {
          return responseError(res, 400, {
            code: 'VALIDATION_ERROR',
            message: error.details.map((d) => d.message).join(', '),
          });
        }

        const paidSoFar = sumPayments(existing.payments);
        const total = Number(existing.totalAmount);
        const newPaid = paidSoFar + value.amount;

        if (newPaid > total + 0.0001) {
          return responseError(res, 409, {
            code: 'OVERPAYMENT',
            message: `Payment exceeds balance due (${Math.max(0, total - paidSoFar).toFixed(2)} ${existing.currency}).`,
          });
        }

        const actorAdminId = req.userId as string;
        const paymentDate = value.paymentDate ? new Date(value.paymentDate) : new Date();
        const fullyPaid = newPaid >= total - 0.0001;

        const updated = await this.prisma.$transaction(async (tx) => {
          await tx.orgInvoicePayment.create({
            data: {
              orgId: existing.orgId,
              invoiceId: existing.id,
              amount: value.amount,
              currency: existing.currency,
              paymentDate,
              paymentMethod: value.paymentMethod,
              refNo: value.refNo?.trim() || null,
              note: value.note?.trim() || null,
              receivedByAdminId: actorAdminId,
            },
          });

          return tx.orgInvoice.update({
            where: { id: invoiceId },
            data: {
              status: fullyPaid ? 'PAID' : 'PARTIALLY_PAID',
              paidAt: fullyPaid ? paymentDate : null,
            },
            select: invoiceDetailSelect,
          });
        });

        return responseSuccess(res, {
          message: fullyPaid ? 'Payment recorded — invoice paid' : 'Payment recorded',
          data: enrichInvoiceDetail(updated),
        });
      }

      const { error, value } = BillingInvoicesUpdateSchema.validate(req.body, {
        abortEarly: false,
        allowUnknown: false,
      });

      if (error) {
        return responseError(res, 400, {
          code: 'VALIDATION_ERROR',
          message: error.details.map((d) => d.message).join(', '),
        });
      }

      const updated = await this.prisma.orgInvoice.update({
        where: { id: invoiceId },
        data: {
          ...(value.status !== undefined ? { status: value.status } : {}),
          ...(value.notes !== undefined ? { notes: value.notes || null } : {}),
          ...(value.issuedAt !== undefined
            ? { issuedAt: value.issuedAt ? new Date(value.issuedAt) : null }
            : {}),
          ...(value.dueDate !== undefined ? { dueDate: new Date(value.dueDate) } : {}),
        },
        select: invoiceDetailSelect,
      });

      responseSuccess(res, {
        message: 'Invoice updated',
        data: enrichInvoiceDetail(updated),
      });
    }),
  ];

  public remove = [
    asyncController(async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
      responseError(res, 405, {
        code: 'NOT_ALLOWED',
        message: 'Invoices cannot be deleted. Set status to CANCELLED instead.',
      });
    }),
  ];
}
