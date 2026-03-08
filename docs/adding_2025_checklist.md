# Checklist: Add 2025 (Y2025) Tax Year Support

Based on the project's [adding_year.md](adding_year.md), a full codebase audit, and the
current state of the repo. Every step lists the file, exact change, and why.

---

## Phase 1: Core data and state (must do first)

| #   | File                     | Change                                                                      | Why                                                                                                                                                             |
| --- | ------------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `src/core/data/index.ts` | Add `Y2025 = 2025` to the `TaxYears` enum.                                  | Defines the year as a valid `TaxYear`. All components that iterate `enumKeys(TaxYears)` (dropdowns, status bar, propagator, patterns) pick it up automatically. |
| 2   | `src/redux/data.ts`      | Add `Y2025: blankState` to `blankYearTaxesState`.                           | Initializes empty state for 2025.                                                                                                                               |
| 3   | `src/redux/reducer.ts`   | Add `Y2025: guardByYear('Y2025')` inside `rootReducer`'s `combineReducers`. | Registers the reducer slice for 2025 data.                                                                                                                      |
| 4   | `src/redux/reducer.ts`   | Change `DEFAULT_TAX_YEAR` from `'Y2024'` to `'Y2025'`.                      | Makes 2025 the default year for new users. (Keep `'Y2024'` if you want 2024 to remain the default until 2025 forms are fully ready.)                            |

---

## Phase 2: Copy and configure form logic

| #   | Action                                       | Detail                                                                                                        |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 5   | Copy `src/forms/Y2024/` → `src/forms/Y2025/` | Copies all form logic, tests, and data for the new year.                                                      |
| 6   | `src/forms/Y2025/data/federal.ts`            | Set `CURRENT_YEAR = 2025`.                                                                                    |
| 7   | `src/forms/Y2025/data/federal.ts`            | Update **standard deduction** amounts to 2025 values (from IRS Rev. Proc. for 2025).                          |
| 8   | `src/forms/Y2025/data/federal.ts`            | Update **ordinary income tax brackets** to 2025 values.                                                       |
| 9   | `src/forms/Y2025/data/federal.ts`            | Update **long-term capital gains brackets** to 2025 values.                                                   |
| 10  | `src/forms/Y2025/data/federal.ts`            | Update FICA limits: SS wage base ($176,100 for 2025), rates if changed. Check the `fica` export.              |
| 11  | `src/forms/Y2025/data/federal.ts`            | Update any other year-specific constants (e.g. child tax credit phaseouts, EIC thresholds) if they live here. |

---

## Phase 3: Wire Y2025 into the app

### 3a. YearForms.ts (form creation and PDF generation)

| #   | File                     | Change                                                                                                                                                                                                                                                                     |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12  | `src/forms/YearForms.ts` | Add imports at top: `import { create1040 as create1040For2025 } from 'ustaxes/forms/Y2025/irsForms/Main'`, `import F1040For2025 from 'ustaxes/forms/Y2025/irsForms/F1040'`, `import { createStateReturn as createStateReturn2025 } from 'ustaxes/forms/Y2025/stateForms'`. |
| 13  | `src/forms/YearForms.ts` | In the `configs` object, add a `Y2025` entry following the same pattern as `Y2024`: `Y2025: { ...baseConfig, createF1040: takeSecond(create1040For2025), createStateReturn: (f: Form) => createStateReturn2025(f as F1040For2025) }`.                                      |

### 3b. SummaryData.ts (summary / review page)

| #   | File                            | Change                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | `src/components/SummaryData.ts` | The `createSummary` switch only handles Y2019–Y2021. Add cases for `'Y2022'` through `'Y2025'`. Import `F1040For2025` (and 2022–2024 if needed) and create a `SummaryCreatorFor2025` that reads credits, worksheets, refund/owed from the 2025 F1040 (same shape as the 2021 creator). Without this, the "Review and Print" summary page returns `undefined` for 2022–2025. |

### 3c. Anonymize (debug / data sharing)

| #   | File                         | Change                                                                                                                                                                  |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15  | `src/core/data/anonymize.ts` | The default export only anonymizes Y2019–Y2021. Add `Y2022` through `Y2025`: `Y2022: anonymizeInformation(input.Y2022), ..., Y2025: anonymizeInformation(input.Y2025)`. |

---

## Phase 4: IRS PDF forms

The app loads PDFs at runtime from `/forms/${year}/irs/<tag>.pdf`.

