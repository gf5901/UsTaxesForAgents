import Form from 'ustaxes/core/stateForms/Form'
import F1040 from '../../irsForms/F1040'
import { Field } from 'ustaxes/core/pdfFiller'
import { State, FilingStatus } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import {
  utahTaxRate,
  utahExemptionAmount,
  utahPhaseOutThreshold,
  utahTaxpayerCreditRate,
  utahPhaseOutRate,
  ssnForPdf
} from './Parameters'
import TC40B from './TC40B'

/** TC-40 PDF field count (indices 0–106). */
const TC40_FIELD_COUNT = 107

/** Full-year resident? Y/N (TC-40 field). */
const FULL_YEAR_RESIDENT_YES = 'Y'
const FULL_YEAR_RESIDENT_NO = 'N'

/** TC-40 PDF field indices (from formgen). */
const F = {
  firstName: 0,
  lastName: 65,
  ssid: 33,
  address: 4,
  telephone: 5,
  city: 6,
  state: 7,
  zip: 8,
  line4: 14,
  line5: 15,
  line6: 16,
  line7: 17,
  line8: 18,
  line9: 19,
  exemptionA: 10,
  exemptionB: 11,
  exemptionTotalC: 105,
  exemptionTotalD: 106,
  line10: 20,
  line11: 21,
  line12: 22,
  line13: 23,
  line14: 24,
  line15: 25,
  line16: 26,
  line17: 27,
  line18: 28,
  line19: 29,
  line20: 30,
  line22: 32,
  line23: 34,
  line24: 35,
  line25: 36,
  line26: 37,
  line27: 38,
  line28: 39,
  line29: 40,
  line30: 41,
  line31: 42,
  line32: 43,
  line33: 44,
  line34: 45,
  line35: 46,
  line36: 47,
  line37: 48,
  line38: 49,
  line39: 50,
  line40: 51,
  line41: 52,
  line42: 53,
  line43: 54,
  filingStatus: 90,
  residency: 91,
  partYearDates: 92
} as const

/** Utah filing status code: 1=Single, 2=MFJ, 3=MFS, 4=HOH, 5=Qualifying surviving spouse */
function utahFilingStatusCode(status: FilingStatus): string {
  const map: Record<FilingStatus, string> = {
    [FilingStatus.S]: '1',
    [FilingStatus.MFJ]: '2',
    [FilingStatus.MFS]: '3',
    [FilingStatus.HOH]: '4',
    [FilingStatus.W]: '5'
  }
  return map[status]
}

export default class TC40 extends Form {
  info: ValidatedInformation
  f1040: F1040
  formName = 'TC-40'
  state: State = 'UT'
  formOrder = 0
  tc40b: TC40B

  constructor(f1040: F1040) {
    super()
    this.info = f1040.info
    this.f1040 = f1040
    this.tc40b = new TC40B(f1040, this)
  }

  isNonresident = (): boolean =>
    !this.info.stateResidencies.some((r) => r.state === 'UT')

  attachments = (): Form[] => (this.isNonresident() ? [this.tc40b] : [])

  /** Federal AGI (Line 4) */
  federalAGI = (): number => this.f1040.l11()

  /** Additions to income from TC-40A Part 1 (Line 5) */
  line5 = (): number => 0

  /** Total income (Line 6) */
  line6 = (): number => this.federalAGI() + this.line5()

  /** State tax refund on federal Sch 1 line 1 (Line 7) */
  line7 = (): number => this.f1040.schedule1.l1() ?? 0

  /** Subtractions from TC-40A Part 2 (Line 8) */
  line8 = (): number => 0

  /** Utah taxable income (Line 9) — full-year resident: 6 - 7 - 8 */
  line9 = (): number => Math.max(0, this.line6() - this.line7() - this.line8())

  /** Utah tax before credits (Line 10) = Line 9 × 4.5% */
  line10 = (): number => Math.round(this.line9() * utahTaxRate)

  /** Qualifying dependents age 16 and under (Line 2a) */
  line2a = (): number =>
    this.info.taxPayer.dependents.filter(
      (d) => new Date().getFullYear() - d.dateOfBirth.getFullYear() <= 16
    ).length

  /** Other qualifying dependents (Line 2b) */
  line2b = (): number => this.info.taxPayer.dependents.length - this.line2a()

  /** Total qualifying dependents (Line 2d) — used for Line 11 */
  line2d = (): number => this.info.taxPayer.dependents.length

  /** Personal exemption (Line 11) = Line 2d × $2,111 */
  line11 = (): number => this.line2d() * utahExemptionAmount

  /** Federal standard or itemized deduction (Line 12) */
  line12 = (): number => this.f1040.l12()

  /** Line 13 = Line 11 + Line 12 */
  line13 = (): number => this.line11() + this.line12()

  /** State income tax from Schedule A (Line 5e less 5b, 5c) — Line 14 */
  line14 = (): number => {
    if (!this.f1040.scheduleA.isNeeded()) return 0
    const l5e = this.f1040.scheduleA.l5e()
    const l5b = this.f1040.scheduleA.l5b()
    const l5c = this.f1040.scheduleA.l5c()
    return Math.max(0, l5e - l5b - l5c)
  }

