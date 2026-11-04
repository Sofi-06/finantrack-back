import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionPurpose,
  TransactionType,
} from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { Account } from '../accounts/entities/account.entity';
import { Category } from '../categories/entities/category.entity';
import { Person } from '../persons/entities/person.entity';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ) {}

  async create(userId: string, dto: CreateTransactionDto): Promise<Transaction> {
    await this.validateReferences(userId, dto);
    this.validatePurpose(dto.type, dto.purpose, dto.personId);
    const transaction = this.transactionRepository.create({
      ...dto,
      userId,
      purpose: dto.purpose ?? TransactionPurpose.NORMAL,
    });
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
      .leftJoinAndSelect('tx.personRecord', 'personRecord')
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

    if (filters.personId) {
      query.andWhere('tx.personId = :personId', { personId: filters.personId });
    }

    if (filters.purpose) {
      query.andWhere('tx.purpose = :purpose', { purpose: filters.purpose });
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
      relations: { account: true, category: true, personRecord: true },
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
    const merged = { ...transaction, ...dto };
    await this.validateReferences(userId, merged);
    this.validatePurpose(merged.type, merged.purpose, merged.personId);
    Object.assign(transaction, dto);
    return this.transactionRepository.save(transaction);
  }

  async remove(id: string, userId: string): Promise<void> {
    const transaction = await this.findOne(id, userId);
    await this.transactionRepository.remove(transaction);
  }

  private async validateReferences(
    userId: string,
    dto: Pick<CreateTransactionDto, 'accountId' | 'categoryId' | 'personId'>,
  ): Promise<void> {
    const [account, category, person] = await Promise.all([
      this.accountRepository.findOne({ where: { id: dto.accountId, userId } }),
      dto.categoryId
        ? this.categoryRepository.findOne({
            where: { id: dto.categoryId, userId },
          })
        : Promise.resolve(null),
      dto.personId
        ? this.personRepository.findOne({ where: { id: dto.personId, userId } })
        : Promise.resolve(null),
    ]);
    if (!account) throw new NotFoundException('Account not found');
    if (dto.categoryId && !category) {
      throw new NotFoundException('Category not found');
    }
    if (dto.personId && !person) throw new NotFoundException('Person not found');
  }

  private validatePurpose(
    type: TransactionType,
    purpose = TransactionPurpose.NORMAL,
    personId?: string,
  ): void {
    if (purpose === TransactionPurpose.NORMAL) return;
    if (!personId) {
      throw new BadRequestException(
        'A person is required for debt and repayment transactions',
      );
    }
    if (purpose === TransactionPurpose.DEBT && type !== TransactionType.EXPENSE) {
      throw new BadRequestException('A debt must be an expense');
    }
    if (
      purpose === TransactionPurpose.REPAYMENT &&
      type !== TransactionType.INCOME
    ) {
      throw new BadRequestException('A repayment must be an income');
    }
  }
}
