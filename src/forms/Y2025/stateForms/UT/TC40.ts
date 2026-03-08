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

  /** Withholding from W-2s with state UT */
  utahWithholding = (): number =>
    this.info.w2s
      .filter((w) => w.state === 'UT')
      .reduce((s, w) => s + (w.stateWithholding ?? 0), 0)

  /** Final Utah tax for payment/refund: resident = Line 22 - Line 24; nonresident = TC-40B Line 41 */
  finalUtahTax = (): number => {
    if (this.isNonresident()) {
      return this.tc40b.apportionedTax()
    }
    return Math.max(0, this.line22() - this.line24())
  }

  /** Tax owed (positive) or refund (negative) */
  payment = (): number => this.finalUtahTax() - this.utahWithholding()

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

    arr[F.line4] = this.federalAGI()
    arr[F.line5] = this.line5() || undefined
    arr[F.line6] = this.line6()
    arr[F.line7] = this.line7() || undefined
    arr[F.line8] = this.line8() || undefined
    arr[F.line9] = this.line9()
    arr[F.line10] = this.line10()
    arr[F.line11] = this.line11() || undefined
    arr[F.line12] = this.line12()
    arr[F.line13] = this.line13()
    arr[F.line14] = this.line14() || undefined
    arr[F.line15] = this.line15()
    arr[F.line16] = this.line16()
    arr[F.line17] = this.line17()
    arr[F.line18] = this.line18() || undefined
    arr[F.line19] = this.line19() || undefined
    arr[F.line20] = this.line20()
    arr[F.line22] = this.line22()

    arr[F.line23] = this.line22()
    arr[F.line24] = this.line24() || undefined
    arr[F.line25] = this.finalUtahTax()
    arr[F.line26] = this.utahWithholding()
    arr[F.line27] = Math.max(0, this.payment())
    arr[F.line28] = Math.max(0, -this.payment())
    return arr
  }
}
