/** Browser file helpers shared by image export and JSON export/import. */

/** Saves a blob as a file via a temporary link. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** File name from a user-given name: keeps letters, digits, spaces and dashes. */
export function safeFileName(name: string, fallback: string, extension: string): string {
  const base = name.replace(/[^\p{L}\p{N} _-]+/gu, '').trim() || fallback
  return `${base}.${extension}`
}

/**
 * Lets the user pick a file and returns its text; null if the dialog was
 * closed without a choice (browsers that report it fire `cancel`).
 */
export function pickTextFile(accept: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = accept
    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      file.text().then(resolve, reject)
    })
    input.addEventListener('cancel', () => resolve(null))
    input.click()
  })
}
