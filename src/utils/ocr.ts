import { rupeesToPaise } from './currency';

export interface ParsedReceipt {
  merchantName: string;
  amountPaise: number;
  amountRupeesStr: string;
  dateStr: string; // ISO or YYYY-MM-DD
  description: string;
  suggestedCategoryId?: string;
  confidence: number;
  rawText: string;
}

/**
 * Heuristic OCR parser that extracts merchant, amount, date and category from receipt text
 */
export function parseReceiptText(rawText: string): ParsedReceipt {
  const lines = rawText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let merchantName = '';
  let amountPaise = 0;
  let amountRupeesStr = '';
  let dateStr = new Date().toISOString();
  let description = '';
  let suggestedCategoryId: string | undefined = undefined;

  // 1. Extract Merchant Name from the top non-empty lines
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];
    // Ignore lines that look like dates, times, phone numbers, or invoice numbers
    if (
      !line.match(/\d{4}/) &&
      !line.toLowerCase().includes('invoice') &&
      !line.toLowerCase().includes('bill') &&
      !line.toLowerCase().includes('gst') &&
      !line.toLowerCase().includes('tax') &&
      line.length >= 3
    ) {
      merchantName = line.replace(/[^a-zA-Z0-9\s&'-]/g, '').trim();
      break;
    }
  }
  if (!merchantName && lines.length > 0) {
    merchantName = lines[0].substring(0, 30);
  }

  // 2. Extract Total Amount
  // Look for lines containing "total", "grand total", "net amount", "amount paid", "total amount", "rs", "inr", "₹"
  const amountRegex = /(?:total|amount|amt|grand\s*total|net|balance|paid|rs\.?|inr|₹)[\s:]*([₹\$\s]*\d+[\d,]*\.?\d{0,2})/i;
  const standaloneAmountRegex = /(?:₹|rs\.?|inr)\s*(\d+[\d,]*\.?\d{0,2})/i;
  const genericNumberRegex = /\b(\d+[\d,]*\.\d{2})\b/;

  let candidateAmounts: number[] = [];

  for (const line of lines) {
    const match = line.match(amountRegex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        candidateAmounts.push(parsed);
      }
    }

    const saMatch = line.match(standaloneAmountRegex);
    if (saMatch && saMatch[1]) {
      const cleanNum = saMatch[1].replace(/[^0-9.]/g, '');
      const parsed = parseFloat(cleanNum);
      if (!isNaN(parsed) && parsed > 0) {
        candidateAmounts.push(parsed);
      }
    }
  }

  if (candidateAmounts.length === 0) {
    // Fallback: look for general two-decimal numbers
    for (const line of lines) {
      const m = line.match(genericNumberRegex);
      if (m && m[1]) {
        const clean = m[1].replace(/,/g, '');
        const parsed = parseFloat(clean);
        if (!isNaN(parsed) && parsed > 0 && parsed < 1000000) {
          candidateAmounts.push(parsed);
        }
      }
    }
  }

  if (candidateAmounts.length > 0) {
    // Grand total is typically the highest extracted relevant figure
    const maxAmount = Math.max(...candidateAmounts);
    amountPaise = rupeesToPaise(maxAmount);
    amountRupeesStr = maxAmount.toFixed(2);
  }

  // 3. Extract Date
  // Formats: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, DD MMM YYYY
  const dateRegex1 = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;
  const dateRegex2 = /\b(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/;

  for (const line of lines) {
    const m1 = line.match(dateRegex1);
    if (m1) {
      const day = parseInt(m1[1], 10);
      const month = parseInt(m1[2], 10);
      const year = parseInt(m1[3], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2035) {
        const d = new Date(year, month - 1, day);
        dateStr = d.toISOString();
        break;
      }
    }

    const m2 = line.match(dateRegex2);
    if (m2) {
      const year = parseInt(m2[1], 10);
      const month = parseInt(m2[2], 10);
      const day = parseInt(m2[3], 10);
      if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 2000 && year <= 2035) {
        const d = new Date(year, month - 1, day);
        dateStr = d.toISOString();
        break;
      }
    }
  }

  // 4. Category Prediction based on keywords
  const lower = rawText.toLowerCase();
  if (lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe') || lower.includes('hotel') || lower.includes('swiggy') || lower.includes('zomato') || lower.includes('pizza') || lower.includes('burger')) {
    suggestedCategoryId = 'cat_exp_1'; // Food
  } else if (lower.includes('mart') || lower.includes('grocery') || lower.includes('supermarket') || lower.includes('vegetable') || lower.includes('bazaar') || lower.includes('blinkit') || lower.includes('zepto')) {
    suggestedCategoryId = 'cat_exp_10'; // Groceries
  } else if (lower.includes('pharmacy') || lower.includes('hospital') || lower.includes('med') || lower.includes('clinic') || lower.includes('health') || lower.includes('doctor')) {
    suggestedCategoryId = 'cat_exp_7'; // Healthcare
  } else if (lower.includes('uber') || lower.includes('ola') || lower.includes('fuel') || lower.includes('petrol') || lower.includes('diesel') || lower.includes('auto') || lower.includes('metro')) {
    suggestedCategoryId = 'cat_exp_4'; // Transportation
  } else if (lower.includes('mall') || lower.includes('cloth') || lower.includes('fashion') || lower.includes('amazon') || lower.includes('flipkart') || lower.includes('myntra')) {
    suggestedCategoryId = 'cat_exp_2'; // Shopping
  } else if (lower.includes('cinema') || lower.includes('movie') || lower.includes('theatre') || lower.includes('bookmyshow') || lower.includes('pvr') || lower.includes('inox')) {
    suggestedCategoryId = 'cat_exp_6'; // Entertainment
  } else if (lower.includes('flight') || lower.includes('air') || lower.includes('train') || lower.includes('rail') || lower.includes('irctc') || lower.includes('makemytrip')) {
    suggestedCategoryId = 'cat_exp_3'; // Travel
  } else if (lower.includes('electricity') || lower.includes('power') || lower.includes('energy') || lower.includes('bescom') || lower.includes('discom')) {
    suggestedCategoryId = 'cat_exp_9'; // Electricity
  } else if (lower.includes('airtel') || lower.includes('jio') || lower.includes('vi') || lower.includes('recharge') || lower.includes('broadband')) {
    suggestedCategoryId = 'cat_exp_11'; // Mobile Recharge
  }

  description = merchantName ? `Receipt at ${merchantName}` : 'Scanned Receipt';

  const confidence = (merchantName ? 0.4 : 0) + (amountPaise > 0 ? 0.4 : 0) + (dateStr ? 0.2 : 0);

  return {
    merchantName: merchantName || 'Unknown Merchant',
    amountPaise,
    amountRupeesStr,
    dateStr,
    description,
    suggestedCategoryId,
    confidence,
    rawText,
  };
}

