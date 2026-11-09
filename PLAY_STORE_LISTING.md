# Google Play Store Listing & Data Safety Answers

Use this guide to copy and paste metadata directly into your Google Play Console store listing.

---

## 1. Store Listing Metadata

### App Title (Max 30 characters)
```text
CashFlow: Expense & Budget
```
*(Or: `CashFlow: Personal Finance`)*

### Short Description (Max 80 characters)
```text
Smart offline personal expense tracker, budget planner, and wallet manager.
```
*(75 characters)*

### Full Description (Max 4,000 characters)
```text
Take complete control of your personal finances with CashFlow — a modern, offline-first personal expense tracker and budget manager designed to keep your financial data 100% private and secure on your device.

No account creation required. No cloud server dependencies. No ads. Just fast, private, and intelligent money tracking.

🌟 KEY FEATURES:

📊 SMART FINANCIAL DASHBOARD
• Real-time overview of your total net balance across all accounts.
• Today's, weekly, and monthly expense breakdowns.
• Live remaining monthly budget indicator and savings tracker.
• Top spending category visual bars and recent activity feed.

💳 MULTI-WALLET & ACCOUNT MANAGEMENT
• Track Bank accounts, Cash in hand, Credit Cards, UPI, and Digital Wallets.
• Inter-wallet fund transfers with automated double-entry balancing.
• Credit limit and outstanding liability monitoring.

📈 INTERACTIVE ANALYTICS & REPORTS
• Category-wise expense breakdown with visual pie charts.
• 7-day weekly spending comparison bar charts.
• 12-month expense trends and income vs. expense balance charts.
• One-tap export to formatted CSV spreadsheets and executive PDF financial statements.

🎯 BUDGETS & SAVINGS GOALS
• Set monthly category budgets with custom warning thresholds (50%, 80%, 100%).
• Track savings targets with progress bars, visual milestones, and target deadlines.
• Allocate deposits directly from wallets into goals.

🔄 RECURRING TRANSACTIONS & BILLS
• Automate recurring bills (rent, electricity, subscriptions, mobile recharges, salaries).
• Daily, weekly, monthly, and yearly frequencies with automated notifications.

🧾 RECEIPT SCANNER & PHOTO ATTACHMENT
• Snap receipts with your camera or select from your gallery.
• Embedded on-device optical receipt scanner to help extract amounts and dates.
• Receipts are stored locally and backed up inside your archives.

🔒 BANK-GRADE SECURITY & APP LOCK
• Secure your app with a 4-digit PIN lock.
• Biometric authentication (Fingerprint / Face Unlock) where supported.
• Immediate lock upon minimizing or backgrounding the application.

🛡️ ZERO-CLOUD PRIVACY & AES-256 BACKUPS
• 100% Offline: Your financial information never leaves your phone.
• Password-protected backups using authenticated AES-256-GCM encryption.
• Preserves all transactions, budgets, wallets, and Base64-encoded receipt images.
• Export/Import freely via Google Drive, SD Card, or any file manager using Android's system file picker.

🌓 DESIGNED FOR ANDROID
• Beautiful modern interface with full Dark Mode and Light Mode support.
• Edge-to-edge layout fully compatible with Android 3-button and gesture navigation.
• Native performance built with React Native and SQLite.

Start tracking your wealth with complete privacy today!
```

---

## 2. Google Play Data Safety Form Answers

When filling out the **Data safety** section in the Play Console:

| Question | Answer | Reason / Explanation |
| :--- | :--- | :--- |
| **Does your app collect or share any of the required user data types?** | **No** | CashFlow operates 100% offline; data stays inside the app's local SQLite database. |
| **Is data encrypted in transit?** | **N/A** (or Yes if asked) | No data is transmitted across the internet. |
| **Do you provide a way for users to request data deletion?** | **Yes** | Users can delete all records or individual transactions at any time within the app, or clear app storage. |

---

## 3. Financial Features Declaration

| Question | Answer |
| :--- | :--- |
| **Financial Features Category** | Select **"Personal finance management"** |
| **Is this app a lending / loan app?** | **No** |
| **Does this app process real financial payments?** | **No** (It is a manual ledger / tracking utility) |

---

## 4. App Access & Permissions Declarations

| Permission / Topic | Declaration |
| :--- | :--- |
| **App Access** | Select **"All functionality is available without special access"** *(Note: PIN lock is user-configured on device).* |
| **Camera** | Used exclusively for receipt photography when requested by the user. |
| **Biometrics** | Used strictly for device-level App Lock authentication via Android BiometricPrompt. |
| **Notifications** | Used for user-scheduled local reminders (daily expense logging reminder). |

