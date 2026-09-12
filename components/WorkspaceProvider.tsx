"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { type Resource } from "@/src/data";
import { subscribeWorkspaceEvent, WORKSPACE_EVENTS } from "@/lib/workspaceEvents";

export type WorkspaceResource = Resource & {
  extractions?: { entityId: string; canonicalName: string; rawMention: string; confidence: number }[];
  connections?: { id: string; sourceName: string; targetName: string; confidence: number }[];
  integrityEntryHash?: string;
  lastIntegrityEventHash?: string;
};

export type WorkspaceSummary = {
  caseId: string;
  case: { id: string; title: string; status: string; priority: string; jurisdiction: string };
  metrics: { activeCases: number; evidenceRecords: number; entitiesResolved: number; openLeads: number; processedRecords: number; processingPercent: number; pipeline: { ingested: number; extracted: number; resolved: number; inGraph: number } };
  lead: { rank: string; name: string; id: string; label: string; score: string; reason: string; signals: string[] } | null;
  leads: { rank: string; name: string; id: string; label: string; score: string; reason: string; signals: string[] }[];
  activity: { id: string; time: string; title: string; detail: string; tone: string }[];
};

export type WorkspaceCase = {
  id: string;
  title: string;
  status: string;
  priority: string;
  jurisdiction: string;
  evidenceCount?: number;
};
export type WorkspaceRole = 'Investigator' | 'Supervisor' | 'Auditor';
export type WorkspacePattern = { type: string; score?: number; signals: string[]; relationship?: string; caseId?: string; source?: { id: string; name: string }; target?: { id: string; name: string } };

type WorkspaceContextValue = {
  activeCaseId: string;
  role: WorkspaceRole;
  cases: WorkspaceCase[];
  setActiveCaseId: (caseId: string) => void;
  resources: WorkspaceResource[];
  summary: WorkspaceSummary | null;
  patterns: WorkspacePattern[];
  loading: boolean;
  error: string | null;
  refreshResources: () => Promise<void>;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeCaseId, setActiveCaseId] = useState("CASE-1004");
  const [role, setRole] = useState<WorkspaceRole>('Investigator');
  const [cases, setCases] = useState<WorkspaceCase[]>([]);
  const [resources, setResources] = useState<WorkspaceResource[]>([]);
  const [summary, setSummary] = useState<WorkspaceSummary | null>(null);
  const [patterns, setPatterns] = useState<WorkspacePattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshResources = async () => {
    try {
      const response = await fetch(`/api/resources?caseId=${encodeURIComponent(activeCaseId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Resource list unavailable");
      const data = (await response.json()) as { resources: WorkspaceResource[] };
      setResources((current) => {
        return data.resources;
      });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Resource list unavailable");
    } finally {
      setLoading(false);
    }
  };

  const refreshSummary = async () => {
    try {
      const response = await fetch(`/api/summary?caseId=${encodeURIComponent(activeCaseId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Workspace summary unavailable");
      setSummary((await response.json()) as WorkspaceSummary);
    } catch {
      setSummary(null);
    }
  };

  const refreshCases = async () => {
    try {
      const response = await fetch('/api/cases', { cache: 'no-store' });
      if (!response.ok) throw new Error('Cases unavailable');
      const data = (await response.json()) as { cases: WorkspaceCase[] };
      setCases(data.cases);
      if (!data.cases.some((item) => item.id === activeCaseId) && data.cases[0]) setActiveCaseId(data.cases[0].id);
    } catch {
      setCases([]);
    }
  };

  const refreshPatterns = async () => {
    try {
      const response = await fetch(`/api/patterns?caseId=${encodeURIComponent(activeCaseId)}`, { cache: 'no-store' });
      if (response.ok) setPatterns(((await response.json()) as { patterns: WorkspacePattern[] }).patterns || []);
    } catch { setPatterns([]) }
  };

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (response.ok) setRole(((await response.json()) as { role: WorkspaceRole }).role)
    } catch { /* The investigator role remains the safe prototype default. */ }
  };

  useEffect(() => {
    void refreshResources();
    void refreshSummary();
    void refreshCases();
    void refreshSession();
    void refreshPatterns();
    const unsubscribe = subscribeWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, () => { void refreshResources(); void refreshSummary(); });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    void refreshResources();
    void refreshSummary();
    void refreshPatterns();
    const interval = window.setInterval(() => { void refreshResources(); void refreshSummary(); void refreshPatterns(); }, 5000);
    return () => window.clearInterval(interval);
  }, [activeCaseId]);

  return <WorkspaceContext.Provider value={{ activeCaseId, setActiveCaseId, role, cases, resources, summary, patterns, loading, error, refreshResources }}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used inside WorkspaceProvider");
  return context;
}
