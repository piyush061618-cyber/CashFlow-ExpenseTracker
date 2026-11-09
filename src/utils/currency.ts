// Indian Rupee (INR ₹) Formatting & Paise Precision Utilities

/**
 * Converts integer paise to Rupees (number)
 */
export function paiseToRupees(paise: number): number {
  return (paise || 0) / 100;
}

/**
 * Converts Rupees (number or string) to integer paise
 * Rounds to nearest integer paise to eliminate floating point imprecision
 */
export function rupeesToPaise(rupees: number | string): number {
  if (typeof rupees === 'string') {
    const cleaned = rupees.replace(/,/g, '').trim();
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(rupees)) return 0;
  return Math.round(rupees * 100);
}

/**
 * Formats a number according to the Indian Numbering System (Lakhs & Crores)
 * e.g., 12500000 -> 1,25,00,000
 */
export function formatIndianNumber(num: number | string): string {
  const parts = num.toString().split('.');
  let integerPart = parts[0];
  const decimalPart = parts.length > 1 ? '.' + parts[1] : '';

  const isNegative = integerPart.startsWith('-');
  if (isNegative) {
    integerPart = integerPart.substring(1);
  }

  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);

  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedOther = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const result = formattedOther + lastThree + decimalPart;

  return isNegative ? '-' + result : result;
}

/**
 * Formats integer paise into standard Indian Rupee string: ₹1,25,000.00
 */
export function formatINR(
  paise: number,
  options: {
    showDecimals?: boolean;
    showSymbol?: boolean;
    showSign?: boolean;
  } = {}
): string {
  const { showDecimals = true, showSymbol = true, showSign = false } = options;

  const isNegative = paise < 0;
  const absPaise = Math.abs(paise || 0);
  const rupees = absPaise / 100;

  const fixed = showDecimals ? rupees.toFixed(2) : Math.round(rupees).toString();
  const formatted = formatIndianNumber(fixed);

  const symbol = showSymbol ? '₹' : '';
  let sign = '';
  if (isNegative) {
    sign = '-';
  } else if (showSign && paise > 0) {
    sign = '+';
  }

  return `${sign}${symbol}${formatted}`;
}

/**
 * Sanitizes numeric input from text field allowing only valid numbers and up to 2 decimal places
 */
export function sanitizeAmountInput(input: string): string {
  let cleaned = input.replace(/[^0-9.]/g, '');
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts[1];
  }
  const [intPart, decPart] = cleaned.split('.');
  if (decPart !== undefined) {
    return `${intPart}.${decPart.substring(0, 2)}`;
  }
  return intPart;
}
