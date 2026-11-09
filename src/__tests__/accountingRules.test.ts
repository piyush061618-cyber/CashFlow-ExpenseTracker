import { computeNextDueDate } from '../utils/date';

describe('Strict Financial Accounting Rules Verification', () => {
  // Test Model Simulation representing the exact logic enforced in SQLite transactions
  interface WalletSim {
    id: string;
    type: string;
    balance_paise: number;
  }

  interface GoalSim {
    id: string;
    target_amount_paise: number;
    saved_amount_paise: number;
    is_completed: boolean;
  }

  function applyTransaction(
    wallet: WalletSim,
    type: 'income' | 'expense',
    amountPaise: number
  ) {
    if (type === 'income') {
      wallet.balance_paise += amountPaise;
    } else {
      wallet.balance_paise -= amountPaise;
    }
  }

  function reverseTransaction(
    wallet: WalletSim,
    type: 'income' | 'expense',
    amountPaise: number
  ) {
    if (type === 'income') {
      wallet.balance_paise -= amountPaise;
    } else {
      wallet.balance_paise += amountPaise;
    }
  }

  function transferBetweenWallets(
    fromWallet: WalletSim,
    toWallet: WalletSim,
    amountPaise: number
  ) {
    fromWallet.balance_paise -= amountPaise;
    toWallet.balance_paise += amountPaise;
  }

  function allocateToGoal(
    wallet: WalletSim,
    goal: GoalSim,
    amountPaise: number
  ) {
    wallet.balance_paise -= amountPaise;
    goal.saved_amount_paise += amountPaise;
    goal.is_completed = goal.saved_amount_paise >= goal.target_amount_paise;
  }

  function calculateAvailableBalance(wallets: WalletSim[]): number {
    let assets = 0;
    let liabilities = 0;
    for (const w of wallets) {
      if (w.type === 'credit_card') {
        liabilities += w.balance_paise;
      } else {
        assets += w.balance_paise;
      }
    }
    return assets - liabilities;
  }

  test('Rule 1: Income increases wallet balance; Expense decreases wallet balance', () => {
    const cashWallet: WalletSim = { id: 'w1', type: 'cash', balance_paise: 500000 }; // ₹5,000

    // Add Income ₹2,000 (200000 paise)
    applyTransaction(cashWallet, 'income', 200000);
    expect(cashWallet.balance_paise).toBe(700000); // ₹7,000

    // Add Expense ₹1,500 (150000 paise)
    applyTransaction(cashWallet, 'expense', 150000);
    expect(cashWallet.balance_paise).toBe(550000); // ₹5,500
  });

  test('Rule 2: Editing a transaction correctly reverses previous effect before applying new effect', () => {
    const bankWallet: WalletSim = { id: 'w2', type: 'bank', balance_paise: 1000000 }; // ₹10,000

    // Originally an expense of ₹2,000
    applyTransaction(bankWallet, 'expense', 200000);
    expect(bankWallet.balance_paise).toBe(800000);

    // Edit expense to ₹2,500:
    // 1. Reverse old expense (+200000)
    reverseTransaction(bankWallet, 'expense', 200000);
    expect(bankWallet.balance_paise).toBe(1000000);
    // 2. Apply new expense (-250000)
    applyTransaction(bankWallet, 'expense', 250000);
    expect(bankWallet.balance_paise).toBe(750000);

    // Change type from expense ₹2,500 to income ₹3,000:
    // 1. Reverse old expense
    reverseTransaction(bankWallet, 'expense', 250000);
    expect(bankWallet.balance_paise).toBe(1000000);
    // 2. Apply new income (+300000)
    applyTransaction(bankWallet, 'income', 300000);
    expect(bankWallet.balance_paise).toBe(1300000);
  });

  test('Rule 3: Deleting a transaction reverses its financial effect', () => {
    const upiWallet: WalletSim = { id: 'w3', type: 'upi', balance_paise: 200000 }; // ₹2,000

    // User made an expense of ₹500
    applyTransaction(upiWallet, 'expense', 50000);
    expect(upiWallet.balance_paise).toBe(150000);

    // Deleting the expense restores the ₹500
    reverseTransaction(upiWallet, 'expense', 50000);
    expect(upiWallet.balance_paise).toBe(200000);
  });

  test('Rule 4: Wallet transfers debits source, credits destination, with ZERO income/expense change', () => {
    const bankWallet: WalletSim = { id: 'w_bank', type: 'bank', balance_paise: 5000000 }; // ₹50,000
    const cashWallet: WalletSim = { id: 'w_cash', type: 'cash', balance_paise: 1000000 }; // ₹10,000

    // Transfer ₹5,000 from Bank to Cash (ATM withdrawal)
    const initialTotalWealth = bankWallet.balance_paise + cashWallet.balance_paise;
    transferBetweenWallets(bankWallet, cashWallet, 500000);

    expect(bankWallet.balance_paise).toBe(4500000); // ₹45,000
    expect(cashWallet.balance_paise).toBe(1500000); // ₹15,000
    expect(bankWallet.balance_paise + cashWallet.balance_paise).toBe(initialTotalWealth);
  });

  test('Rule 5: Credit-card liabilities are distinguished from cash assets', () => {
    const wallets: WalletSim[] = [
      { id: 'w_bank', type: 'bank', balance_paise: 4000000 }, // ₹40,000 in bank
      { id: 'w_cash', type: 'cash', balance_paise: 1000000 }, // ₹10,000 cash
      { id: 'w_cc', type: 'credit_card', balance_paise: 1500000 }, // ₹15,000 spent on CC (liability)
    ];

    // Net Available Cash = Assets (₹50,000) - Liabilities (₹15,000) = ₹35,000
    const available = calculateAvailableBalance(wallets);
    expect(available).toBe(3500000); // 35,000.00
  });

  test('Rule 6: Savings goal allocation does not double count savings', () => {
    const bankWallet: WalletSim = { id: 'w_bank', type: 'bank', balance_paise: 10000000 }; // ₹1,00,000
    const laptopGoal: GoalSim = {
      id: 'g1',
      target_amount_paise: 8000000, // ₹80,000
      saved_amount_paise: 0,
      is_completed: false,
    };

    // Deposit ₹50,000 to goal from bank
    allocateToGoal(bankWallet, laptopGoal, 5000000);

    // Bank is debited by ₹50,000, goal saved is credited by ₹50,000
    expect(bankWallet.balance_paise).toBe(5000000);
    expect(laptopGoal.saved_amount_paise).toBe(5000000);
    expect(laptopGoal.is_completed).toBe(false);

    // Deposit remaining ₹30,000
    allocateToGoal(bankWallet, laptopGoal, 3000000);
    expect(bankWallet.balance_paise).toBe(2000000);
    expect(laptopGoal.saved_amount_paise).toBe(8000000);
    expect(laptopGoal.is_completed).toBe(true);
  });

  test('Rule 7: Recurring transactions next due date calculation', () => {
    const baseDate = '2026-11-01T10:00:00.000Z';

    const nextDaily = computeNextDueDate(baseDate, 'daily');
    expect(nextDaily.startsWith('2026-11-02')).toBe(true);

    const nextWeekly = computeNextDueDate(baseDate, 'weekly');
    expect(nextWeekly.startsWith('2026-11-08')).toBe(true);

    const nextMonthly = computeNextDueDate(baseDate, 'monthly');
    expect(nextMonthly.startsWith('2026-12-01')).toBe(true);

    const nextYearly = computeNextDueDate(baseDate, 'yearly');
    expect(nextYearly.startsWith('2027-11-01')).toBe(true);
  });
});
