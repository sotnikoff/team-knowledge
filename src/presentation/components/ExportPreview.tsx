import { useEffect, useState } from 'react'
import type { DiagramElement } from '@/domain/element/types'
import { exportArea, renderExport, type ExportTheme } from '../export/exportImage'
import { useI18n } from '../i18n/i18n'
import styles from './ExportMenu.module.css'

/** Room for the picture inside the preview box, in CSS pixels. */
const BOX = { width: 246, height: 130 }

/** A small picture of exactly what will be exported (area, cards, theme, background). */
export function ExportPreview(props: {
  elements: readonly DiagramElement[]
  theme: ExportTheme
  findCardNode: (elementId: string) => HTMLElement | null
}) {
  const { t } = useI18n()
  const { elements, theme, findCardNode } = props
  const [image, setImage] = useState<{ url: string; key: string } | null>(null)
  const [failed, setFailed] = useState(false)
  const key = `${theme}:${elements.map((el) => el.id).join(',')}`

  useEffect(() => {
    const area = exportArea(elements)
    if (!area) return
    let cancelled = false
    // Fit the area into the box, sharp on high-DPI screens.
    const scale = Math.min(BOX.width / area.width, BOX.height / area.height, 1) * (window.devicePixelRatio || 1)
    renderExport({ elements, theme, scale, findCardNode })
      .then((canvas) => {
        if (cancelled) return
        setFailed(false)
        setImage({ url: canvas.toDataURL('image/png'), key })
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [elements, theme, findCardNode, key])

  return (
    <div className={styles.preview} aria-label={t('export.preview')} role="img">
      {failed ? (
        <span className={styles.previewNote}>{t('export.previewFailed')}</span>
      ) : image ? (
        // Keep the last picture while the next one renders, just dimmed.
        <img src={image.url} alt="" className={image.key === key ? undefined : styles.previewStale} />
      ) : (
        <span className={styles.previewNote}>{t('export.preparing')}</span>
      )}
    </div>
  )
}
