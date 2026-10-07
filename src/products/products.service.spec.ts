import { HttpStatus } from '@nestjs/common';
import { PrismaService } from '@/prisma.service';
import { ProductsService } from './products.service';

jest.mock('@/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

jest.mock('@/generated/prisma/client', () => {
  class PrismaClientKnownRequestError extends Error {
    code: string;
    meta?: { target?: unknown };

    constructor(code: string, meta?: { target?: unknown }) {
      super('Unique constraint failed');
      this.name = 'PrismaClientKnownRequestError';
      this.code = code;
      this.meta = meta;
    }
  }

  return {
    Prisma: {
      PrismaClientKnownRequestError,
    },
  };
});

describe('ProductsService duplicate-name handling', () => {
  let service: ProductsService;
  let prisma: {
    product: {
      create: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };

  const createDuplicateNameError = (_name: string) => {
    const { Prisma } = jest.requireMock('@/generated/prisma/client') as {
      Prisma: {
        PrismaClientKnownRequestError: new (
          code: string,
          meta?: { target?: string[] },
        ) => Error & { code: string; meta?: { target?: string[] } };
      };
    };

    return new Prisma.PrismaClientKnownRequestError('P2002', {
      target: ['name'],
    });
  };

  beforeEach(() => {
    prisma = {
      product: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new ProductsService(prisma as unknown as PrismaService);
  });

  it('throws a 400 RpcException when creating a product with an existing name', async () => {
    const name = 'Duplicate Product';
    prisma.product.create.mockRejectedValue(createDuplicateNameError(name));

    await expect(
      service.create({
        name,
        price: 10,
      }),
    ).rejects.toMatchObject({
      message: `A product with the name ${name} already exists`,
      error: {
        message: `A product with the name ${name} already exists`,
        status: HttpStatus.BAD_REQUEST,
      },
    });

    expect(prisma.product.create).toHaveBeenCalledTimes(1);
  });

  it('throws a 400 RpcException when updating a product to an existing name', async () => {
    const name = 'Duplicate Product';
    prisma.product.findUnique.mockResolvedValue({
      id: 1,
      name: 'Existing Product',
      price: 10,
      available: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.product.update.mockRejectedValue(createDuplicateNameError(name));

    await expect(
      service.update(1, {
        id: 1,
        name,
        price: 20,
      }),
    ).rejects.toMatchObject({
      message: `A product with the name ${name} already exists`,
      error: {
        message: `A product with the name ${name} already exists`,
        status: HttpStatus.BAD_REQUEST,
      },
    });

    expect(prisma.product.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.product.update).toHaveBeenCalledTimes(1);
  });
});
