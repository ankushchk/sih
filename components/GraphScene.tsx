"use client"

import { useEffect, useRef, useState } from 'react'
import { DataSet } from 'vis-data/peer'
import { Network } from 'vis-network/peer'
import type { Edge, Node } from 'vis-network/peer'
import { entityById, graphEdges, graphNodes, type GraphEdge, type GraphNode } from '@/src/data'
import { subscribeWorkspaceEvent, WORKSPACE_EVENTS } from '@/lib/workspaceEvents'

type Props = { focusId?: string; onSelect?: (id: string) => void; communities?: boolean; searchQuery?: string; statusFilter?: 'all' | 'observed' | 'corroborated' | 'predicted'; expanded?: boolean; caseId?: string; pathNodes?: string[]; pathEdges?: string[] }
type GraphPayload = { source: string; nodes: GraphNode[]; edges: GraphEdge[] }

function degreeFor(nodes: GraphNode[], edges: GraphEdge[]) {
  return new Map(nodes.map((node) => [node.id, edges.filter((edge) => edge.source === node.id || edge.target === node.id).length]))
}

function nodeShape(degree: number, id: string) {
  if (id === 'P003' || degree >= 7) return 'star'
  if (degree >= 4) return 'triangle'
  return 'dot'
}

function clusterColor(node: GraphNode) {
  const colors: Record<string, string> = { Delhi: '#e6194b', Noida: '#ffe119', Ghaziabad: '#4363d8', Gurugram: '#3cb44b' }
  return colors[node.jurisdiction || ''] || (node.type === 'LOCATION' ? '#8b8b8b' : '#6b7280')
}