  /** Line 15 = Line 13 - Line 14 */
  line15 = (): number => Math.max(0, this.line13() - this.line14())

  /** Initial credit before phase-out (Line 16) = Line 15 × 6% */
  line16 = (): number => Math.round(this.line15() * utahTaxpayerCreditRate)

  /** Phase-out threshold (Line 17) */
  line17 = (): number => utahPhaseOutThreshold[this.info.taxPayer.filingStatus]

  /** Income subject to phase-out (Line 18) */
  line18 = (): number => Math.max(0, this.line9() - this.line17())

  /** Phase-out amount (Line 19) = Line 18 × 1.3% */
  line19 = (): number => Math.round(this.line18() * utahPhaseOutRate)

  /** Taxpayer tax credit (Line 20) = Line 16 - Line 19 */
  line20 = (): number => Math.max(0, this.line16() - this.line19())

  /** Utah income tax (Line 22) = Line 10 - Line 20 */
  line22 = (): number => Math.max(0, this.line10() - this.line20())

  /** Other credits (Line 24) — e.g. nonrefundable; 0 if not used */
  line24 = (): number => 0

  /** Line 25: resident = Line 23 - Line 24; nonresident = TC-40B Line 41 */
  line25 = (): number => {
    if (this.isNonresident()) {
      return this.tc40b.apportionedTax()
    }
    return Math.max(0, this.line22() - this.line24())
  }

  /** Line 26: Nonapportionable nonrefundable credits (TC-40A Part 4) */
  line26 = (): number => 0

  /** Line 27 = Line 25 - Line 26, not less than zero */
  line27 = (): number => Math.max(0, this.line25() - this.line26())

  /** Line 32: Total tax (= Line 27 + Lines 28–31, simplified) */
  line32 = (): number => this.line27()

  /** Line 33: Total withholding from W-2s/1099s with state UT (TC-40W) */
  utahWithholding = (): number =>
    this.info.w2s
      .filter((w) => w.state === 'UT')
      .reduce((s, w) => s + (w.stateWithholding ?? 0), 0)

  /** Line 37: Total payments and credits (= Line 33 + Lines 34–36, simplified) */
  line37 = (): number => this.utahWithholding()

  /** Line 38: Overpayment = Line 37 - Line 32, if positive */
  line38Overpayment = (): number => Math.max(0, this.line37() - this.line32())

  /** Line 42: Tax due = Line 32 - Line 37, if positive */
  line42TaxDue = (): number => Math.max(0, this.line32() - this.line37())

  fields = (): Field[] => {
    const arr: Field[] = Array.from(
      { length: TC40_FIELD_COUNT },
      () => undefined
    )
    const p = this.info.taxPayer.primaryPerson
    const addr = p.address

    arr[F.ssid] = ssnForPdf(p.ssid)
    arr[F.firstName] = p.firstName
    arr[F.lastName] = p.lastName
    arr[F.address] = addr.address
    arr[F.telephone] = undefined
    arr[F.city] = addr.city
    arr[F.state] = addr.state
    arr[F.zip] = addr.zip
    arr[F.filingStatus] = utahFilingStatusCode(this.info.taxPayer.filingStatus)
    arr[F.residency] = this.isNonresident()
      ? FULL_YEAR_RESIDENT_NO
      : FULL_YEAR_RESIDENT_YES
    arr[F.partYearDates] = undefined

    arr[F.exemptionA] = this.line2a() || undefined
    arr[F.exemptionB] = this.line2b() || undefined
    arr[F.exemptionTotalD] = this.line2d() || undefined

    // Page 1 — Lines 4–22 (show 0 explicitly to avoid rejection)
    arr[F.line4] = this.federalAGI()
    arr[F.line5] = this.line5()
    arr[F.line6] = this.line6()
    arr[F.line7] = this.line7()
    arr[F.line8] = this.line8()
    arr[F.line9] = this.line9()
    arr[F.line10] = this.line10()
    arr[F.line11] = this.line11()
    arr[F.line12] = this.line12()
    arr[F.line13] = this.line13()
    arr[F.line14] = this.line14()
    arr[F.line15] = this.line15()
    arr[F.line16] = this.line16()
    arr[F.line17] = this.line17()
    arr[F.line18] = this.line18()
    arr[F.line19] = this.line19()
    arr[F.line20] = this.line20()
    arr[F.line22] = this.line22()

    // Page 2 — Lines 23–43
    arr[F.line23] = this.line22() // Line 23 = Utah income tax
    arr[F.line24] = this.line24() // Line 24 = other credits
    arr[F.line25] = this.line25() // Line 25 = tax (apportioned for NR)
    arr[F.line26] = this.line26() // Line 26 = nonapportionable credits
    arr[F.line27] = this.line27() // Line 27 = Line 25 - Line 26
    arr[F.line32] = this.line32() // Line 32 = total tax
    arr[F.line33] = this.utahWithholding() // Line 33 = total withholding (TC-40W)
    arr[F.line37] = this.line37() // Line 37 = total payments and credits
    arr[F.line38] = this.line38Overpayment() // Line 38 = overpayment (refund)
    arr[F.line42] = this.line42TaxDue() // Line 42 = tax due
    return arr
  }
}
