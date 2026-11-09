# CashFlow — Personal Expense Tracker (Android Application)

CashFlow is a modern, offline-first, production-quality Personal Expense Tracker Android mobile application built with **React Native**, **Expo SDK 58**, **TypeScript**, and **SQLite**.

Designed specifically for Indian personal finance, CashFlow defaults to the Indian Rupee (`₹`), formats currency with the Indian numbering convention (`₹1,25,000.00`), and executes all monetary calculations using integer paise (64-bit integers) to eliminate floating-point rounding errors.

---

## 📱 Deliverable APK

The release APK has been compiled and is ready for sideloading on any Android device:

- **Location**: [`CashFlow.apk`](./CashFlow.apk) (also located at `android/app/build/outputs/apk/release/app-release.apk`)
- **Size**: ~47.4 MB (47,447,779 bytes)
- **Target OS**: Android 7.0+ (API 24 to 36)
- **Architectures**: Universal ARM (`arm64-v8a`, `armeabi-v7a`)
- **Signing**: Signed with Android debug keystore for one-tap sideloading

---

## 🚀 Key Features

### 1. Offline-First Architecture
- **Zero Registration & Login**: All features are accessible immediately after installation.
- **Local SQLite Engine**: Fast, persistent storage utilizing Write-Ahead Logging (WAL) and indexed foreign keys.
- **Privacy Guaranteed**: Financial transactions remain on the user's device unless explicitly exported.

### 2. Dashboard & Financial Overview
- Real-time calculations: Total Available Balance, Today's Spend, Weekly Spend, Monthly Expenses, and Monthly Savings.
- Balance Formula: `Total Liquid Assets (Bank + Savings + Cash + UPI + Digital Wallets) - Credit Card Outstanding Liabilities`.
- Category spending distribution bar, 5 recent transactions, and one-tap quick action buttons.

### 3. Income & Expense Tracking
- Category selection with custom icon mapping.
- Date, time, description, wallet selector, and payment method options.
- Attach receipt images via camera or image gallery.
- Safe delete workflows with confirmation dialogs and automatic wallet balance reversals.

### 4. Strict Accounting Rules & Wallets
- Multiple wallets: Cash, Bank Account, Savings Account, UPI, Credit Card, and Digital Wallet.
- **Inter-Wallet Transfers**: Atomically debits source wallet and credits target wallet. Transfers are completely isolated from income and expense aggregates.
- Credit cards track liabilities; credit limits are not treated as owned wealth.

### 5. Financial Reports & Interactive SVG Charts
- **Timeframes**: Daily, Weekly, Monthly, Yearly, and Custom Date Range.
- **Category Donut / Pie Chart**: SVG dynamic arc rendering with category legends and percentage share.
- **Weekly Bar Chart**: Day-by-day comparison (Monday to Sunday) highlighting peak spending days.
- **Trend Line Chart**: Cubic bezier curve tracking spending over time.
- **Income vs. Expense Comparison Bar**: Direct visual assessment of cash flow.

### 6. Budget Management & Real-Time Alerts
- Overall monthly and weekly budget limits.
- Category-specific caps.
- Dynamic color-coded consumption meters (Green < 75%, Warning Amber ≥ 75%, Danger Red ≥ 100%).
- Scheduled local notifications triggered at 75%, 90%, and 100% threshold consumption without duplicates.

### 7. Savings Goals
- Set target amount, saved balance, and target deadline.
- Atomic Deposit to Goal and Withdraw from Goal options.
- Goal allocations prevent double-counting in liquid balance.

### 8. Recurring Transactions Engine
- Supports Daily, Weekly, Monthly, and Yearly schedules.
- Leap-year and calendar-boundary aware due-date calculation.
- Idempotent execution on startup ensures overdue transactions are generated without duplication.

