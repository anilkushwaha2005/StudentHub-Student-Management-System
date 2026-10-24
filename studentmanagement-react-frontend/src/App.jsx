import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, Settings, Search,
  Plus, Bell, ChevronDown, Pencil, Trash2, Mail, Hash, BookMarked, X,
  CheckCircle2, AlertCircle, RefreshCw, UserRound, LogOut, SlidersHorizontal,
  ArrowUpRight, CalendarDays, ShieldCheck, CircleHelp, Home, ExternalLink,
  Check, BellRing, Moon, Sun, Save, ChevronRight
} from "lucide-react";

const API = "/api/students";
const emptyForm = { name: "", rollNumber: "", course: "", email: "" };

function normalizeStudents(payload) {
  if (Array.isArray(payload)) return payload;
  const embedded = payload?._embedded;
  if (embedded) {
    const key = Object.keys(embedded).find(k => Array.isArray(embedded[k]));
    if (key) return embedded[key];
  }
  if (Array.isArray(payload?.content)) return payload.content;
  return [];
}
function studentId(student) {
  if (student.id !== undefined) return student.id;
  const href = student?._links?.self?.href || student?._links?.student?.href;
  if (!href) return null;
  const match = href.match(/\/(\d+)(?:\?.*)?$/);
  return match ? match[1] : null;
}
function initials(name = "") {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase() || "ST";
}
function Toast({ toast, onClose }) {
  if (!toast) return null;
  const Icon = toast.type === "error" ? AlertCircle : CheckCircle2;
  return <div className={`toast ${toast.type}`} role="status"><Icon size={18}/><span>{toast.message}</span><button onClick={onClose} aria-label="Close notification"><X size={16}/></button></div>;
}
function StudentModal({ student, onClose, onSave, saving }) {
  const [form, setForm] = useState(student || emptyForm);
  const [error, setError] = useState("");
  useEffect(() => setForm(student || emptyForm), [student]);
  const update = (key, value) => setForm(old => ({ ...old, [key]: value }));
  async function submit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.rollNumber.trim() || !form.course.trim() || !form.email.trim()) return setError("Please complete all fields.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Enter a valid email address.");
    setError("");
    await onSave({ name: form.name.trim(), rollNumber: form.rollNumber.trim(), course: form.course.trim(), email: form.email.trim() });
  }
  return <div className="modal-backdrop" onMouseDown={e => e.target === e.currentTarget && onClose()}>
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-head"><div><span className="eyebrow">{student ? "UPDATE RECORD" : "NEW RECORD"}</span><h2 id="modal-title">{student ? "Edit student" : "Add a student"}</h2><p>Enter the student's academic and contact details.</p></div><button className="icon-btn" onClick={onClose} aria-label="Close"><X size={19}/></button></div>
      <form onSubmit={submit}>
        <label>Full name<div className="field"><Users size={17}/><input autoFocus value={form.name || ""} onChange={e => update("name", e.target.value)} placeholder="e.g. Anil Kushwaha"/></div></label>
        <div className="form-grid"><label>Roll number<div className="field"><Hash size={17}/><input value={form.rollNumber || ""} onChange={e => update("rollNumber", e.target.value)} placeholder="NIET001"/></div></label><label>Course<div className="field"><BookMarked size={17}/><input value={form.course || ""} onChange={e => update("course", e.target.value)} placeholder="B.Tech CSE IoT"/></div></label></div>
        <label>Email address<div className="field"><Mail size={17}/><input type="email" value={form.email || ""} onChange={e => update("email", e.target.value)} placeholder="student@example.com"/></div></label>
        {error && <div className="form-error"><AlertCircle size={15}/>{error}</div>}
        <div className="modal-actions"><button type="button" className="btn secondary" onClick={onClose}>Cancel</button><button type="submit" className="btn primary" disabled={saving}>{saving ? "Saving..." : student ? <><Save size={16}/> Save changes</> : <><Plus size={17}/> Add student</>}</button></div>
      </form>
    </section>
  </div>;
}

