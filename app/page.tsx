import App from '@/components/App'
import { WorkspaceProvider } from '@/components/WorkspaceProvider'

export default function Page() {
  return <WorkspaceProvider><App /></WorkspaceProvider>
}