| #   | Action                                         | Detail                                                                                                                                                          |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16  | `scripts/downloadCatalogs.ts`                  | Change `const taxYear = 'Y2024'` → `'Y2025'`.                                                                                                                   |
| 17  | `public/catalogs.json`                         | Verify/update the `latest.irs` URLs to point to 2025 form PDFs from the IRS. (The IRS typically publishes updated forms at `https://www.irs.gov/pub/irs-pdf/`.) |
| 18  | Run: `npx ts-node scripts/downloadCatalogs.ts` | Downloads 2025 IRS PDFs into `public/forms/Y2025/irs/`.                                                                                                         |
| 19  | **State PDFs** (if needed)                     | For any state forms you want for 2025, add the PDFs to `public/forms/Y2025/states/<STATE>/`.                                                                    |

**Important:** If the IRS changed the **field layout** of a PDF form for 2025 (added/removed/reordered fields), the corresponding `fields()` method in `src/forms/Y2025/irsForms/<form>.ts` must be updated to match. Compare the new PDF fields (use `npm run formgen`) against the old one.

---

## Phase 5: Tests

| #   | File                                     | Change                                                                                                                                                                   |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 20  | `src/tests/arbitraries.ts`               | In the `taxesState` arbitrary, add one more `information` to the `fc.tuple(...)` call (7 → 8 items), destructure as `Y2025`, and include `Y2025` in the returned object. |
| 21  | `src/forms/Y2025/tests/index.ts`         | Already created by the copy in step 5. Update the import path if it still references `Y2024`. Confirm it imports from `../irsForms/Main` and `../data/federal`.          |
| 22  | `src/forms/Y2025/tests/taxRates.test.ts` | Update the CSV path to `./src/forms/Y2025/tests/taxTable.csv`. Create or copy the 2025 tax table CSV if needed.                                                          |
| 23  | Run `npm test`                           | Fix any TypeScript or test failures.                                                                                                                                     |

---

## Phase 6: Optional / nice-to-have

| #   | File                      | Change                                                                                                               | Notes                                                 |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 24  | `src/data/urls.ts`        | Add `Y2025: { ... }` if 2025 has year-specific URLs (e.g. new credits like the 2021 advance CTC).                    | Only if there are 2025-specific pages.                |
| 25  | `src/components/Menu.tsx` | Add a `Y2025` entry to `yearSpecificPages` if 2025 has year-specific menu items.                                     | Only if there are 2025-specific pages.                |
| 26  | `src/redux/store.ts`      | Bump `persistConfig.version` and add a migration if the shape of persisted state changed (e.g. new required fields). | Only if the `Information` interface changed for 2025. |

---

## Phase 7: Form logic review

Many forms stay identical year to year. For forms that change:

1. Download the **2025 IRS instructions** for each schedule/form.
2. Compare against the `src/forms/Y2025/irsForms/<form>.ts` logic (which is a copy of 2024).
3. Update line numbers, thresholds, phase-outs, or new worksheets as needed.
4. Key forms to check: **F1040**, **Schedule 1**, **Schedule 2**, **Schedule 3**, **Schedule D**, **Schedule E**, **Schedule 8812**, **Form 8959**, **Form 8960**.

---

## Phase 8: Update your import data

Once Y2025 exists in the app:

1. In `my-files/parsed-import.json`: move the contents of `Y2024` into a new `Y2025` key. Reset `Y2024` to blank state. Set `"activeYear": "Y2025"`.
2. Load the updated file in UsTaxes with the year selector on **2025**.

---

## Quick reference: files that need changes

```
src/core/data/index.ts          ← TaxYears enum
src/redux/data.ts               ← blankYearTaxesState
src/redux/reducer.ts            ← DEFAULT_TAX_YEAR, rootReducer
src/forms/Y2025/                ← copy of Y2024 (entire folder)
src/forms/Y2025/data/federal.ts ← year constants, brackets, deductions
src/forms/YearForms.ts          ← imports + configs
src/components/SummaryData.ts   ← createSummary switch cases
src/core/data/anonymize.ts      ← default export (Y2022–Y2025)
scripts/downloadCatalogs.ts     ← taxYear constant
public/catalogs.json            ← IRS PDF URLs
src/tests/arbitraries.ts        ← taxesState arbitrary
src/forms/Y2025/tests/          ← test paths and imports
```

## Files that do NOT need changes (auto-adapt via TaxYears enum)

```
src/components/YearDropDown.tsx
src/components/YearStatusBar.tsx
src/components/DataPropagator.tsx
src/components/Patterns.ts
src/components/Main.tsx
src/components/CreatePDF.tsx
src/components/Summary.tsx
src/components/debug.tsx
src/components/income/*.tsx
src/components/payments/*.tsx
src/components/savingsAccounts/*.tsx
src/redux/actions.ts
src/redux/store.ts (types)
src/redux/migration.ts
src/redux/yearDispatch.ts
```
