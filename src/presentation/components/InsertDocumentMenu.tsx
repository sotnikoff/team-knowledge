import { useCallback, useState } from 'react'
import * as editor from '@/application/editor/editorModel'
import { createDocumentElement, DOCUMENT_CARD_WIDTH } from '@/domain/element/factory'
import type { Point } from '@/domain/shared/geometry'
import type { SpaceId } from '@/domain/space/Space'
import { useDependencies } from '../app/dependencies'
import { dispatch } from '../editor/store'
import { errorMessage } from '../errors'
import { useCreateDocument, useDocumentList } from '../hooks/useDocuments'
import { AppIcon } from './icons'
import { useI18n } from '../i18n/i18n'
import { cx } from '../ui/cx'
import { Panel } from '../ui/Panel'
import { Popover } from '../ui/Popover'
import menu from './ExportMenu.module.css'
import styles from './InsertDocumentMenu.module.css'

/** Puts a document of the space onto the board as a card. */
export function InsertDocumentMenu(props: { spaceId: SpaceId; viewCenter: () => Point }) {
  const { t } = useI18n()
  const { ids } = useDependencies()
  const [open, setOpen] = useState(false)
  const documents = useDocumentList(props.spaceId)
  const create = useCreateDocument(props.spaceId)

  const insert = (documentId: string) => {
    const center = props.viewCenter()
    const card = createDocumentElement({
      id: ids.next(),
      documentId,
      seed: 1,
      style: editor.defaultStyle,
      x: center.x - DOCUMENT_CARD_WIDTH / 2,
      y: center.y - 120,
    })
    dispatch(
      (m) => editor.commit(m, [...m.elements, card]),
      (m) => editor.select(editor.setTool(m, 'select'), [card.id]),
    )
    setOpen(false)
  }

  const closeMenu = useCallback(() => setOpen(false), [])

  return (
    <Popover
      open={open}
      onClose={closeMenu}
      className={styles.menu}
      trigger={
        <Panel>
          <button
            type="button"
            title={t('insertDocument.title')}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className={cx(menu.trigger, open && menu.triggerOpen)}
          >
            <AppIcon name="document" /> {t('insertDocument.button')}
          </button>
        </Panel>
      }
    >
      <button
        type="button"
        disabled={create.isPending}
        onClick={() => create.mutate(t('common.untitled'), { onSuccess: (doc) => insert(doc.id) })}
        className={cx(styles.option, styles.create)}
      >
        <AppIcon name="plus" /> {t('insertDocument.new')}
      </button>
      {(documents.data?.length ?? 0) > 0 && <div className={styles.divider} />}
      <ul className={styles.list}>
        {documents.data?.map((doc) => (
          <li key={doc.id}>
            <button type="button" onClick={() => insert(doc.id)} className={styles.option}>
              <span className={styles.docIcon}>
                <AppIcon name="document" />
              </span>
              <span className={styles.name}>{doc.title}</span>
            </button>
          </li>
        ))}
      </ul>
      {create.error && <p className={styles.error}>{errorMessage(create.error, t)}</p>}
    </Popover>
  )
}
