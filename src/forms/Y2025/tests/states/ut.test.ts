import { create1040 } from '../../irsForms/Main'
import { createStateReturn } from '../../stateForms'
import { StateFormError } from 'ustaxes/forms/StateForms'
import { isLeft, isRight } from 'ustaxes/core/util'
import { FilingStatus, PersonRole, Information, State } from 'ustaxes/core/data'
import TC40 from '../../stateForms/UT/TC40'

const WA: State = 'WA'
const UT: State = 'UT'

const minimalPrimaryPerson = {
  firstName: 'Test',
  lastName: 'User',
  ssid: '123-45-6789',
  role: PersonRole.PRIMARY,
  isBlind: false,
  dateOfBirth: new Date('1980-01-01'),
  address: {
    address: '100 Test Ave',
    city: 'Seattle',
    state: WA,
    zip: '98101'
  },
  isTaxpayerDependent: false
}

const baseInfo: Information = {
  f1099s: [],
  w2s: [],
  estimatedTaxes: [],
  realEstate: [],
  taxPayer: {
    filingStatus: FilingStatus.S,
    dependents: [],
    primaryPerson: minimalPrimaryPerson
  },
  questions: {},
  f1098es: [],
  f3921s: [],
  scheduleK1Form1065s: [],
  itemizedDeductions: undefined,
  stateResidencies: [{ state: WA }],
  healthSavingsAccounts: [],
  credits: [],
  individualRetirementArrangements: []
}

const utRentalProperty = {
  address: {
    address: '456 Example Rd',
    aptNo: '101',
    city: 'Salt Lake City',
    state: UT,
    zip: '84101'
  },
  rentalDays: 365,
  personalUseDays: 0,
  rentReceived: 10000,
  propertyType: 'singleFamily' as const,
  qualifiedJointVenture: false,
  expenses: { taxes: 500, management: 200 }
}

describe('Y2025 Utah state return', () => {
  it('returns UT forms when WA resident has UT rental property', () => {
    const info: Information = { ...baseInfo, realEstate: [utRentalProperty] }

    const f1040Result = create1040(info, [])
    expect(isRight(f1040Result)).toBe(true)
    if (isLeft(f1040Result)) return

    const [f1040] = f1040Result.right
    expect(f1040).toBeDefined()

    const stateReturn = createStateReturn(f1040)
    expect(isRight(stateReturn)).toBe(true)
    if (isLeft(stateReturn)) return

    const stateForms = stateReturn.right
    expect(stateForms.length).toBeGreaterThanOrEqual(1)
    const utForms = stateForms.filter((f) => f.state === 'UT')
    expect(utForms.length).toBeGreaterThanOrEqual(1)
    expect(utForms.some((f) => f.formName === 'TC-40')).toBe(true)
    expect(utForms.some((f) => f.formName === 'TC-40B')).toBe(true)
  })

  it('TC40 is nonresident and attaches TC-40B when residency is not UT', () => {
    const smallRental = {
      ...utRentalProperty,
      rentReceived: 5000,
      expenses: { taxes: 500 }
    }
    const info: Information = { ...baseInfo, realEstate: [smallRental] }

    const f1040Result = create1040(info, [])
    if (isLeft(f1040Result)) return
    const [f1040] = f1040Result.right

    const tc40 = new TC40(f1040)
    expect(tc40.isNonresident()).toBe(true)
    const attachments = tc40.attachments()
    expect(attachments.some((f) => f.formName === 'TC-40B')).toBe(true)
    expect(tc40.tc40b.utahSourceIncome()).toBe(4500)
  })

  it('returns no state forms when WA resident has no UT property', () => {
    const info: Information = { ...baseInfo }

    const f1040Result = create1040(info, [])
    if (isLeft(f1040Result)) return
    const [f1040] = f1040Result.right

    const stateReturn = createStateReturn(f1040)
    expect(isLeft(stateReturn)).toBe(true)
    if (isRight(stateReturn)) return
    expect(stateReturn.left).toContain(StateFormError.NoFilingRequirement)
  })
})
