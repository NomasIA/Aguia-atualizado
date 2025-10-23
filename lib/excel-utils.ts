import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  format?: 'currency' | 'date' | 'text' | 'number';
}

export interface ExcelOptions {
  title?: string;
  period?: string;
  columns: ExcelColumn[];
  data: any[];
  filename: string;
  sheetName?: string;
  totals?: { [key: string]: number | string };
}

export function generateExcelReport(options: ExcelOptions) {
  const {
    title,
    period,
    columns,
    data,
    filename,
    sheetName = 'Relatório',
    totals,
  } = options;

  const workbook = XLSX.utils.book_new();
  const worksheet: any = {};

  let currentRow = 0;

  if (title || period) {
    const titleText = [title, period].filter(Boolean).join(' - ');
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];
    worksheet['A1'] = { v: titleText, t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } };
    currentRow = 2;
  }

  const headerRow = currentRow;
  columns.forEach((col, idx) => {
    const cell = XLSX.utils.encode_cell({ r: headerRow, c: idx });
    worksheet[cell] = {
      v: col.header,
      t: 's',
      s: {
        font: { bold: true },
        fill: { fgColor: { rgb: 'E5E7EB' } },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } },
        },
      },
    };
  });

  currentRow++;

  data.forEach((row, rowIdx) => {
    columns.forEach((col, colIdx) => {
      const cell = XLSX.utils.encode_cell({ r: currentRow + rowIdx, c: colIdx });
      let value = row[col.key];
      let cellType = 't';

      if (col.format === 'currency' && typeof value === 'number') {
        worksheet[cell] = {
          v: value,
          t: 'n',
          z: 'R$ #,##0.00',
          s: {
            border: {
              top: { style: 'thin', color: { rgb: 'D1D5DB' } },
              bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
              left: { style: 'thin', color: { rgb: 'D1D5DB' } },
              right: { style: 'thin', color: { rgb: 'D1D5DB' } },
            },
          },
        };
      } else if (col.format === 'date' && value) {
        try {
          const date = new Date(value);
          worksheet[cell] = {
            v: format(date, 'dd/MM/yyyy'),
            t: 's',
            s: {
              border: {
                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                right: { style: 'thin', color: { rgb: 'D1D5DB' } },
              },
            },
          };
        } catch (e) {
          worksheet[cell] = { v: value, t: 's' };
        }
      } else if (col.format === 'number' && typeof value === 'number') {
        worksheet[cell] = {
          v: value,
          t: 'n',
          z: '#,##0.00',
          s: {
            border: {
              top: { style: 'thin', color: { rgb: 'D1D5DB' } },
              bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
              left: { style: 'thin', color: { rgb: 'D1D5DB' } },
              right: { style: 'thin', color: { rgb: 'D1D5DB' } },
            },
          },
        };
      } else {
        worksheet[cell] = {
          v: value || '',
          t: 's',
          s: {
            border: {
              top: { style: 'thin', color: { rgb: 'D1D5DB' } },
              bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
              left: { style: 'thin', color: { rgb: 'D1D5DB' } },
              right: { style: 'thin', color: { rgb: 'D1D5DB' } },
            },
          },
        };
      }
    });
  });

  currentRow += data.length;

  if (totals) {
    currentRow++;
    columns.forEach((col, colIdx) => {
      const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIdx });
      const totalValue = totals[col.key];

      if (totalValue !== undefined) {
        if (typeof totalValue === 'number' && col.format === 'currency') {
          worksheet[cell] = {
            v: totalValue,
            t: 'n',
            z: 'R$ #,##0.00',
            s: {
              font: { bold: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              },
            },
          };
        } else {
          worksheet[cell] = {
            v: totalValue,
            t: 's',
            s: {
              font: { bold: true },
              border: {
                top: { style: 'thin', color: { rgb: '000000' } },
                bottom: { style: 'thin', color: { rgb: '000000' } },
                left: { style: 'thin', color: { rgb: '000000' } },
                right: { style: 'thin', color: { rgb: '000000' } },
              },
            },
          };
        }
      }
    });
  }

  const range = XLSX.utils.decode_range(
    XLSX.utils.encode_cell({ r: 0, c: 0 }) +
      ':' +
      XLSX.utils.encode_cell({ r: currentRow, c: columns.length - 1 })
  );
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  const colWidths = columns.map((col) => ({
    wch: col.width || 15,
  }));
  worksheet['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const finalFilename = `${filename}-${timestamp}.xlsx`;

  XLSX.writeFile(workbook, finalFilename);
}

