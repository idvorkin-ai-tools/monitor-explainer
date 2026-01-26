import { useState } from 'react'
import './App.css'

type AspectRatio = '16:9' | '21:9' | '32:9'
type Resolution = '1440p' | '2160p'

interface Monitor {
  diagonal: number
  aspectRatio: AspectRatio
  resolution: Resolution
  width: number // physical width in inches
  height: number // physical height in inches
  resolutionX: number
  resolutionY: number
  name: string
}

const monitors: Monitor[] = [
  // 16:9 Standard
  { diagonal: 27, aspectRatio: '16:9', resolution: '1440p', width: 23.5, height: 13.2, resolutionX: 2560, resolutionY: 1440, name: '27" Standard' },
  { diagonal: 32, aspectRatio: '16:9', resolution: '2160p', width: 27.9, height: 15.7, resolutionX: 3840, resolutionY: 2160, name: '32" Standard' },
  { diagonal: 43, aspectRatio: '16:9', resolution: '2160p', width: 37.5, height: 21.1, resolutionX: 3840, resolutionY: 2160, name: '43" Standard' },

  // 21:9 Ultrawide
  { diagonal: 34, aspectRatio: '21:9', resolution: '1440p', width: 31.3, height: 13.4, resolutionX: 3440, resolutionY: 1440, name: '34" Ultrawide' },
  { diagonal: 40, aspectRatio: '21:9', resolution: '2160p', width: 36.8, height: 15.8, resolutionX: 5120, resolutionY: 2160, name: '40" Ultrawide' },

  // 32:9 Super-ultrawide
  { diagonal: 49, aspectRatio: '32:9', resolution: '1440p', width: 47.2, height: 13.3, resolutionX: 5120, resolutionY: 1440, name: '49" Super-wide' },
  { diagonal: 57, aspectRatio: '32:9', resolution: '2160p', width: 54.9, height: 15.4, resolutionX: 7680, resolutionY: 2160, name: '57" Super-wide' },
]

type ViewMode = 'height' | 'resolution' | 'overlay'

