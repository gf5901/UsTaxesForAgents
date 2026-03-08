import { PDFDocument, PDFCheckBox, PDFTextField, PDFName } from 'pdf-lib'
import { Field } from '.'
import { displayRound } from '../irsForms/util'
import _ from 'lodash'

/**
 * Attempt to fill fields in a PDF from a Form,
 * checking one by one that each pdf field and Form value
 * Make sense by type (checkbox => boolean, textField => string / number)
 * Side-effecting! Modifies the pdf document.
 */
export function fillPDF(
  pdf: PDFDocument,
  fieldValues: Field[],
  formName: string
): PDFDocument {
  const formFields = pdf.getForm().getFields()

  formFields.forEach((pdfField, index) => {
    const value: Field = fieldValues[index]

    const error = (expected: string): Error => {
      return new Error(
        `${formName} Field ${index}, ${pdfField.getName()} expected ${expected}`
      )
    }
    // First handle radio groups. If the value for this field
    // is a RadioSelect object, then assume the pdfField
    // has children, and check the correct box given the index value.
    // Idea taken from this comment:
    // https://github.com/Hopding/pdf-lib/issues/780#issuecomment-771453157
    // Note, this is for cases such as the 2021 IL-1040 where the field
    // behaves as a radio group, but the pdfField is a PDFCheckbox
    // instead of a PDFRadioGroup.
    if (
      _.isObject(value) &&
      'select' in value &&
      typeof (value as { select: number }).select === 'number'
    ) {
      const children = pdfField.acroField.getWidgets()
      if (value.select >= children.length) {
        throw new Error(
          `Error in field ${index}, expected to select child at index ${value.select} but this node has only ${children.length} children.`
        )
      }
      const setValue = children[value.select].getOnValue()
      if (setValue !== undefined) {
        pdfField.acroField.dict.set(PDFName.of('V'), setValue)
        children[value.select].setAppearanceState(setValue)
      } else {
        console.error(children)
        throw new Error(
          `Error handling RadioGroup, could not set index ${value.select}`
        )
      }
    } else if (pdfField instanceof PDFCheckBox) {
      // Coerce non-boolean to boolean so PDFs with different field order (e.g. 2025) still fill
      const checked = value === true
      if (value !== true && value !== false && value !== undefined) {
        // Leave unchecked when form sent number/string for a checkbox (field order mismatch)
      }
      if (checked) {
        pdfField.check()
      }
    } else if (pdfField instanceof PDFTextField) {
      try {
        // Coerce value for text field: boolean/undefined/object -> empty string when PDF field order differs
        const raw =
          typeof value === 'number' || typeof value === 'string'
            ? value
            : undefined
        // Never write NaN into a text field (can happen if field order mismatches or bad data)
        const safeRaw =
          raw !== undefined && typeof raw === 'number' && Number.isNaN(raw)
            ? undefined
            : raw
        let text: string
        const isNumber = typeof safeRaw === 'number' && !Number.isNaN(safeRaw)
        if (safeRaw !== undefined && isNumber) {
          const rounded = displayRound(safeRaw)
          text =
            rounded !== undefined && rounded !== 0
              ? String(rounded)
              : safeRaw !== 0
                ? String(safeRaw)
                : ''
        } else if (safeRaw !== undefined) {
          text = String(safeRaw)
        } else {
          text = ''
        }
        try {
          pdfField.setText(text)
        } catch {
          try {
            pdfField.setText(text || ' ')
          } catch {
            try {
              if (text !== '' && text !== 'NaN') pdfField.setText(' ')
            } catch {
              // leave field unchanged when PDF rejects all writes
            }
          }
        }
      } catch (err) {
        throw error('text field')
      }
    } else if (value !== undefined) {
      throw error('unknown')
    }
    pdfField.enableReadOnly()
  })

  return pdf
}