export function generateMultiSheetExcelReport(
  sheets: { sheetName: string; options: Omit<ExcelOptions, 'filename'> }[],
  filename: string
) {
  const workbook = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, options }) => {
    const worksheet: any = {};
    const { title, period, columns, data, totals } = options;

    let currentRow = 0;

    if (title || period) {
      const titleText = [title, period].filter(Boolean).join(' - ');
      worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } }];
      worksheet['A1'] = { v: titleText, t: 's', s: { font: { bold: true, sz: 14 }, alignment: { horizontal: 'center' } } };
      currentRow = 2;
    }

    const headerRow = currentRow;
    columns.forEach((col, idx) => {
      const cell = XLSX.utils.encode_cell({ r: headerRow, c: idx });
      worksheet[cell] = {
        v: col.header,
        t: 's',
        s: {
          font: { bold: true },
          fill: { fgColor: { rgb: 'E5E7EB' } },
          border: {
            top: { style: 'thin', color: { rgb: '000000' } },
            bottom: { style: 'thin', color: { rgb: '000000' } },
            left: { style: 'thin', color: { rgb: '000000' } },
            right: { style: 'thin', color: { rgb: '000000' } },
          },
        },
      };
    });

    currentRow++;

    data.forEach((row, rowIdx) => {
      columns.forEach((col, colIdx) => {
        const cell = XLSX.utils.encode_cell({ r: currentRow + rowIdx, c: colIdx });
        let value = row[col.key];

        if (col.format === 'currency' && typeof value === 'number') {
          worksheet[cell] = {
            v: value,
            t: 'n',
            z: 'R$ #,##0.00',
            s: {
              border: {
                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                right: { style: 'thin', color: { rgb: 'D1D5DB' } },
              },
            },
          };
        } else if (col.format === 'date' && value) {
          try {
            const date = new Date(value);
            worksheet[cell] = {
              v: format(date, 'dd/MM/yyyy'),
              t: 's',
              s: {
                border: {
                  top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                  right: { style: 'thin', color: { rgb: 'D1D5DB' } },
                },
              },
            };
          } catch (e) {
            worksheet[cell] = { v: value, t: 's' };
          }
        } else {
          worksheet[cell] = {
            v: value || '',
            t: 's',
            s: {
              border: {
                top: { style: 'thin', color: { rgb: 'D1D5DB' } },
                bottom: { style: 'thin', color: { rgb: 'D1D5DB' } },
                left: { style: 'thin', color: { rgb: 'D1D5DB' } },
                right: { style: 'thin', color: { rgb: 'D1D5DB' } },
              },
            },
          };
        }
      });
    });

    currentRow += data.length;

    if (totals) {
      currentRow++;
      columns.forEach((col, colIdx) => {
        const cell = XLSX.utils.encode_cell({ r: currentRow, c: colIdx });
        const totalValue = totals[col.key];

        if (totalValue !== undefined) {
          if (typeof totalValue === 'number' && col.format === 'currency') {
            worksheet[cell] = {
              v: totalValue,
              t: 'n',
              z: 'R$ #,##0.00',
              s: {
                font: { bold: true },
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } },
                },
              },
            };
          } else {
            worksheet[cell] = {
              v: totalValue,
              t: 's',
              s: {
                font: { bold: true },
                border: {
                  top: { style: 'thin', color: { rgb: '000000' } },
                  bottom: { style: 'thin', color: { rgb: '000000' } },
                  left: { style: 'thin', color: { rgb: '000000' } },
                  right: { style: 'thin', color: { rgb: '000000' } },
                },
              },
            };
          }
        }
      });
    }

    const range = XLSX.utils.decode_range(
      XLSX.utils.encode_cell({ r: 0, c: 0 }) +
        ':' +
        XLSX.utils.encode_cell({ r: currentRow, c: columns.length - 1 })
    );
    worksheet['!ref'] = XLSX.utils.encode_range(range);

    const colWidths = columns.map((col) => ({
      wch: col.width || 15,
    }));
    worksheet['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  });

  const timestamp = format(new Date(), 'yyyy-MM-dd-HHmm');
  const finalFilename = `${filename}-${timestamp}.xlsx`;

  XLSX.writeFile(workbook, finalFilename);
}
