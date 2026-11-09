# Privacy Policy for CashFlow

**Last Updated:** November 9, 2026

CashFlow ("we", "our", or "the App") is committed to protecting your privacy. This Privacy Policy explains our practices regarding your data when using the CashFlow mobile application on Android.

---

### 1. Offline-First Architecture & No Data Collection

**CashFlow operates 100% offline.** 
- We do **not** collect, store, transmit, or share any personal or financial information on external servers or cloud services.
- All data—including transactions, income, expenses, category tags, wallet balances, budgets, savings goals, recurring rules, and receipt images—is stored exclusively on your device's local SQLite database and sandboxed storage.
- There are **no accounts, logins, tracking cookies, or analytics SDKs** embedded in the application.

---

### 2. Permissions & How They Are Used

CashFlow requests only the minimum Android permissions necessary to provide user-requested features:

| Permission | Technical Name | Purpose |
| :--- | :--- | :--- |
| **Camera** | `android.permission.CAMERA` | Allows you to photograph paper receipts and attach them to transactions. Images never leave your phone. |
| **Photos / Media** | `android.permission.READ_MEDIA_IMAGES` | Allows you to select an existing receipt photo from your gallery. |
| **Biometric / Fingerprint** | `android.permission.USE_BIOMETRIC`, `USE_FINGERPRINT` | Powers the on-device App Lock screen. Biometric verification is handled strictly by the Android OS hardware security module. CashFlow never sees or stores your biometric raw data. |
| **Notifications** | `android.permission.POST_NOTIFICATIONS` | Delivers user-scheduled daily expense logging reminders and budget threshold alerts scheduled locally on your device. |
| **Storage / Document Access** | Storage Access Framework | Used exclusively when you choose to export or import an encrypted backup file (`.enc` / `.json`). |

---

### 3. Data Protection & Backups

- **Encrypted Backups**: If you choose to protect your backup with a password, your financial records and receipt photos are sealed using authenticated **AES-256-GCM** encryption with PBKDF2/SHA-256 key derivation.
- **Export Control**: You retain 100% control over your backup files. When exported, you decide where to save them (e.g., local storage, external SD card, personal Google Drive, or email).

---

### 4. Children’s Privacy

CashFlow does not collect any data from anyone, including children under the age of 13.

---

### 5. Third-Party Services

CashFlow does not integrate third-party advertising networks, analytics trackers (such as Google Analytics or Firebase), or social media SDKs.

---

### 6. Changes to This Privacy Policy

If we update this Privacy Policy, the revised version will be published with an updated "Last Updated" date.

---

### 7. Contact Us

If you have questions about this Privacy Policy or CashFlow, you can reach out via:
- **Email:** support@cashflowapp.local (or your developer email)
- **Project Repository:** https://github.com/your-username/CashFlow

