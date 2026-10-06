import { useEffect, useRef, type ReactNode } from 'react'
import { cx } from './cx'
import { Panel } from './Panel'
import styles from './Popover.module.css'

/**
 * A trigger with a floating panel under it. Closes on Escape and on a click
 * outside, so menus never get stuck open.
 */
export function Popover(props: {
  open: boolean
  onClose: () => void
  trigger: ReactNode
  align?: 'start' | 'end'
  className?: string
  children: ReactNode
}) {
  const root = useRef<HTMLDivElement>(null)
  const { open, onClose } = props

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  return (
    <div ref={root} className={styles.anchor}>
      {props.trigger}
      {open && (
        <Panel
          padding="roomy"
          className={cx(styles.popover, styles[props.align ?? 'end'], props.className)}
        >
          {props.children}
        </Panel>
      )}
    </div>
  )
}
