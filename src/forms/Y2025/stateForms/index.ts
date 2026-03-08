import F1040 from '../irsForms/F1040'
import { State } from 'ustaxes/core/data'
import StateForm from 'ustaxes/core/stateForms/Form'
import { Either, left, right } from 'ustaxes/core/util'
import { StateFormError } from '../../StateForms'
import ut40 from './UT'

export const noFilingRequirementStates: State[] = [
  'AK',
  'TN',
  'WY',
  'FL',
  'NH',
  'SD',
  'TX',
  'WA',
  'NV'
]

export const stateForms: {
  [K in State]?: (f1040: F1040) => StateForm
} = {
  UT: ut40
}

/**
 * States for which we have income (e.g. rental property) and a form implementation.
 * Excludes residency state and states not in stateForms.
 */
function incomeStates(f1040: F1040, residencyState: State): State[] {
  const fromRealEstate = f1040.info.realEstate
    .map((p) => p.address.state)
    .filter((s): s is State => typeof s === 'string' && s.length === 2)
  const unique = Array.from(new Set(fromRealEstate))
  const result: State[] = []
  for (const s of unique) {
    if (s !== residencyState && stateForms[s] !== undefined) {
      result.push(s)
    }
  }
  return result
}

export const createStateReturn = (
  f1040: F1040
): Either<StateFormError[], StateForm[]> => {
  if (f1040.info.stateResidencies.length < 1) {
    return left([StateFormError.NoResidency])
  }

  const residencyState = f1040.info.stateResidencies[0].state
  const allForms: StateForm[] = []

  // Residency state: include if it has a filing requirement and we have a form
  if (!noFilingRequirementStates.includes(residencyState)) {
    const form = stateForms[residencyState]?.(f1040)
    if (form !== undefined) {
      const stateFormsList = [form, ...form.attachments()].sort(
        (a, b) => a.formOrder - b.formOrder
      )
      allForms.push(...stateFormsList)
    }
  }

  // Income states (e.g. UT rental when resident is WA)
  const income = incomeStates(f1040, residencyState)
  for (const state of income) {
    const form = stateForms[state]?.(f1040)
    if (form !== undefined) {
      const stateFormsList = [form, ...form.attachments()].sort(
        (a, b) => a.formOrder - b.formOrder
      )
      allForms.push(...stateFormsList)
    }
  }

  if (allForms.length === 0) {
    if (noFilingRequirementStates.includes(residencyState)) {
      return left([StateFormError.NoFilingRequirement])
    }
    return left([StateFormError.StateFormsNotAvailable])
  }

  return right(allForms)
}
