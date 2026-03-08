import { FilingStatus } from 'ustaxes/core/data'

/**
 * SSN for PDF fields: digits only, up to 9 chars. Many state PDFs restrict SSN length/format.
 */
export function ssnForPdf(ssid: string): string {
  const digits = ssid.replace(/\D/g, '')
  return digits.slice(0, 9)
}

/**
 * Utah individual income tax parameters for 2025.
 * Rate: 4.5% flat (HB 106, effective Jan 1 2025).
 */
export const utahTaxRate = 0.045

/** Personal exemption per dependent/exemption (TC-40 line 11). */
export const utahExemptionAmount = 2111

/** Taxpayer credit rate (TC-40 line 16): Line 15 × 6%. */
export const utahTaxpayerCreditRate = 0.06

/** Phase-out rate (TC-40 line 19): Line 18 × 1.3%. */
export const utahPhaseOutRate = 0.013

/** Phase-out threshold (TC-40 line 17). Income above this reduces the taxpayer credit. */
export const utahPhaseOutThreshold: Record<FilingStatus, number> = {
  [FilingStatus.S]: 18213,
  [FilingStatus.MFS]: 18213,
  [FilingStatus.HOH]: 27320,
  [FilingStatus.MFJ]: 36426,
  [FilingStatus.W]: 36426
}
