import {
  getFinancialSummary,
  getCategoryBreakdown,
  getFilteredTransactions,
} from '../database/transactionsRepo';
import { getBudgetsWithProgress } from '../database/budgetsRepo';
import { getSetting } from '../database/settingsRepo';
import { formatINR } from './currency';
import { getMonthRange, subDays } from '../utils/date';
import { subMonths } from 'date-fns';

export interface FinancialContext {
  monthlyIncome: number;
  monthlyExpense: number;
  monthlySavings: number;
  totalBalance: number;
  topCategories: { name: string; amount: string; percentage: string }[];
  budgets: { name: string; limit: string; spent: string; percentage: number }[];
  previousMonthComparison: {
    lastMonthExpense: number;
    diffPaise: number;
    percentageChange: number;
  };
  dailyAverageSpendingPaise: number;
  remainingMonthlyBudgetPaise: number;
  daysRemainingInMonth: number;
}

/**
 * Aggregates actual financial database records locally to build factual context
 */
export async function buildFinancialContext(): Promise<FinancialContext> {
  const now = new Date();
  const summary = await getFinancialSummary(now);
  const monthRange = getMonthRange(now);

  // Category breakdown for current month
  const categories = await getCategoryBreakdown(monthRange.start, monthRange.end, 'expense');
  const topCategories = categories.slice(0, 5).map((c) => ({
    name: c.category_name,
    amount: formatINR(c.total_paise),
    percentage: c.percentage.toFixed(1) + '%',
  }));

  // Budgets
  const budgets = await getBudgetsWithProgress('monthly');
  const budgetSummaries = budgets.map((b) => ({
    name: b.category_name || 'Overall Monthly Limit',
    limit: formatINR(b.amount_paise),
    spent: formatINR(b.spent_paise || 0),
    percentage: b.percentage || 0,
  }));

  // Previous month comparison
  const lastMonthDate = subMonths(now, 1);
  const lastMonthRange = getMonthRange(lastMonthDate);
  const lastMonthTxs = await getFilteredTransactions({
    type: 'expense',
    startDate: lastMonthRange.start,
    endDate: lastMonthRange.end,
  });
  const lastMonthExpense = lastMonthTxs.reduce((sum, t) => sum + t.amount_paise, 0);

  const diffPaise = summary.monthly_expense_paise - lastMonthExpense;
  const percentageChange =
    lastMonthExpense > 0 ? (diffPaise / lastMonthExpense) * 100 : 0;

  // Daily average spending this month
  const dayOfMonth = now.getDate();
  const dailyAverageSpendingPaise =
    dayOfMonth > 0 ? Math.round(summary.monthly_expense_paise / dayOfMonth) : 0;

  // Days remaining in month
  const endOfMonthDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysRemainingInMonth = Math.max(1, endOfMonthDay - dayOfMonth);

  return {
    monthlyIncome: summary.monthly_income_paise,
    monthlyExpense: summary.monthly_expense_paise,
    monthlySavings: summary.monthly_savings_paise,
    totalBalance: summary.total_balance_paise,
    topCategories,
    budgets: budgetSummaries,
    previousMonthComparison: {
      lastMonthExpense,
      diffPaise,
      percentageChange,
    },
    dailyAverageSpendingPaise,
    remainingMonthlyBudgetPaise: summary.remaining_monthly_budget_paise,
    daysRemainingInMonth,
  };
}

/**
 * Intelligent Local Rule-Based Financial Assistant (Zero latency, works completely offline)
 */
