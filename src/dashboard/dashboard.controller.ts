import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({
    summary: 'Get financial dashboard summary for current month',
    description: `Returns:
- totalBalance: sum of all account balances (computed from initialBalance + transactions)
- monthlyIncome: total income this month
- monthlyExpenses: total expenses this month
- netMonthly: income minus expenses this month
- accountBalances: balance breakdown per account
- expensesByCategory: expenses grouped by category for this month
- receivables: debt minus repayments grouped by person`,
  })
  @ApiResponse({ status: 200, description: 'Dashboard data returned' })
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.dashboardService.getDashboard(user.id);
  }
}
