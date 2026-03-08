import Form from 'ustaxes/core/stateForms/Form'
import F1040 from '../../irsForms/F1040'
import { Field } from 'ustaxes/core/pdfFiller'
import { State } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import { utahTaxRate } from './Parameters'
import TC40B from './TC40B'

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
    this.tc40b = new TC40B(f1040)
  }

  isNonresident = (): boolean =>
    !this.info.stateResidencies.some((r) => r.state === 'UT')

  attachments = (): Form[] => (this.isNonresident() ? [this.tc40b] : [])

  /** Federal AGI */
  federalAGI = (): number => this.f1040.l11()

  /** Utah taxable income: for nonresident, apportion by TC-40B ratio */
  utahTaxableIncome = (): number => {
    const taxable = Math.max(0, this.f1040.l15())
    if (this.isNonresident()) {
      const r = this.tc40b.ratio()
      return Math.round(taxable * r)
    }
    return taxable
  }

  /** Utah tax before credits */
  utahTax = (): number => Math.round(this.utahTaxableIncome() * utahTaxRate)

  /** Withholding from W-2s with state UT */
  utahWithholding = (): number =>
    this.info.w2s
      .filter((w) => w.state === 'UT')
      .reduce((s, w) => s + (w.stateWithholding ?? 0), 0)

  /** Tax owed (positive) or refund (negative) */
  payment = (): number => this.utahTax() - this.utahWithholding()

  // TC-40 PDF has 107 fields (indices 0-106). Set key ones.
  fields = (): Field[] => {
    const arr: Field[] = Array.from({ length: 107 }, () => undefined)
    const p = this.info.taxPayer.primaryPerson
    const addr = p.address
    arr[0] = p.firstName
    arr[65] = p.lastName
    arr[33] = p.ssid
    arr[4] = addr.address
    arr[5] = undefined
    arr[6] = addr.city
    arr[7] = addr.state
    arr[8] = addr.zip
    arr[90] = this.info.taxPayer.filingStatus
    arr[91] = this.isNonresident() ? '2' : '1' // 1=full year resident, 2=nonresident
    arr[92] = undefined
    arr[14] = this.federalAGI() // Line 4
    arr[34] = this.utahTaxableIncome() // Line 23
    arr[35] = this.utahTax() // Line 24
    arr[36] = this.utahWithholding() // Line 25
    arr[37] = Math.max(0, this.payment()) // Line 26 tax owed
    arr[38] = Math.max(0, -this.payment()) // Line 27 refund
    return arr
  }
}
