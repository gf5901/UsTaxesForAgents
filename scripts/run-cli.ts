#!/usr/bin/env node
/**
 * CLI to generate federal (and optionally state) PDFs from an import JSON file
 * without running the web app.
 *
 * Usage:
 *   npx ts-node scripts/run-cli.ts [options] [input.json]
 *
 * Options:
 *   --output, -o DIR   Write PDFs to DIR (default: my-files/output)
 *   --year, -y YYYY    Tax year (default: from input file activeYear)
 *   --federal-only     Only generate federal 1040 PDF
 *
 * Example:
 *   npx ts-node scripts/run-cli.ts my-files/parsed-import.json -o my-files/output
 */

import fs from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import type { PDFDownloader } from 'ustaxes/core/pdfFiller/pdfHandler'
import { TaxYear, TaxYears, Information, Asset } from 'ustaxes/core/data'
import { yearFormBuilder } from 'ustaxes/forms/YearForms'
import { runAsync } from 'ustaxes/core/util'

const projectRoot = path.join(__dirname, '..')
const defaultInput = path.join(projectRoot, 'my-files', 'parsed-import.json')
const defaultOutput = path.join(projectRoot, 'my-files', 'output')

function createFsDownloader(year: TaxYear): PDFDownloader {
  const formsDir = path.join(projectRoot, 'public', 'forms', year)
  return async (url: string): Promise<PDFDocument> => {
    const filePath = path.join(formsDir, url)
    if (!fs.existsSync(filePath)) {
      throw new Error(
        `PDF not found: ${filePath}. Run: npx ts-node scripts/downloadCatalogs.ts`
      )
    }
    const bytes = fs.readFileSync(filePath)
    return await PDFDocument.load(bytes as ArrayBuffer)
  }
}

function parseArgs(): {
  input: string
  output: string
  year?: TaxYear
  federalOnly: boolean
} {
  const args = process.argv.slice(2)
  let input = defaultInput
  let output = defaultOutput
  let year: TaxYear | undefined
  let federalOnly = false

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
      case '-o':
        output = args[++i] ?? output
        break
      case '--year':
      case '-y':
        const y = args[++i]
        if (y) {
          const key = `Y${y}` as TaxYear
          if (key in TaxYears) year = key
          else throw new Error(`Unsupported year: ${y}. Use 2019-2025.`)
        }
        break
      case '--federal-only':
        federalOnly = true
        break
      case '--help':
      case '-h':
        console.log(`
Usage: npx ts-node scripts/run-cli.ts [options] [input.json]

Options:
  --output, -o DIR   Write PDFs to DIR (default: my-files/output)
  --year, -y YYYY    Tax year (default: from input file activeYear)
  --federal-only     Only generate federal 1040 PDF

Example:
  npx ts-node scripts/run-cli.ts my-files/parsed-import.json -o my-files/output
`)
        process.exit(0)
      default:
        if (!args[i].startsWith('-')) input = path.resolve(args[i])
    }
  }

  return { input, output, year, federalOnly }
}

interface LoadedState {
  activeYear: TaxYear
  assets: Asset<string>[]
  [key: string]: unknown
}

function loadState(inputPath: string): LoadedState {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file not found: ${inputPath}`)
  }
  const raw = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as Record<
    string,
    unknown
  >
  const activeYear = raw.activeYear as TaxYear | undefined
  if (!activeYear || !raw[activeYear]) {
    throw new Error('Invalid import file: missing activeYear or year data.')
  }
  const assets = Array.isArray(raw.assets)
    ? (raw.assets as Asset<string>[])
    : []
  return { ...raw, activeYear, assets }
}

function stringToDateInfo<I extends Information<string>>(
  info: I
): Information<Date> {
  const stringToDatePerson = <P extends { dateOfBirth: string }>(p: P) => ({
    ...p,
    dateOfBirth: new Date(p.dateOfBirth)
  })
  return {
    ...info,
    healthSavingsAccounts: info.healthSavingsAccounts.map((h) => ({
      ...h,
      startDate: new Date(h.startDate),
      endDate: new Date(h.endDate)
    })),
    taxPayer: {
      ...info.taxPayer,
      primaryPerson: info.taxPayer.primaryPerson
        ? stringToDatePerson(info.taxPayer.primaryPerson)
        : undefined,
      dependents: info.taxPayer.dependents.map((d) => stringToDatePerson(d)),
      spouse: info.taxPayer.spouse
        ? stringToDatePerson(info.taxPayer.spouse)
        : undefined
    }
  }
}

function assetsToDate(assets: Asset<string>[]): Asset<Date>[] {
  return assets.map((a) => ({
    ...a,
    openDate: new Date(a.openDate),
    closeDate: a.closeDate ? new Date(a.closeDate) : undefined,
    giftedDate: a.giftedDate ? new Date(a.giftedDate) : undefined
  }))
}

async function main(): Promise<void> {
  const { input, output, year: yearArg, federalOnly } = parseArgs()
  const state = loadState(input)
  const year: TaxYear = yearArg !== undefined ? yearArg : state.activeYear
  const infoRaw = state[year] as Information<string>
  const info: Information<Date> = stringToDateInfo(infoRaw)
  const assets: Asset<Date>[] = assetsToDate(state.assets)

  const downloader = createFsDownloader(year)
  const builder = yearFormBuilder(year)
    .setDownloader(downloader)
    .build(info, assets)

  const errors = builder.errors()
  if (errors.length > 0) {
    console.error('Validation errors:')
    errors.forEach((e) => console.error('  -', e))
    process.exit(1)
  }

  if (!fs.existsSync(output)) {
    fs.mkdirSync(output, { recursive: true })
  }

  const lastName = info.taxPayer.primaryPerson?.lastName ?? 'Tax'
  const federalFileName = `${lastName}-1040.pdf`
  const federalPath = path.join(output, federalFileName)

  const federalResult = await runAsync(builder.f1040Bytes())
  federalResult.fold(
    (errs: string[]) => {
      console.error('Federal PDF errors:', errs)
      process.exit(1)
    },
    (bytes: Uint8Array) => {
      fs.writeFileSync(federalPath, Buffer.from(bytes))
      console.log('Wrote', federalPath)
    }
  )

  if (!federalOnly) {
    const stateResult = await runAsync(builder.stateReturnBytesByState())
    stateResult.fold(
      (errs: string[]) => {
        if (errs.length > 0) console.warn('State return skipped:', errs)
      },
      (perState: { state: string; bytes: Uint8Array }[]) => {
        for (const { state, bytes } of perState) {
          const statePath = path.join(output, `${lastName}-${state}.pdf`)
          fs.writeFileSync(statePath, Buffer.from(bytes))
          console.log('Wrote', statePath)
        }
      }
    )
  }

  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
