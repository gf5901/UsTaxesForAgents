import Form from 'ustaxes/core/stateForms/Form'
import F1040 from '../../irsForms/F1040'
import { Field } from 'ustaxes/core/pdfFiller'
import { State } from 'ustaxes/core/data'
import { ValidatedInformation } from 'ustaxes/forms/F1040Base'
import type { PropertyExpenseTypeName } from 'ustaxes/core/data'
import type TC40 from './TC40'
import { ssnForPdf } from './Parameters'

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

/** TC-40B PDF field count (indices 0–91). */
const TC40B_FIELD_COUNT = 92

/** Number of income category lines in Part 3 before the total (lines 1–17). */
const INCOME_CATEGORY_LINES = 17

/** Income line indices: Col A, Col B for TC-40B Part 3 lines 1–18. */
const INCOME_LINE_INDICES: [number, number][] = [
  [11, 12], // 1 Wages
  [13, 14], // 2 Interest
  [15, 16], // 3 Dividends
  [17, 18], // 4 IRA/pensions
  [19, 20], // 5 Social Security
  [21, 22], // 6 State tax refund
  [23, 24], // 7 Alimony
  [25, 26], // 8 Business
  [27, 28], // 9 Capital gain
  [29, 30], // 10 Other gains
  [31, 32], // 11 Rental
  [33, 34], // 12 Farm
  [35, 36], // 13 Unemployment
  [37, 38], // 14 Other income
  [39, 40], // 15 Additions
  [41, 42], // 16 Reserved
  [89, 90], // 17 Reserved
  [71, 72] // 18 Total
]

/** TC-40B PDF field indices for summary and tax lines. */
const F = {
  taxpayerName: 0,
  ssid: 1,
  nonresidentCheckbox: 2,
  nonresidentState: 3,
  line37ColA: 85,
  line37ColB: 86,
  line38ColA: 87,
  line38ColB: 88,
  ratioLine39: 78,
  line40: 79,
  line41: 80
} as const

export default class TC40B extends Form {
  info: ValidatedInformation
  f1040: F1040
  formName = 'TC-40B'
  state: State = 'UT'
  formOrder = 1
  tc40: TC40 | undefined

  constructor(f1040: F1040, tc40?: TC40) {
    super()
    this.info = f1040.info
    this.f1040 = f1040
    this.tc40 = tc40
  }

  attachments = (): Form[] => []

  /** Utah-source income: net rental from UT properties only */
  utahSourceIncome = (): number => {
    const utProps = this.info.realEstate.filter((p) => p.address.state === 'UT')
    return utProps.reduce((sum, p) => sum + netIncomeForProperty(p), 0)
  }

  /** Total income (federal AGI for apportionment) */
  totalIncome = (): number => this.f1040.l11()

  /** Ratio Line 39: Line 38 Col A / Line 38 Col B (to 4 decimal places) */
  ratio = (): number => {
    const [a38, b38] = this.line38Totals()
    if (b38 <= 0) return 0
    return Math.min(1, Math.max(0, a38 / b38))
  }

  /** TC-40B Line 40 = TC-40 Line 23 - Line 24 (tax before apportionment) */
  line40 = (): number => {
    if (this.tc40 === undefined) return 0
    return Math.max(0, this.tc40.line22() - this.tc40.line24())
  }

  /** TC-40B Line 41 = Line 40 × ratio = apportioned Utah tax. Enter on TC-40 page 2 Line 25. */
  apportionedTax = (): number => Math.round(this.line40() * this.ratio())

  /** Income by category for Part 3: [Col A, Col B] per line. Utah column = UT-source only. */
  incomeByLine = (): number[][] => {
    const w2Utah = this.info.w2s
      .filter((w) => w.state === 'UT')
      .reduce((s, w) => s + w.income, 0)
    const w2Total = this.f1040.l1z()
    const intTotal = this.f1040.l2b() ?? 0
    const divTotal = this.f1040.l3b() ?? 0
    const iraTotal = (this.f1040.l4b() ?? 0) + (this.f1040.l5b() ?? 0)
    const ssTotal = this.f1040.l6b() ?? 0
    const stateRefund = this.f1040.schedule1.l1() ?? 0
    const alimony = this.f1040.schedule1.l2a() ?? 0
    const business = this.f1040.schedule1.l3() ?? 0
    const capGain = this.f1040.l7() ?? 0
    const otherGains = this.f1040.schedule1.l4() ?? 0
    const rentalUtah = this.utahSourceIncome()
    const rentalTotal = this.f1040.scheduleE.l41()
    const farm = this.f1040.schedule1.l6() ?? 0
    const unemployment = this.f1040.schedule1.l7() ?? 0
    const otherIncome = this.f1040.schedule1.l9()
    const additions = 0
    return [
      [w2Utah, w2Total],
      [0, intTotal],
      [0, divTotal],
      [0, iraTotal],
      [0, ssTotal],
      [0, stateRefund],
      [0, alimony],
      [0, business],
      [0, capGain],
      [0, otherGains],
      [rentalUtah, rentalTotal],
      [0, farm],
      [0, unemployment],
      [0, otherIncome],
      [0, additions],
      [0, 0],
      [0, 0],
      [0, 0] // 18 total filled below
    ]
  }

  /** Line 18 total for Col A and Col B */
  line18Totals = (): [number, number] => {
    const rows = this.incomeByLine().slice(0, INCOME_CATEGORY_LINES)
    const colA = rows.reduce((s, r) => s + r[0], 0)
    const colB = rows.reduce((s, r) => s + r[1], 0)
    return [colA, colB]
  }

  /** Line 37 = total adjustments (simplified: 0 for now) */
  line37Totals = (): [number, number] => [0, 0]

  /** Line 38 = Line 18 - Line 37 */
  line38Totals = (): [number, number] => {
    const [a18, b18] = this.line18Totals()
    const [a37, b37] = this.line37Totals()
    return [Math.max(0, a18 - a37), Math.max(0, b18 - b37)]
  }

  fields = (): Field[] => {
    const arr: Field[] = Array.from(
      { length: TC40B_FIELD_COUNT },
      () => undefined
    )
    const primary = this.info.taxPayer.primaryPerson
    arr[F.taxpayerName] = `${primary.firstName} ${primary.lastName}`
    arr[F.ssid] = ssnForPdf(primary.ssid)
    arr[F.nonresidentCheckbox] = true
    arr[F.nonresidentState] = this.info.stateResidencies[0]?.state

    const incomeRows = this.incomeByLine()
    const [totalA18, totalB18] = this.line18Totals()
    incomeRows[INCOME_CATEGORY_LINES] = [totalA18, totalB18]

    INCOME_LINE_INDICES.forEach(([idxA, idxB], i) => {
      const [a, b] = incomeRows[i]
      if (a !== 0) arr[idxA] = a
      if (b !== 0) arr[idxB] = b
    })

    const [a38, b38] = this.line38Totals()
    const [a37, b37] = this.line37Totals()
    arr[F.line38ColA] = a38
    arr[F.line38ColB] = b38
    arr[F.line37ColA] = a37 || undefined
    arr[F.line37ColB] = b37 || undefined

    arr[F.ratioLine39] = this.ratio().toFixed(4)
    arr[F.line40] = this.line40()
    arr[F.line41] = this.apportionedTax()

    return arr
  }
}