export function GraphScene({ focusId, onSelect, searchQuery = '', statusFilter = 'all', expanded = false, caseId = '', communities = false, pathNodes = [], pathEdges = [] }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)
  const selectRef = useRef(onSelect)
  const [payload, setPayload] = useState<GraphPayload>({ source: 'local fallback', nodes: graphNodes, edges: graphEdges })
  const [isLive, setIsLive] = useState(false)
  selectRef.current = onSelect

  useEffect(() => {
    const loadGraph = () => {
      const api = process.env.NEXT_PUBLIC_GRAPH_API || ''
      const controller = new AbortController()
      const timeout = window.setTimeout(() => controller.abort(), 5000)
      const endpoint = expanded && focusId ? `${api}/api/graph/neighborhood?focusId=${encodeURIComponent(focusId)}&caseId=${encodeURIComponent(caseId)}` : `${api}/api/graph?limit=220&caseId=${encodeURIComponent(caseId)}`
      return fetch(endpoint, { signal: controller.signal })
        .finally(() => window.clearTimeout(timeout))
        .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: GraphPayload) => { setPayload(data); setIsLive(data.source === 'neo4j') })
      .catch(() => setIsLive(false))
    }
    void loadGraph()
    return subscribeWorkspaceEvent(WORKSPACE_EVENTS.graphRefresh, () => void loadGraph())
  }, [expanded, focusId, caseId])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    networkRef.current?.destroy()
    const visibleEdges = statusFilter === 'all' ? payload.edges : payload.edges.filter((edge) => edge.status === statusFilter)
    const pathNodeSet = new Set(pathNodes)
    const pathEdgeSet = new Set(pathEdges)
    const degrees = degreeFor(payload.nodes, visibleEdges)
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const matchesNode = (node: GraphNode) => !normalizedSearch || [node.id, node.name, node.alias, node.type, node.jurisdiction]
      .filter(Boolean)
      .some((value) => value!.toLowerCase().includes(normalizedSearch))
    const matchingIds = new Set(payload.nodes.filter(matchesNode).map((node) => node.id))
    const nodes = new DataSet<Node>(payload.nodes.map((node) => {
      const degree = degrees.get(node.id) ?? 0
      const isPerson = node.type === 'PERSON'
      const isMatch = matchingIds.has(node.id)
      return {
        id: node.id,
        label: isPerson ? node.name : node.name,
        title: `${node.name} (${node.id})\nType: ${node.type}\nConnections: ${degree}${node.alias ? `\nAlias: ${node.alias}` : ''}`,
        shape: nodeShape(degree, node.id),
        size: Math.max(13, Math.min(34, 13 + degree * 2.2)),
        color: { background: clusterColor(node), border: '#101010', highlight: { background: '#ffffff', border: '#ffffff' }, hover: { background: '#ffffff', border: '#ffffff' } },
        font: { color: '#ffffff', size: isPerson ? 14 : 11, face: 'Arial', strokeWidth: 4, strokeColor: '#111111' },
         opacity: pathNodes.length ? pathNodeSet.has(node.id) ? 1 : 0.12 : isMatch ? 1 : 0.2,
         group: communities ? node.jurisdiction || node.type : undefined,
        borderWidth: isMatch && normalizedSearch ? 4 : node.id === 'P003' ? 3 : 1.5,
        shadow: { enabled: node.id === 'P003' || (isMatch && Boolean(normalizedSearch)), color: '#000000', size: 4, x: 2, y: 2 },
      }
    }))
    const edges = new DataSet<Edge>(visibleEdges.map((edge) => ({
      id: edge.id,
      from: edge.source,
      to: edge.target,
      label: edge.type.replaceAll('_', ' '),
      title: `${edge.type.replaceAll('_', ' ')}\nStatus: ${edge.status}\nSources: ${edge.evidence?.join(', ') || 'graph signal'}`,
      width: edge.status === 'corroborated' ? 4 : 1.2,
      dashes: edge.status === 'predicted' ? [8, 6] : false,
       color: { color: pathEdges.length && pathEdgeSet.has(String(edge.id)) ? '#ffad61' : !normalizedSearch || matchingIds.has(edge.source) || matchingIds.has(edge.target) ? edge.status === 'predicted' ? '#c1a4ef' : edge.status === 'corroborated' ? '#65dcb0' : '#9ec4e7' : '#31404d', opacity: pathEdges.length ? pathEdgeSet.has(String(edge.id)) ? 1 : 0.1 : !normalizedSearch || matchingIds.has(edge.source) || matchingIds.has(edge.target) ? 1 : 0.2, highlight: '#ffffff', hover: '#ffffff' },
      arrows: { to: { enabled: true, scaleFactor: 0.45 } },
      font: { color: '#dddddd', size: 9, face: 'Arial', strokeWidth: 3, strokeColor: '#111111', align: 'middle' },
      smooth: false,
    })))
    const network = new Network(mount, { nodes, edges }, {
      autoResize: true,
      height: '100%',
      width: '100%',
      layout: { improvedLayout: true },
      physics: { enabled: true, stabilization: { iterations: 280, fit: true }, barnesHut: { gravitationalConstant: -7200, centralGravity: 0.12, springLength: 190, springConstant: 0.035, damping: 0.14 } },
      interaction: { hover: true, tooltipDelay: 120, dragNodes: true, dragView: true, zoomView: true, hoverConnectedEdges: true, navigationButtons: false, keyboard: true },
      nodes: { scaling: { min: 10, max: 28 }, chosen: true },
      edges: { selectionWidth: 3, hoverWidth: 1.5 },
    })
    network.on('click', (event) => { const id = event.nodes?.[0]; if (typeof id === 'string') selectRef.current?.(id) })
    networkRef.current = network
    return () => { network.destroy(); networkRef.current = null }
  }, [payload, searchQuery, statusFilter])

  useEffect(() => {
    const network = networkRef.current
    if (!network) return
    const normalizedSearch = searchQuery.trim().toLowerCase()
    const firstMatch = normalizedSearch
      ? payload.nodes.find((node) => [node.id, node.name, node.alias, node.type, node.jurisdiction]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(normalizedSearch)))?.id
      : undefined
    const target = firstMatch || focusId
    if (!target) return
    network.selectNodes([target])
    network.focus(target, { scale: 1.15, animation: { duration: 450, easingFunction: 'easeInOutQuad' } })
  }, [focusId, payload, searchQuery])

  const focusedName = entityById(focusId || '')?.name || payload.nodes.find((node) => node.id === focusId)?.name
  return <div className="graph-canvas vis-graph-canvas" ref={mountRef}>
    <div className="graph-control-box"><button onClick={() => networkRef.current?.fit({ animation: { duration: 450, easingFunction: 'easeInOutQuad' } })}>↻ Reset layout</button><p><strong>Drag any node to reposition it.</strong><br />Star = bridge candidate · Triangle = high connectivity · Dot = entity<br />Color = jurisdiction cluster · Size = graph connectivity</p></div>
    <div className="graph-hint">Drag nodes · scroll to zoom · hover for provenance · click to inspect</div>
    <div className="graph-labels"><span><i className="dot observed" />Observed</span><span><i className="dot corroborated" />Corroborated</span><span><i className="dot predicted" />Predicted lead</span></div>
    <div className="graph-focus">{searchQuery.trim() ? `${payload.nodes.filter((node) => [node.id, node.name, node.alias, node.type, node.jurisdiction].filter(Boolean).some((value) => value!.toLowerCase().includes(searchQuery.trim().toLowerCase()))).length} matching entities` : focusedName || 'All graph entities'}<small>{isLive ? 'live Neo4j knowledge graph' : 'offline demo graph'}</small></div>
    <div className="graph-shape-key"><span><b className="shape-red" />Delhi</span><span><b className="shape-yellow" />Noida</span><span><b className="shape-blue" />Ghaziabad</span><span><b className="shape-green" />Gurugram</span></div>
  </div>
}
