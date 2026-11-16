import React from 'react';
import { IndianRupee, DollarSign, Euro, PoundSterling } from 'lucide-react';

/**
 * Returns the symbol corresponding to a 3-letter currency code.
 * Defaults to Indian Rupee (₹).
 */
export const getCurrencySymbol = (currency = 'INR') => {
  switch (currency?.toUpperCase()) {
    case 'INR':
      return '₹';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'CAD':
      return 'CA$';
    default:
      return currency || '₹';
  }
};

/**
 * Formats a salary range (e.g. "₹6,00,000 - ₹12,00,000 / year" or "$120,000 - $160,000 / year").
 */
export const formatSalaryRange = (min, max, currency = 'INR', period = '') => {
  const symbol = getCurrencySymbol(currency);
  const suffix = period ? ` / ${period}` : '';

  if (min && max) {
    return `${symbol}${Number(min).toLocaleString()} - ${symbol}${Number(max).toLocaleString()}${suffix}`;
  }
  if (min || max) {
    return `${symbol}${Number(min || max).toLocaleString()}${suffix}`;
  }
  return 'Not specified';
};

/**
 * Renders an icon corresponding to the currency code, defaulting to IndianRupee.
 */
export const CurrencyIcon = ({ currency = 'INR', className = 'w-4 h-4' }) => {
  switch (currency?.toUpperCase()) {
    case 'USD':
    case 'CAD':
      return <DollarSign className={className} />;
    case 'EUR':
      return <Euro className={className} />;
    case 'GBP':
      return <PoundSterling className={className} />;
    case 'INR':
    default:
      return <IndianRupee className={className} />;
  }
};

