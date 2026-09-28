import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PrismaService } from '@/prisma.service';
import { PaginationDto } from '@/common/dto/pagination.dto';

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

  async create(createProductDto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: createProductDto,
    });
    return product;
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
      throw new NotFoundException(`Product with ID #${id} not found`);
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _, ...updateData } = updateProductDto; // Exclude 'id' from the update data
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No update fields provided');
    }
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: updateData,
      select: SELECT,
    });
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