export function generateLocalFinancialResponse(
  query: string,
  ctx: FinancialContext
): string {
  const q = query.toLowerCase();

  // 1. "How much did I spend this month?"
  if (q.includes('spend this month') || q.includes('monthly expense') || q.includes('total spend')) {
    return (
      `📅 **This Month's Spending**\n\n` +
      `You have spent **${formatINR(ctx.monthlyExpense)}** so far this month.\n` +
      `• Daily Average: **${formatINR(ctx.dailyAverageSpendingPaise)}/day**\n` +
      `• Total Income: **${formatINR(ctx.monthlyIncome)}**\n` +
      `• Net Savings: **${formatINR(ctx.monthlySavings)}**`
    );
  }

  // 2. "What is my biggest expense category?"
  if (q.includes('biggest') || q.includes('highest') || q.includes('top category') || q.includes('top expense')) {
    if (ctx.topCategories.length === 0) {
      return `You have not recorded any expenses yet this month.`;
    }
    const top = ctx.topCategories[0];
    const others = ctx.topCategories
      .slice(1, 4)
      .map((c) => `• ${c.name}: ${c.amount} (${c.percentage})`)
      .join('\n');

    return (
      `🏆 **Top Expense Category**\n\n` +
      `Your largest spending area is **${top.name}** at **${top.amount}**, which accounts for **${top.percentage}** of your total expenses.\n\n` +
      (others ? `Other major categories:\n${others}` : '')
    );
  }

  // 3. "Compare this month with last month"
  if (q.includes('compare') || q.includes('last month') || q.includes('previous month')) {
    const { lastMonthExpense, diffPaise, percentageChange } = ctx.previousMonthComparison;
    const direction = diffPaise > 0 ? 'increased' : 'decreased';
    const indicator = diffPaise > 0 ? '📈' : '📉';

    return (
      `${indicator} **Month-Over-Month Comparison**\n\n` +
      `• Current Month Spending: **${formatINR(ctx.monthlyExpense)}**\n` +
      `• Last Month Spending: **${formatINR(lastMonthExpense)}**\n` +
      `• Difference: **${formatINR(Math.abs(diffPaise))}** (${Math.abs(percentageChange).toFixed(1)}% ${direction})\n\n` +
      (diffPaise > 0
        ? `⚠️ Your spending is trending higher than last month. Review discretionary categories like Shopping and Food.`
        : `🎉 Great job! You are currently spending less than this time last month.`)
    );
  }

  // 4. "Am I exceeding my budget?" / "Remaining budget"
  if (q.includes('budget') || q.includes('exceed') || q.includes('limit') || q.includes('remaining budget')) {
    if (ctx.budgets.length === 0) {
      return `ℹ️ You have not configured any active budgets for this month. Go to the **Budgets** tab to set monthly spending limits!`;
    }

    const budgetStatus = ctx.budgets
      .map((b) => {
        let emoji = '🟢';
        if (b.percentage >= 100) emoji = '🚨 EXCEEDED';
        else if (b.percentage >= 90) emoji = '⚠️ DANGER';
        else if (b.percentage >= 75) emoji = '🟡 WARNING';
        return `• ${b.name}: ${b.spent} of ${b.limit} (${b.percentage}%) ${emoji}`;
      })
      .join('\n');

    const dailyAllowance =
      ctx.remainingMonthlyBudgetPaise > 0 && ctx.daysRemainingInMonth > 0
        ? formatINR(Math.round(ctx.remainingMonthlyBudgetPaise / ctx.daysRemainingInMonth))
        : '₹0.00';

    return (
      `🎯 **Budget Health Overview**\n\n` +
      `${budgetStatus}\n\n` +
      `Remaining Overall Allowance: **${formatINR(ctx.remainingMonthlyBudgetPaise)}**\n` +
      `Safe Daily Spend (next ${ctx.daysRemainingInMonth} days): **${dailyAllowance}/day**`
    );
  }

  // 5. "How can I reduce unnecessary spending?" / "Which category should I control?"
  if (q.includes('reduce') || q.includes('control') || q.includes('save') || q.includes('unnecessary')) {
    const discretionary = ctx.topCategories.filter((c) =>
      ['Food', 'Shopping', 'Entertainment', 'Subscriptions'].includes(c.name)
    );

    let advice = `💡 **Actionable Spending Optimization Tips**\n\n`;
    if (discretionary.length > 0) {
      advice += `1. **Target Discretionary Categories:**\n`;
      discretionary.forEach((c) => {
        advice += `   • **${c.name}**: currently ${c.amount} (${c.percentage} of your spend). Trimming 15% would save ${formatINR(Math.round((parseInt(c.amount.replace(/[^0-9]/g, ''), 10) * 15) / 100))}.\n`;
      });
    }

    advice += `\n2. **Daily Spending Cap:** Limit your variable expenses to under **${formatINR(ctx.dailyAverageSpendingPaise)}/day** for the rest of this month.\n`;
    advice += `3. **Automate Savings:** Move savings to your designated savings goals as soon as your salary/income arrives rather than saving what is left.`;

    return advice;
  }

  // Default intelligent overview
  return (
    `📊 **Financial Summary & Status**\n\n` +
    `• Net Worth / Available Balance: **${formatINR(ctx.totalBalance)}**\n` +
    `• This Month's Income: **${formatINR(ctx.monthlyIncome)}**\n` +
    `• This Month's Expenses: **${formatINR(ctx.monthlyExpense)}**\n` +
    `• Net Savings Rate: **${ctx.monthlyIncome > 0 ? ((ctx.monthlySavings / ctx.monthlyIncome) * 100).toFixed(1) : '0'}%**\n` +
    (ctx.topCategories.length > 0
      ? `• Top Category: **${ctx.topCategories[0].name} (${ctx.topCategories[0].amount})**\n\n`
      : '\n') +
    `You can ask me questions like:\n` +
    `• *"How much did I spend this month?"*\n` +
    `• *"What is my biggest expense category?"*\n` +
    `• *"Compare this month with last month"*\n` +
    `• *"Am I exceeding my budget?"*\n` +
    `• *"How can I reduce unnecessary spending?"*`
  );
}

