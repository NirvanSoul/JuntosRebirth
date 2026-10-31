/** Importación de extractos bancarios. */
export const imports: Record<string, string> = {
  Descripción: 'Description',
  Importe: 'Amount',
  'Tipo (cargo/abono)': 'Type (debit/credit)',
  Saldo: 'Balance',
  Ignorar: 'Ignore',
  '¿Dónde está cada dato?': 'Where is each piece of data?',
  'Indica qué contiene cada columna de tu archivo.':
    'Tell us what each column of your file contains.',
  'Columna {{value}}': 'Column {{value}}',
  'Continuar con este mapeo de columnas': 'Continue with this column mapping',
  'Sube tu extracto bancario y revisa los movimientos antes de guardarlos.':
    'Upload your bank statement and review the transactions before saving them.',
  'Formatos: Excel (.xlsx, .xls) y CSV': 'Formats: Excel (.xlsx, .xls) and CSV',
  'Elegir un archivo bancario': 'Choose a bank file',
  'Elegir archivo': 'Choose file',
  'Ver revisiones de importación guardadas': 'See saved import reviews',
  'Ver revisiones guardadas': 'See saved reviews',
  '1 movimiento': '1 transaction',
  '{{count}} movimientos': '{{count}} transactions',
  'Elegir categoría para {{title}}': 'Choose a category for {{title}}',
  'Quitar {{title}} de la importación': 'Remove {{title}} from the import',
  'Incluir {{title}} en la importación': 'Include {{title}} in the import',
  'Cambiar categoría de {{title}}: {{name}}':
    'Change category of {{title}}: {{name}}',
  'Elegir categoría': 'Choose category',
  'Contraer {{title}}': 'Collapse {{title}}',
  'Mostrar {{count}} movimientos de {{title}}':
    'Show {{count}} transactions from {{title}}',
  'Importar {{count}} movimientos': 'Import {{count}} transactions',
  'Importar {{count}}': 'Import {{count}}',
  'Sin fecha': 'No date',
  'Quitar de la importación': 'Remove from the import',
  'Incluir en la importación': 'Include in the import',
  Encontrados: 'Found',
  Listos: 'Ready',
  'Para revisar': 'To review',
  'Ya existen': 'Already exist',
  'Ya existe un movimiento igual a este.':
    'An identical transaction already exists.',
  'Podría ser un duplicado. Revísalo.':
    'It could be a duplicate. Please review it.',
  'Movimiento importado': 'Imported transaction',
  'No pudimos reconocer la fecha de este movimiento.':
    "We couldn't recognize the date of this transaction.",
  'La fecha es ambigua. Confirma que sea correcta.':
    'The date is ambiguous. Confirm that it is correct.',
  'Este movimiento tiene un gasto y un ingreso a la vez; revísalo.':
    'This transaction has both an expense and an income; please review it.',
  'No pudimos reconocer el importe de este movimiento.':
    "We couldn't recognize the amount of this transaction.",
  'No reconocimos la moneda de este movimiento.':
    "We didn't recognize the currency of this transaction.",
  'No encontramos movimientos. Revisa que el archivo sea un extracto bancario con fechas e importes visibles.':
    "We didn't find any transactions. Check that the file is a bank statement with visible dates and amounts.",
  'No pudimos preparar esta revisión para guardarla.':
    "We couldn't prepare this review to save it.",
  'No pudimos abrir el selector de archivos.':
    "We couldn't open the file picker.",
  'No pudimos leer este archivo.': "We couldn't read this file.",
  'No pudimos preparar tus reglas de categorización.':
    "We couldn't prepare your categorization rules.",
  'No pudimos cargar tus revisiones guardadas.':
    "We couldn't load your saved reviews.",
  'No pudimos eliminar esta revisión. Inténtalo de nuevo.':
    "We couldn't delete this review. Please try again.",
  'Importamos {{count}}. Aún te quedan {{remaining}} movimientos por revisar o seleccionar.':
    'We imported {{count}}. You still have {{remaining}} transactions to review or select.',
  'No pudimos guardar los movimientos. Inténtalo de nuevo.':
    "We couldn't save the transactions. Please try again.",
  'Revisa antes de importar': 'Review before importing',
  'Tienes revisiones pendientes': 'You have pending reviews',
  'Ya vimos este archivo antes': 'We have seen this file before',
  'Elige la moneda de este documento': 'Choose the currency of this document',
  'Importar movimientos': 'Import transactions',
  'Elegir otro archivo': 'Choose another file',
  'Ya importaste este mismo archivo el {{date}}.':
    'You already imported this same file on {{date}}.',
  'Importar de todas formas': 'Import anyway',
  'Si continúas, podrías crear movimientos duplicados.':
    'If you continue, you could create duplicate transactions.',
  'Archivo ya importado': 'File already imported',
  'No encontramos una columna de moneda en el archivo. ¿En qué moneda están los movimientos de este documento?':
    "We didn't find a currency column in the file. What currency are the transactions in this document in?",
  'Tus movimientos ya están en Juntos.': 'Your transactions are now in Juntos.',
  Listo: 'Done',
  'Retoma una revisión guardada o empieza una importación nueva.':
    'Resume a saved review or start a new import.',
  'Se eliminará esta revisión guardada y sus {{count}} movimientos pendientes no se importarán.':
    'This saved review will be deleted and its {{count}} pending transactions will not be imported.',
  '¿Eliminar esta importación?': 'Delete this import?',
  'Revisar importación de {{count}} movimientos':
    'Review import of {{count}} transactions',
  '{{count}} movimientos · {{date}}': '{{count}} transactions · {{date}}',
  'Guardada {{date}}': 'Saved {{date}}',
  Revisar: 'Review',
  'Eliminar importación guardada de {{count}} movimientos':
    'Delete saved import of {{count}} transactions',
  '{{count}} por revisar': '{{count}} to review',
  'Elegir un archivo nuevo': 'Choose a new file',
  'Elegir archivo nuevo': 'Choose new file',
  'Elige un archivo Excel (.xlsx, .xls) o CSV.':
    'Choose an Excel (.xlsx, .xls) or CSV file.',
  'Este archivo supera el tamaño máximo admitido ({{limit}} MB).':
    'This file exceeds the maximum allowed size ({{limit}} MB).',
  'Este archivo tiene demasiadas filas (máximo {{max}}).':
    'This file has too many rows (maximum {{max}}).',
  'El archivo está dañado o no tiene un formato reconocido.':
    'The file is damaged or has an unrecognized format.',
  'No pudimos leer el archivo seleccionado.':
    "We couldn't read the selected file.",
  'El archivo no contiene ninguna hoja.':
    'The file does not contain any sheet.',
  'No encontramos ninguna fila con datos.': "We didn't find any row with data.",
};
