import Form from 'ustaxes/core/stateForms/Form'
import F1040 from '../../irsForms/F1040'
import { Field } from 'ustaxes/core/pdfFiller'
import { State } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import type { PropertyExpenseTypeName } from 'ustaxes/core/data'

const expenseKeys: PropertyExpenseTypeName[] = [
  'advertising',
  'auto',
  'cleaning',
  'commissions',
  'insurance',
  'legal',
  'management',
  'mortgage',
  'otherInterest',
  'repairs',
  'supplies',
  'taxes',
  'utilities',
  'depreciation',
  'other'
]

function netIncomeForProperty(p: {
  rentReceived: number
  expenses: Partial<Record<PropertyExpenseTypeName, number>>
}): number {
  const totalExp = expenseKeys.reduce((sum, k) => sum + (p.expenses[k] ?? 0), 0)
  return p.rentReceived - totalExp
}

export default class TC40B extends Form {
  info: ValidatedInformation
  f1040: F1040
  formName = 'TC-40B'
  state: State = 'UT'
  formOrder = 1

  constructor(f1040: F1040) {
    super()
    this.info = f1040.info
    this.f1040 = f1040
  }

  attachments = (): Form[] => []

  /** Utah-source income: net rental from UT properties only */
  utahSourceIncome = (): number => {
    const utProps = this.info.realEstate.filter((p) => p.address.state === 'UT')
    return utProps.reduce((sum, p) => sum + netIncomeForProperty(p), 0)
  }

  /** Total income (federal AGI for apportionment) */
  totalIncome = (): number => this.f1040.l11()

  /** Ratio Line 39: Utah source / total */
  ratio = (): number => {
    const total = this.totalIncome()
    if (total <= 0) return 0
    return Math.min(1, Math.max(0, this.utahSourceIncome() / total))
  }

  // PDF has 92 fields (indices 0-91). Build array and set key positions.
  fields = (): Field[] => {
    const arr: Field[] = Array.from({ length: 92 }, () => undefined)
    const primary = this.info.taxPayer.primaryPerson
    arr[0] = `${primary.firstName} ${primary.lastName}`
    arr[1] = primary.ssid
    arr[3] = this.info.stateResidencies[0]?.state
    arr[11] = this.utahSourceIncome()
    arr[12] = this.totalIncome()
    arr[47] = this.utahSourceIncome()
    arr[48] = this.totalIncome()
    arr[78] = this.ratio()
    arr[79] = this.ratio()
    arr[80] = this.utahSourceIncome()
    arr[81] = this.utahSourceIncome()
    arr[82] = this.totalIncome()
    return arr
  }
}