/**
 * Dispatches query to either Local Intelligent Engine or Optional User LLM API
 */
export async function askFinancialAssistant(userQuestion: string): Promise<{
  answer: string;
  isAiGenerated: boolean;
  provider: string;
}> {
  const ctx = await buildFinancialContext();
  const provider = await getSetting<'local' | 'gemini' | 'openai'>('ai_provider', 'local');
  const apiKey = await getSetting<string>('ai_api_key', '');

  // If local engine is selected or no API key configured, use local engine
  if (provider === 'local' || !apiKey || apiKey.trim().length === 0) {
    const answer = generateLocalFinancialResponse(userQuestion, ctx);
    return {
      answer: answer + '\n\n*(Generated via Local Offline Financial Intelligence)*',
      isAiGenerated: false,
      provider: 'Local Engine (Offline)',
    };
  }

  // If API key is provided, contact LLM API with sanitized factual summary
  try {
    const prompt = `
You are a certified financial advisor assistant inside the CashFlow Android App.
Answer the user's question directly, clearly, and concisely using the user's REAL financial context provided below:

REAL USER FINANCIAL CONTEXT:
- Total Available Balance: ${formatINR(ctx.totalBalance)}
- Monthly Income: ${formatINR(ctx.monthlyIncome)}
- Monthly Expense: ${formatINR(ctx.monthlyExpense)}
- Monthly Savings: ${formatINR(ctx.monthlySavings)}
- Daily Average Spending: ${formatINR(ctx.dailyAverageSpendingPaise)}
- Top Expense Categories: ${JSON.stringify(ctx.topCategories)}
- Active Budgets: ${JSON.stringify(ctx.budgets)}
- Days Remaining In Month: ${ctx.daysRemainingInMonth}
- Month-over-Month Change: ${ctx.previousMonthComparison.percentageChange.toFixed(1)}%

User Question: "${userQuestion}"

Provide a friendly, highly professional, formatted response with bullet points and realistic advice based strictly on these figures.
`;

    // Example Gemini or OpenAI endpoint call
    let responseText = '';
    if (provider === 'gemini') {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await res.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    } else {
      // OpenAI compatible
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });
      const data = await res.json();
      responseText = data.choices?.[0]?.message?.content;
    }

    if (responseText) {
      return {
        answer: responseText,
        isAiGenerated: true,
        provider: provider.toUpperCase(),
      };
    } else {
      throw new Error('Empty response from AI provider.');
    }
  } catch (err: any) {
    // Graceful offline fallback
    const fallbackAnswer = generateLocalFinancialResponse(userQuestion, ctx);
    return {
      answer:
        fallbackAnswer +
        `\n\n*(Notice: Cloud AI call failed: ${err.message || 'Network error'}. Fallen back to Local Offline Intelligence).*`,
      isAiGenerated: false,
      provider: 'Local Engine (Fallback)',
    };
  }
}