export default function App() {
  const [students, setStudents] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [page, setPage] = useState(1);
  const [activePage, setActivePage] = useState("dashboard");
  const [openPanel, setOpenPanel] = useState(null);
  const [compactMode, setCompactMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [adminName, setAdminName] = useState("Anil Kushwaha");
  const [adminEmail, setAdminEmail] = useState("anil@example.com");
  const [savedSettings, setSavedSettings] = useState({ name: "Anil Kushwaha", email: "anil@example.com" });
  const pageSize = 7;

  function notify(message, type = "success") {
    setToast({ message, type });
    window.clearTimeout(window.__studentHubToastTimer);
    window.__studentHubToastTimer = window.setTimeout(() => setToast(null), 3500);
  }
  async function loadStudents(showToast = false) {
    setLoading(true); setLoadError("");
    try {
      const response = await fetch(API, { headers: { Accept: "application/hal+json, application/json" } });
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      setStudents(normalizeStudents(data));
      if (showToast) notify("Student records refreshed.");
    } catch (err) {
      setLoadError(err.message === "Failed to fetch" ? "Cannot connect to the API. Check that Spring Boot is running and the Vite proxy is configured." : `Could not load students: ${err.message}`);
      if (showToast) notify("Could not refresh student records.", "error");
    } finally { setLoading(false); }
  }
  useEffect(() => { loadStudents(); }, []);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return students;
    return students.filter(s => [s.name, s.rollNumber, s.course, s.email].some(v => String(v || "").toLowerCase().includes(q)));
  }, [students, query]);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageStudents = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const courseGroups = useMemo(() => students.reduce((acc, student) => {
    const name = (student.course || "Unspecified course").trim();
    if (!acc[name]) acc[name] = [];
    acc[name].push(student);
    return acc;
  }, {}), [students]);

  async function saveStudent(data) {
    setSaving(true);
    try {
      const editing = Boolean(modal?.student);
      const id = editing ? studentId(modal.student) : null;
      if (editing && id == null) throw new Error("Student ID was not found in the API response.");
      const response = await fetch(editing ? `${API}/${id}` : API, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json", Accept: "application/hal+json, application/json" }, body: JSON.stringify(data) });
      if (!response.ok) { const body = await response.text(); throw new Error(`Request failed (${response.status})${body ? `: ${body.slice(0, 160)}` : ""}`); }
      setModal(null); await loadStudents(); notify(editing ? "Student details updated." : "Student added successfully.");
    } catch (err) { notify(err.message || "Could not save student.", "error"); }
    finally { setSaving(false); }
  }
  async function deleteStudent(student) {
    const id = studentId(student);
    if (id == null) return notify("Student ID was not found in the API response.", "error");
    if (!window.confirm(`Delete ${student.name || "this student"}? This cannot be undone.`)) return;
    try {
      const response = await fetch(`${API}/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      await loadStudents(); notify("Student deleted.");
    } catch (err) { notify(err.message || "Could not delete student.", "error"); }
  }
  function navigate(pageName) { setActivePage(pageName); setOpenPanel(null); setQuery(""); setPage(1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function saveAdminSettings(e) { e.preventDefault(); if (!adminName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return notify("Enter a valid name and email address.", "error"); setSavedSettings({ name: adminName.trim(), email: adminEmail.trim() }); notify("Settings saved for this session."); }
  const pageTitle = { dashboard: "Dashboard", students: "Students", courses: "Courses", settings: "Settings", profile: "My profile" }[activePage] || "Dashboard";
  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "students", label: "Students", Icon: Users, count: students.length },
    { id: "courses", label: "Courses", Icon: BookOpen }
  ];

  return <div className={`app-shell ${compactMode ? "compact-mode" : ""} ${darkMode ? "dark-mode" : ""}`} onClick={() => openPanel && setOpenPanel(null)}>
    <aside className="sidebar" onClick={e => e.stopPropagation()}>
      <button className="brand brand-button" onClick={() => navigate("dashboard")} aria-label="StudentHub dashboard"><span className="brand-mark"><GraduationCap size={23}/></span><span>student<span className="brand-light">hub</span></span><span className="brand-beta">ADMIN</span></button>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">{navItems.map(({ id, label, Icon, count }) => <button key={id} className={`nav-item ${activePage === id ? "active" : ""}`} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span>{count !== undefined && <span className="nav-count">{count}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-label">PREFERENCES</div><button className={`nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings size={18}/><span>Settings</span></button>
        <div className="help-card"><div className="help-icon">✦</div><strong>Need a hand?</strong><p>Manage your student records with ease.</p><button onClick={() => notify("Quick tip: use the Students page to search, add, edit and delete records.")}>Quick tip <ArrowUpRight size={13}/></button></div>
        <button className={`profile profile-button ${openPanel === "profile" ? "menu-active" : ""}`} onClick={() => setOpenPanel(openPanel === "profile" ? null : "profile")} aria-expanded={openPanel === "profile"}><span className="avatar admin-avatar">{initials(savedSettings.name)}</span><span className="profile-copy"><strong>{savedSettings.name}</strong><span>Administrator</span></span><ChevronDown size={16}/></button>
        {openPanel === "profile" && <div className="dropdown profile-dropdown"><div className="dropdown-user"><span className="avatar admin-avatar">{initials(savedSettings.name)}</span><div><strong>{savedSettings.name}</strong><span>{savedSettings.email}</span></div></div><button onClick={() => navigate("profile")}><UserRound size={16}/> My profile</button><button onClick={() => navigate("settings")}><Settings size={16}/> Account settings</button><button onClick={() => { setOpenPanel(null); loadStudents(true); }}><RefreshCw size={16}/> Refresh data</button><div className="dropdown-divider"/><button className="danger-menu" onClick={() => { setOpenPanel(null); notify("Demo mode: no account is signed in or signed out."); }}><LogOut size={16}/> Sign out <span className="demo-label">DEMO</span></button></div>}
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar" onClick={e => e.stopPropagation()}><div className="breadcrumb"><button onClick={() => navigate("dashboard")} className="crumb-link"><Home size={14}/> Workspace</button><ChevronRight size={14} className="crumb-slash"/><strong>{pageTitle}</strong></div><div className="top-actions"><div className="api-status"><span className={`status-dot ${loadError ? "offline" : loading ? "checking" : "online"}`}></span>{loadError ? "API unavailable" : loading ? "Connecting..." : "API connected"}</div>
        <div className="top-popover-wrap"><button className={`icon-btn notification-btn ${openPanel === "notifications" ? "menu-active" : ""}`} onClick={() => setOpenPanel(openPanel === "notifications" ? null : "notifications")} aria-label="Notifications" aria-expanded={openPanel === "notifications"}><Bell size={19}/>{notificationsEnabled && <i/>}</button>{openPanel === "notifications" && <div className="dropdown notification-dropdown"><div className="dropdown-heading"><div><strong>Notifications</strong><span>Latest activity in StudentHub</span></div><span className="live-chip">LIVE</span></div>{loadError ? <div className="notification-item"><span className="notice-icon warning"><AlertCircle size={16}/></span><div><strong>API connection issue</strong><p>{loadError}</p></div></div> : <><div className="notification-item"><span className="notice-icon success"><CheckCircle2 size={16}/></span><div><strong>Database connected</strong><p>Student records are loading from the API.</p></div></div><div className="notification-item"><span className="notice-icon purple"><Users size={16}/></span><div><strong>{students.length} student records</strong><p>Your directory currently contains {students.length} record{students.length === 1 ? "" : "s"}.</p></div></div></>}{!notificationsEnabled && <p className="dropdown-note">Desktop notifications are disabled in Settings.</p>}<button className="dropdown-footer" onClick={() => { setOpenPanel(null); navigate("students"); }}>View student directory <ArrowUpRight size={14}/></button></div>}</div>
        <div className="top-popover-wrap"><button className="top-avatar top-avatar-button" onClick={() => setOpenPanel(openPanel === "profileTop" ? null : "profileTop")} aria-label="Open account menu" aria-expanded={openPanel === "profileTop"}>{initials(savedSettings.name)}</button>{openPanel === "profileTop" && <div className="dropdown top-profile-dropdown"><div className="dropdown-user"><span className="avatar admin-avatar">{initials(savedSettings.name)}</span><div><strong>{savedSettings.name}</strong><span>Administrator</span></div></div><button onClick={() => navigate("profile")}><UserRound size={16}/> My profile</button><button onClick={() => navigate("settings")}><Settings size={16}/> Settings</button><button onClick={() => { setOpenPanel(null); loadStudents(true); }}><RefreshCw size={16}/> Refresh data</button></div>}</div>
      </div></header>

      <div className="page-content">
        {activePage === "dashboard" && <>
          <section className="welcome-row"><div><div className="eyebrow">OVERVIEW</div><h1>Good to see you, {savedSettings.name.split(" ")[0]} <span className="wave">✦</span></h1><p>Here’s what’s happening with your students today.</p></div><button className="btn primary" onClick={() => setModal({ student: null })}><Plus size={18}/> Add student</button></section>
          {loadError && <div className="error-banner"><AlertCircle size={18}/><div><strong>Can't reach your student API</strong><p>{loadError}</p><small>API: {API}</small></div><button className="btn secondary small" onClick={() => loadStudents(true)}><RefreshCw size={15}/> Retry</button></div>}
          <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Total students</span><div className="stat-icon purple"><Users size={19}/></div></div><div className="stat-number">{loading ? "—" : students.length}</div><div className="stat-foot"><span className="trend neutral">Live data</span><span>from MySQL API</span></div></article><article className="stat-card"><div className="stat-top"><span>Courses represented</span><div className="stat-icon blue"><BookOpen size={19}/></div></div><div className="stat-number">{loading ? "—" : Object.keys(courseGroups).length}</div><div className="stat-foot"><span>Unique course names</span></div></article><article className="stat-card"><div className="stat-top"><span>With email</span><div className="stat-icon green"><Mail size={19}/></div></div><div className="stat-number">{loading ? "—" : students.filter(s => s.email).length}</div><div className="stat-foot"><span>Contact records</span></div></article><article className="stat-card"><div className="stat-top"><span>Search results</span><div className="stat-icon orange"><Search size={19}/></div></div><div className="stat-number">{loading ? "—" : filtered.length}</div><div className="stat-foot"><span>Matching students</span></div></article></section>
          <StudentDirectory students={pageStudents} total={filtered.length} loading={loading} query={query} setQuery={setQuery} page={currentPage} pageCount={pageCount} setPage={setPage} onAdd={() => setModal({ student: null })} onEdit={s => setModal({ student: s })} onDelete={deleteStudent} onRefresh={() => loadStudents(true)} />
        </>}
        {activePage === "students" && <><PageIntro eyebrow="DIRECTORY" title="Student directory" subtitle="Search, add and manage student records from one place." action={<button className="btn primary" onClick={() => setModal({ student: null })}><Plus size={17}/> Add student</button>}/>{loadError && <div className="error-banner"><AlertCircle size={18}/><div><strong>Can't reach your student API</strong><p>{loadError}</p></div><button className="btn secondary small" onClick={() => loadStudents(true)}>Retry</button></div>}<StudentDirectory students={pageStudents} total={filtered.length} loading={loading} query={query} setQuery={setQuery} page={currentPage} pageCount={pageCount} setPage={setPage} onAdd={() => setModal({ student: null })} onEdit={s => setModal({ student: s })} onDelete={deleteStudent} onRefresh={() => loadStudents(true)}/></>}
        {activePage === "courses" && <><PageIntro eyebrow="ACADEMIC OVERVIEW" title="Courses" subtitle="Explore courses represented in your student directory." action={<span className="soft-count"><BookOpen size={15}/> {Object.keys(courseGroups).length} course names</span>}/><div className="course-summary-grid"><div className="course-summary-card"><span className="course-summary-icon purple"><BookOpen size={19}/></span><div><span>Course names</span><strong>{Object.keys(courseGroups).length}</strong></div></div><div className="course-summary-card"><span className="course-summary-icon blue"><Users size={19}/></span><div><span>Enrolled student records</span><strong>{students.length}</strong></div></div></div>{Object.keys(courseGroups).length === 0 ? <div className="settings-card empty-courses"><div className="empty-illustration"><BookOpen size={24}/></div><h3>No courses yet</h3><p>Add a student and enter a course name to see it here.</p><button className="btn primary" onClick={() => setModal({ student: null })}><Plus size={16}/> Add student</button></div> : <div className="course-grid">{Object.entries(courseGroups).sort(([a], [b]) => a.localeCompare(b)).map(([course, enrolled], i) => <article className="course-card" key={course}><div className={`course-card-icon course-color-${i % 4}`}><BookOpen size={21}/></div><div className="course-card-top"><span className="course-tag">COURSE</span><span className="course-count">{enrolled.length} student{enrolled.length === 1 ? "" : "s"}</span></div><h3>{course}</h3><p>Student records assigned to this course.</p><div className="course-student-list">{enrolled.slice(0, 4).map(s => <div className="mini-student" key={studentId(s) ?? s.rollNumber}><span className="mini-avatar">{initials(s.name)}</span><span>{s.name || "Unnamed student"}</span></div>)}{enrolled.length > 4 && <span className="more-students">+{enrolled.length - 4} more</span>}</div><button className="text-action" onClick={() => { setQuery(course); setPage(1); navigate("students"); setQuery(course); }}>View students <ArrowUpRight size={14}/></button></article>)}</div>}</>}
        {activePage === "settings" && <><PageIntro eyebrow="PREFERENCES" title="Settings" subtitle="Personalize your StudentHub workspace and account preferences."/><div className="settings-layout"><section className="settings-card"><div className="settings-card-head"><span className="settings-icon purple"><SlidersHorizontal size={19}/></span><div><h2>Workspace preferences</h2><p>Adjust how the dashboard looks and behaves.</p></div></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol"><BellRing size={17}/></span><div><strong>Notifications</strong><p>Show notification indicators and activity updates.</p></div></div><button className={`toggle ${notificationsEnabled ? "on" : ""}`} role="switch" aria-checked={notificationsEnabled} onClick={() => { setNotificationsEnabled(v => !v); notify(`Notifications ${notificationsEnabled ? "disabled" : "enabled"}.`); }}><span/></button></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol"><SlidersHorizontal size={17}/></span><div><strong>Compact layout</strong><p>Reduce spacing to fit more records on screen.</p></div></div><button className={`toggle ${compactMode ? "on" : ""}`} role="switch" aria-checked={compactMode} onClick={() => { setCompactMode(v => !v); notify(`Compact layout ${compactMode ? "disabled" : "enabled"}.`); }}><span/></button></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol">{darkMode ? <Moon size={17}/> : <Sun size={17}/>}</span><div><strong>Dark appearance</strong><p>Switch to a darker dashboard palette.</p></div></div><button className={`toggle ${darkMode ? "on" : ""}`} role="switch" aria-checked={darkMode} onClick={() => { setDarkMode(v => !v); notify(`Dark appearance ${darkMode ? "disabled" : "enabled"}.`); }}><span/></button></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol"><RefreshCw size={17}/></span><div><strong>Student data</strong><p>Fetch the latest records from the Spring Boot API.</p></div></div><button className="btn secondary" onClick={() => loadStudents(true)} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh data</button></div></section><section className="settings-card account-settings"><div className="settings-card-head"><span className="settings-icon blue"><UserRound size={19}/></span><div><h2>Administrator profile</h2><p>Update the display name and contact email shown in this workspace.</p></div></div><form className="settings-form" onSubmit={saveAdminSettings}><label>Display name<div className="field"><UserRound size={17}/><input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Your name"/></div></label><label>Contact email<div className="field"><Mail size={17}/><input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="you@example.com"/></div></label><div className="settings-form-footer"><span><ShieldCheck size={14}/> Saved locally for this session</span><button className="btn primary" type="submit"><Save size={16}/> Save settings</button></div></form></section></div></>}
        {activePage === "profile" && <><PageIntro eyebrow="ACCOUNT" title="My profile" subtitle="Your administrator identity for this StudentHub demo."/><section className="settings-card profile-page-card"><div className="profile-hero"><div className="profile-large-avatar">{initials(savedSettings.name)}</div><div><span className="live-chip">ADMINISTRATOR</span><h2>{savedSettings.name}</h2><p>{savedSettings.email}</p></div><button className="btn secondary" onClick={() => navigate("settings")}><Settings size={15}/> Edit profile</button></div><div className="profile-detail-grid"><div><span>Account role</span><strong>Administrator</strong></div><div><span>Workspace</span><strong>StudentHub</strong></div><div><span>Data source</span><strong>Spring Boot + MySQL</strong></div><div><span>Connection status</span><strong className={loadError ? "text-danger" : "text-success"}>{loadError ? "Disconnected" : "Connected"}</strong></div></div><div className="profile-note"><ShieldCheck size={17}/><p>This is a local demo profile. Authentication and server-side account management are not configured in this project.</p></div></section></>}
        <footer className="footer"><span>© 2026 StudentHub <span className="footer-dot">·</span> Admin workspace</span><span><span className={`status-dot ${loadError ? "offline" : "online"}`}></span>{loadError ? "Disconnected from Spring Boot API" : "Connected to Spring Boot API"}</span></footer>
      </div>
    </main>
    {modal && <StudentModal student={modal.student} onClose={() => !saving && setModal(null)} onSave={saveStudent} saving={saving}/>}
    <Toast toast={toast} onClose={() => setToast(null)}/>
  </div>;
}

function PageIntro({ eyebrow, title, subtitle, action }) {
  return <section className="page-intro"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{subtitle}</p></div>{action && <div className="page-intro-action">{action}</div>}</section>;
}
function StudentDirectory({ students, total, loading, query, setQuery, page, pageCount, setPage, onAdd, onEdit, onDelete, onRefresh }) {
  return <section className="table-card" id="students"><div className="table-heading"><div><h2>Student directory</h2><p>View and manage all student records in one place.</p></div><button className="btn primary desktop-add" onClick={onAdd}><Plus size={17}/> Add student</button></div><div className="table-toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name, roll number, course..."/>{query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15}/></button>}</div><button className="btn secondary refresh-btn" onClick={onRefresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""}/> Refresh</button></div><div className="table-wrap"><table><thead><tr><th>STUDENT</th><th>ROLL NUMBER</th><th>COURSE</th><th>EMAIL ADDRESS</th><th className="actions-col">ACTIONS</th></tr></thead><tbody>
    {loading && <tr><td colSpan="5"><div className="empty-state"><RefreshCw className="spin" size={22}/><strong>Loading student records...</strong></div></td></tr>}
    {!loading && students.map((s, index) => <tr key={studentId(s) ?? `${s.rollNumber}-${index}`}><td><div className="student-cell"><div className={`avatar avatar-${index % 5}`}>{initials(s.name)}</div><div className="student-name"><strong>{s.name || "Unnamed student"}</strong><span>Student record</span></div></div></td><td><span className="roll-pill">{s.rollNumber || "—"}</span></td><td><span className="course-text">{s.course || "—"}</span></td><td><a className="email-link" href={s.email ? `mailto:${s.email}` : undefined}>{s.email || "—"}</a></td><td><div className="row-actions"><button className="icon-btn edit-btn" title="Edit student" onClick={() => onEdit(s)}><Pencil size={16}/></button><button className="icon-btn delete-btn" title="Delete student" onClick={() => onDelete(s)}><Trash2 size={16}/></button></div></td></tr>)}
    {!loading && students.length === 0 && <tr><td colSpan="5"><div className="empty-state"><div className="empty-illustration"><Users size={24}/></div><strong>{query ? "No matching students" : "No students yet"}</strong><p>{query ? "Try another name, roll number, course or email." : "Add your first student to see their details here."}</p>{!query && <button className="btn primary" onClick={onAdd}><Plus size={16}/> Add first student</button>}</div></td></tr>}
  </tbody></table></div><div className="table-footer"><span>Showing <strong>{total ? (page - 1) * 7 + 1 : 0}–{Math.min(page * 7, total)}</strong> of <strong>{total}</strong> students</span><div className="pagination"><button className="page-btn" disabled={page <= 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button><span className="page-number">{page} / {pageCount}</span><button className="page-btn" disabled={page >= pageCount} onClick={() => setPage(p => Math.min(pageCount, p + 1))}>Next</button></div></div></section>;
}