### 9. Receipt Scanner & On-Device Heuristic OCR
- Capture receipts via camera or gallery picker.
- On-device heuristic OCR parser extracting:
  - Total amount (detects `Total`, `INR`, `₹`, `Net Amount`, etc.)
  - Merchant name
  - Transaction date (`dd/MM/yyyy`, `yyyy-MM-dd`, `dd-MMM-yyyy`)
  - Category prediction
- Verification review modal allows user correction prior to saving.

### 10. AI Financial Assistant
- **Offline Rule-Based Intelligence Mode**: Instant answers for top spending categories, budget status, weekly savings, and expense reduction suggestions without internet connectivity or API keys.
- **Optional Online AI Integration**: Supports custom Gemini or OpenAI API keys entered by the user.

### 11. Security & Biometrics
- 4-digit PIN lock with salted SHA-256 hash storage in `expo-secure-store`.
- Hardware biometric authentication (fingerprint / face unlock) via `expo-local-authentication`.
- Masked notification mode hides amounts from notifications when privacy is enabled.

### 12. Data Portability & Backup
- **CSV Export**: Full transaction ledger ready for Excel or Google Sheets.
- **PDF Report**: Formatted executive statement table generated via `expo-print`.
- **JSON Backup & Restore**: Full database backup and validation inside atomic SQLite transactions.

---

## 🏗️ Project Architecture

```
CashFlow/
├── assets/                     # App icons, splash screens, assets
├── android/                    # Native Android Gradle configuration
├── src/
│   ├── theme/                  # Color palettes, typography, spacing, ThemeContext
│   ├── database/               # SQLite schema, migrations, and repositories
│   │   ├── db.ts               # Database initialization & seeds
│   │   ├── walletsRepo.ts      # Wallet CRUD & atomic fund transfers
│   │   ├── categoriesRepo.ts   # Category management
│   │   ├── transactionsRepo.ts # Transactions & aggregate analytics
│   │   ├── budgetsRepo.ts      # Budget calculations & threshold tracking
│   │   ├── goalsRepo.ts        # Savings goals & deposits/withdrawals
│   │   ├── recurringRepo.ts    # Recurring rules engine
│   │   ├── settingsRepo.ts     # Key-value persistent preferences
│   │   └── backupRepo.ts       # Database JSON backup & restore
│   ├── utils/                  # Currency, date, OCR, AI engine, export
│   ├── services/               # Security (biometrics/PIN) & local notifications
│   ├── components/             # Reusable UI cards, inputs, and SVG charts
│   ├── screens/                # Home, Transactions, Analytics, Budgets, Settings
│   │   └── modals/             # 13 Dedicated feature modals
│   └── navigation/             # AppNavigator (Tabs + Floating Action Button + Modals)
├── App.tsx                     # App root, database initialization, theme & lock gate
└── package.json
```

---

## 🧪 Testing & Verification

Run the automated test suite:
```bash
npm test
```
All 4 test suites pass (22 tests passing):
- `src/__tests__/currency.test.ts`
- `src/__tests__/date.test.ts`
- `src/__tests__/accountingRules.test.ts`
- `src/__tests__/backupValidation.test.ts`

Run TypeScript verification:
```bash
npx tsc --noEmit
```

---

## 🛠️ Building the APK Locally

To rebuild the APK locally with Gradle:

1. Ensure the Android SDK and JDK 17/21 are installed.
2. In `android/local.properties`, configure `sdk.dir`:
   ```properties
   sdk.dir=C:\\Users\\<YourUser>\\AppData\\Local\\Android\\Sdk
   ```
3. Run the Gradle build:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
4. Output APK location:
   `android/app/build/outputs/apk/release/app-release.apk`

---

## 📲 Installing on Your Phone

1. Transfer [`CashFlow.apk`](./CashFlow.apk) to your Android device via USB cable, Google Drive, or messaging.
2. Open your phone's **File Manager** and tap `CashFlow.apk`.
3. Enable *"Install unknown apps"* if prompted.
4. Tap **Install** and enjoy managing your finances with CashFlow!

