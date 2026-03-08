/**
 * Worksheet types used by form logic (e.g. SDQualifiedAndCapGains).
 * Moved from components/SummaryData for CLI-only use.
 */
export interface WorksheetLine {
  line: number | string
  value: string | number | undefined
}

export interface WorksheetData {
  name: string
  lines: WorksheetLine[]
}
