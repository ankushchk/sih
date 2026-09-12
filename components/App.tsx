"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRight,
  AudioLines,
  Bell,
  BookOpen,
  BrainCircuit,
  Check,
  ChevronRight,
  CircleAlert,
  CarFront,
  Clock3,
  FileCheck2,
  FileText,
  Fingerprint,
  GitBranch,
  Globe2,
  Hexagon,
  KeyRound,
  LockKeyhole,
  LogIn,
  Menu,
  Network,
  PanelLeft,
  Play,
  Search,
  ScanFace,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { GraphScene } from "@/components/GraphScene";
import { AskPanel } from "@/components/AskPanel";
import { emitWorkspaceEvent, subscribeWorkspaceEvent, WORKSPACE_EVENTS } from "@/lib/workspaceEvents";
import { useWorkspace } from "@/components/WorkspaceProvider";
import { CURRENT_USER } from "@/lib/currentUser";
import {
  cases,
  entityById,
  evidence,
  people,
  relationships,
  resources,
  type Resource,
} from "@/src/data";

type View =
  | "overview"
  | "cases"
  | "resources"
  | "evidence"
  | "network"
  | "intelligence"
  | "matching"
  | "timeline"
  | "security"
  | "integrity";

function App() {
  const { activeCaseId, cases: workspaceCases, setActiveCaseId, summary } = useWorkspace();
  const [screen, setScreen] = useState<"landing" | "login" | "app">("landing");
  const [view, setView] = useState<View>("network");
  const [selectedEntity, setSelectedEntity] = useState("P003");
  const [selectedEdge, setSelectedEdge] = useState("P001-P003");
  const [relationshipDrawerOpen, setRelationshipDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sidebar, setSidebar] = useState(true);
  const [processed, setProcessed] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    setSidebar(window.innerWidth > 980);
  }, []);

  useEffect(() => {
    setSelectedEntity("");
    setSelectedEdge("");
    setRelationshipDrawerOpen(false);
  }, [activeCaseId]);

  if (screen === "landing")
    return <Landing onEnter={() => setScreen("login")} />;
  if (screen === "login") return <Login onLogin={(role) => { void fetch("/api/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role, userId: CURRENT_USER.id }) }); setScreen("app"); }} />;

  const selected = entityById(selectedEntity);
  const edge =
    relationships.find((item) => item.id === selectedEdge) ?? relationships[1];
  const edgeSource = entityById(edge.source)?.name ?? edge.source;
  const edgeTarget = entityById(edge.target)?.name ?? edge.target;

  const createRelationshipResource = async () => {
    await fetch('/api/resources/manual', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caseId: activeCaseId, source: edge.source, target: edge.target, sourceName: edgeSource, targetName: edgeTarget, type: edge.type, confidence: edge.confidence, note: `Investigator note: ${edgeSource} and ${edgeTarget} are being reviewed for a ${edge.type.replaceAll('_', ' ').toLowerCase()} relationship.` }) });
    emitWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, { caseId: activeCaseId });
    setView('resources');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebar ? "" : "collapsed"}`}>
        <div className="brand">
          <span className="brand-mark">
            <Hexagon size={18} strokeWidth={1.5} />
          </span>
          {sidebar && (
            <span>
              Evidence<span className="brand-accent">Graph</span>
            </span>
          )}
        </div>
        {sidebar && (
          <div className="case-selector">
            <span className="eyebrow">ACTIVE INVESTIGATION</span>
            <select className="case-selector-select" value={activeCaseId} onChange={(event) => setActiveCaseId(event.target.value)} aria-label="Active investigation">
              {(workspaceCases.length ? workspaceCases : [{ id: activeCaseId, title: activeCaseId, status: "", priority: "", jurisdiction: "" }]).map((item) => <option key={item.id} value={item.id}>{item.id}</option>)}
            </select>
            <span className="case-selector-title">{summary?.case.title || "Loading investigation..."}</span>
            <ChevronRight size={15} />
          </div>
        )}
        <nav className="nav-list">
          <NavItem
            icon={<PanelLeft size={17} />}
            label="Command center"
            active={view === "overview"}
            onClick={() => setView("overview")}
            compact={!sidebar}
          />
          <NavItem
            icon={<BookOpen size={17} />}
            label="Cases"
            active={view === "cases"}
            onClick={() => setView("cases")}
            compact={!sidebar}
            badge={summary ? String(summary.metrics.activeCases) : "—"}
          />
          <NavItem
            icon={<FileText size={17} />}
            label="Evidence inbox"
            active={view === "evidence"}
            onClick={() => setView("evidence")}
            compact={!sidebar}
            badge={summary ? String(summary.metrics.evidenceRecords) : "—"}
          />
          <NavItem
            icon={<Globe2 size={17} />}
            label="Resource library"
            active={view === "resources"}
            onClick={() => setView("resources")}
            compact={!sidebar}
            badge={summary ? String(summary.metrics.evidenceRecords) : "—"}
          />
          <div className="nav-section">INVESTIGATE</div>
          <NavItem
            icon={<Network size={17} />}
            label="Network graph"
            active={view === "network"}
            onClick={() => setView("network")}
            compact={!sidebar}
          />
          <NavItem
            icon={<BrainCircuit size={17} />}
            label="Intelligence"
            active={view === "intelligence"}
            onClick={() => setView("intelligence")}
            compact={!sidebar}
            badge={summary ? String(summary.metrics.openLeads) : "—"}
          />
          <NavItem
            icon={<Clock3 size={17} />}
            label="Timeline"
            active={view === "timeline"}
            onClick={() => setView("timeline")}
            compact={!sidebar}
          />
          <div className="nav-section">MATCHING</div>
          <NavItem
            icon={<ScanFace size={17} />}
            label="Identity matching"
            active={view === "matching"}
            onClick={() => setView("matching")}
            compact={!sidebar}
            badge={summary ? String(summary.metrics.entitiesResolved) : "—"}
          />
          <div className="nav-section">CONTROL</div>
            <NavItem
            icon={<Fingerprint size={17} />}
            label="Evidence integrity"
            active={view === "integrity"}
            onClick={() => setView("integrity")}
            compact={!sidebar}
          />
          <NavItem
            icon={<ShieldCheck size={17} />}
            label="Security & access"
            active={view === "security"}
            onClick={() => setView("security")}
            compact={!sidebar}
          />
        </nav>
        {sidebar && (
          <div className="sidebar-bottom">
            <div className="secure-note">
              <LockKeyhole size={15} />
              <span>
                Prototype mode
                <br />
                <b>All data is synthetic</b>
              </span>
            </div>
            <div className="profile">
              <div className="avatar">{CURRENT_USER.initials}</div>
              <div>
               <strong>{CURRENT_USER.name}</strong>
               <small>{CURRENT_USER.role}</small>
              </div>
              <ChevronRight size={14} />
            </div>
          </div>
        )}
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <button
            className="icon-button menu-button"
            onClick={() => setSidebar(!sidebar)}
          >
            <Menu size={18} />
          </button>
          <div className="breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>
              {view === "overview"
                ? "Command center"
                : view[0].toUpperCase() + view.slice(1)}
            </strong>
          </div>
          <div className="top-actions">
            <div className="global-search">
              <Search size={16} />
              <input
                placeholder="Search entities, cases, evidence..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && search.trim()) setView("network");
                }}
              />
              <kbd>⌘ K</kbd>
            </div>
            <button className="icon-button" aria-label="Notifications" onClick={() => setNotificationsOpen((open) => !open)}>
              <Bell size={17} />
              <i className="notification-dot" />
            </button>
            {notificationsOpen && <div className="notification-popover"><strong>Recent notifications</strong><span>Evidence hash verified for the latest uploaded resource.</span><span>Vikram Malhotra remains the highest-priority investigative lead.</span></div>}
            <div className="top-avatar">{CURRENT_USER.initials}</div>
          </div>
        </header>
        <div className="content-scroll">
          {view === "overview" && (
            <Overview
              setView={setView}
              processed={processed}
              setProcessed={setProcessed}
            />
          )}
          {view === "cases" && <Cases setView={setView} />}
          {view === "evidence" && (
            <EvidenceInbox processed={processed} setProcessed={setProcessed} setView={setView} />
          )}
          {view === "resources" && <ResourceLibrary setView={setView} />}
          {view === "network" && (
            <NetworkView
              selectedEntity={selectedEntity}
              setSelectedEntity={setSelectedEntity}
              selectedEdge={selectedEdge}
              setSelectedEdge={setSelectedEdge}
              openRelationshipDrawer={() => setRelationshipDrawerOpen(true)}
              globalSearch={search}
            />
          )}
          {view === "intelligence" && (
            <Intelligence
              setSelectedEntity={setSelectedEntity}
              setView={setView}
            />
          )}
          {view === "timeline" && <Timeline />}
          {view === "matching" && <MatchingView setView={setView} />}
          {view === "security" && <SecurityAccess />}
          {view === "integrity" && <Integrity />}
        </div>
      </main>
      {view === "network" && relationshipDrawerOpen && (
        <aside className="detail-drawer">
          <button className="drawer-close" onClick={() => setRelationshipDrawerOpen(false)}>
            <X size={16} />
          </button>
          <span className="eyebrow">RELATIONSHIP EXPLORER</span>
          <div className="relationship-title">
            <div className="connection-node">{edgeSource.slice(0, 1)}</div>
            <div className="connection-line" />
            <div className="connection-node green">
              {edgeTarget.slice(0, 1)}
            </div>
          </div>
          <h2>
            {edgeSource} <span>↔</span> {edgeTarget}
          </h2>
          <div className={`status-pill ${edge.status}`}>
            <i /> {edge.status.toUpperCase()}{" "}
            {edge.status === "predicted" && "LEAD"}
          </div>
          <div className="confidence-row">
            <span>Confidence score</span>
            <strong>{Math.round(edge.confidence * 100)}%</strong>
          </div>
          <div className="confidence-bar">
            <i style={{ width: `${edge.confidence * 100}%` }} />
          </div>
          <div className="why-block">
            <h3>
              <Sparkles size={15} /> Why this connection?
            </h3>
            <p>
              {edge.status === "predicted"
                ? "This is a potential association inferred from graph patterns. It is not directly supported by a source record."
                : "Independent source types converge on this observed relationship across the investigation timeline."}
            </p>
            <ul>
              {edge.evidence.length ? (
                edge.evidence.map((id) => (
                  <li key={id}>
                    <Check size={14} /> <span>{id}</span>
                    <small>
                      {evidence.find((item) => item.id === id)?.type ??
                        "GRAPH SIGNAL"}
                    </small>
                  </li>
                ))
              ) : (
                <li className="muted">
                  <CircleAlert size={14} /> No direct source currently proves
                  this association.
                </li>
              )}
            </ul>
          </div>
          <button className="full-button" onClick={() => setView("evidence")}>
            Open supporting evidence <ArrowRight size={15} />
          </button>
          <button className="text-button" onClick={() => void createRelationshipResource()}>
            Create investigator evidence note <ArrowRight size={14} />
          </button>
        </aside>
      )}
    </div>
  );
}

function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing marketing-landing">
      <video className="hero-video" autoPlay muted loop playsInline preload="auto" aria-hidden="true">
        <source src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260809_012548_ef22562c-c0ae-4816-ad9d-f8922af4e6a7.mp4" type="video/mp4" />
      </video>
      <div className="hero-video-overlay" aria-hidden="true" />
      <div className="landing-backdrop">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <div className="landing-grid" />
      </div>
      <nav className="landing-nav">
        <div className="brand landing-brand">
          <span className="brand-mark">
            <Hexagon size={18} />
          </span>
          Evidence<span className="brand-accent">Graph</span>
        </div>
        <div className="landing-links">
          <a href="#product">Product</a>
          <a href="#case-studies">Case studies</a>
          <a href="#security">Security</a>
          <a href="#contact">Contact</a>
        </div>
        <button className="outline-button" onClick={onEnter}>
          Enter workspace <ArrowRight size={15} />
        </button>
      </nav>
      <section className="hero">
        <div className="hero-kicker">
          <span className="live-dot" /> Synthetic investigation environment ·
          SIH26189
        </div>
        <h1>
          Connect the <em>evidence.</em>
          <br />
          Reveal the network.
        </h1>
        <p>
          EvidenceGraph turns fragmented case material into a living,
          explainable intelligence workspace. Every connection has a source.
          Every lead shows its reasoning.
        </p>
        <div className="hero-actions">
          <button className="primary-button" onClick={onEnter}>
            Enter investigation workspace <ArrowRight size={16} />
          </button>
          <a className="play-button" href="#product">
            <span>
              <Play size={12} fill="currentColor" />
            </span>{" "}
            See how it works
          </a>
        </div>
        <div className="hero-foot">
          <div>
            <strong>14</strong>
            <span>
              source types
              <br />
              connected
            </span>
          </div>
          <div>
            <strong>01</strong>
            <span>
              unified evidence
              <br />
              graph
            </span>
          </div>
          <div>
            <strong>WHY</strong>
            <span>
              before every
              <br />
              important insight
            </span>
          </div>
        </div>
      </section>
      <main className="marketing-content">
        <section id="product" className="marketing-section">
          <div className="marketing-section-heading">
            <span className="marketing-kicker">THE WORKSPACE</span>
            <h2>From fragmented records to explainable intelligence.</h2>
            <p>EvidenceGraph connects source records, canonical entities and graph relationships into one reviewable investigation workflow.</p>
          </div>
          <div className="marketing-feature-grid">
            <article><span className="marketing-icon"><FileCheck2 size={18} /></span><span className="marketing-number">01</span><h3>Ingest and normalize</h3><p>Bring FIRs, CDRs, financial records, surveillance, transcripts and OSINT into one case-scoped evidence library.</p></article>
            <article><span className="marketing-icon"><Network size={18} /></span><span className="marketing-number">02</span><h3>Resolve the network</h3><p>Map aliases, phones, vehicles, accounts, locations and organizations to stable canonical entities.</p></article>
            <article><span className="marketing-icon"><BrainCircuit size={18} /></span><span className="marketing-number">03</span><h3>Explain every lead</h3><p>Use graph analytics and GraphRAG to show why a connection matters, which sources support it and what remains unproven.</p></article>
          </div>
          <div className="marketing-process"><span>Source material</span><i /> <span>Entity resolution</span><i /> <span>Evidence graph</span><i /> <span>Investigative lead</span></div>
        </section>

        <section id="case-studies" className="marketing-section marketing-section-alt">
          <div className="marketing-section-heading"><span className="marketing-kicker">CASE STUDIES</span><h2>Built around evidence, not assumptions.</h2><p>Demonstration cases show how different source types converge into neutral, auditable investigative signals.</p></div>
          <div className="marketing-case-grid">
            <article className="marketing-case-card featured"><span className="case-label">CASE-1004 · ACTIVE</span><h3>Cafe Meridian Network</h3><p>Connect FIR, CDR, surveillance, transcript and vehicle evidence across Delhi and Noida.</p><div><strong>Potential intermediary</strong><span>Vikram Malhotra · P003</span></div><a href="#contact">Request a walkthrough <ArrowRight size={14} /></a></article>
            <article className="marketing-case-card"><span className="case-label">CASE-1001 · CORRELATION</span><h3>Warehouse 7</h3><p>Resolve the Rahul–Sameer meeting context and connect it to location and vehicle records.</p><div><strong>Observed relationship</strong><span>Source-linked meeting context</span></div></article>
            <article className="marketing-case-card"><span className="case-label">CASE-1003 · FINANCIAL</span><h3>Old Industrial Road</h3><p>Trace account transfers as neutral financial observations without turning transaction patterns into conclusions.</p><div><strong>Observed financial association</strong><span>Transaction chain with provenance</span></div></article>
          </div>
        </section>

        <section id="security" className="marketing-section">
          <div className="marketing-security-layout">
            <div className="marketing-section-heading"><span className="marketing-kicker">SECURITY AND PROVENANCE</span><h2>Trust the trail behind every answer.</h2><p>EvidenceGraph keeps source provenance visible and separates observed evidence from corroborated relationships and predicted investigative leads.</p></div>
            <div className="marketing-security-list"><div><ShieldCheck size={17} /><span><strong>Case-scoped access</strong><small>Investigation context and source references stay within their assigned scope.</small></span></div><div><LockKeyhole size={17} /><span><strong>Evidence stays authoritative</strong><small>Original records remain the basis for every extraction and approved graph change.</small></span></div><div><GitBranch size={17} /><span><strong>Verifiable computation</strong><small>Hash-linked processing events show which inputs and outputs produced a result.</small></span></div></div>
          </div>
          <div className="marketing-status-line"><span className="live-dot" /> Prototype environment · synthetic data only · blockchain and ZK proofs are not enabled</div>
        </section>

        <section id="contact" className="marketing-section marketing-contact-section">
          <div className="marketing-contact-copy"><span className="marketing-kicker">CONTACT</span><h2>Bring the evidence into focus.</h2><p>Discuss a demonstration, dataset integration or a secure deployment architecture with the EvidenceGraph team.</p><a className="marketing-email" href="mailto:ankush.chauhan@ncrb.gov.in">ankush.chauhan@ncrb.gov.in <ArrowRight size={15} /></a></div>
          <div className="marketing-contact-card"><span className="eyebrow">DEMO REQUEST</span><strong>CASE-READY BY DESIGN</strong><span>Graph · provenance · explainability</span><a className="primary-button" href="mailto:ankush.chauhan@ncrb.gov.in">Start a conversation <ArrowRight size={15} /></a></div>
        </section>
      </main>
      <div className="landing-footer">
        <span>
          Built for the National Crime Records Bureau · Women Safety Division
        </span>
        <span>Prototype / fictional data only</span>
      </div>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (role: "Investigator" | "Supervisor" | "Auditor") => void }) {
  const [role, setRole] = useState<"Investigator" | "Supervisor" | "Auditor">("Investigator");
  return (
    <div className="login-screen">
      <div className="login-glow" />
      <div className="login-card">
        <div className="brand login-brand">
          <span className="brand-mark">
            <Hexagon size={18} />
          </span>
          Evidence<span className="brand-accent">Graph</span>
        </div>
        <div className="login-intro">
          <span className="eyebrow">SECURE INVESTIGATION ACCESS</span>
          <h1>Welcome back.</h1>
          <p>Sign in to your protected investigation workspace.</p>
        </div>
        <label>
          Official email
          <input defaultValue="ankush.chauhan@ncrb.gov.in" />
        </label>
        <label>
          Password
          <div className="input-with-icon">
            <input type="password" defaultValue="evidencegraph" />
            <LockKeyhole size={16} />
          </div>
        </label>
        <label>
          Workspace role
          <select value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
            <option>Investigator</option>
            <option>Supervisor</option>
            <option>Auditor</option>
          </select>
        </label>
        <div className="login-meta">
          <span>
            <input type="checkbox" defaultChecked /> Trust this device
          </span>
          <a>Reset password</a>
        </div>
        <button className="primary-button login-submit" onClick={() => onLogin(role)}>
          Continue to workspace <ArrowRight size={16} />
        </button>
        <div className="mfa-note">
          <ShieldCheck size={16} />
          <span>
            MFA is enabled for this account
            <br />
            <b>Last verified today at 09:42 IST</b>
          </span>
        </div>
      </div>
      <span className="login-legal">
        EvidenceGraph · Prototype environment · Synthetic data only
      </span>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  onClick,
  compact,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  compact: boolean;
  badge?: string;
}) {
  return (
    <button
      className={`nav-item ${active ? "active" : ""} ${compact ? "compact" : ""}`}
      onClick={onClick}
      title={compact ? label : undefined}
    >
      {icon}
      {!compact && (
        <>
          <span>{label}</span>
          {badge && <b>{badge}</b>}
        </>
      )}
    </button>
  );
}

function PageTitle({
  eyebrow,
  title,
  copy,
  action,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-title">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        {copy && <p>{copy}</p>}
      </div>
      {action}
    </div>
  );
}

function Overview({
  setView,
  processed,
  setProcessed,
}: {
  setView: (v: View) => void;
  processed: boolean;
  setProcessed: (v: boolean) => void;
}) {
  const { activeCaseId, summary: workspaceSummary } = useWorkspace();
  const summary = workspaceSummary;
  const lead = summary?.lead;
  const metrics = summary?.metrics;
  const progress = metrics?.processingPercent ?? null;
  const [showAllActivity, setShowAllActivity] = useState(false);
  const activity = showAllActivity ? (summary?.activity || []) : (summary?.activity || []).slice(0, 3);
  return (
    <>
      <PageTitle
        eyebrow={`COMMAND CENTER / ${activeCaseId}`}
        title={`Good morning, ${CURRENT_USER.name.split(" ")[0]}.`}
        copy="Here is the signal across your active investigations."
        action={
          <button className="primary-button" onClick={() => setView("network")}>
            Open network <Network size={15} />
          </button>
        }
      />
      <div className="signal-banner">
        <div className="signal-icon">
          <Activity size={18} />
        </div>
        <div>
          <span className="eyebrow">LEAD SIGNAL · HIGH PRIORITY</span>
          <h3>{lead ? `${lead.name} is the strongest ${lead.label.toLowerCase()}` : "No prioritized lead is available yet"}</h3>
          <p>{lead ? `${lead.signals.slice(0, 2).join(" · ")} · priority score ${lead.score}` : "Process evidence to generate investigative signals."}</p>
        </div>
        <button
          onClick={() => {
            setView("network");
          }}
        >
          Investigate <ArrowRight size={15} />
        </button>
      </div>
      <div className="metric-grid dashboard-metric-grid">
        <Metric
          label="Active cases"
          value={metrics ? String(metrics.activeCases).padStart(2, "0") : "—"}
          detail={metrics ? "Active investigations" : "Loading live case data"}
          icon={<Target size={17} />}
          tone="orange"
        />
        <Metric
          label="Open leads"
          value={metrics ? String(metrics.openLeads).padStart(2, "0") : "—"}
          detail={metrics ? "Predicted leads requiring review" : "Loading graph signals"}
          icon={<Sparkles size={17} />}
          tone="purple"
        />
      </div>
      <p className="lead-explainer"><Sparkles size={13} /> Open leads are entities ranked as structurally significant through connectivity or bridge signals and not yet reviewed by an investigator.</p>
      <div className="overview-grid overview-single">
        <section className="panel case-panel">
          <PanelHeading
            title="Active investigation"
            action="Open case"
            onAction={() => setView("cases")}
          />
          <div className="case-hero">
            <div className="case-tag">
              {activeCaseId} <span>ACTIVE</span>
            </div>
            <h2>{summary?.case.title || "Loading active investigation..."}</h2>
            <p>{summary?.case.priority || ""} priority · {summary?.case.jurisdiction || "Loading jurisdiction..."}</p>
            <div className="case-inline-stats">
              <span><strong>{metrics ? metrics.evidenceRecords : "—"}</strong> evidence records</span>
              <span><strong>{metrics ? metrics.entitiesResolved : "—"}</strong> entities resolved</span>
            </div>
            <div className="case-progress">
              <div>
                <span>Evidence processing</span>
                <strong>{progress == null ? "—" : `${progress}%`}</strong>
              </div>
              <div className="progress-track">
                <i style={{ width: `${progress ?? 0}%` }} />
              </div>
            </div>
            <details className="pipeline-disclosure">
              <summary>View pipeline detail <ChevronRight size={14} /></summary>
              <div className="pipeline pipeline-inline">
                <PipelineStep icon={<FileText size={16} />} label="Ingested" value={metrics ? String(metrics.pipeline.ingested).padStart(2, "0") : "—"} done={Boolean(metrics)} />
                <PipelineStep icon={<BrainCircuit size={16} />} label="Extracted" value={metrics ? String(metrics.pipeline.extracted).padStart(2, "0") : "—"} done={(metrics?.pipeline.extracted ?? 0) > 0} />
                <PipelineStep icon={<GitBranch size={16} />} label="Resolved" value={metrics ? String(metrics.pipeline.resolved).padStart(2, "0") : "—"} done={(metrics?.pipeline.resolved ?? 0) > 0} />
                <PipelineStep icon={<Network size={16} />} label="In graph" value={metrics ? String(metrics.pipeline.inGraph).padStart(2, "0") : "—"} done={(metrics?.pipeline.inGraph ?? 0) > 0} />
              </div>
            </details>
            <button className="text-button" onClick={() => setView("evidence")}>
              {progress === 100 ? "Review extracted results" : "Continue processing"}{" "}
              <ArrowRight size={14} />
            </button>
          </div>
        </section>
      </div>
      <div className="bottom-grid">
        <section className="panel activity-panel">
          <PanelHeading
            title="Recent activity"
            action="Audit trail"
            onAction={() => setView("integrity")}
          />
          {activity.map(({ id, time, title, detail, tone }) => (
            <div className="activity-row" key={id}>
              <span className={`activity-dot ${tone}`} />
              <span className="activity-time">{Number.isNaN(Date.parse(time)) ? time : new Date(time).toLocaleDateString()}</span>
              <span>
                <strong>{title}</strong>
                <small>{detail}</small>
              </span>
            </div>
          ))}
          {(summary?.activity.length || 0) > 3 && <button className="text-button activity-more" onClick={() => setShowAllActivity((value) => !value)}>{showAllActivity ? "Show less" : "Show more"} <ArrowRight size={14} /></button>}
        </section>
      </div>
    </>
  );
}

function PanelHeading({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="panel-heading">
      <h3>{title}</h3>
      {action && (
        <button className="panel-action" onClick={onAction}>
          {action} <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}
function Metric({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className="metric">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}
function PipelineStep({
  icon,
  label,
  value,
  done,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  done?: boolean;
}) {
  return (
    <div className={`pipeline-step ${done ? "done" : ""}`}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}

function Cases({ setView }: { setView: (v: View) => void }) {
  const { activeCaseId } = useWorkspace();
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState("ALL");
  const visibleCases = cases.filter((item) =>
    (priority === "ALL" || item.priority === priority) &&
    `${item.id} ${item.title} ${item.jurisdiction}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <PageTitle
        eyebrow="INVESTIGATIONS"
        title="Cases"
        copy="Manage access, scope and evidence across the investigation portfolio."
        action={
          <button
            className="primary-button"
            onClick={() => setView("evidence")}
          >
            Open active case <ArrowRight size={15} />
          </button>
        }
      />
      <div className="case-table panel">
        <div className="table-toolbar">
          <label className="filter-search">
            <Search size={15} />
            <input aria-label="Filter cases" placeholder="Filter cases..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <button className="filter-button" onClick={() => setPriority((current) => current === "ALL" ? "HIGH" : current === "HIGH" ? "MEDIUM" : current === "MEDIUM" ? "LOW" : "ALL")}>
            <SlidersHorizontal size={14} /> {priority === "ALL" ? "All priorities" : priority}
          </button>
        </div>
        <div className="table-head">
          <span>CASE</span>
          <span>JURISDICTION</span>
          <span>PRIORITY</span>
          <span>STATUS</span>
          <span>UPDATED</span>
          <span />
        </div>
        {visibleCases.map((item) => (
          <button
            className="case-row"
            key={item.id}
            onClick={() =>
              setView(item.id === activeCaseId ? "evidence" : "network")
            }
          >
            <span>
              <strong>{item.id}</strong>
              <small>{item.title}</small>
            </span>
            <span>{item.jurisdiction}</span>
            <span className={`priority ${item.priority.toLowerCase()}`}>
              {item.priority}
            </span>
            <span className={`case-status ${item.status.toLowerCase()}`}>
              <i />
              {item.status}
            </span>
            <span>{item.updated}</span>
            <ChevronRight size={15} />
          </button>
        ))}
        {visibleCases.length === 0 && <div className="empty-state">No cases match the current filters.</div>}
      </div>
    </>
  );
}

