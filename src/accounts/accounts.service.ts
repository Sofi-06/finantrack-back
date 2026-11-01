import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from './entities/account.entity';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';
import { TransactionType } from '../transactions/entities/transaction.entity';

@Injectable()
export class AccountsService {
  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  async create(userId: string, dto: CreateAccountDto): Promise<Account> {
    const account = this.accountRepository.create({
      ...dto,
      userId,
      initialBalance: dto.initialBalance ?? 0,
    });
    return this.accountRepository.save(account);
  }

  async findAll(userId: string): Promise<Account[]> {
    return this.accountRepository.find({ where: { userId } });
  }

  async findOne(id: string, userId: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, userId },
    });
    if (!account) {
      throw new NotFoundException(`Account #${id} not found`);
    }
    return account;
  }

  async update(
    id: string,
    userId: string,
    dto: UpdateAccountDto,
  ): Promise<Account> {
    const account = await this.findOne(id, userId);
    Object.assign(account, dto);
    return this.accountRepository.save(account);
  }

  async remove(id: string, userId: string): Promise<void> {
    const account = await this.findOne(id, userId);
    await this.accountRepository.remove(account);
  }

  async getBalance(id: string, userId: string): Promise<number> {
    const account = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.transactions', 'tx')
      .where('account.id = :id AND account.userId = :userId', { id, userId })
      .getOne();

    if (!account) {
      throw new NotFoundException(`Account #${id} not found`);
    }

    const txBalance = (account.transactions ?? []).reduce((sum, tx) => {
      const amount = Number(tx.amount);
      if (tx.type === TransactionType.INCOME) return sum + amount;
      if (tx.type === TransactionType.EXPENSE) return sum - amount;
      return sum;
    }, 0);

    return Number(account.initialBalance) + txBalance;
  }
}
