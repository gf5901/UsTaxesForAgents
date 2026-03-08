---
name: generate-tax-forms
description: Generate federal and state tax PDFs from user-provided documents. Use when the user provides W-2s, 1099s, property docs, or asks to file taxes, generate tax forms, or update their tax JSON.
---

# Generate tax forms from documents

## Workflow

1. **Collect documents** — Ask the user to place tax documents (W-2, 1099, property statements, HOA receipts) in `my-files/`
2. **Parse documents** — Read each document and extract relevant numbers
3. **Build or update JSON** — Write/update `my-files/parsed-import.json` following the format in `.cursor/rules/json-import.mdc`
4. **Generate PDFs** — Run the CLI:
   ```sh
   npm run cli -- my-files/parsed-import.json -o my-files/output
   ```
5. **Verify output** — Dump filled fields to check correctness:
   ```sh
   npx ts-node scripts/dump-pdf-fields.ts my-files/output/LastName-1040.pdf
   npx ts-node scripts/dump-pdf-fields.ts my-files/output/LastName-ST.pdf
   ```

## Key data mappings

| Document           | JSON field                                                                |
| ------------------ | ------------------------------------------------------------------------- |
| W-2                | `w2s[]` — income, withholding, employer, state wages                      |
| 1099-INT           | `f1099s[]` with `type: "INT"`, `form: { income }`                         |
| 1099-DIV           | `f1099s[]` with `type: "DIV"`, `form: { dividends, qualifiedDividends }`  |
| 1099-B             | `f1099s[]` with `type: "B"` or use `assets[]` for individual transactions |
| 1099-MISC          | `f1099s[]` with `type: "MISC"`                                            |
| Rental property    | `realEstate[]` — address, rentReceived, expenses breakdown                |
| Property tax bill  | `realEstate[].expenses.taxes`                                             |
| HOA statements     | `realEstate[].expenses.other` (or management, as appropriate)             |
| Mortgage statement | `realEstate[].expenses.mortgage`                                          |

## Rental expense categories

Map property expenses to these keys: `advertising`, `auto`, `cleaning`, `commissions`, `insurance`, `legal`, `management`, `mortgage`, `otherInterest`, `repairs`, `supplies`, `taxes`, `utilities`, `depreciation`, `other`.

Use `otherExpenseType` (string) to describe what `other` contains.

## State filing

- Set `stateResidencies` to the user's home state (e.g. `[{ "state": "WA" }]`)
- Rental properties in other states auto-trigger nonresident returns if the state is supported
- Currently supported states with forms: UT (Utah), IL (Illinois)
- Non-filing states (no income tax): AK, FL, NV, NH, SD, TN, TX, WA, WY

## Common issues

- If the build fails, run `npm run build` to see ESLint errors (CI treats warnings as errors)
- If PDF fields show wrong values, use `dump-pdf-fields.ts` to inspect
- SSN format: `"123-45-6789"` (string with dashes)
- Filing status: `"S"` (single), `"MFJ"`, `"MFS"`, `"HOH"`, `"W"`
- Dates in JSON are ISO strings: `"1980-01-01T00:00:00.000Z"`