function ResourceLibrary({ setView }: { setView: (v: View) => void }) {
  const { activeCaseId, role } = useWorkspace();
  const [items, setItems] = useState<Resource[]>(resources);
  const [selected, setSelected] = useState<Resource>(resources[0]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [resourceTab, setResourceTab] = useState("overview");
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [resourceError, setResourceError] = useState<string | null>(null);
  const [resourceNotice, setResourceNotice] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [reviewData, setReviewData] = useState<{ extractions: { entityId: string; canonicalName: string; rawMention: string; confidence: number }[]; connections: { id: string; sourceName: string; targetName: string; confidence: number; type?: string; reviewStatus?: string; evidenceExcerpt?: string }[] } | null>(null);
  const [selectedConnections, setSelectedConnections] = useState<string[]>([]);
  const visible = items.filter(
    (item) =>
      (filter === "ALL" || item.type === filter) &&
      `${item.filename} ${item.title} ${item.caseId}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );

  const loadResources = async () => {
    try {
      const response = await fetch(`/api/resources?caseId=${encodeURIComponent(activeCaseId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Resource list unavailable");
      const data = (await response.json()) as { resources: Resource[] };
      setItems((current) => {
        const byId = new Map(current.map((item) => [item.id, item]));
        data.resources.forEach((item) => byId.set(item.id, { ...byId.get(item.id), ...item }));
        return Array.from(byId.values());
      });
    } catch {
      setResourceError("Could not refresh stored resources.");
    }
  };

  const selectResource = async (item: Resource) => {
    setSelected(item);
    setReviewData(null);
    if (!item.id.startsWith("UPLOAD-") && !item.id.startsWith("EP-DOC-")) return;
    try {
      const response = await fetch(`/api/resources/${item.id}`);
      if (!response.ok) return;
      const data = (await response.json()) as {
        resource?: Resource & {
          extractions?: { entityId: string; canonicalName: string; rawMention: string; confidence: number }[];
          connections?: { id: string; sourceName: string; targetName: string; confidence: number }[];
        };
      };
      if (!data.resource) return;
      setSelected(data.resource);
      if (data.resource.extractions || data.resource.connections) {
        setReviewData({ extractions: data.resource.extractions || [], connections: data.resource.connections || [] });
      }
    } catch {
      setResourceError("Could not load resource details.");
    }
  };

  useEffect(() => {
    void loadResources();
    return subscribeWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, () => void loadResources());
  }, []);
  const addFile = async (file: File) => {
    setUploading(true);
    setResourceError(null);
    setResourceNotice(null);
    const form = new FormData();
    form.append("file", file);
    form.append("caseId", activeCaseId);
    try {
      const response = await fetch("/api/resources", { method: "POST", body: form });
      const data = (await response.json()) as { resource?: Resource; error?: string };
      if (!response.ok || !data.resource) throw new Error(data.error || "Upload failed");
      setItems((current) => [data.resource!, ...current]);
      setSelected(data.resource);
      setReviewData(null);
      setSelectedConnections([]);
      setResourceTab("overview");
      setResourceNotice(`${data.resource.filename} uploaded and committed to the integrity ledger.`);
      emitWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, data.resource);
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const processSelected = async () => {
    setProcessing(true);
    setResourceError(null);
    setResourceNotice(null);
    try {
      const response = await fetch(`/api/resources/${selected.id}/process`, { method: "POST" });
      const data = (await response.json()) as { resource?: Resource; extractions?: typeof reviewData extends infer T ? T extends { extractions: infer E } ? E : never : never; connections?: typeof reviewData extends infer T ? T extends { connections: infer C } ? C : never : never; error?: string };
      if (!response.ok || !data.resource) throw new Error(data.error || "Processing failed");
      setItems((current) => current.map((item) => item.id === data.resource!.id ? data.resource! : item));
      setSelected(data.resource);
      setReviewData({ extractions: (data.extractions || []) as NonNullable<typeof reviewData>["extractions"], connections: (data.connections || []) as NonNullable<typeof reviewData>["connections"] });
      setSelectedConnections((data.connections || []).map((connection) => connection.id));
      setResourceTab("extracted");
      setResourceNotice(`${data.resource.filename} processed. Review the extracted relationships before approval.`);
      emitWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, data.resource);
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : "Processing failed");
    } finally {
      setProcessing(false);
    }
  };

  const approveSelected = async () => {
    setProcessing(true);
    setResourceError(null);
    setResourceNotice(null);
    try {
      const response = await fetch(`/api/resources/${selected.id}/approve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionIds: selectedConnections }) });
      const data = (await response.json()) as { resource?: Resource; error?: string };
      if (!response.ok || !data.resource) throw new Error(data.error || "Approval failed");
      setItems((current) => current.map((item) => item.id === data.resource!.id ? data.resource! : item));
      setSelected(data.resource);
      setResourceNotice(`${data.resource.filename} approved and the graph is refreshing.`);
      emitWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, data.resource);
      emitWorkspaceEvent(WORKSPACE_EVENTS.graphRefresh, data.resource);
      emitWorkspaceEvent(WORKSPACE_EVENTS.integrityRefresh, data.resource);
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : "Approval failed");
    } finally {
      setProcessing(false);
    }
  };

  const reviewConnection = async (connectionId: string, action: "approve" | "reject") => {
    setProcessing(true);
    setResourceError(null);
    try {
      const response = await fetch(`/api/resources/${selected.id}/connections/${connectionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const data = (await response.json()) as { resource?: Resource; connection?: { id: string; reviewStatus?: string }; error?: string };
      if (!response.ok || !data.resource) throw new Error(data.error || "Review update failed");
      setItems((current) => current.map((item) => item.id === data.resource!.id ? data.resource! : item));
      setSelected(data.resource);
      setReviewData((current) => current ? { ...current, connections: current.connections.map((connection) => connection.id === connectionId ? { ...connection, reviewStatus: action === "approve" ? "approved" : "rejected" } : connection) } : current);
      setSelectedConnections((current) => current.filter((id) => id !== connectionId));
      emitWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, data.resource);
      if (action === "approve") emitWorkspaceEvent(WORKSPACE_EVENTS.graphRefresh, data.resource);
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : "Review update failed");
    } finally {
      setProcessing(false);
    }
  };

  const updateConnection = async (connectionId: string, type: string, confidence: number) => {
    try {
      const response = await fetch(`/api/resources/${selected.id}/connections/${connectionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update", type, confidence }) });
      const data = (await response.json()) as { resource?: Resource; error?: string };
      if (!response.ok || !data.resource) throw new Error(data.error || "Connection update failed");
      setItems((current) => current.map((item) => item.id === data.resource!.id ? data.resource! : item));
      setSelected(data.resource);
      setReviewData((current) => current ? { ...current, connections: current.connections.map((connection) => connection.id === connectionId ? { ...connection, type, confidence } : connection) } : current);
      emitWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, data.resource);
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : "Connection update failed");
    }
  };

  const verifySelected = async () => {
    if (!selected.id.startsWith("UPLOAD-")) {
      setResourceError("Integrity verification is available for uploaded resources.");
      return;
    }
    setVerifying(true);
    setResourceError(null);
    setResourceNotice(null);
    try {
      const response = await fetch(`/api/resources/${selected.id}/verify`, { method: "POST" });
      const data = (await response.json()) as { valid?: boolean; error?: string; reason?: string };
      if (!response.ok && data.valid !== false) throw new Error(data.error || "Verification failed");
      const nextIntegrity = data.valid ? "verified" : "mismatch";
      const next = { ...selected, integrity: nextIntegrity as Resource["integrity"] };
      setItems((current) => current.map((item) => item.id === next.id ? next : item));
      setSelected(next);
      if (data.valid) setResourceNotice("Document hash, Merkle commitment, and integrity chain verified.");
      if (!data.valid) setResourceError(data.reason || "The stored file does not match its committed hash.");
    } catch (error) {
      setResourceError(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setVerifying(false);
    }
  };
  return (
    <>
      <PageTitle
        eyebrow={`RESOURCE LIBRARY / ${activeCaseId}`}
        title="Explore your evidence"
        copy="Add source material, review extraction, and follow every resource into the knowledge graph."
        action={role === "Auditor" ? undefined : (
          <label className="primary-button upload-label">
            <ArrowRight size={15} /> {uploading ? "Uploading..." : "Add resource"}
            <input
              type="file"
              accept=".pdf,.csv,.json,.txt"
              disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void addFile(file);
                  event.currentTarget.value = "";
                }}
            />
          </label>
        )}
      />
      <div className="resource-layout">
        <section className="panel resource-table">
          <div className="resource-toolbar">
            <div className="filter-search">
              <Search size={15} />
              <input
                placeholder="Search files, cases, source IDs..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
            <div className="resource-filter">
              <button
                className={filter === "ALL" ? "active" : ""}
                onClick={() => setFilter("ALL")}
              >
                All
              </button>
              {["FIR", "CDR", "FINANCIAL", "SURVEILLANCE", "TRANSCRIPT", "CSV", "OSINT"].map(
                (type) => (
                  <button
                    className={filter === type ? "active" : ""}
                    onClick={() => setFilter(type)}
                    key={type}
                  >
                    {type}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="resource-count">
            <strong>{visible.length}</strong> resources in workspace{" "}
            <span>· All source content is synthetic</span>
          </div>
          {visible.map((item) => (
            <button
              className={`resource-row ${selected.id === item.id ? "selected" : ""}`}
              key={item.id}
              onClick={() => void selectResource(item)}
            >
              <span className={`resource-file ${item.type.toLowerCase()}`}>
                <FileText size={16} />
              </span>
              <span className="resource-main">
                <strong>{item.filename}</strong>
                <small>
                  {item.type} · {item.caseId} · {item.size}
                </small>
              </span>
              <span className="resource-stats">
                <strong>{item.entities}</strong>
                <small>entities</small>
              </span>
              <span className="resource-stats">
                <strong>{item.relationships}</strong>
                <small>edges</small>
              </span>
              <span className={`resource-status ${item.status}`}>
                <i />
                {item.status}
              </span>
              <ChevronRight size={14} />
            </button>
          ))}
        </section>
        <section className="panel resource-detail">
          <div className="resource-detail-head">
            <div>
              <span className="eyebrow">RESOURCE DETAIL</span>
              <h2>{selected.filename}</h2>
              <p>
                {selected.type} · {selected.caseId} · Added by{" "}
                {selected.addedBy}
              </p>
            </div>
            <span className={`resource-status ${selected.status}`}>
              <i />
              {selected.status}
            </span>
          </div>
          <div className="resource-tabs">
            {[
              ["overview", "Overview"],
              ["extracted", "Extracted intelligence"],
              ["graph", "Graph impact"],
              ["integrity", "Integrity"],
            ].map(([id, label]) => (
              <button className={resourceTab === id ? "active" : ""} key={id} onClick={() => setResourceTab(id)}>{label}</button>
            ))}
          </div>
          {resourceError && <div className="resource-error"><CircleAlert size={14} /> {resourceError}</div>}
          {resourceNotice && <div className="inline-notice"><Check size={14} /> {resourceNotice}</div>}
          <div className="resource-tab-summary">
            {resourceTab === "overview" && <><strong>Source overview</strong><span>Review the original resource, case scope, and ingestion metadata.</span></>}
            {resourceTab === "extracted" && <><strong>Extracted intelligence</strong><span>{selected.entities || "No"} entities and {selected.relationships || "no"} relationships are available for investigator review.</span></>}
            {resourceTab === "graph" && <><strong>Graph impact</strong><span>This resource can be traced to every entity and relationship it supports.</span><button className="text-button" onClick={() => setView("network")}>Open graph <ArrowRight size={13} /></button></>}
            {resourceTab === "integrity" && <><strong>Integrity record</strong><span>SHA-256 {selected.hash} · {selected.integrity === "verified" ? "Verified against ledger" : "Integrity mismatch"}</span>{selected.id.startsWith("UPLOAD-") && <button className="secondary-button small" onClick={verifySelected} disabled={verifying}>{verifying ? "Verifying..." : "Verify document"}</button>}</>}
          </div>
          <div className="resource-preview">
            <div className="resource-preview-icon">
              <FileText size={24} />
            </div>
            <span className="eyebrow">SOURCE CONTENT</span>
            <h3>{selected.title}</h3>
            <p>{selected.excerpt}</p>
            <div className="resource-meta">
              <span>
                <small>CASE</small>
                <strong>{selected.caseId}</strong>
              </span>
              <span>
                <small>ADDED</small>
                <strong>{selected.timestamp}</strong>
              </span>
              <span>
                <small>SIZE</small>
                <strong>{selected.size}</strong>
              </span>
            </div>
          </div>
          <div className="resource-extraction">
            <div className="extraction-heading">
              <div>
                <span className="eyebrow">GRAPH IMPACT</span>
                <h3>
                  {selected.entities
                    ? `${selected.entities} entities · ${selected.relationships} relationships`
                    : "Ready for processing"}
                </h3>
              </div>
              {role !== "Auditor" && <button
                className="secondary-button small"
                onClick={selected.status === "ready" || selected.status === "failed" ? processSelected : selected.status === "processing" ? undefined : () => setView("network")}
                disabled={processing || selected.status === "processing"}
              >
                {selected.status === "ready" || selected.status === "failed" ? (processing ? "Processing..." : selected.status === "failed" ? "Retry processing" : "Process evidence") : selected.status === "processing" ? "Processing..." : <>Explore graph <Network size={14} /></>}
              </button>}
              {role !== "Auditor" && selected.status === "review" && <button className="primary-button small" onClick={approveSelected} disabled={processing}>{processing ? "Approving..." : "Approve connections"} <Check size={14} /></button>}
            </div>
            {selected.processingError && <div className="resource-error"><CircleAlert size={14} /> {selected.processingError}</div>}
            <div className="impact-list">
              <span>
                <Check size={13} /> Source retained with provenance
              </span>
              <span>
                <Check size={13} /> Case scope: {selected.caseId}
              </span>
              <span>
                <Check size={13} /> SHA-256: {selected.hash}
              </span>
            </div>
            {reviewData && <div className="extraction-review"><strong>Review mappings and candidate relationships</strong>{reviewData.extractions.map((item) => <div className="mapping-row" key={item.entityId}><span>"{item.rawMention}"</span><ArrowRight size={13} /><b>{item.canonicalName}</b><small>{item.entityId} · {Math.round(item.confidence * 100)}%</small></div>)}<div className="candidate-connections">{reviewData.connections.map((connection) => <div className="candidate-connection" key={connection.id}><label><input type="checkbox" checked={selectedConnections.includes(connection.id)} onChange={() => setSelectedConnections((current) => current.includes(connection.id) ? current.filter((id) => id !== connection.id) : [...current, connection.id])} disabled={connection.reviewStatus === "approved" || connection.reviewStatus === "rejected"} /><span><b>{connection.sourceName} → {connection.targetName}</b><small><select value={connection.type || "MENTIONED_TOGETHER"} onChange={(event) => void updateConnection(connection.id, event.target.value, connection.confidence)} disabled={connection.reviewStatus !== "pending"}><option>MENTIONED_TOGETHER</option><option>MET</option><option>CALLS</option><option>VISITED</option><option>TRANSFERRED_TO</option></select> · {Math.round(connection.confidence * 100)}% · {connection.reviewStatus || "pending"}</small><em>{connection.evidenceExcerpt || "No source excerpt captured."}</em></span></label><div><input type="range" min="0" max="100" value={Math.round(connection.confidence * 100)} onChange={(event) => void updateConnection(connection.id, connection.type || "MENTIONED_TOGETHER", Number(event.target.value) / 100)} disabled={connection.reviewStatus !== "pending"} /><button className="text-button" onClick={() => void reviewConnection(connection.id, "approve")} disabled={processing || connection.reviewStatus === "approved"}>Approve</button><button className="text-button danger" onClick={() => void reviewConnection(connection.id, "reject")} disabled={processing || connection.reviewStatus === "rejected"}>Reject</button></div></div>)}</div><p>{selectedConnections.length} candidate connection(s) selected. Approvals remain linked to the source excerpt.</p></div>}
          </div>
          <div className="resource-callout">
            <ShieldCheck size={16} />
            <span>
              <strong>Evidence remains authoritative.</strong> Extracted
              relationships will be marked as observed or corroborated only
              after source review. Predicted leads are kept separate.
            </span>
          </div>
        </section>
      </div>
    </>
  );
}

function EvidenceInbox({
  processed,
  setProcessed,
  setView,
}: {
  processed: boolean;
  setProcessed: (v: boolean) => void;
  setView: (v: View) => void;
}) {
  type ResourceExtraction = { entityId: string; canonicalName: string; rawMention: string; type: string; confidence: number };
  const { activeCaseId, resources: liveResources, role } = useWorkspace();
  const [selectedEvidenceId, setSelectedEvidenceId] = useState("FIR-1004");
  const [sourceFilter, setSourceFilter] = useState("ALL");
  const [showAllEvidence, setShowAllEvidence] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<{ text?: string; extractions?: ResourceExtraction[] } | null>(null);
  const allEvidence = activeCaseId === "CASE-EPSTEIN" ? liveResources : [...evidence, ...liveResources.filter((resource) => !evidence.some((item) => item.id === resource.id))];
  const selectedEvidence = allEvidence.find((item) => item.id === selectedEvidenceId) ?? allEvidence[0];
  const filteredEvidence = allEvidence.filter((item) => sourceFilter === "ALL" || item.type === sourceFilter);
  const visibleEvidence = showAllEvidence ? filteredEvidence : filteredEvidence.slice(0, 5);
  if (!selectedEvidence) return <><PageTitle eyebrow={`${activeCaseId} / EVIDENCE INBOX`} title="Evidence workspace" copy="Process source records, preserve provenance, and review extracted intelligence." action={<button className="secondary-button" onClick={() => setView("resources")}><UploadIcon /> Add evidence</button>} /><div className="panel empty-state">No records are available for this case yet.</div></>;

  const selectEvidence = async (item: (typeof allEvidence)[number]) => {
    setSelectedEvidenceId(item.id);
    setSelectedDetail(null);
    if (!item.id.startsWith("UPLOAD-")) return;
    const response = await fetch(`/api/resources/${item.id}?includeText=1`, { cache: "no-store" }).catch(() => null);
    if (!response?.ok) return;
    const data = await response.json() as { resource?: { text?: string; extractions?: ResourceExtraction[] } };
    if (data.resource) setSelectedDetail({ text: data.resource.text, extractions: data.resource.extractions });
  };

  useEffect(() => {
    const selectedIsCurrent = liveResources.some((resource) => resource.id === selectedEvidenceId);
    const firstLive = liveResources[0];
    if (firstLive && !selectedIsCurrent) void selectEvidence(firstLive);
  }, [liveResources]);

  const selectedExtractions: ResourceExtraction[] = selectedDetail?.extractions || (("extractions" in selectedEvidence && Array.isArray(selectedEvidence.extractions)) ? selectedEvidence.extractions : []);
  const selectedText = selectedDetail?.text || selectedEvidence.excerpt;
  const aliases = selectedExtractions.filter((item) => item.rawMention.toLowerCase() !== item.canonicalName.toLowerCase());
  const selectedStatus = "status" in selectedEvidence ? selectedEvidence.status : "processed";
  const highlightText = (text: string) => {
    const mentions = Array.from(new Set(selectedExtractions.flatMap((item) => [item.rawMention, item.canonicalName]).filter(Boolean))).sort((a, b) => b.length - a.length);
    if (!mentions.length) return text;
    const expression = new RegExp(`(${mentions.map((mention) => mention.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return text.split(expression).map((part, index) => mentions.some((mention) => mention.toLowerCase() === part.toLowerCase()) ? <mark key={index}>{part}</mark> : <span key={index}>{part}</span>);
  };

  const processEvidence = async () => {
    if (!selectedEvidence.id.startsWith("UPLOAD-") || role === "Auditor") return;
    setProcessed(true);
    await fetch(`/api/resources/${selectedEvidence.id}/process`, { method: "POST" });
    emitWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, selectedEvidence);
  };

  return (
    <>
      <PageTitle
        eyebrow={`${activeCaseId} / EVIDENCE INBOX`}
        title="Evidence workspace"
        copy="Process source records, preserve provenance, and review extracted intelligence."
        action={
          <button className="secondary-button" onClick={() => setView("resources")}>
            <UploadIcon /> Add evidence
          </button>
        }
      />
      <div className="evidence-layout">
        <section className="panel evidence-list">
          <div className="evidence-toolbar">
            <div>
                <strong>{allEvidence.length}</strong>
              <span>records in scope</span>
            </div>
            <button className="filter-button" onClick={() => setSourceFilter((current) => current === "ALL" ? "FIR" : current === "FIR" ? "SURVEILLANCE" : current === "SURVEILLANCE" ? "FINANCIAL" : "ALL")}>
              <SlidersHorizontal size={14} /> {sourceFilter === "ALL" ? "All sources" : sourceFilter}
            </button>
          </div>
          {visibleEvidence.map((item, index) => (
            <button
              className={`evidence-row ${item.id === selectedEvidenceId ? "selected" : ""}`}
              key={item.id}
              onClick={() => void selectEvidence(item)}
            >
              <span
                className={`source-icon ${item.type.toLowerCase().replace(" ", "-")}`}
              >
                <FileText size={16} />
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>
                  {item.type} · {item.timestamp}
                </small>
              </span>
              {item.integrity === "mismatch" ? (
                <CircleAlert className="integrity-alert" size={15} />
              ) : (
                <Check className="verified" size={15} />
              )}
              {("status" in item ? item.status !== "ready" : index < 5) && <span className="processed-label">processed</span>}
            </button>
          ))}
          {filteredEvidence.length > 5 && <button className="text-button activity-more" onClick={() => setShowAllEvidence((value) => !value)}>{showAllEvidence ? "Show less" : `Show ${filteredEvidence.length - 5} more`} <ArrowRight size={14} /></button>}
        </section>
        <section className="panel evidence-preview">
          <div className="preview-top">
            <div>
              <span className="eyebrow">SELECTED SOURCE · {selectedEvidence.type}</span>
              <h2>{selectedEvidence.title}</h2>
            </div>
            <span className="verified-label">
              <Check size={13} /> Hash verified
            </span>
          </div>
          <div className="document-preview">
            <div className="document-head">
              <span>{selectedEvidence.type}</span>
              <small>{selectedEvidence.id} · {selectedEvidence.caseId}</small>
            </div>
            <div className="document-lines">
              <h3>{selectedEvidence.title}</h3>
              <p>{highlightText(selectedText)}</p>
              <p className="document-fade">Source record remains linked to its original hash and provenance metadata.</p>
            </div>
            <div className="document-stamp">
              SYNTHETIC
              <br />
              DEMO
            </div>
          </div>
          <div className="extraction-result">
            <div className="extraction-heading">
              <div>
                <span className="eyebrow">EXTRACTION RESULT</span>
                <h3>
                  {selectedStatus === "ready" ? "Ready for processing" : selectedStatus === "processing" ? "Processing source record" : "Entities resolved into graph"}
                </h3>
              </div>
              {selectedEvidence.id.startsWith("UPLOAD-") && role !== "Auditor" && <button
                className="primary-button small"
                onClick={() => void processEvidence()}
              >
                {processed ? "Processed" : "Process evidence"}{" "}
                <BrainCircuit size={14} />
              </button>}
            </div>
            <div className="entity-chips">
              {selectedExtractions.map((item) => <span className={`entity-chip ${item.type.toLowerCase()}`} key={item.entityId}><UserRound size={13} /> {item.canonicalName} <small>{item.entityId}</small></span>)}
              {!selectedExtractions.length && <span className="muted">{"entities" in selectedEvidence && selectedEvidence.entities ? `${selectedEvidence.entities} indexed entities are recorded for this source.` : "No extracted entities for this resource yet."}</span>}
            </div>
            {aliases.length > 0 && <div className="resolution-callout">
              <GitBranch size={15} />
              <span>
                <strong>Entity resolution applied</strong> {aliases.map((item) => `“${item.rawMention}” → ${item.canonicalName}`).join(" · ")}. Original mentions remain attached to this source.
              </span>
            </div>}
          </div>
        </section>
      </div>
    </>
  );
}
function UploadIcon() {
  return <ArrowRight size={15} />;
}

function NetworkView({
  selectedEntity,
  setSelectedEntity,
  selectedEdge,
  openRelationshipDrawer,
  setSelectedEdge,
  globalSearch,
}: {
  selectedEntity: string;
  setSelectedEntity: (id: string) => void;
  selectedEdge: string;
  setSelectedEdge: (id: string) => void;
  openRelationshipDrawer: () => void;
  globalSearch: string;
}) {
  const { activeCaseId } = useWorkspace();
  const [networkMode, setNetworkMode] = useState("network");
  const [graphSearch, setGraphSearch] = useState(globalSearch);
  const [statusFilter, setStatusFilter] = useState<"all" | "observed" | "corroborated" | "predicted">("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pathFrom, setPathFrom] = useState<string>();
  const [pathTo, setPathTo] = useState<string>();
  const [pathNodes, setPathNodes] = useState<string[]>([]);
  const [pathEdges, setPathEdges] = useState<string[]>([]);
  useEffect(() => {
    if (globalSearch.trim()) setGraphSearch(globalSearch);
  }, [globalSearch]);
  return (
    <>
      <PageTitle
        eyebrow={`NETWORK ANALYSIS / ${activeCaseId}`}
        title="Neo4j knowledge graph"
        copy="Explore the evidence graph built from people, phones, vehicles, accounts, locations, cases, and source records."
        action={
          <div className="network-actions">
            <button className={`filter-button ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen((open) => !open)}>
              <SlidersHorizontal size={14} /> Filters
            </button>
            <button className="secondary-button" disabled={!selectedEntity} title={!selectedEntity ? "Select a node first" : undefined} onClick={() => setExpanded((value) => !value)}>
              <Network size={15} /> {expanded ? "Collapse graph" : "Expand 2 hops"}
            </button>
          </div>
        }
      />
      <div className="network-toolbar">
        <div className="network-tabs">
          <button className={networkMode === "network" ? "active" : ""} onClick={() => setNetworkMode("network")}>Network</button>
          <button className={networkMode === "communities" ? "active" : ""} onClick={() => setNetworkMode("communities")}>Communities</button>
          <button className={networkMode === "path" ? "active" : ""} onClick={() => setNetworkMode("path")}>Path explorer</button>
        </div>
        <div className="network-search">
          <Search size={14} />
          <input
            aria-label="Search graph"
            value={graphSearch}
            onChange={(event) => setGraphSearch(event.target.value)}
            placeholder="Search graph"
          />
          {graphSearch && (
            <button
              className="network-search-clear"
              aria-label="Clear graph search"
              onClick={() => setGraphSearch("")}
            >
              ×
            </button>
          )}
        </div>
        <span className="network-count">Live graph view · Neo4j source</span>
      </div>
      {filtersOpen && <div className="network-filter-panel panel"><strong>Relationship status</strong><div>{(["all", "observed", "corroborated", "predicted"] as const).map((status) => <button key={status} className={statusFilter === status ? "active" : ""} onClick={() => setStatusFilter(status)}>{status === "all" ? "All statuses" : status}</button>)}</div></div>}
      <div className="network-mode-summary">
        {networkMode === "network" && <><strong>Evidence relationship view</strong><span>Showing source-aware entities and relationships from the selected investigation scope.</span></>}
        {networkMode === "communities" && <><strong>Community view</strong><span>Clusters are grouped by connected evidence and jurisdiction. Select a node to inspect its supporting records.</span></>}
        {networkMode === "path" && <><strong>Path explorer</strong><span>Selected focus: {entityById(selectedEntity)?.name || selectedEntity}. Click another node to compare its strongest connected path.</span></>}
      </div>
      {networkMode === "path" && <div className="inline-notice">{pathFrom ? `From: ${entityById(pathFrom)?.name || pathFrom}` : "Select a starting node"}{pathTo ? ` · To: ${entityById(pathTo)?.name || pathTo}` : " · Select a second node"}{pathNodes.length > 0 && ` · ${pathEdges.length} hop(s) found`}</div>}
      <div className="graph-source-note">
        <span className="graph-source-indicator" />
        <span><strong>Knowledge graph</strong> Every node and relationship is linked back to source evidence.</span>
        <span className="graph-source-note-meta">Drag nodes · click a node to inspect</span>
      </div>
      <div className="network-layout">
        <section className="panel graph-panel">
          <GraphScene
            focusId={selectedEntity}
            onSelect={(id) => {
              if (networkMode === "path") {
                if (!pathFrom) { setPathFrom(id); setSelectedEntity(id); return; }
                if (id === pathFrom) return;
                setPathTo(id);
                void fetch(`/api/graph/path?caseId=${encodeURIComponent(activeCaseId)}&from=${encodeURIComponent(pathFrom)}&to=${encodeURIComponent(id)}`).then((response) => response.json()).then((data: { nodes?: string[]; edges?: { id: string }[] }) => { setPathNodes(data.nodes || []); setPathEdges((data.edges || []).map((edge) => String(edge.id))); });
                return;
              }
              setSelectedEntity(id);
              const connected = relationships.find((item) => item.source === id || item.target === id);
              if (connected) setSelectedEdge(connected.id);
              openRelationshipDrawer();
            }}
            searchQuery={graphSearch}
            statusFilter={statusFilter}
            expanded={expanded}
            caseId={activeCaseId}
            communities={networkMode === "communities"}
            pathNodes={pathNodes}
            pathEdges={pathEdges}
          />
          <div className="graph-stats">
            <span>
              <strong>08</strong> relationships
            </span>
            <span>
              <strong>03</strong> communities
            </span>
            <span>
              <strong>04</strong> sources corroborating
            </span>
          </div>
        </section>
        <section className="panel entity-panel">
          <span className="eyebrow">SELECTED ENTITY</span>
          <div className="entity-profile">
            <div className="large-avatar">VM</div>
            <div>
              <h2>{entityById(selectedEntity)?.name}</h2>
              <span>
                {entityById(selectedEntity)?.id} ·{" "}
                {entityById(selectedEntity)?.role}
              </span>
            </div>
          </div>
          <div className="profile-stats">
            <div>
              <strong>{selectedEntity === "P003" ? "05" : "03"}</strong>
              <small>connections</small>
            </div>
            <div>
              <strong>{selectedEntity === "P003" ? "04" : "02"}</strong>
              <small>case contexts</small>
            </div>
            <div>
              <strong>{selectedEntity === "P003" ? "0.91" : "0.84"}</strong>
              <small>bridge score</small>
            </div>
          </div>
          <div className="connected-heading">
            <h3>Connected entities</h3>
            <span>Click to focus</span>
          </div>
          {relationships
            .filter(
              (item) =>
                item.source === selectedEntity ||
                item.target === selectedEntity,
            )
            .map((item) => {
              const other =
                item.source === selectedEntity ? item.target : item.source;
              return (
                <button
                  className="connected-row"
                  key={item.id}
                  onClick={() => {
                    setSelectedEntity(other);
                    setSelectedEdge(item.id);
                    openRelationshipDrawer();
                  }}
                >
                  <span className={`mini-dot ${item.status}`} />
                  <span>
                    <strong>{entityById(other)?.name}</strong>
                    <small>{item.type.replaceAll("_", " ")}</small>
                  </span>
                  <b>{Math.round(item.confidence * 100)}%</b>
                </button>
              );
            })}
        </section>
      </div>
    </>
  );
}

function Intelligence({
  setSelectedEntity,
  setView,
}: {
  setSelectedEntity: (id: string) => void;
  setView: (v: View) => void;
}) {
  const { summary, patterns: livePatterns } = useWorkspace();
  const potentialLead = livePatterns.find((pattern) => pattern.type === "POTENTIAL_ASSOCIATION");
  const [analysisRun, setAnalysisRun] = useState(false);
  return (
    <>
      <PageTitle
        eyebrow="INTELLIGENCE / EXPLAINABLE LEADS"
        title="What deserves attention"
        copy="Prioritised analytical signals, with the evidence and reasoning kept visible. Open leads are investigative signals, not findings."
        action={
          <button className="secondary-button" onClick={() => setAnalysisRun(true)}>
            <Sparkles size={15} /> Run analysis
          </button>
        }
      />
      {analysisRun && <div className="inline-notice"><Check size={14} /> Analysis refreshed from the current canonical relationship set.</div>}
      <div className="intelligence-grid">
        <section className="panel lead-list-panel">
          <PanelHeading
            title="Priority entities"
            action="Network view"
            onAction={() => setView("network")}
          />
          {(summary?.leads || []).map((lead) => (
            <button
              className="intelligence-lead"
              key={lead.id}
              onClick={() => {
                setSelectedEntity(lead.id);
                setView("network");
              }}
            >
              <span className="lead-number">{lead.rank}</span>
              <span className="intelligence-lead-main">
                <span className="eyebrow">{lead.label}</span>
                <h2>{lead.name}</h2>
                <p>{lead.reason}</p>
                <div className="signal-tags">
                  {lead.signals.map((signal) => (
                    <span key={signal}>
                      <Check size={12} /> {signal}
                    </span>
                  ))}
                </div>
              </span>
              <span className="big-score" title={lead.signals.join(" · ")}>
                {lead.score}
                <small>priority score</small>
              </span>
              <ChevronRight size={17} />
            </button>
          ))}
          {summary && summary.leads.length === 0 && <div className="empty-state">No graph leads are available for this case yet.</div>}
        </section>
        <section className="panel patterns-panel">
          <PanelHeading title="Pattern detection" />
          <p className="panel-intro">
            Rule-based signals found across the current evidence scope.
          </p>
          {livePatterns.map((pattern, index) => {
            const isSpike = pattern.type === "COMMUNICATION_SPIKE";
            const score = pattern.score || 0;
            const severity = score >= 0.8 ? "HIGH" : "MEDIUM";
            return <div className="pattern-row" key={`${pattern.type}-${pattern.relationship || index}`}>
              <span className={`pattern-icon ${isSpike ? "orange" : "purple"}`}>
                <Activity size={15} />
              </span>
              <span>
                <strong>{isSpike ? "Communication spike" : "Potential association"}</strong>
                <small>{pattern.relationship || `${pattern.source?.name || "Entity"} → ${pattern.target?.name || "Entity"}`}</small>
                <p>{pattern.signals.join(" · ")}</p>
                <em>{pattern.caseId || "Active case"}</em>
              </span>
              <span className={`severity ${severity.toLowerCase()}`}>
                {severity}
              </span>
            </div>;
          })}
          {livePatterns.length === 0 && <div className="empty-state">No computed patterns are available for this case yet.</div>}
        </section>
      </div>
      {potentialLead && <section className="potential-lead panel">
        <div className="potential-icon">
          <GitBranch size={20} />
        </div>
        <div>
          <span className="eyebrow">PREDICTED / POTENTIAL ASSOCIATION</span>
          <h2>
            {potentialLead.source?.name || "Entity"} <span>· · ·</span> {potentialLead.target?.name || potentialLead.relationship || "Entity"}
          </h2>
          <p>
            Score <b>{Math.round((potentialLead.score || 0) * 100)}%</b> · {potentialLead.signals.join(" · ")}
          </p>
        </div>
        <div className="potential-note">
          <CircleAlert size={15} /> No direct evidence currently proves this
          edge.
        </div>
        <button className="text-button" onClick={() => setView("network")}>
          Inspect lead <ArrowRight size={14} />
        </button>
      </section>}
      <AskPanel
        onEntityClick={(id) => {
          setSelectedEntity(id);
          setView("network");
        }}
        onCiteClick={() => setView("evidence")}
      />
    </>
  );
}

function MatchingView({ setView }: { setView: (v: View) => void }) {
  const matchers = [
    { icon: <ScanFace size={18} />, title: "Facial matching", status: "NOT CONFIGURED", tone: "pending", detail: "Compare approved image evidence against a permissioned gallery. Requires a face-detection and embedding service before any investigator review.", metric: "0 indexed faces" },
    { icon: <Fingerprint size={18} />, title: "Alias and entity matching", status: "ACTIVE", tone: "active", detail: "Resolve names, aliases and canonical IDs from extracted evidence while retaining the original mention.", metric: "12 canonical entities" },
    { icon: <AudioLines size={18} />, title: "Voice and transcript matching", status: "REVIEW", tone: "review", detail: "Match transcript speaker references and audio metadata to known case entities. Voice biometrics are not enabled.", metric: "2 transcript sources" },
    { icon: <CarFront size={18} />, title: "Vehicle matching", status: "ACTIVE", tone: "active", detail: "Match registration numbers and vehicle descriptions against the canonical vehicle registry and surveillance events.", metric: "5 registered vehicles" },
    { icon: <PhoneIcon />, title: "Phone and account matching", status: "ACTIVE", tone: "active", detail: "Link phone numbers, calls, accounts and transfers to resolved entities through source-backed records.", metric: "12 phones · 7 accounts" },
  ];

  return <>
    <PageTitle
      eyebrow="MATCHING / MULTIMODAL EVIDENCE"
      title="Match signals without overclaiming"
      copy="Connect faces, names, voices, vehicles, phones and accounts to canonical entities, with every candidate kept reviewable and source-backed."
      action={<button className="secondary-button" onClick={() => setView("resources")}><ArrowRight size={15} /> Add source material</button>}
    />
    <div className="matching-notice panel">
      <div className="matching-notice-icon"><CircleAlert size={17} /></div>
      <div><strong>Matching is an investigative aid, not an identity verdict.</strong><p>Potential matches require source review and investigator approval. Facial and voice matching are shown as planned capabilities until a compliant biometric service and consent policy are configured.</p></div>
    </div>
    <div className="matching-grid">
      {matchers.map((matcher) => <section className="panel matching-card" key={matcher.title}>
        <div className={`matching-icon ${matcher.tone}`}>{matcher.icon}</div>
        <div className="matching-card-head"><h2>{matcher.title}</h2><span className={`matching-status ${matcher.tone}`}>{matcher.status}</span></div>
        <p>{matcher.detail}</p>
        <div className="matching-card-footer"><strong>{matcher.metric}</strong>{matcher.tone === "active" ? <button className="text-button" onClick={() => setView("network")}>Inspect graph <ArrowRight size={13} /></button> : <span className="muted">Requirements pending</span>}</div>
      </section>)}
    </div>
    <section className="panel matching-review-panel">
      <PanelHeading title="Recent match signals" action="Open evidence" onAction={() => setView("evidence")} />
      <div className="matching-signal-row"><span className="matching-signal-dot active" /><span><strong>UP14EF9090</strong><small>Vehicle registry ↔ SURV-0012 · Cafe Meridian</small></span><b>OBSERVED</b><em>98%</em></div>
      <div className="matching-signal-row"><span className="matching-signal-dot active" /><span><strong>“Vicky” → Vikram Malhotra</strong><small>Transcript and FIR aliases ↔ P003</small></span><b>CORROBORATED</b><em>91%</em></div>
      <div className="matching-signal-row"><span className="matching-signal-dot review" /><span><strong>PH003 ↔ P003</strong><small>CDR usage pattern · investigator review required</small></span><b>REVIEW</b><em>84%</em></div>
    </section>
  </>;
}

function PhoneIcon() {
  return <span className="phone-icon">⌕</span>;
}

function Timeline() {
  const { activeCaseId, summary } = useWorkspace();
  const [filterType, setFilterType] = useState("ALL");
  const liveTimeline = (summary?.activity || []).map((item) => [item.time, "—", activeCaseId, item.title, item.tone.toUpperCase()] as const);
  const visibleTimeline = liveTimeline.filter(([, , , , type]) => filterType === "ALL" || type === filterType);
  const timelineDates = liveTimeline.map(([date]) => date).sort();
  const timelineWindow = timelineDates.length ? `${timelineDates[0]} – ${timelineDates[timelineDates.length - 1]}` : "No events available";
  return (
    <>
      <PageTitle
        eyebrow={`TEMPORAL ANALYSIS / ${activeCaseId}`}
        title="Investigation timeline"
        copy="Events are ordered from source timestamps. Use time to test convergence, sequence and overlap."
        action={
          <button className="filter-button" onClick={() => setFilterType((current) => current === "ALL" ? "BLUE" : current === "BLUE" ? "GREEN" : current === "GREEN" ? "PURPLE" : "ALL")}>
            <SlidersHorizontal size={14} /> {filterType === "ALL" ? "All event types" : filterType}
          </button>
        }
      />
      <div className="timeline-summary">
        <div>
          <span className="eyebrow">WINDOW</span>
            <strong>{timelineWindow}</strong>
        </div>
        <div>
          <span className="eyebrow">EVENTS</span>
            <strong>{liveTimeline.length}</strong>
        </div>
        <div>
          <span className="eyebrow">SOURCE TYPES</span>
            <strong>{new Set(liveTimeline.map(([, , , , type]) => type)).size}</strong>
        </div>
        <div className="timeline-legend">
          <span>
            <i className="dot blue" />
            Source event
          </span>
          <span>
            <i className="dot orange" />
            Case milestone
          </span>
        </div>
      </div>
      <div className="panel timeline-panel">
        <div className="timeline-axis">
          <span>01 AUG</span>
          <span>08 AUG</span>
          <span>15 AUG</span>
          <span>22 AUG</span>
          <span>26 AUG</span>
        </div>
        <div className="timeline-line" />
        {visibleTimeline.map(([date, time, place, title, type], index) => (
          <div
            className={`timeline-event ${type === "INCIDENT" ? "milestone" : ""}`}
            style={{ marginLeft: `${index * 9 + 4}%` }}
            key={`${date}-${time}-${place}-${title}`}
          >
            <span className="timeline-marker" />
            <div className="timeline-card">
              <span className="eyebrow">
                {date} · {time} · {type}
              </span>
              <strong>{title}</strong>
              <small>{place}</small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

type ProofEvent = {
  eventId: string;
  sequence: number;
  eventType: string;
  inputHashes: string[];
  outputHash: string;
  previousOutputHash: string | null;
  operationVersion: string;
  previousEventHash: string | null;
  eventHash: string;
  createdAt: string;
};

type ProofRun = {
  runId: string;
  caseId: string;
  status: "VERIFIED" | "INVALID";
  rootHash: string;
  pipelineVersion: string;
  scope: string;
  storage: string;
  events: ProofEvent[];
  verification?: { valid: boolean; invalidEvent: string | null };
};

type LocalResource = {
  id: string;
  filename: string;
  hash: string;
  status: string;
  integrityEntryHash?: string;
};

type ResourceVerification = {
  valid: boolean;
  committedHash?: string;
  currentHash?: string;
  merkleRoot?: string | null;
  invalidDocument?: string | null;
  invalidEvent?: string | null;
  eventCount?: number;
};

function SecurityAccess() {
  const { activeCaseId, cases: workspaceCases, role } = useWorkspace();
  return <>
    <PageTitle eyebrow="CONTROL PLANE / ACCESS" title="Security & access" copy="Review the active session role and case-level access scope." action={<span className="role-badge">{role.toUpperCase()}</span>} />
    <div className="integrity-grid">
      <section className="panel access-panel">
        <PanelHeading title="Current session" />
        <div className="current-role">
          <div className="avatar">{CURRENT_USER.initials}</div>
          <span><strong>{CURRENT_USER.name}</strong><small>{role} · session enforced by API</small></span>
          <span className="role-badge">{role.toUpperCase()}</span>
        </div>
        <div className="rbac-note"><KeyRound size={15} /><span>Mutation routes enforce the selected role server-side. Auditor sessions are read-only.</span></div>
      </section>
      <section className="panel access-panel">
        <PanelHeading title="Case access" />
        {workspaceCases.map((item) => {
          const allowed = role === "Supervisor" || role === "Auditor" || item.id === activeCaseId;
          return <div className="access-row" key={item.id}><span className={allowed ? "access-yes" : "access-no"}>{allowed ? <Check size={13} /> : <X size={13} />}</span><strong>{item.id}</strong><small>{allowed ? `${item.priority} · ${item.jurisdiction}` : "Outside assigned scope"}</small></div>;
        })}
      </section>
    </div>
  </>;
}

function Integrity() {
  const { activeCaseId, resources: workspaceResources } = useWorkspace();
  const [proofRun, setProofRun] = useState<ProofRun | null>(null);
  const [verification, setVerification] = useState<ProofRun["verification"]>();
  const [proofLoading, setProofLoading] = useState(true);
  const [proofError, setProofError] = useState<string | null>(null);
  const [verifyingProof, setVerifyingProof] = useState(false);
  const [localResources, setLocalResources] = useState<LocalResource[]>([]);
  const [resourceVerification, setResourceVerification] = useState<Record<string, ResourceVerification>>({});
  const [verifyingResource, setVerifyingResource] = useState<string | null>(null);

  async function loadProofRun() {
    setProofLoading(true);
    try {
      setProofError(null);
      const response = await fetch(`/api/provenance?caseId=${encodeURIComponent(activeCaseId)}`);
      if (!response.ok) throw new Error("Proof trail unavailable");
      const data = (await response.json()) as ProofRun;
      setProofRun(data);
      setVerification(data.verification);
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Proof trail unavailable");
      setProofRun(null);
    } finally {
      setProofLoading(false);
    }
  }

  async function verifyProof() {
    if (!proofRun) { setProofError("Load the proof trail before verifying it."); return; }
    setVerifyingProof(true);
    setProofError(null);
    try {
      const response = await fetch("/api/provenance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ caseId: proofRun.caseId }) });
      if (!response.ok) throw new Error("Proof verification failed");
      const data = (await response.json()) as { valid: boolean; invalidEvent: string | null };
      setVerification(data);
    } catch (error) {
      setProofError(error instanceof Error ? error.message : "Proof verification failed");
    } finally {
      setVerifyingProof(false);
    }
  }

  async function loadLocalResources() {
    try {
      const response = await fetch(`/api/resources?caseId=${encodeURIComponent(activeCaseId)}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Resources unavailable");
      const data = (await response.json()) as { resources: LocalResource[] };
      setLocalResources(data.resources.filter((resource) => resource.id.startsWith("UPLOAD-")));
    } catch {
      setLocalResources([]);
    }
  }

  useEffect(() => {
    loadProofRun().catch(() => setProofLoading(false));
    void loadLocalResources();
    const unsubscribeResources = subscribeWorkspaceEvent(WORKSPACE_EVENTS.resourcesChanged, () => void loadLocalResources());
    const unsubscribeIntegrity = subscribeWorkspaceEvent(WORKSPACE_EVENTS.integrityRefresh, () => {
      void loadProofRun();
      void loadLocalResources();
    });
    return () => {
      unsubscribeResources();
      unsubscribeIntegrity();
    };
  }, [activeCaseId]);

  async function verifyResource(resourceId: string) {
    setVerifyingResource(resourceId);
    try {
      const response = await fetch(`/api/resources/${resourceId}/verify`, { method: "POST" });
      const data = (await response.json()) as ResourceVerification;
      setResourceVerification((current) => ({ ...current, [resourceId]: data }));
    } finally {
      setVerifyingResource(null);
    }
  }

  async function verifyAllResources() {
    await Promise.all(localResources.map((resource) => verifyResource(resource.id)));
  }

  function downloadAuditLog() {
    const audit = [
      { time: "09:42", event: "Hash verification completed", scope: activeCaseId, actor: CURRENT_USER.name },
      { time: "09:18", event: "Entity resolution accepted", scope: "Raju → P001", actor: CURRENT_USER.name },
      { time: "Yesterday", event: "Predicted lead generated", scope: "Rahul ↔ Imran", actor: "Ingestion service" },
    ];
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([JSON.stringify(audit, null, 2)], { type: "application/json" }));
    link.download = "evidencegraph-audit-log.json";
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <>
      <PageTitle
        eyebrow="CONTROL PLANE / PROVENANCE"
        title="Trust, access and audit"
        copy="Security controls are visible at the point where investigative work happens."
      />
      {proofError && <div className="resource-error"><CircleAlert size={14} /> {proofError}</div>}
      <section className="panel proof-panel">
        <div className="proof-header">
          <div>
            <span className="eyebrow">VERIFIABLE COMPUTATION / {activeCaseId}</span>
            <h2>Computation proof trail</h2>
            <p>Each step consumes the previous output and is linked to the previous event by SHA-256 hashes.</p>
          </div>
          <span className={`proof-status ${verification?.valid ? "verified" : "pending"}`}>
            <i /> {proofLoading ? "LOADING" : verification?.valid ? "VERIFIED" : "CHECK REQUIRED"}
          </span>
        </div>
        {proofRun && (
          <>
            <div className="proof-summary">
              <div><small>ROOT HASH</small><strong>{proofRun.rootHash.slice(0, 18)}...</strong></div>
              <div><small>EVENTS</small><strong>{proofRun.events.length}</strong></div>
              <div><small>STORAGE</small><strong>{proofRun.storage === "neo4j" ? "Neo4j" : "Local demo"}</strong></div>
              <button className="secondary-button small" onClick={() => void verifyProof()} disabled={proofLoading || !proofRun || verifyingProof}>{verifyingProof ? "Verifying..." : "Verify trail"}</button>
            </div>
            <div className="proof-events">
              {proofRun.events.map((event) => (
                <details className="proof-event" key={event.eventId}>
                  <summary>
                    <span className="proof-event-number">{String(event.sequence).padStart(2, "0")}</span>
                    <span><strong>{event.eventType.replaceAll("_", " ")}</strong><small>{event.eventId}</small></span>
                    <code>{event.eventHash.slice(0, 12)}...</code>
                    <ChevronRight size={14} />
                  </summary>
                  <div className="proof-event-details">
                    <span>Input hashes <code>{event.inputHashes.join(" · ")}</code></span>
                    <span>Output hash <code>{event.outputHash}</code></span>
                    <span>Previous output hash <code>{event.previousOutputHash || "GENESIS"}</code></span>
                    <span>Previous event hash <code>{event.previousEventHash || "GENESIS"}</code></span>
                    <span>Operation <code>{event.operationVersion}</code></span>
                  </div>
                </details>
              ))}
            </div>
          </>
        )}
      </section>
      {localResources.length > 0 && (
        <section className="panel proof-panel local-integrity-panel">
          <div className="proof-header">
            <div>
              <span className="eyebrow">LOCAL RESOURCE COMMITMENTS</span>
              <h2>Uploaded document verification</h2>
              <p>Each upload is a Merkle leaf and every processing step is chained to the committed document hash.</p>
            </div>
            <span className="proof-status verified"><i /> {localResources.length} COMMITTED</span>
          </div>
          <div className="proof-events">
            {localResources.map((resource) => {
              const result = resourceVerification[resource.id];
              return (
                <div className="proof-event" key={resource.id}>
                  <div className="proof-event-details">
                    <span><strong>{resource.filename}</strong><small>{resource.id} · {resource.status}</small></span>
                    <span>Source hash <code>{resource.hash}</code></span>
                    {result && <span>Merkle root <code>{result.merkleRoot || "UNAVAILABLE"}</code></span>}
                    {result && <span>Chain events <code>{result.eventCount ?? 0}</code> · {result.invalidEvent || result.invalidDocument || "No invalid links"}</span>}
                    <button className="secondary-button small" onClick={() => verifyResource(resource.id)} disabled={verifyingResource === resource.id}>
                      {verifyingResource === resource.id ? "Verifying..." : result?.valid ? "Verified" : "Verify document"}
                    </button>
                    {result && <b className={result.valid ? "ledger-ok" : "ledger-bad"}>{result.valid ? "VALID" : "MISMATCH"}</b>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
      <div className="integrity-grid">
        <section className="panel ledger-panel">
          <PanelHeading title="Evidence integrity ledger" action="Verify all" onAction={verifyAllResources} />
          <div className="ledger-intro">
            <div className="ledger-check">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>7 of 8 records verified</strong>
              <p>
                Hashes are compared against the prototype permissioned-ledger
                record. Sensitive evidence stays off-chain.
              </p>
            </div>
          </div>
          {evidence.slice(0, 6).map((item) => (
            <div className="ledger-row" key={item.id}>
              <span
                className={
                  item.integrity === "verified" ? "ledger-ok" : "ledger-bad"
                }
              >
                {item.integrity === "verified" ? (
                  <Check size={14} />
                ) : (
                  <CircleAlert size={14} />
                )}
              </span>
              <span>
                <strong>{item.id}</strong>
                <small>{item.hash} · encrypted off-chain</small>
              </span>
              <b>{item.integrity === "verified" ? "VERIFIED" : "MISMATCH"}</b>
            </div>
          ))}
        </section>
      </div>
      <section className="panel audit-panel">
        <PanelHeading title="Recent audit trail" action="Export log" onAction={downloadAuditLog} />
        {[
          [
            "09:42",
            "Hash verification completed",
            "FIR-1004.pdf · VERIFIED",
             CURRENT_USER.name,
          ],
          [
            "09:18",
            "Entity resolution accepted",
            "Raju → P001 · canonical mapping",
             CURRENT_USER.name,
          ],
          [
            "Yesterday",
            "Access request denied",
            "CASE-2001 · outside assigned scope",
            "Policy engine",
          ],
          [
            "04 Sep",
            "Evidence package ingested",
            `${workspaceResources.length} records · ${activeCaseId}`,
            "Forensic analyst",
          ],
        ].map(([time, title, detail, actor]) => (
          <div className="audit-row" key={`${time}-${title}-${detail}`}>
            <span>{time}</span>
            <span>
              <strong>{title}</strong>
              <small>{detail}</small>
            </span>
            <small>{actor}</small>
            <ChevronRight size={14} />
          </div>
        ))}
      </section>
      <section className="panel provenance-note-panel">
        <div className="provenance-note-icon"><ShieldCheck size={18} /></div>
        <div>
          <span className="eyebrow">HOW VERIFICATION WORKS</span>
          <h2>Every computation step carries its own proof</h2>
          <p>
            EvidenceGraph canonicalizes each input and calculates a SHA-256 hash.
            Every processing event stores its output hash and the hash of the
            previous event, forming a tamper-evident chain that ends at the root
            hash shown above.
          </p>
          <p>
            Verification replays the hash calculations and checks the entire
            chain. This confirms that the declared inputs, processing order and
            outputs have not changed. It does not establish guilt, validate the
            truth of source material, or replace independent investigation.
          </p>
          <div className="provenance-note-meta">
            <span><Check size={13} /> Inputs committed</span>
            <span><Check size={13} /> Previous outputs consumed</span>
            <span><Check size={13} /> Root independently recalculable</span>
            <span><CircleAlert size={13} /> Blockchain and ZK proofs not enabled</span>
          </div>
        </div>
      </section>
    </>
  );
}

export default App;
