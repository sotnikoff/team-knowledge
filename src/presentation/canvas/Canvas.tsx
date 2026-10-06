import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import * as editor from '@/application/editor/editorModel'
import { findElement, shapeAt, topmostElementAt, updateElements } from '@/application/editor/scene'
import { isBendIndex, removeBend } from '@/domain/element/linear'
import { isLinearElement } from '@/domain/element/types'
import type { Point } from '@/domain/shared/geometry'
import { panBy, screenToWorld, zoomAt } from '@/application/editor/viewport'
import { useDependencies } from '../app/dependencies'
import { boardPointer } from '../editor/boardPointer'
import { dispatch, getModel, useEditor } from '../editor/store'
import { commitTextEdit, startEditing } from '../editor/textEditing'
import { renderOverlay, type Surface } from './renderScene'
import { SceneLayers } from './SceneLayers'
import { HIT_TOLERANCE, lineHandleAt } from './selection'
import { TextEditor } from './TextEditor'
import { cx } from '../ui/cx'
import styles from './Canvas.module.css'
import { tools, type PointerInput, type ToolContext, type ToolSession } from './tools'
import { startPan } from './tools/handTool'
import { hoverCursor } from './tools/selectTool'
import { hintFor, snapLineEnd } from './tools/snapping'
import { startTextAt } from './tools/textTool'
import { useLayerCanvas } from './useLayerCanvas'

/** `onOpenDocument` is called on double click on a document card. */
/** Double click on a bend of the selected line removes it. */
function removeBendAt(world: Point): boolean {
  const m = getModel()
  const line = m.selectedIds.length === 1 ? findElement(m.elements, m.selectedIds[0]!) : null
  if (!line || !isLinearElement(line)) return false
  const handle = lineHandleAt(line, world, m.viewport.zoom)
  if (handle?.kind !== 'point' || !isBendIndex(line, handle.index)) return false
  dispatch((s) => editor.commit(s, updateElements(s.elements, [line.id], (el) => (isLinearElement(el) ? removeBend(el, handle.index) : el))))
  return true
}

export function Canvas(props: { onOpenDocument: (documentId: string) => void }) {
  const { ids } = useDependencies()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const session = useRef<ToolSession | null>(null)
  const [surface, setSurface] = useState<Surface>({ width: 0, height: 0, pixelRatio: 1 })
  const [spaceHeld, setSpaceHeld] = useState(false)
  const [hover, setHover] = useState('default')
  const tool = useEditor((m) => m.tool)

  const toolContext = useMemo<ToolContext>(
    () => ({ ids, randomSeed: () => Math.floor(Math.random() * 2 ** 31) + 1 }),
    [ids],
  )

  // Track the container size. Measured synchronously on mount too, because the
  // observer only reports on the next rendered frame.
  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return
    const measure = (width: number, height: number) => {
      setSurface({ width, height, pixelRatio: window.devicePixelRatio || 1 })
      boardPointer.resize(width, height)
    }
    const rect = container.getBoundingClientRect()
    measure(rect.width, rect.height)
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // The input canvas on top of every layer also shows the selection UI.
  const drawOverlay = useCallback((canvas: HTMLCanvasElement) => renderOverlay(canvas, getModel(), surface), [surface])
  useLayerCanvas(canvasRef, surface, drawOverlay)

  // Wheel: pan, or zoom with ctrl/cmd (also what trackpad pinch sends).
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      dispatch((m) =>
        editor.setViewport(
          m,
          e.ctrlKey || e.metaKey
            ? zoomAt(m.viewport, m.viewport.zoom * Math.exp(-e.deltaY * 0.01), anchor)
            : panBy(m.viewport, -e.deltaX, -e.deltaY),
        ),
      )
    }
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  // Hold space to pan with any tool.
  useEffect(() => {
    const isTyping = (t: EventTarget | null) => t instanceof HTMLTextAreaElement || t instanceof HTMLInputElement
    const onDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isTyping(e.target)) {
        e.preventDefault()
        setSpaceHeld(true)
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceHeld(false)
    }
    window.addEventListener('keydown', onDown)
    window.addEventListener('keyup', onUp)
    return () => {
      window.removeEventListener('keydown', onDown)
      window.removeEventListener('keyup', onUp)
    }
  }, [])

  const toInput = (e: PointerEvent | MouseEvent): PointerInput => {
    const rect = canvasRef.current!.getBoundingClientRect()
    const screen = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    return { screen, world: screenToWorld(getModel().viewport, screen), shiftKey: e.shiftKey, altKey: e.altKey }
  }

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 2) return
    // Keep focus where it is: otherwise a freshly opened text editor would blur at once.
    e.preventDefault()
    if (getModel().editingTextId) {
      commitTextEdit()
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    const input = toInput(e)
    session.current =
      e.button === 1 || spaceHeld ? startPan(input.screen) : tools[getModel().tool].begin(input, toolContext)
  }

  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const input = toInput(e)
    boardPointer.move(input.screen)
    if (session.current) session.current.move(input)
    else if (tool === 'select') setHover(hoverCursor(input.world))
    else if (tool === 'line' || tool === 'arrow') {
      // Preview which shape side a new line would start from.
      const snapped = snapLineEnd(input.world, input.altKey)
      dispatch((m) => editor.setBindingHint(m, hintFor(snapped.binding)))
    }
  }

  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    session.current?.end(toInput(e))
    session.current = null
  }

  const onDoubleClick = (e: MouseEvent<HTMLCanvasElement>) => {
    if (getModel().tool !== 'select') return
    const { world } = toInput(e)
    const m = getModel()
    if (removeBendAt(world)) return
    const hit = topmostElementAt(m.elements, world, HIT_TOLERANCE / m.viewport.zoom)
    if (hit?.type === 'document') return props.onOpenDocument(hit.documentId)
    if (hit && isLinearElement(hit)) return startEditing(hit.id)
    const shape = hit?.type === 'text' ? hit : shapeAt(m.elements, world)
    if (shape) startEditing(shape.id)
    else if (!hit) startTextAt(world, toolContext)
  }

  const cursor = spaceHeld ? 'grab' : tool === 'select' ? hover : tools[tool].cursor

  return (
    <div ref={containerRef} className={styles.container}>
      <SceneLayers surface={surface} />
      <canvas
        ref={canvasRef}
        className={cx('board-ink', styles.layer, styles.input)}
        style={{ width: surface.width, height: surface.height, cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          boardPointer.leave()
          dispatch((m) => (m.interactionBase ? m : editor.setBindingHint(m, null)))
        }}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      <TextEditor />
    </div>
  )
}
