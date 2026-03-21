import F1040Attachment from './F1040Attachment'
import { Field } from 'ustaxes/core/pdfFiller'
import { FormTag } from 'ustaxes/core/irsForms/Form'
import { sumFields } from 'ustaxes/core/irsForms/util'
import { ScheduleCBusiness } from 'ustaxes/core/data'

export default class ScheduleC extends F1040Attachment {
  tag: FormTag = 'f1040sc'
  sequenceIndex = 9

  business: ScheduleCBusiness

  constructor(f1040: F1040Attachment['f1040'], business: ScheduleCBusiness) {
    super(f1040)
    this.business = business
  }

  isNeeded = (): boolean => true

  l1 = (): number => this.business.grossReceipts
  l2 = (): number => 0
  l3 = (): number => this.l1() - this.l2()
  l4 = (): number => this.business.costOfGoodsSold ?? 0
  l5 = (): number => this.l3() - this.l4()
  l6 = (): number => this.business.otherIncome ?? 0
  l7 = (): number => this.l5() + this.l6()

  expenseField = (
    key: keyof Omit<
      NonNullable<ScheduleCBusiness['expenses']>,
      'otherExpenseType'
    >
  ): number | undefined => this.business.expenses?.[key]

  l8 = (): number | undefined => this.expenseField('advertising')
  l9 = (): number | undefined => this.expenseField('carAndTruck')
  l10 = (): number | undefined => this.expenseField('commissions')
  l11 = (): number | undefined => this.expenseField('contractLabor')
  l12 = (): number | undefined => this.expenseField('depletion')
  l13 = (): number | undefined => this.expenseField('depreciation')
  l14 = (): number | undefined => this.expenseField('employeeBenefits')
  l15 = (): number | undefined => this.expenseField('insurance')
  l16a = (): number | undefined => this.expenseField('mortgageInterest')
  l16b = (): number | undefined => this.expenseField('otherInterest')
  l17 = (): number | undefined => this.expenseField('legal')
  l18 = (): number | undefined => this.expenseField('office')
  l19 = (): number | undefined => this.expenseField('pension')
  l20a = (): number | undefined => this.expenseField('rentVehicles')
  l20b = (): number | undefined => this.expenseField('rentOther')
  l21 = (): number | undefined => this.expenseField('repairs')
  l22 = (): number | undefined => this.expenseField('supplies')
  l23 = (): number | undefined => this.expenseField('taxesAndLicenses')
  l24a = (): number | undefined => this.expenseField('travel')
  l24b = (): number | undefined => this.expenseField('meals')
  l25 = (): number | undefined => this.expenseField('utilities')
  l26 = (): number | undefined => this.expenseField('wages')
  l27a = (): number | undefined => this.expenseField('otherExpenses')

  l28 = (): number =>
    sumFields([
      this.l8(),
      this.l9(),
      this.l10(),
      this.l11(),
      this.l12(),
      this.l13(),
      this.l14(),
      this.l15(),
      this.l16a(),
      this.l16b(),
      this.l17(),
      this.l18(),
      this.l19(),
      this.l20a(),
      this.l20b(),
      this.l21(),
      this.l22(),
      this.l23(),
      this.l24a(),
      this.l24b(),
      this.l25(),
      this.l26(),
      this.l27a()
    ])

  l29 = (): number => this.l7() - this.l28()
  l30 = (): number => 0

  l31 = (): number => this.l29() - this.l30()

  fields = (): Field[] => {
    const exp = this.business.expenses
    return [
      this.f1040.namesString(), // 0: Name
      this.f1040.info.taxPayer.primaryPerson.ssid, // 1: SSN
      this.business.businessActivity ?? '', // 2: Line A
      this.business.businessCode ?? '', // 3: Line B
      this.business.businessName, // 4: Line C
      undefined, // 5: Line D - EIN
      undefined, // 6: Line E - address
      undefined, // 7: Line E - city/state/zip
      true, // 8: Cash accounting
      false, // 9: Accrual
      false, // 10: Other
      undefined, // 11: Other specify
      true, // 12: Materially participated - Yes
      false, // 13: Materially participated - No
      false, // 14: Started this year
      false, // 15: Made 1099 payments - Yes
      false, // 16: Made 1099 payments - No
      false, // 17: Filed 1099s - Yes
      false, // 18: Filed 1099s - No
      false, // 19: Statutory employee
      this.l1(), // 20: Line 1
      this.l2() || undefined, // 21: Line 2
      this.l3(), // 22: Line 3
      this.l4() || undefined, // 23: Line 4
      this.l5(), // 24: Line 5
      this.l6() || undefined, // 25: Line 6
      this.l7(), // 26: Line 7
      this.l8(), // 27: Line 8
      this.l9(), // 28: Line 9
      this.l10(), // 29: Line 10
      this.l11(), // 30: Line 11
      this.l12(), // 31: Line 12
      this.l13(), // 32: Line 13
      this.l14(), // 33: Line 14
      this.l15(), // 34: Line 15
      this.l16a(), // 35: Line 16a
      this.l16b(), // 36: Line 16b
      this.l17(), // 37: Line 17
      this.l18(), // 38: Line 18
      this.l19(), // 39: Line 19
      this.l20a(), // 40: Line 20a
      this.l20b(), // 41: Line 20b
      this.l21(), // 42: Line 21
      this.l22(), // 43: Line 22
      this.l23(), // 44: Line 23
      this.l24a(), // 45: Line 24a
      this.l24b(), // 46: Line 24b
      this.l25(), // 47: Line 25
      this.l26(), // 48: Line 26
      this.l27a(), // 49: Line 27a
      undefined, // 50: Line 27b (reserved)
      this.l28(), // 51: Line 28
      this.l29(), // 52: Line 29
      this.l30() || undefined, // 53: Line 30
      true, // 54: Line 31 - All investment at risk
      false, // 55: Line 31 - Some not at risk
      this.l31(), // 56: Line 31 amount
      // Part III - Cost of Goods Sold (lines 33-42): 21 fields
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      // Part IV - Vehicle info checkboxes: 8 fields
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      // Part V - Other Expenses table: 9 rows × 2 fields + total = 19 fields
      exp?.otherExpenseType ?? undefined,
      exp?.otherExpenses ?? undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      exp?.otherExpenses ?? undefined
    ]
  }
}