function App() {
  const [selectedMonitors, setSelectedMonitors] = useState<Monitor[]>([
    monitors[0], // 27" standard
    monitors[3], // 34" ultrawide
    monitors[5], // 49" super-wide
  ])
  const [viewMode, setViewMode] = useState<ViewMode>('height')

  // Pan and zoom state
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  // Monitor positions (for individual dragging)
  const [monitorPositions, setMonitorPositions] = useState<Record<string, { x: number; y: number }>>({})
  const [monitorRotations, setMonitorRotations] = useState<Record<string, number>>({}) // 0, 90, 180, 270
  const [draggingMonitor, setDraggingMonitor] = useState<string | null>(null)
  const [monitorDragStart, setMonitorDragStart] = useState({ x: 0, y: 0 })

  const toggleMonitor = (monitor: Monitor) => {
    setSelectedMonitors(prev => {
      // Always add monitor (allow duplicates)
      return [...prev, monitor]
    })
  }

  const removeMonitor = (index: number) => {
    setSelectedMonitors(prev => prev.filter((_, i) => i !== index))
  }

  // Zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.max(0.5, Math.min(5, prev * delta)))
  }

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    setPanX(e.clientX - dragStart.x)
    setPanY(e.clientY - dragStart.y)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const resetView = () => {
    setZoom(1)
    setPanX(0)
    setPanY(0)
    setMonitorPositions({})
    setMonitorRotations({})
  }

  const rotateMonitor = (monitorId: string) => {
    setMonitorRotations(prev => {
      const currentRotation = prev[monitorId] || 0
      const nextRotation = (currentRotation + 90) % 360
      return { ...prev, [monitorId]: nextRotation }
    })
  }

  const getRotatedDimensions = (width: number, height: number, rotation: number) => {
    if (rotation === 90 || rotation === 270) {
      return { width: height, height: width } // Swap dimensions
    }
    return { width, height }
  }

  // Monitor drag handlers
  const handleMonitorMouseDown = (e: React.MouseEvent, monitorId: string) => {
    e.stopPropagation() // Prevent canvas pan
    setDraggingMonitor(monitorId)
    const svgRect = (e.currentTarget as SVGElement).ownerSVGElement?.getBoundingClientRect()
    if (svgRect) {
      setMonitorDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMonitorMouseMove = (e: React.MouseEvent) => {
    if (!draggingMonitor) return

    const deltaX = (e.clientX - monitorDragStart.x) / zoom
    const deltaY = (e.clientY - monitorDragStart.y) / zoom

    let newX = (monitorPositions[draggingMonitor]?.x || 0) + deltaX
    let newY = (monitorPositions[draggingMonitor]?.y || 0) + deltaY

    // Snapping logic - snap to other monitors within 10px threshold
    const snapThreshold = 10
    selectedMonitors.forEach((monitor, index) => {
      const monitorId = `${monitor.name}-${index}`
      if (monitorId === draggingMonitor) return

      const otherPos = monitorPositions[monitorId] || { x: 0, y: 0 }
      const otherRotation = monitorRotations[monitorId] || 0
      const draggedMonitor = selectedMonitors.find((_, i) => `${selectedMonitors[i].name}-${i}` === draggingMonitor)
      if (!draggedMonitor) return

      const draggedRotation = monitorRotations[draggingMonitor] || 0

      // Get rotated dimensions
      const otherDims = getRotatedDimensions(monitor.width * scale, monitor.height * scale, otherRotation)
      const draggedDims = getRotatedDimensions(draggedMonitor.width * scale, draggedMonitor.height * scale, draggedRotation)

      const otherWidth = otherDims.width
      const otherHeight = otherDims.height
      const draggedWidth = draggedDims.width
      const draggedHeight = draggedDims.height

      // Snap horizontal (right edge to left edge, or left edge to right edge)
      if (Math.abs((newX + draggedWidth) - otherPos.x) < snapThreshold) {
        newX = otherPos.x - draggedWidth
      } else if (Math.abs(newX - (otherPos.x + otherWidth)) < snapThreshold) {
        newX = otherPos.x + otherWidth
      }

      // Snap vertical (bottom edge to top edge, or top edge to bottom edge)
      if (Math.abs((newY + draggedHeight) - otherPos.y) < snapThreshold) {
        newY = otherPos.y - draggedHeight
      } else if (Math.abs(newY - (otherPos.y + otherHeight)) < snapThreshold) {
        newY = otherPos.y + otherHeight
      }

      // Snap to same top edge
      if (Math.abs(newY - otherPos.y) < snapThreshold) {
        newY = otherPos.y
      }

      // Snap to same left edge
      if (Math.abs(newX - otherPos.x) < snapThreshold) {
        newX = otherPos.x
      }
    })

    setMonitorPositions(prev => ({
      ...prev,
      [draggingMonitor]: { x: newX, y: newY }
    }))

    setMonitorDragStart({ x: e.clientX, y: e.clientY })
  }

  const handleMonitorMouseUp = () => {
    setDraggingMonitor(null)
  }

  // Scale for visualization - use width for scaling
  const maxWidth = Math.max(...monitors.map(m => m.width))
  const scale = 600 / maxWidth // pixels per inch

  // Calculate viewBox based on zoom and pan
  const baseViewBox = { x: 0, y: 0, width: 700, height: 400 }
  const viewBoxWidth = baseViewBox.width / zoom
  const viewBoxHeight = baseViewBox.height / zoom
  const viewBoxX = baseViewBox.x - (panX / zoom)
  const viewBoxY = baseViewBox.y - (panY / zoom)

  return (
    <div className="app">
      <header>
        <h1>Monitor Dimension Explainer</h1>
        <p className="subtitle">Cut through the marketing gobbledygook</p>
      </header>

      <main>
        <section className="intro">
          <p className="intro-text">
            Buying monitors is super confusing because of everyone's diagonal size (27", 34", 49")
            and some number followed by 1080p, 4K, or HD. But this is all <strong>marketing gobbledygook</strong>.
            What we really need to understand are three independent dimensions:
          </p>

          <nav className="toc">
            <h3>Quick Navigation</h3>
            <ul>
              <li><a href="#three-dimensions">The Three Dimensions</a></li>
              <li><a href="#igor-setup">Igor's Setup</a></li>
              <li><a href="#visual-comparison">Visual Comparison</a></li>
              <li><a href="#diagonal-confusion">Why Diagonal Measurements?</a></li>
              <li><a href="#curved-monitors">Curved Monitors</a></li>
              <li><a href="#pixel-density">Pixel Density (PPI)</a></li>
              <li><a href="#panel-type">Panel Type (IPS/VA/TN)</a></li>
              <li><a href="#mac-tools">Mac Tools for Display Management</a></li>
              <li><a href="#p-vs-k">The "p" vs "K" Confusion</a></li>
            </ul>
          </nav>
        </section>

        <section className="explainer" id="three-dimensions">
          <h2>The Three Dimensions</h2>
          <div className="dimensions-grid">
            <div className="dimension-card">
              <h3>1. Aspect Ratio</h3>
              <p>How wide vs how tall (horizontal stretch)</p>
              <ul>
                <li><strong>16:9</strong> - Standard</li>
                <li><strong>21:9</strong> - Ultrawide (1.3× wider)</li>
                <li><strong>32:9</strong> - Super-wide (2× wider)</li>
              </ul>
            </div>

            <div className="dimension-card">
              <h3>2. Physical Size</h3>
              <p>Actual height in inches (vertical growth)</p>
              <ul>
                <li><strong>~13" tall</strong> - Smaller class</li>
                <li><strong>~16" tall</strong> - Larger class</li>
              </ul>
            </div>

            <div className="dimension-card">
              <h3>3. Resolution</h3>
              <p>Number of pixels (sharpness)</p>
              <ul>
                <li><strong>1440p</strong> - 2K (1440 pixels tall)</li>
                <li><strong>2160p</strong> - 4K (2160 pixels tall)</li>
              </ul>
            </div>
          </div>

          <div className="warning-box">
            <h3>⚠️ Size ≠ Resolution</h3>
            <p>You can have a 45" monitor at only 1440p (2K). It'll be physically huge but have the same pixel count as a 27" 2K monitor - things will look less sharp!</p>
          </div>
        </section>

        <section className="igor-monitors" id="igor-setup">
          <h2>Igor's Setup</h2>
          <div className="igor-setup-grid">
            <div className="igor-monitor-card">
              <h3>Work: 32" 4K Standard</h3>
              <p>3840×2160 (16:9)</p>
              <button
                className="add-monitor-btn"
                onClick={() => {
                  const monitor = monitors.find(m => m.name === '32" Standard')
                  if (monitor) toggleMonitor(monitor)
                }}
              >
                Add to Comparison
              </button>
            </div>

            <div className="igor-monitor-card">
              <h3>Home: 43" 4K Standard</h3>
              <p>3840×2160 (16:9) - Same pixels as 32", larger</p>
              <button
                className="add-monitor-btn"
                onClick={() => {
                  const monitor = monitors.find(m => m.name === '43" Standard')
                  if (monitor) toggleMonitor(monitor)
                }}
              >
                Add to Comparison
              </button>
            </div>

            <div className="igor-monitor-card">
              <h3>Home: 40" Samsung Odyssey G7</h3>
              <p>5120×2160 (21:9) - Ultrawide</p>
              <button
                className="add-monitor-btn"
                onClick={() => {
                  const monitor = monitors.find(m => m.name === '40" Ultrawide')
                  if (monitor) toggleMonitor(monitor)
                }}
              >
                Add to Comparison
              </button>
            </div>
          </div>
        </section>

        <section className="monitor-selector" id="visual-comparison">
          <h2>Visual Comparison</h2>

          <p>Select monitors to compare (click to add, can add multiple of same model):</p>

          <div className="monitor-catalog-grid">
            <div className="catalog-header">
              <div className="size-label">Height</div>
              <div className="aspect-label">Standard (16:9)</div>
              <div className="aspect-label">Ultrawide (21:9)</div>
              <div className="aspect-label">Super-wide (32:9)</div>
            </div>

            {/* ~13" tall row */}
            <div className="catalog-row">
              <div className="size-label">~13" tall</div>
              <div className="catalog-cell">
                {monitors.filter(m => m.height >= 13 && m.height < 15 && m.aspectRatio === '16:9').map(monitor => (
                  <button key={monitor.name} className="monitor-chip" onClick={() => toggleMonitor(monitor)}>
                    <div>{monitor.name}</div>
                    <span className="chip-details">{monitor.resolutionX}×{monitor.resolutionY}</span>
                  </button>
                ))}
              </div>
              <div className="catalog-cell">
                {monitors.filter(m => m.height >= 13 && m.height < 15 && m.aspectRatio === '21:9').map(monitor => (
                  <button key={monitor.name} className="monitor-chip" onClick={() => toggleMonitor(monitor)}>
                    <div>{monitor.name}</div>
                    <span className="chip-details">{monitor.resolutionX}×{monitor.resolutionY}</span>
                  </button>
                ))}
              </div>
              <div className="catalog-cell">
                {monitors.filter(m => m.height >= 13 && m.height < 15 && m.aspectRatio === '32:9').map(monitor => (
                  <button key={monitor.name} className="monitor-chip" onClick={() => toggleMonitor(monitor)}>
                    <div>{monitor.name}</div>
                    <span className="chip-details">{monitor.resolutionX}×{monitor.resolutionY}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ~16" tall row */}
            <div className="catalog-row">
              <div className="size-label">~16" tall</div>
              <div className="catalog-cell">
                {monitors.filter(m => m.height >= 15 && m.height < 20 && m.aspectRatio === '16:9').map(monitor => (
                  <button key={monitor.name} className="monitor-chip" onClick={() => toggleMonitor(monitor)}>
                    <div>{monitor.name}</div>
                    <span className="chip-details">{monitor.resolutionX}×{monitor.resolutionY}</span>
                  </button>
                ))}
              </div>
              <div className="catalog-cell">
                {monitors.filter(m => m.height >= 15 && m.height < 20 && m.aspectRatio === '21:9').map(monitor => (
                  <button key={monitor.name} className="monitor-chip" onClick={() => toggleMonitor(monitor)}>
                    <div>{monitor.name}</div>
                    <span className="chip-details">{monitor.resolutionX}×{monitor.resolutionY}</span>
                  </button>
                ))}
              </div>
              <div className="catalog-cell">
                {monitors.filter(m => m.height >= 15 && m.height < 20 && m.aspectRatio === '32:9').map(monitor => (
                  <button key={monitor.name} className="monitor-chip" onClick={() => toggleMonitor(monitor)}>
                    <div>{monitor.name}</div>
                    <span className="chip-details">{monitor.resolutionX}×{monitor.resolutionY}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ~21" tall row */}
            <div className="catalog-row">
              <div className="size-label">~21" tall</div>
              <div className="catalog-cell">
                {monitors.filter(m => m.height >= 20 && m.aspectRatio === '16:9').map(monitor => (
                  <button key={monitor.name} className="monitor-chip" onClick={() => toggleMonitor(monitor)}>
                    <div>{monitor.name}</div>
                    <span className="chip-details">{monitor.resolutionX}×{monitor.resolutionY}</span>
                  </button>
                ))}
              </div>
              <div className="catalog-cell empty">—</div>
              <div className="catalog-cell empty">—</div>
            </div>
          </div>

          <div className="view-mode-selector">
            <p>Canvas view mode:</p>
            <div className="view-mode-buttons">
              <button
                className={`view-mode-btn ${viewMode === 'height' ? 'active' : ''}`}
                onClick={() => setViewMode('height')}
              >
                Height Class
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'resolution' ? 'active' : ''}`}
                onClick={() => setViewMode('resolution')}
              >
                Resolution
              </button>
              <button
                className={`view-mode-btn ${viewMode === 'overlay' ? 'active' : ''}`}
                onClick={() => setViewMode('overlay')}
              >
                Overlay (Stacked)
              </button>
            </div>
          </div>

          {selectedMonitors.length > 0 && (
            <div className="selected-monitors-list">
              <p>Selected ({selectedMonitors.length}):</p>
              <div className="selected-chips">
                {selectedMonitors.map((monitor, index) => (
                  <button
                    key={`${monitor.name}-${index}`}
                    className="selected-chip"
                    onClick={() => removeMonitor(index)}
                    title="Click to remove"
                  >
                    {monitor.name} ×
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="visualization">
          <div className="zoom-controls">
            <p>Zoom: {zoom.toFixed(1)}x | Drag canvas to pan, drag monitors to move, click ↻ to rotate, scroll to zoom</p>
            <button onClick={resetView} className="reset-btn">Reset View</button>
          </div>
          <div
            className="monitor-canvas"
            onMouseDown={handleMouseDown}
            onMouseMove={(e) => {
              handleMouseMove(e)
              handleMonitorMouseMove(e)
            }}
            onMouseUp={() => {
              handleMouseUp()
              handleMonitorMouseUp()
            }}
            onMouseLeave={() => {
              handleMouseUp()
              handleMonitorMouseUp()
            }}
            style={{ cursor: isDragging ? 'grabbing' : draggingMonitor ? 'grabbing' : 'grab' }}
          >
            <svg
              width="100%"
              height="400"
              viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
              style={{ border: '1px solid #ccc', background: '#f5f5f5' }}
              onWheel={handleWheel}
            >
              {/* Dynamic grouping based on view mode */}
              {(() => {
                if (viewMode === 'overlay') {
                  // Overlay mode: stack all monitors from same origin
                  const baseX = 50
                  const baseY = 50
                  return selectedMonitors.map((monitor, index) => {
                    const monitorId = `${monitor.name}-${index}`
                    const baseRectWidth = monitor.width * scale
                    const baseRectHeight = monitor.height * scale
                    const rotation = monitorRotations[monitorId] || 0
                    const rotatedDims = getRotatedDimensions(baseRectWidth, baseRectHeight, rotation)
                    const position = monitorPositions[monitorId] || { x: 0, y: 0 }
                    const finalX = baseX + position.x
                    const finalY = baseY + position.y

                    // Center point for rotation
                    const centerX = finalX + rotatedDims.width / 2
                    const centerY = finalY + rotatedDims.height / 2

                    return (
                      <g key={monitorId}>
                        <g
                          transform={`rotate(${rotation} ${centerX} ${centerY})`}
                          style={{ cursor: 'move', transition: draggingMonitor === monitorId ? 'none' : 'all 0.5s ease' }}
                          onMouseDown={(e) => handleMonitorMouseDown(e, monitorId)}
                        >
                          <rect
                            x={finalX}
                            y={finalY}
                            width={baseRectWidth}
                            height={baseRectHeight}
                            fill={monitor.aspectRatio === '16:9' ? '#3b82f6' : monitor.aspectRatio === '21:9' ? '#8b5cf6' : '#ec4899'}
                            stroke="#1e40af"
                            strokeWidth="2"
                            opacity="0.4"
                          />
                          <text
                            x={finalX + baseRectWidth / 2}
                            y={finalY + baseRectHeight / 2}
                            textAnchor="middle"
                            fontSize="14"
                            fontWeight="bold"
                            fill="white"
                          >
                            {monitor.name}
                          </text>
                        </g>
                        {/* Rotate button */}
                        <g
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            rotateMonitor(monitorId)
                          }}
                        >
                          <circle
                            cx={finalX + 10}
                            cy={finalY + 10}
                            r="8"
                            fill="#22c55e"
                            stroke="white"
                            strokeWidth="1"
                          />
                          <text
                            x={finalX + 10}
                            y={finalY + 10}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="10"
                            fontWeight="bold"
                            fill="white"
                          >
                            ↻
                          </text>
                        </g>
                        {/* Close button */}
                        <g
                          style={{ cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            removeMonitor(index)
                          }}
                        >
                          <circle
                            cx={finalX + rotatedDims.width - 10}
                            cy={finalY + 10}
                            r="8"
                            fill="#ef4444"
                            stroke="white"
                            strokeWidth="1"
                          />
                          <text
                            x={finalX + rotatedDims.width - 10}
                            y={finalY + 10}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fontSize="12"
                            fontWeight="bold"
                            fill="white"
                          >
                            ×
                          </text>
                        </g>
                      </g>
                    )
                  })
                }

                // Height or Resolution grouping
                const groups = viewMode === 'height'
                  ? [
                      { label: '~13" tall', monitors: selectedMonitors.filter(m => m.height < 14), y: 50 },
                      { label: '~16" tall', monitors: selectedMonitors.filter(m => m.height >= 14 && m.height < 20), y: 200 },
                      { label: '~21" tall', monitors: selectedMonitors.filter(m => m.height >= 20), y: 300 },
                    ]
                  : [
                      { label: '1440p (2K)', monitors: selectedMonitors.filter(m => m.resolution === '1440p'), y: 50 },
                      { label: '2160p (4K)', monitors: selectedMonitors.filter(m => m.resolution === '2160p'), y: 200 },
                    ]

                return groups.map(group => {
                  if (group.monitors.length === 0) return null

                  let xOffset = 20
                  return (
                    <g key={group.label}>
                      {/* Group label */}
                      <text x="10" y={group.y + 10} fontSize="12" fill="#666">
                        {group.label}
                      </text>

                      {/* Monitors in this group */}
                      {group.monitors.map((monitor) => {
                        // Find the index of this monitor in the full selectedMonitors array
                        const globalIndex = selectedMonitors.findIndex(m => m === monitor)
                        const monitorId = `${monitor.name}-${globalIndex}`
                        const baseRectWidth = monitor.width * scale
                        const baseRectHeight = monitor.height * scale
                        const rotation = monitorRotations[monitorId] || 0
                        const rotatedDims = getRotatedDimensions(baseRectWidth, baseRectHeight, rotation)
                        const position = monitorPositions[monitorId] || { x: 0, y: 0 }
                        const finalX = xOffset + position.x
                        const finalY = group.y + position.y

                        // Center point for rotation
                        const centerX = finalX + rotatedDims.width / 2
                        const centerY = finalY + rotatedDims.height / 2

                        const rect = (
                          <g key={monitorId}>
                            <g
                              transform={`rotate(${rotation} ${centerX} ${centerY})`}
                              style={{ cursor: 'move', transition: draggingMonitor === monitorId ? 'none' : 'all 0.5s ease' }}
                              onMouseDown={(e) => handleMonitorMouseDown(e, monitorId)}
                            >
                              <rect
                                x={finalX}
                                y={finalY}
                                width={baseRectWidth}
                                height={baseRectHeight}
                                fill={monitor.aspectRatio === '16:9' ? '#3b82f6' : monitor.aspectRatio === '21:9' ? '#8b5cf6' : '#ec4899'}
                                stroke="#1e40af"
                                strokeWidth="2"
                                opacity="0.7"
                              />
                              <text
                                x={finalX + baseRectWidth / 2}
                                y={finalY + baseRectHeight / 2 - 10}
                                textAnchor="middle"
                                fontSize="14"
                                fontWeight="bold"
                                fill="white"
                              >
                                {monitor.name}
                              </text>
                              <text
                                x={finalX + baseRectWidth / 2}
                                y={finalY + baseRectHeight / 2 + 10}
                                textAnchor="middle"
                                fontSize="12"
                                fill="white"
                              >
                                {monitor.resolutionX}×{monitor.resolutionY}
                              </text>
                              <text
                                x={finalX + baseRectWidth / 2}
                                y={finalY + baseRectHeight / 2 + 25}
                                textAnchor="middle"
                                fontSize="11"
                                fill="white"
                              >
                                {monitor.width.toFixed(1)}" × {monitor.height.toFixed(1)}"
                              </text>
                            </g>
                            {/* Rotate button */}
                            <g
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                rotateMonitor(monitorId)
                              }}
                            >
                              <circle
                                cx={finalX + 10}
                                cy={finalY + 10}
                                r="8"
                                fill="#22c55e"
                                stroke="white"
                                strokeWidth="1"
                              />
                              <text
                                x={finalX + 10}
                                y={finalY + 10}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="10"
                                fontWeight="bold"
                                fill="white"
                              >
                                ↻
                              </text>
                            </g>
                            {/* Close button */}
                            <g
                              style={{ cursor: 'pointer' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                removeMonitor(globalIndex)
                              }}
                            >
                              <circle
                                cx={finalX + rotatedDims.width - 10}
                                cy={finalY + 10}
                                r="8"
                                fill="#ef4444"
                                stroke="white"
                                strokeWidth="1"
                              />
                              <text
                                x={finalX + rotatedDims.width - 10}
                                y={finalY + 10}
                                textAnchor="middle"
                                dominantBaseline="central"
                                fontSize="12"
                                fontWeight="bold"
                                fill="white"
                              >
                                ×
                              </text>
                            </g>
                          </g>
                        )
                        xOffset += rotatedDims.width + 20
                        return rect
                      })}
                    </g>
                  )
                })
              })()}

              {/* Legend */}
              <g transform="translate(10, 380)">
                <rect x="0" y="0" width="15" height="15" fill="#3b82f6" opacity="0.7" />
                <text x="20" y="12" fontSize="12">16:9 Standard</text>

                <rect x="120" y="0" width="15" height="15" fill="#8b5cf6" opacity="0.7" />
                <text x="140" y="12" fontSize="12">21:9 Ultrawide</text>

                <rect x="260" y="0" width="15" height="15" fill="#ec4899" opacity="0.7" />
                <text x="280" y="12" fontSize="12">32:9 Super-wide</text>
              </g>
            </svg>
          </div>
        </section>

        <section className="key-insights">
          <h2>Key Insights</h2>
          <div className="insight-grid">
            <div className="insight-card">
              <h3>Same Height, Different Width</h3>
              <p>A 27" standard (16:9), 34" ultrawide (21:9), and 49" super-wide (32:9) are all ~13" tall. The diagonal size increases because you're stretching wider!</p>
            </div>

            <div className="insight-card">
              <h3>Resolution Independence</h3>
              <p>A 32" 4K and a 43" 4K have the same pixels (3840×2160), but the 43" spreads them across more space - slightly less sharp.</p>
            </div>

            <div className="insight-card">
              <h3>Refresh Rate</h3>
              <p>How many times per second the screen updates:</p>
              <ul>
                <li>30 Hz - Gives headaches</li>
                <li>60 Hz - Standard, fine</li>
                <li>120 Hz - Noticeably smoother</li>
                <li>240 Hz - Hard to tell from 120 Hz</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="diagonal-confusion" id="diagonal-confusion">
          <h2>Why Are Monitors Measured Diagonally?</h2>

          <div className="warning-box">
            <h3>⚠️ Diagonal measurement hides the real story!</h3>
            <p>Monitors are marketed by diagonal size (27", 34", 49"), but <strong>physical height</strong> is what actually determines viewing area. A 49" super-wide and a 27" standard monitor are both ~13" tall - the 49" is just stretched horizontally!</p>
          </div>

          <div className="examples">
            <h3>The confusion this creates:</h3>
            <ul>
              <li>A <strong>49" super-wide</strong> (32:9) is ~13" tall - same height as a <strong>27" standard</strong> (16:9)</li>
              <li>A <strong>34" ultrawide</strong> (21:9) is ~13" tall - also same height class!</li>
              <li>A <strong>43" standard</strong> (16:9) is ~21" tall - much taller than you'd expect from the diagonal</li>
            </ul>
            <p><strong>Why diagonal?</strong> Historical artifact from CRT TV marketing. It made screens sound bigger and allowed comparing across aspect ratios with one number. But it obscures what matters: actual viewing height!</p>
          </div>
        </section>

        <section className="curved-monitors" id="curved-monitors">
          <h2>Curved Monitors</h2>

          <div className="dimension-card">
            <h3>Curvature Rating (e.g., 1000R, 1800R)</h3>
            <p>The "R" number indicates the radius of the curve in millimeters</p>
            <ul>
              <li><strong>1000R</strong> - Aggressive curve (1 meter radius) - wraps around your vision</li>
              <li><strong>1500R</strong> - Moderate curve (1.5 meter radius) - good for ultrawide</li>
              <li><strong>1800R</strong> - Gentle curve (1.8 meter radius) - subtle immersion</li>
            </ul>
            <p><strong>Lower number = tighter curve.</strong> More curve helps with ultrawide/super-wide monitors by keeping edges equidistant from your eyes.</p>
          </div>

          <div className="warning-box">
            <h3>💡 When does curve matter?</h3>
            <p>Curved screens are most beneficial on ultrawide (21:9) and super-wide (32:9) monitors. On standard 16:9 monitors, the curve is less noticeable and may not add much value. The wider the monitor, the more a curve helps maintain consistent viewing distance across the entire screen.</p>
          </div>
        </section>

        <section className="pixel-density" id="pixel-density">
          <h2>Pixel Density (PPI)</h2>

          <div className="dimension-card">
            <h3>What is PPI?</h3>
            <p><strong>Pixels Per Inch</strong> - How tightly packed the pixels are</p>
            <ul>
              <li><strong>Higher PPI</strong> = Sharper text and images</li>
              <li><strong>Lower PPI</strong> = You can see individual pixels (looks fuzzy)</li>
              <li><strong>Sweet spot</strong>: 100-140 PPI for desktop monitors</li>
            </ul>
          </div>

          <div className="examples">
            <h3>Why PPI matters:</h3>
            <ul>
              <li>A <strong>27" at 1440p</strong> = ~109 PPI (sharp, comfortable)</li>
              <li>A <strong>32" at 1440p</strong> = ~92 PPI (noticeably less sharp)</li>
              <li>A <strong>32" at 2160p</strong> = ~138 PPI (very sharp)</li>
              <li>A <strong>43" at 2160p</strong> = ~103 PPI (same pixels spread over larger area)</li>
            </ul>
            <p><strong>The trade-off:</strong> Bigger physical size at the same resolution means lower PPI. You need more pixels (higher resolution) to maintain sharpness on larger monitors.</p>
          </div>

          <div className="warning-box">
            <h3>⚠️ This is why size ≠ better!</h3>
            <p>A 43" 4K monitor has the exact same pixel count as a 32" 4K monitor - just spread over a larger area. Text and images will be the same size in inches, but less sharp on the 43" because the pixels are physically bigger.</p>
          </div>
        </section>

        <section className="panel-type" id="panel-type">
          <h2>Panel Type (IPS vs VA vs TN)</h2>

          <div className="terminology-grid">
            <div className="term-card">
              <h3>IPS (In-Plane Switching)</h3>
              <p><strong>Best for:</strong> Color accuracy and viewing angles</p>
              <ul>
                <li>✅ Excellent color reproduction</li>
                <li>✅ Wide viewing angles (looks good from the side)</li>
                <li>✅ Best for photo/video editing</li>
                <li>❌ More expensive</li>
                <li>❌ Slower response time (motion blur in fast games)</li>
                <li>❌ Weaker contrast (blacks look grayish)</li>
              </ul>
            </div>

            <div className="term-card">
              <h3>VA (Vertical Alignment)</h3>
              <p><strong>Best for:</strong> Contrast and deep blacks</p>
              <ul>
                <li>✅ Best contrast ratio (deep blacks)</li>
                <li>✅ Good for dark room viewing</li>
                <li>✅ Middle ground price</li>
                <li>❌ Narrower viewing angles than IPS</li>
                <li>❌ Color shifts when viewed from angles</li>
                <li>❌ Slower pixel response (ghosting in games)</li>
              </ul>
            </div>

            <div className="term-card">
              <h3>TN (Twisted Nematic)</h3>
              <p><strong>Best for:</strong> Competitive gaming (speed)</p>
              <ul>
                <li>✅ Fastest response time (1ms)</li>
                <li>✅ High refresh rates (240Hz+)</li>
                <li>✅ Cheapest option</li>
                <li>❌ Poor viewing angles</li>
                <li>❌ Washed out colors</li>
                <li>❌ Not good for color work</li>
              </ul>
            </div>
          </div>

          <div className="examples">
            <h3>Which should you choose?</h3>
            <ul>
              <li><strong>Photo/video editing, design work:</strong> IPS (color accuracy matters most)</li>
              <li><strong>Movies, general use, dark room:</strong> VA (contrast and deep blacks)</li>
              <li><strong>Competitive gaming (CS:GO, Valorant):</strong> TN (speed beats everything)</li>
              <li><strong>General gaming, productivity:</strong> IPS (best all-around, modern IPS has decent response times)</li>
            </ul>
          </div>
        </section>

        <section className="mac-tools" id="mac-tools">
          <h2>Mac Tools for Display Management</h2>

          <div className="dimension-card">
            <h3>Command Line Tools</h3>
            <p>Check your current resolution and refresh rate:</p>
            <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`# List all available resolutions
system_profiler SPDisplaysDataType

# Get current resolution
system_profiler SPDisplaysDataType | grep Resolution`}
            </pre>
          </div>

          <div className="dimension-card">
            <h3>BetterDisplay - Force Custom Resolutions</h3>
            <p><a href="https://github.com/waydabber/BetterDisplay" target="_blank" rel="noopener noreferrer">BetterDisplay</a> is a free, open-source tool that lets you:</p>
            <ul>
              <li>Force any resolution your display can handle</li>
              <li>Override system limitations for refresh rates</li>
              <li>Manage HiDPI and scaled resolutions</li>
              <li>Control displays via command line</li>
            </ul>
            <p>Example CLI usage:</p>
            <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '4px', overflow: 'auto' }}>
{`# Set resolution and refresh rate
betterdisplaycli set --resolution=3840x2160 --refreshRate=59.94Hz

# Check current settings
betterdisplaycli get --resolution --refreshRate`}
            </pre>
          </div>

          <div className="dimension-card">
            <h3>4K@120Hz on Apple Silicon Macs</h3>
            <p>Apple Silicon Macs can support 4K@120Hz over HDMI using EDID overrides:</p>
            <ol>
              <li>Install <a href="https://github.com/waydabber/BetterDisplay" target="_blank" rel="noopener noreferrer">BetterDisplay</a> and <a href="https://www.analogway.com/americas/products/software-tools/aw-edid-editor/" target="_blank" rel="noopener noreferrer">AW EDID Editor</a></li>
              <li>Export your display's EDID binary using BetterDisplay</li>
              <li>Edit the EDID in AW EDID Editor:
                <ul>
                  <li>Change EDID format to V1.4 (change Revision from 3 to 4)</li>
                  <li>Change Video Interface bits to DisplayPort (0101)</li>
                </ul>
              </li>
              <li>Upload and apply the modified EDID in BetterDisplay</li>
              <li>Set your resolution to 4K@120Hz</li>
            </ol>
            <p>Note: Some adapters may need firmware updates. <a href="https://forums.macrumors.com/threads/mac-mini-4k-120hz.2267035/page-31?post=31952813#post-31952813" target="_blank" rel="noopener noreferrer">More details on MacRumors</a></p>
          </div>

          <div className="dimension-card">
            <h3>TestUFO - Verify Your Settings</h3>
            <p>Use <a href="https://www.testufo.com/refreshrate" target="_blank" rel="noopener noreferrer">TestUFO</a> to verify your display's refresh rate and resolution:</p>
            <ul>
              <li>Close other apps and browser tabs</li>
              <li>Run the test for at least 30 seconds</li>
              <li>Use full-screen mode</li>
            </ul>
            <p>TestUFO helps identify frame skipping and confirms if your custom settings are actually working.</p>
          </div>

          <div className="warning-box">
            <h3>💡 Tips</h3>
            <ul>
              <li>For external displays, try "Default for display" first</li>
              <li>Hold Option key in Display settings to access HiDPI modes</li>
              <li>Some USB-C to HDMI adapters work better than others for high refresh rates</li>
              <li>YCbCr422 color format is typically used for 4K@120Hz</li>
            </ul>
          </div>
        </section>

        <section className="terminology" id="p-vs-k">
          <h2>The "p" vs "K" Confusion</h2>

          <div className="warning-box">
            <h3>⚠️ Neither tells you full dimensions!</h3>
            <p>Both "p" and "K" notation are incomplete - that's why you get weird abbreviations like WQHD, UWQHD, QHD+, etc. You always need to know BOTH resolution AND aspect ratio to understand monitor dimensions.</p>
          </div>

          <div className="terminology-grid">
            <div className="term-card">
              <h3>"p" notation</h3>
              <p>Measures <strong>vertical</strong> pixels (height only)</p>
              <ul>
                <li>1080p = 1080 pixels tall</li>
                <li>1440p = 1440 pixels tall</li>
                <li>2160p = 2160 pixels tall</li>
              </ul>
              <p className="problem">Problem: Doesn't tell you width! Width depends on aspect ratio.</p>
            </div>

            <div className="term-card">
              <h3>"K" notation</h3>
              <p>Measures <strong>horizontal</strong> pixels (width only)</p>
              <ul>
                <li>2K ≈ 2560 pixels wide (16:9)</li>
                <li>4K ≈ 3840 pixels wide (16:9)</li>
                <li>4K ≈ 5120 pixels wide (21:9)</li>
              </ul>
              <p className="problem">Problem: "4K" means different widths depending on aspect ratio!</p>
            </div>
          </div>

          <div className="examples">
            <h3>Why the weird abbreviations?</h3>
            <p>Since neither "p" nor "K" is enough, the industry invented confusing acronyms:</p>
            <ul>
              <li><strong>QHD</strong> (Quad HD) = 2560×1440 (16:9) = 1440p</li>
              <li><strong>WQHD</strong> (Wide QHD) = 3440×1440 (21:9) = 1440p ultrawide</li>
              <li><strong>UWQHD</strong> (Ultra-Wide QHD) = 3440×1440 (21:9) - same as WQHD!</li>
              <li><strong>UHD</strong> (Ultra HD) = 3840×2160 (16:9) = 4K = 2160p</li>
              <li><strong>5K2K</strong> = 5120×2160 (21:9) = 2160p ultrawide</li>
            </ul>
            <p><strong>Bottom line:</strong> Just use the actual resolution (e.g., 3840×2160) to avoid confusion!</p>
          </div>
        </section>
      </main>

      <footer>
        <p>Made with data from <a href="https://idvorkin.github.io/irl#monitors" target="_blank" rel="noopener noreferrer">Igor's IRL blog</a></p>
      </footer>
    </div>
  )
}

export default App
