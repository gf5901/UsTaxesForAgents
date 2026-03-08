#!/usr/bin/env node
/**
 * Dump form field names and values from a filled PDF (for verification).
 * Usage: npx ts-node scripts/dump-pdf-fields.ts <path-to.pdf>
 */

import { readFile } from 'fs/promises'
import { PDFDocument, PDFTextField, PDFCheckBox } from 'pdf-lib'

async function main(): Promise<void> {
  const path = process.argv[2]
  if (!path) {
    console.error('Usage: npx ts-node scripts/dump-pdf-fields.ts <path-to.pdf>')
    process.exit(1)
  }
  const bytes = await readFile(path)
  const doc = await PDFDocument.load(bytes)
  const form = doc.getForm()
  const fields = form.getFields()
  console.log(`\n${path} — ${fields.length} form fields\n`)
  fields.forEach((field, index) => {
    let value: string
    try {
      if (field instanceof PDFTextField) {
        value = field.getText() ?? '(empty)'
      } else if (field instanceof PDFCheckBox) {
        value = field.isChecked() ? 'checked' : 'unchecked'
      } else {
        value = '(unknown type)'
      }
    } catch (e) {
      value = `(error: ${(e as Error).message})`
    }
    const name = field.getName()
    if (value !== '(empty)' && value !== 'unchecked') {
      console.log(`  [${index}] ${name} = ${value}`)
    }
  })
  console.log('')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
