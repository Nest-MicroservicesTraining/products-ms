import { HttpStatus, Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '@/prisma.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { RpcException } from '@nestjs/microservices';
import { Prisma } from '@/generated/prisma/client';

const SELECT = {
  available: false,
  id: true,
  name: true,
  price: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private handleDuplicateName(error: unknown, name: string): never {
    const { code } = error as Prisma.PrismaClientKnownRequestError;
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      code === 'P2002'
    ) {
      console.log(`Duplicate name error for product: ${name}`);
      throw new RpcException({
        message: `A product with the name ${name} already exists`,
        status: HttpStatus.BAD_REQUEST,
      });
    }
    console.error(
      'Unexpected error occurred:',
      (error as { code: string }).code,
    );
    throw error;
  }

  async create(createProductDto: CreateProductDto) {
    try {
      return await this.prisma.product.create({
        data: createProductDto,
      });
    } catch (error) {
      this.handleDuplicateName(error, createProductDto.name);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10 } = paginationDto;
    const total = await this.prisma.product.count({
      where: { available: true },
    });
    const totalPages = Math.ceil(total / limit);
    return {
      data: await this.prisma.product.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { available: true },
        select: SELECT,
      }),
      meta: {
        total_records: total,
        records_per_page: limit,
        current_page: page,
        total_pages: totalPages,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id, available: true },
      select: SELECT,
    });

    if (!product)
      throw new RpcException({
        message: `Product with ID #${id} not found`,
        status: HttpStatus.NOT_FOUND,
      });
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...updateData } = updateProductDto; // Exclude 'id' from the update data
    if (Object.keys(updateData).length === 0) {
      // throw new BadRequestException('No update fields provided');
      throw new RpcException({
        message: 'No update fields provided',
        status: HttpStatus.BAD_REQUEST,
      });
    }
    await this.findOne(id);

    try {
      return await this.prisma.product.update({
        where: { id },
        data: updateData,
        select: SELECT,
      });
    } catch (error) {
      this.handleDuplicateName(error, updateData.name ?? '');
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { available: false },
      select: SELECT,
    });
    // return this.prisma.product.delete({
    //   where: { id },
    // });
    // return `This action removes a #${id} product`;
  }
}
