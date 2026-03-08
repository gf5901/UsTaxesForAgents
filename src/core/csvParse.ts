/**
 * Minimal CSV parser for tests (replaces ustaxes/data/csvImport for CLI-only).
 */
export function parseCsvOrThrow<A>(
  contents: string,
  parseRow: (r: string[], rowNum: number) => A[]
): A[] {
  const lines = contents.split(/\r?\n/).filter((line) => line.trim() !== '')
  const data: string[][] = lines.map((line) => {
    const row: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        inQuotes = !inQuotes
      } else if ((c === ',' && !inQuotes) || (c === '\n' && !inQuotes)) {
        row.push(current.trim())
        current = ''
      } else {
        current += c
      }
    }
    row.push(current.trim())
    return row
  })
  return data.flatMap((row, i) => parseRow(row, i))
}
