import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionType,
} from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    const transaction = this.transactionRepository.create({ ...dto, userId });
    return this.transactionRepository.save(transaction);
  }

  async findAll(
    userId: string,
    filters: FilterTransactionDto,
  ): Promise<Transaction[]> {
    const query = this.transactionRepository
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.account', 'account')
      .leftJoinAndSelect('tx.category', 'category')
      .where('tx.userId = :userId', { userId })
      .orderBy('tx.date', 'DESC')
      .addOrderBy('tx.createdAt', 'DESC');

    if (filters.accountId) {
      query.andWhere('tx.accountId = :accountId', {
        accountId: filters.accountId,
      });
    }

    if (filters.categoryId) {
      query.andWhere('tx.categoryId = :categoryId', {
        categoryId: filters.categoryId,
      });
    }

    if (filters.type) {
      query.andWhere('tx.type = :type', { type: filters.type });
    }

    if (filters.startDate) {
      query.andWhere('tx.date >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('tx.date <= :endDate', { endDate: filters.endDate });
    }

    return query.getMany();
  }

  async findOne(id: string, userId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, userId },
      relations: { account: true, category: true },
    });
    if (!transaction) {
      throw new NotFoundException(`Transaction #${id} not found`);
    }
    return transaction;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateTransactionDto,
  ): Promise<Transaction> {
    const transaction = await this.findOne(id, userId);
    Object.assign(transaction, dto);
    return this.transactionRepository.save(transaction);
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);
    await this.transactionRepository.remove(transaction);
  }
}
