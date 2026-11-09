import {
  paiseToRupees,
  rupeesToPaise,
  formatIndianNumber,
  formatINR,
  sanitizeAmountInput,
} from '../utils/currency';

describe('Currency and Indian Rupee Formatting Tests', () => {
  test('paiseToRupees correctly converts integer paise to rupees', () => {
    expect(paiseToRupees(100)).toBe(1);
    expect(paiseToRupees(125050)).toBe(1250.5);
    expect(paiseToRupees(0)).toBe(0);
    expect(paiseToRupees(99)).toBe(0.99);
  });

  test('rupeesToPaise converts rupees number and strings without float rounding error', () => {
    expect(rupeesToPaise(100)).toBe(10000);
    expect(rupeesToPaise(1250.5)).toBe(125050);
    expect(rupeesToPaise('1,250.50')).toBe(125050);
    expect(rupeesToPaise('125000')).toBe(12500000);
    expect(rupeesToPaise('0.05')).toBe(5);
    expect(rupeesToPaise('0.01')).toBe(1);
  });

  test('formatIndianNumber groups with standard Indian comma rules', () => {
    // 1,00,000 (1 Lakh)
    expect(formatIndianNumber('100000.00')).toBe('1,00,000.00');
    // 1,25,000 (1.25 Lakh)
    expect(formatIndianNumber('125000.00')).toBe('1,25,000.00');
    // 1,00,00,000 (1 Crore)
    expect(formatIndianNumber('10000000.00')).toBe('1,00,00,000.00');
    // 500 (hundreds, no comma)
    expect(formatIndianNumber('500.00')).toBe('500.00');
  });

  test('formatINR formats integer paise into standard Indian Rupee string', () => {
    // ₹1,25,000.00
    expect(formatINR(12500000)).toBe('₹1,25,000.00');
    // ₹500.50
    expect(formatINR(50050)).toBe('₹500.50');
    // Negative amounts: -₹1,200.00
    expect(formatINR(-120000)).toBe('-₹1,200.00');
    // Zero: ₹0.00
    expect(formatINR(0)).toBe('₹0.00');
    // Without decimals
    expect(formatINR(12500000, { showDecimals: false })).toBe('₹1,25,000');
    // With positive sign
    expect(formatINR(50000, { showSign: true })).toBe('+₹500.00');
  });

  test('sanitizeAmountInput allows only valid numerical inputs with max 2 decimals', () => {
    expect(sanitizeAmountInput('1250.50')).toBe('1250.50');
    expect(sanitizeAmountInput('1250.555')).toBe('1250.55');
    expect(sanitizeAmountInput('abc125xyz.5')).toBe('125.5');
    expect(sanitizeAmountInput('100.20.30')).toBe('100.20');
  });
});

