import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import * as editor from '@/application/editor/editorModel'
import { shapeAt, topmostElementAt } from '@/application/editor/scene'
import { panBy, screenToWorld, zoomAt } from '@/application/editor/viewport'
import { useDependencies } from '../app/dependencies'
import { dispatch, getModel, subscribeToModel, useEditor } from '../editor/store'
import { commitTextEdit, startEditing } from '../editor/textEditing'
import { DocumentLayer } from './DocumentLayer'
import { createRoughCanvas, renderScene, type Surface } from './renderScene'
import { HIT_TOLERANCE } from './selection'
import { TextEditor } from './TextEditor'
import { tools, type PointerInput, type ToolContext, type ToolSession } from './tools'
import { startPan } from './tools/handTool'
import { hoverCursor } from './tools/selectTool'
import { hintFor, snapLineEnd } from './tools/snapping'
import { startTextAt } from './tools/textTool'

/** `onOpenDocument` is called on double click on a document card. */
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
    const measure = (width: number, height: number) =>
      setSurface({ width, height, pixelRatio: window.devicePixelRatio || 1 })
    const rect = container.getBoundingClientRect()
    measure(rect.width, rect.height)
    const observer = new ResizeObserver(([entry]) => {
      if (entry) measure(entry.contentRect.width, entry.contentRect.height)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  // Render on every model change, at most once per frame.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || surface.width === 0) return
    canvas.width = Math.floor(surface.width * surface.pixelRatio)
    canvas.height = Math.floor(surface.height * surface.pixelRatio)
    const rc = createRoughCanvas(canvas)
    let frame = 0
    const draw = () => {
      frame = 0
      renderScene(canvas, rc, getModel(), surface)
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw)
    }
    draw()
    const unsubscribe = subscribeToModel(schedule)
    void document.fonts.ready.then(schedule)
    return () => {
      unsubscribe()
      cancelAnimationFrame(frame)
    }
  }, [surface])

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
    const hit = topmostElementAt(m.elements, world, HIT_TOLERANCE / m.viewport.zoom)
    if (hit?.type === 'document') return props.onOpenDocument(hit.documentId)
    const shape = hit?.type === 'text' ? hit : shapeAt(m.elements, world)
    if (shape) startEditing(shape.id)
    else if (!hit) startTextAt(world, toolContext)
  }

  const cursor = spaceHeld ? 'grab' : tool === 'select' ? hover : tools[tool].cursor

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <DocumentLayer />
      <canvas
        ref={canvasRef}
        className="relative block touch-none"
        style={{ width: surface.width, height: surface.height, cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => dispatch((m) => (m.interactionBase ? m : editor.setBindingHint(m, null)))}
        onDoubleClick={onDoubleClick}
        onContextMenu={(e) => e.preventDefault()}
      />
      <TextEditor />
    </div>
  )
}
