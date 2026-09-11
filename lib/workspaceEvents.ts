export const WORKSPACE_EVENTS = {
  resourcesChanged: 'evidencegraph:resources-changed',
  graphRefresh: 'evidencegraph:graph-refresh',
  integrityRefresh: 'evidencegraph:integrity-refresh',
} as const

export function emitWorkspaceEvent(name: string, detail?: unknown) {
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(name, { detail }))
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel('evidencegraph-workspace')
    channel.postMessage({ name, detail })
    channel.close()
  }
}

export function subscribeWorkspaceEvent(name: string, listener: (detail?: unknown) => void) {
  if (typeof window === 'undefined') return () => undefined
  const onWindowEvent = (event: Event) => listener((event as CustomEvent).detail)
  window.addEventListener(name, onWindowEvent)
  const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('evidencegraph-workspace') : undefined
  const onChannelMessage = (event: MessageEvent<{ name: string; detail?: unknown }>) => {
    if (event.data?.name === name) listener(event.data.detail)
  }
  channel?.addEventListener('message', onChannelMessage)
  return () => {
    window.removeEventListener(name, onWindowEvent)
    channel?.removeEventListener('message', onChannelMessage)
    channel?.close()
  }
}
