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
      const draggedMonitor = selectedMonitors.find((_, i) => `${selectedMonitors[i].name}-${i}` === draggingMonitor)
      if (!draggedMonitor) return

      const otherWidth = monitor.width * scale
      const otherHeight = monitor.height * scale
      const draggedWidth = draggedMonitor.width * scale
      const draggedHeight = draggedMonitor.height * scale

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
        <p className="subtitle">Understanding aspect ratios, physical size, and resolution</p>
      </header>

      <main>
        <section className="explainer">
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

        <section className="terminology">
          <h2>The "p" vs "K" Confusion</h2>
          <div className="terminology-grid">
            <div className="term-card">
              <h3>"p" notation</h3>
              <p>Measures <strong>vertical</strong> pixels (height)</p>
              <ul>
                <li>1080p = 1080 pixels tall</li>
                <li>1440p = 1440 pixels tall</li>
                <li>2160p = 2160 pixels tall</li>
              </ul>
              <p className="problem">Problem: Doesn't tell you width! Width depends on aspect ratio.</p>
            </div>

            <div className="term-card">
              <h3>"K" notation</h3>
              <p>Measures <strong>horizontal</strong> pixels (width)</p>
              <ul>
                <li>2K ≈ 2560 pixels wide</li>
                <li>4K ≈ 3840 pixels wide (for 16:9)</li>
                <li>4K ≈ 5120 pixels wide (for 21:9)</li>
              </ul>
            </div>
          </div>

          <div className="examples">
            <h3>Examples:</h3>
            <ul>
              <li><strong>1440p at 16:9</strong> = 2560×1440 (standard monitor)</li>
              <li><strong>1440p at 21:9</strong> = 3440×1440 (ultrawide monitor)</li>
              <li><strong>2160p at 16:9</strong> = 3840×2160 (standard 4K)</li>
              <li><strong>2160p at 21:9</strong> = 5120×2160 (ultrawide 4K)</li>
            </ul>
          </div>
        </section>

        <section className="monitor-selector">
          <h2>Visual Comparison</h2>

          <div className="view-mode-selector">
            <p>Group by:</p>
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

          <p>Select monitors to compare (click to add, can add multiple of same model):</p>

          <div className="monitor-chips">
            {monitors.map(monitor => (
              <button
                key={monitor.name}
                className="monitor-chip"
                onClick={() => toggleMonitor(monitor)}
              >
                {monitor.name}
                <span className="chip-details">
                  {monitor.resolutionX}×{monitor.resolutionY}
                </span>
              </button>
            ))}
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
            <p>Zoom: {zoom.toFixed(1)}x | Drag canvas to pan, drag monitors to arrange, scroll to zoom</p>
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
                    const rectWidth = monitor.width * scale
                    const rectHeight = monitor.height * scale
                    const position = monitorPositions[monitorId] || { x: 0, y: 0 }
                    const finalX = baseX + position.x
                    const finalY = baseY + position.y
                    return (
                      <g key={monitorId}>
                        <g
                          style={{ cursor: 'move', transition: draggingMonitor === monitorId ? 'none' : 'all 0.5s ease' }}
                          onMouseDown={(e) => handleMonitorMouseDown(e, monitorId)}
                        >
                          <rect
                            x={finalX}
                            y={finalY}
                            width={rectWidth}
                            height={rectHeight}
                            fill={monitor.aspectRatio === '16:9' ? '#3b82f6' : monitor.aspectRatio === '21:9' ? '#8b5cf6' : '#ec4899'}
                            stroke="#1e40af"
                            strokeWidth="2"
                            opacity="0.4"
                          />
                          <text
                            x={finalX + rectWidth / 2}
                            y={finalY + rectHeight / 2}
                            textAnchor="middle"
                            fontSize="14"
                            fontWeight="bold"
                            fill="white"
                          >
                            {monitor.name}
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
                            cx={finalX + rectWidth - 10}
                            cy={finalY + 10}
                            r="8"
                            fill="#ef4444"
                            stroke="white"
                            strokeWidth="1"
                          />
                          <text
                            x={finalX + rectWidth - 10}
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
                        const rectWidth = monitor.width * scale
                        const rectHeight = monitor.height * scale
                        const position = monitorPositions[monitorId] || { x: 0, y: 0 }
                        const finalX = xOffset + position.x
                        const finalY = group.y + position.y
                        const rect = (
                          <g key={monitorId}>
                            <g
                              style={{ cursor: 'move', transition: draggingMonitor === monitorId ? 'none' : 'all 0.5s ease' }}
                              onMouseDown={(e) => handleMonitorMouseDown(e, monitorId)}
                            >
                              <rect
                                x={finalX}
                                y={finalY}
                                width={rectWidth}
                                height={rectHeight}
                                fill={monitor.aspectRatio === '16:9' ? '#3b82f6' : monitor.aspectRatio === '21:9' ? '#8b5cf6' : '#ec4899'}
                                stroke="#1e40af"
                                strokeWidth="2"
                                opacity="0.7"
                              />
                              <text
                                x={finalX + rectWidth / 2}
                                y={finalY + rectHeight / 2 - 10}
                                textAnchor="middle"
                                fontSize="14"
                                fontWeight="bold"
                                fill="white"
                              >
                                {monitor.name}
                              </text>
                              <text
                                x={finalX + rectWidth / 2}
                                y={finalY + rectHeight / 2 + 10}
                                textAnchor="middle"
                                fontSize="12"
                                fill="white"
                              >
                                {monitor.resolutionX}×{monitor.resolutionY}
                              </text>
                              <text
                                x={finalX + rectWidth / 2}
                                y={finalY + rectHeight / 2 + 25}
                                textAnchor="middle"
                                fontSize="11"
                                fill="white"
                              >
                                {monitor.width.toFixed(1)}" × {monitor.height.toFixed(1)}"
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
                                cx={finalX + rectWidth - 10}
                                cy={finalY + 10}
                                r="8"
                                fill="#ef4444"
                                stroke="white"
                                strokeWidth="1"
                              />
                              <text
                                x={finalX + rectWidth - 10}
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
                        xOffset += rectWidth + 20
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
      </main>

      <footer>
        <p>Made with data from <a href="https://idvorkin.github.io/irl#monitors" target="_blank" rel="noopener noreferrer">Igor's IRL blog</a></p>
      </footer>
    </div>
  )
}

export default App
