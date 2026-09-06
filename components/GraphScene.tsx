import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { entityById, graphEdges, graphNodes, type GraphEdge, type GraphNode } from '../src/data'

type Props = { focusId?: string; onSelect?: (id: string) => void; communities?: boolean }
type GraphPayload = { source: string; nodes: GraphNode[]; edges: GraphEdge[] }
const palette = { observed: '#ffffff', corroborated: '#bdbdbd', predicted: '#777777' }
const typeColor: Record<string, string> = { PERSON: '#ffffff', PHONE: '#bdbdbd', VEHICLE: '#999999', BANK_ACCOUNT: '#707070', LOCATION: '#d7d7d7', ORGANIZATION: '#4d4d4d' }

export function GraphScene({ focusId, onSelect, communities = true }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const focusRef = useRef(focusId)
  const selectRef = useRef(onSelect)
  const [payload, setPayload] = useState<GraphPayload>({ source: 'local fallback', nodes: graphNodes, edges: graphEdges })
  focusRef.current = focusId
  selectRef.current = onSelect

  useEffect(() => {
    const api = process.env.NEXT_PUBLIC_GRAPH_API || ''
    fetch(`${api}/api/graph?limit=220`).then((response) => response.ok ? response.json() : Promise.reject()).then((data: GraphPayload) => setPayload(data)).catch(() => undefined)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const scene = new THREE.Scene()
    scene.background = new THREE.Color('#111111')
    const camera = new THREE.PerspectiveCamera(42, mount.clientWidth / mount.clientHeight, 0.1, 1000)
    camera.position.set(0, 0, 16)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.setSize(mount.clientWidth, mount.clientHeight); mount.appendChild(renderer.domElement)
    const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = 0.06; controls.minDistance = 5; controls.maxDistance = 30
    scene.add(new THREE.AmbientLight('#ffffff', 1.7))
    const point = new THREE.PointLight('#ffffff', 15, 28); point.position.set(0, 3, 7); scene.add(point)
    const group = new THREE.Group(); scene.add(group)
    const positions: Record<string, THREE.Vector3> = {}
    const count = payload.nodes.length
    payload.nodes.forEach((node, index) => {
      const angle = (index / count) * Math.PI * 2
      const ring = node.type === 'PERSON' ? 4.6 : node.type === 'LOCATION' ? 5.7 : 6.5
      positions[node.id] = new THREE.Vector3(Math.cos(angle) * ring, Math.sin(angle * 2.4) * (node.type === 'PERSON' ? 2.2 : 2.8), Math.sin(angle) * ring * 0.42)
    })
    const nodeMeshes = new Map<string, THREE.Mesh>()
    payload.nodes.forEach((node) => {
      const isPerson = node.type === 'PERSON'
      const isFocus = node.id === 'P003'
      const material = new THREE.MeshStandardMaterial({ color: typeColor[node.type] || '#60758b', emissive: typeColor[node.type] || '#60758b', emissiveIntensity: 0.23, roughness: 0.58 })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(isFocus ? 0.46 : isPerson ? 0.3 : 0.2, 18, 12), material)
      mesh.position.copy(positions[node.id]); mesh.userData = { id: node.id }; group.add(mesh); nodeMeshes.set(node.id, mesh)
      if (isFocus || isPerson) { const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(isFocus ? 0.61 : 0.4, 0.015, 7, 24), new THREE.MeshBasicMaterial({ color: isFocus ? '#ffffff' : '#777777', transparent: true, opacity: 0.62 })); ringMesh.rotation.x = Math.PI / 2; ringMesh.position.copy(mesh.position); group.add(ringMesh) }
    })
    const lineGroup = new THREE.Group(); group.add(lineGroup)
    payload.edges.forEach((edge) => {
      const a = positions[edge.source]; const b = positions[edge.target]
      if (!a || !b) return
      const material = edge.status === 'predicted' ? new THREE.LineDashedMaterial({ color: palette.predicted, transparent: true, opacity: 0.68, dashSize: 0.16, gapSize: 0.11 }) : new THREE.LineBasicMaterial({ color: palette[edge.status] || palette.observed, transparent: true, opacity: edge.status === 'corroborated' ? 0.72 : 0.48 })
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), material); line.userData = { id: edge.id, source: edge.source, target: edge.target }; if (edge.status === 'predicted') line.computeLineDistances(); lineGroup.add(line)
    })
    const raycaster = new THREE.Raycaster(); const pointer = new THREE.Vector2()
    const onPointer = (event: PointerEvent) => { const bounds = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1; pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1; raycaster.setFromCamera(pointer, camera); const hit = raycaster.intersectObjects(Array.from(nodeMeshes.values()))[0]; if (hit?.object.userData.id) selectRef.current?.(hit.object.userData.id) }
    renderer.domElement.addEventListener('pointerup', onPointer)
    const resize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight) }; window.addEventListener('resize', resize)
    let frame = 0; const animate = () => { frame = requestAnimationFrame(animate); const focused = focusRef.current; nodeMeshes.forEach((mesh, id) => { const material = mesh.material as THREE.MeshStandardMaterial; mesh.scale.setScalar(focused && id !== focused ? 0.82 : 1); material.emissiveIntensity = id === focused ? 0.88 : 0.23 }); group.rotation.y += 0.00045; controls.update(); renderer.render(scene, camera) }; animate()
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize); renderer.domElement.removeEventListener('pointerup', onPointer); controls.dispose(); renderer.dispose(); mount.removeChild(renderer.domElement) }
  }, [payload, communities])

  const focusedName = entityById(focusId || '')?.name || payload.nodes.find((node) => node.id === focusId)?.name
  return <div className="graph-canvas" ref={mountRef}><div className="graph-hint">Drag to orbit · scroll to zoom · click an entity</div><div className="graph-labels"><span><i className="dot observed" />Observed</span><span><i className="dot corroborated" />Corroborated</span><span><i className="dot predicted" />Predicted lead</span></div><div className="graph-focus">{focusedName || 'All graph entities'}<small>{payload.source === 'neo4j' ? 'live Neo4j knowledge graph' : `${payload.nodes.length} nodes · local fallback`}</small></div><div className="graph-type-key">{['PERSON', 'PHONE', 'LOCATION', 'BANK_ACCOUNT'].map((type) => <span key={type}><i style={{ background: typeColor[type] }} />{type.replace('_', ' ')}</span>)}</div></div>
}
