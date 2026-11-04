import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Transaction,
  TransactionPurpose,
  TransactionType,
} from '../transactions/entities/transaction.entity';
import { Account } from '../accounts/entities/account.entity';
import { Person } from '../persons/entities/person.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ) {}

  async getDashboard(userId: string) {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    const [
      accounts,
      allTransactions,
      monthTransactions,
      categoryExpenses,
      receivables,
    ] = await Promise.all([
      this.getAccountBalances(userId),
      this.transactionRepository.find({ where: { userId } }),
      this.getMonthTransactions(userId, firstDayOfMonth, lastDayOfMonth),
      this.getExpensesByCategory(userId, firstDayOfMonth, lastDayOfMonth),
      this.getReceivables(userId),
    ]);

    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    const monthlyIncome = monthTransactions
      .filter((tx) => tx.type === TransactionType.INCOME)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    const monthlyExpenses = monthTransactions
      .filter((tx) => tx.type === TransactionType.EXPENSE)
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    return {
      totalBalance: +totalBalance.toFixed(2),
      monthlyIncome: +monthlyIncome.toFixed(2),
      monthlyExpenses: +monthlyExpenses.toFixed(2),
      netMonthly: +(monthlyIncome - monthlyExpenses).toFixed(2),
      accountBalances: accounts,
      expensesByCategory: categoryExpenses,
      receivables,
      period: {
        startDate: firstDayOfMonth,
        endDate: lastDayOfMonth,
      },
    };
  }

  private async getAccountBalances(userId: string) {
    const accounts = await this.accountRepository
      .createQueryBuilder('account')
      .leftJoinAndSelect('account.transactions', 'tx')
      .where('account.userId = :userId', { userId })
      .getMany();

    return accounts.map((account) => {
      const txBalance = (account.transactions ?? []).reduce((sum, tx) => {
        const amount = Number(tx.amount);
        if (tx.type === TransactionType.INCOME) return sum + amount;
        if (tx.type === TransactionType.EXPENSE) return sum - amount;
        return sum;
      }, 0);

      const balance = Number(account.initialBalance) + txBalance;

      return {
        accountId: account.id,
        name: account.name,
        type: account.type,
        balance: +balance.toFixed(2),
      };
    });
  }

  private async getMonthTransactions(
    userId: string,
    startDate: string,
    endDate: string,
  ): Promise<Transaction[]> {
    return this.transactionRepository
      .createQueryBuilder('tx')
      .where('tx.userId = :userId', { userId })
      .andWhere('tx.date >= :startDate', { startDate })
      .andWhere('tx.date <= :endDate', { endDate })
      .getMany();
  }

  private async getExpensesByCategory(
    userId: string,
    startDate: string,
    endDate: string,
  ) {
    const rows = await this.transactionRepository
      .createQueryBuilder('tx')
      .select('cat.id', 'categoryId')
      .addSelect('cat.name', 'categoryName')
      .addSelect('cat.icon', 'icon')
      .addSelect('SUM(tx.amount)', 'total')
      .innerJoin('tx.category', 'cat')
      .where('tx.userId = :userId', { userId })
      .andWhere("tx.type = 'EXPENSE'")
      .andWhere('tx.date >= :startDate', { startDate })
      .andWhere('tx.date <= :endDate', { endDate })
      .groupBy('cat.id')
      .addGroupBy('cat.name')
      .addGroupBy('cat.icon')
      .orderBy('total', 'DESC')
      .getRawMany();

    return rows.map((r) => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName,
      icon: r.icon,
      total: +Number(r.total).toFixed(2),
    }));
  }

  private async getReceivables(userId: string) {
    const persons = await this.personRepository.find({
      where: { userId },
      relations: { transactions: true },
    });

    return persons
      .map((person) => {
        const debtTransactions = person.transactions.filter(
          (tx) =>
            tx.purpose === TransactionPurpose.DEBT ||
            tx.purpose === TransactionPurpose.REPAYMENT,
        );
        const balance = debtTransactions.reduce((total, tx) => {
          const amount = Number(tx.amount);
          return tx.purpose === TransactionPurpose.DEBT
            ? total + amount
            : total - amount;
        }, 0);
        return {
          personId: person.id,
          person: person.name,
          totalAmount: +balance.toFixed(2),
          transactionCount: debtTransactions.length,
        };
      })
      .sort((a, b) => b.totalAmount - a.totalAmount);
  }
}
