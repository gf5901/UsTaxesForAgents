---
name: parse-tax-forms-for-ustaxes
description: Parses uploaded tax documents (W-2, 1099 PDFs or images) and generates UsTaxes import JSON. Use when the user provides tax forms to parse, wants UsTaxes import JSON, or mentions loading W-2/1099 data into UsTaxes.
---

# Parse tax forms for UsTaxes import

## When to use

User has put tax documents (e.g. W-2, 1099) in the repo (e.g. `my-files/`) and wants import-ready JSON for UsTaxes, or asks to "parse my tax forms" / "generate UsTaxes forms from my documents."

## Workflow

1. **Locate documents**  
   User provides paths or @-references (e.g. `my-files/*.pdf`). Read PDFs or images (JPEG, PNG, GIF, WebP). If only PDFs exist, read them; the tool can often extract text from PDFs.

2. **Map to UsTaxes types**
   - **W-2:** Map to `IncomeW2` in `src/core/data/index.ts`: Box 1→`income`, 2→`fedWithholding`, 3→`ssWages`, 4→`ssWithholding`, 5→`medicareIncome`, 6→`medicareWithholding`, 12→`box12` (e.g. D, DD), state wages/withholding if present. Use `personRole`: `"PRIMARY"` or `"SPOUSE"`. `occupation` can be `""`.
   - **1099-INT/DIV/B/R/SSA:** Map to the corresponding `Supported1099` shape (`payer`, `type`, `form` with the right data object, `personRole`).
   - **1099-MISC:** Not supported by UsTaxes. Extract amounts (e.g. Box 1 Rents) and tell the user to enter them manually (e.g. Schedule E or Other income). Do not add to `f1099s`.

3. **Build full state JSON**
   - Structure: `assets: []`, `Y2019`…`Y2024` (each an `Information` object), `activeYear: "Y2024"`.
   - Use `blankState` from `src/redux/reducer.ts` for years with no data.
   - Put parsed W-2s and 1099s in the appropriate year (e.g. `Y2024`).
   - Include minimal `taxPayer` for that year: `primaryPerson` (name, address, SSN, `dateOfBirth` as ISO string placeholder if unknown), `dependents: []`, and `stateResidencies` if state is known.
   - Any key whose name contains `date` or `Date` must be an ISO date string in JSON.
   - Use `null` for `itemizedDeductions`; do not use `undefined` in JSON.

4. **Write output**
   - Save as a single JSON file (e.g. `my-files/parsed-import.json`).
   - Optionally add a short README (e.g. `my-files/IMPORT-README.txt`) with: what was included, what was skipped (e.g. 1099-MISC), and how to load in UsTaxes (User Settings → Load).

5. **Tell the user**
   - Path to the JSON file and that they should load it via **User Settings → Load** in the web or desktop app.
   - Remind them to confirm/edit date of birth and to enter any unsupported form data (e.g. 1099-MISC) manually.

## Reference

- Data types: `src/core/data/index.ts` (`IncomeW2`, `Supported1099`, `State`, `Information`).
- Blank state: `src/redux/reducer.ts` (`blankState`).
- Serialization: dates in JSON are ISO strings; see `src/redux/store.ts` (`serializeTransform`).
