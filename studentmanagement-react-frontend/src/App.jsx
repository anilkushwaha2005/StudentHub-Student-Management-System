import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap, LayoutDashboard, Users, BookOpen, Settings, Search,
  Plus, Bell, ChevronDown, Pencil, Trash2, Mail, Hash, BookMarked, X,
  CheckCircle2, AlertCircle, RefreshCw, UserRound, LogOut, SlidersHorizontal,
  ArrowUpRight, CalendarDays, ShieldCheck, CircleHelp, Home, ExternalLink,
  Check, BellRing, Moon, Sun, Save, ChevronRight
} from "lucide-react";

const API = "/api/students";

async function apiFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/hal+json, application/json",
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // A 401 means the token is missing, invalid, or expired.
  // A 403 is a permission issue, so do not automatically log out.
  if (response.status === 401) {
    window.dispatchEvent(new Event("studenthub:unauthorized"));
  }

  return response;
}

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

function StudentDashboard({ onLogout }) {
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
  const initialAdminEmail = localStorage.getItem("userEmail") || "";
  const persistedAdmin = (() => { try { return JSON.parse(localStorage.getItem("studenthubAdminProfile") || "null"); } catch { return null; } })();
  const [adminName, setAdminName] = useState(persistedAdmin?.name || "Anil Kushwaha");
  const [adminEmail, setAdminEmail] = useState(persistedAdmin?.email || initialAdminEmail || "anilkushwaha00231@gmail.com");
  const [savedSettings, setSavedSettings] = useState({
    name: persistedAdmin?.name || "Anil Kushwaha",
    email: persistedAdmin?.email || initialAdminEmail || "anilkushwaha00231@gmail.com",
  });
  const pageSize = 7;

  function notify(message, type = "success") {
    setToast({ message, type });
    window.clearTimeout(window.__studentHubToastTimer);
    window.__studentHubToastTimer = window.setTimeout(() => setToast(null), 3500);
  }
  async function loadStudents(showToast = false) {
    setLoading(true); setLoadError("");
    try {
  const response = await apiFetch(API);
      if (!response.ok) throw new Error(`Server returned ${response.status}`);
      const data = await response.json();
      setStudents(normalizeStudents(data));
      if (showToast) notify("Student records refreshed.");
    } catch (err) {
      setLoadError(err.message === "Failed to fetch" ? "Cannot connect to the API. Check that Spring Boot is running and the Vite proxy is configured." : `Could not load students: ${err.message}`);
      if (showToast) notify("Could not refresh student records.", "error");
    } finally { setLoading(false); }
  }
  useEffect(() => {
    loadStudents();
    (async () => {
      try {
        const r = await apiFetch("/api/admin/profile");
        if (!r.ok) return;
        const p = await r.json();
        const next = { name: p.fullName || "Anil Kushwaha", email: p.email || initialAdminEmail };
        setSavedSettings(next); setAdminName(next.name); setAdminEmail(next.email);
        localStorage.setItem("studenthubAdminProfile", JSON.stringify(next));
      } catch { /* Keep last saved local display while API profile loads/unavailable. */ }
    })();
  }, []);
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
      const response = await apiFetch(editing ? `${API}/${id}` : API, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
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
      const response = await apiFetch(`/api/admin/students/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      await loadStudents(); notify("Student deleted.");
    } catch (err) { notify(err.message || "Could not delete student.", "error"); }
  }
  function navigate(pageName) { setActivePage(pageName); setOpenPanel(null); setQuery(""); setPage(1); window.scrollTo({ top: 0, behavior: "smooth" }); }
  async function saveAdminSettings(e) {
    e.preventDefault();
    if (!adminName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return notify("Enter a valid name and email address.", "error");
    try {
      const r = await apiFetch("/api/admin/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName: adminName.trim() }) });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || `Profile save failed (${r.status})`); }
      const next = { name: adminName.trim(), email: adminEmail.trim() };
      setSavedSettings(next); localStorage.setItem("studenthubAdminProfile", JSON.stringify(next)); notify("Profile saved to your account.");
    } catch (err) { notify(err.message || "Could not save profile to the database.", "error"); }
  }
  const pageTitle = { dashboard: "Dashboard", students: "Students", courses: "Courses", customForms: "Custom Forms", submissions: "Submissions", settings: "Settings", profile: "My profile" }[activePage] || "Dashboard";
  const navItems = [
    { id: "dashboard", label: "Dashboard", Icon: LayoutDashboard },
    { id: "students", label: "Students", Icon: Users, count: students.length },
    { id: "courses", label: "Courses", Icon: BookOpen },
    { id: "customForms", label: "Custom Forms", Icon: BookMarked },
    { id: "submissions", label: "Submissions", Icon: CheckCircle2 }
  ];

  return <div className={`app-shell ${compactMode ? "compact-mode" : ""} ${darkMode ? "dark-mode" : ""}`} onClick={() => openPanel && setOpenPanel(null)}>
    <aside className="sidebar" onClick={e => e.stopPropagation()}>
      <button className="brand brand-button" onClick={() => navigate("dashboard")} aria-label="StudentHub dashboard"><span className="brand-mark"><GraduationCap size={23}/></span><span>student<span className="brand-light">hub</span></span><span className="brand-beta">ADMIN</span></button>
      <div className="workspace-label">WORKSPACE</div>
      <nav className="nav-list">{navItems.map(({ id, label, Icon, count }) => <button key={id} className={`nav-item ${activePage === id ? "active" : ""}`} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span>{count !== undefined && <span className="nav-count">{count}</span>}</button>)}</nav>
      <div className="sidebar-bottom"><div className="workspace-label">PREFERENCES</div><button className={`nav-item ${activePage === "settings" ? "active" : ""}`} onClick={() => navigate("settings")}><Settings size={18}/><span>Settings</span></button>
        <div className="help-card"><div className="help-icon">✦</div><strong>Need a hand?</strong><p>Manage your student records with ease.</p><button onClick={() => notify("Quick tip: use the Students page to search, add, edit and delete records.")}>Quick tip <ArrowUpRight size={13}/></button></div>
        <button className={`profile profile-button ${openPanel === "profile" ? "menu-active" : ""}`} onClick={() => setOpenPanel(openPanel === "profile" ? null : "profile")} aria-expanded={openPanel === "profile"}><span className="avatar admin-avatar">{initials(savedSettings.name)}</span><span className="profile-copy"><strong>{savedSettings.name}</strong><span>Administrator</span></span><ChevronDown size={16}/></button>
        {openPanel === "profile" && <div className="dropdown profile-dropdown"><div className="dropdown-user"><span className="avatar admin-avatar">{initials(savedSettings.name)}</span><div><strong>{savedSettings.name}</strong><span>{savedSettings.email}</span></div></div><button onClick={() => navigate("profile")}><UserRound size={16}/> My profile</button><button onClick={() => navigate("settings")}><Settings size={16}/> Account settings</button><button onClick={() => { setOpenPanel(null); loadStudents(true); }}><RefreshCw size={16}/> Refresh data</button><div className="dropdown-divider"/><button className="danger-menu" onClick={() => { setOpenPanel(null); onLogout(); }}><LogOut size={16}/> Sign out</button></div>}
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar" onClick={e => e.stopPropagation()}><div className="breadcrumb"><button onClick={() => navigate("dashboard")} className="crumb-link"><Home size={14}/> Workspace</button><ChevronRight size={14} className="crumb-slash"/><strong>{pageTitle}</strong></div><div className="top-actions"><div className="api-status"><span className={`status-dot ${loadError ? "offline" : loading ? "checking" : "online"}`}></span>{loadError ? "API unavailable" : loading ? "Connecting..." : "API connected"}</div>
        <div className="top-popover-wrap"><button className={`icon-btn notification-btn ${openPanel === "notifications" ? "menu-active" : ""}`} onClick={() => setOpenPanel(openPanel === "notifications" ? null : "notifications")} aria-label="Notifications" aria-expanded={openPanel === "notifications"}><Bell size={19}/>{notificationsEnabled && <i/>}</button>{openPanel === "notifications" && <div className="dropdown notification-dropdown"><div className="dropdown-heading"><div><strong>Notifications</strong><span>Latest activity in StudentHub</span></div><span className="live-chip">LIVE</span></div>{loadError ? <div className="notification-item"><span className="notice-icon warning"><AlertCircle size={16}/></span><div><strong>API connection issue</strong><p>{loadError}</p></div></div> : <><div className="notification-item"><span className="notice-icon success"><CheckCircle2 size={16}/></span><div><strong>Database connected</strong><p>Student records are loading from the API.</p></div></div><div className="notification-item"><span className="notice-icon purple"><Users size={16}/></span><div><strong>{students.length} student records</strong><p>Your directory currently contains {students.length} record{students.length === 1 ? "" : "s"}.</p></div></div></>}{!notificationsEnabled && <p className="dropdown-note">Desktop notifications are disabled in Settings.</p>}<button className="dropdown-footer" onClick={() => { setOpenPanel(null); navigate("students"); }}>View student directory <ArrowUpRight size={14}/></button></div>}</div>
        <div className="top-popover-wrap"><button className="top-avatar top-avatar-button" onClick={() => setOpenPanel(openPanel === "profileTop" ? null : "profileTop")} aria-label="Open account menu" aria-expanded={openPanel === "profileTop"}>{initials(savedSettings.name)}</button>{openPanel === "profileTop" && <div className="dropdown top-profile-dropdown"><div className="dropdown-user"><span className="avatar admin-avatar">{initials(savedSettings.name)}</span><div><strong>{savedSettings.name}</strong><span>Administrator</span></div></div><button onClick={() => navigate("profile")}><UserRound size={16}/> My profile</button><button onClick={() => navigate("settings")}><Settings size={16}/> Settings</button><button onClick={() => { setOpenPanel(null); loadStudents(true); }}><RefreshCw size={16}/> Refresh data</button></div>}</div>
      </div></header>

      <div className="page-content">
        {activePage === "dashboard" && <>
          <section className="welcome-row"><div><div className="eyebrow">OVERVIEW</div><h1>Good to see you, {savedSettings.name.split(" ")[0]} <span className="wave">✦</span></h1><p>Here’s what’s happening with your students today.</p></div></section>
          {loadError && <div className="error-banner"><AlertCircle size={18}/><div><strong>Can't reach your student API</strong><p>{loadError}</p><small>API: {API}</small></div><button className="btn secondary small" onClick={() => loadStudents(true)}><RefreshCw size={15}/> Retry</button></div>}
          <section className="stats-grid"><article className="stat-card"><div className="stat-top"><span>Total students</span><div className="stat-icon purple"><Users size={19}/></div></div><div className="stat-number">{loading ? "—" : students.length}</div><div className="stat-foot"><span className="trend neutral">Live data</span><span>from MySQL API</span></div></article><article className="stat-card"><div className="stat-top"><span>Courses represented</span><div className="stat-icon blue"><BookOpen size={19}/></div></div><div className="stat-number">{loading ? "—" : Object.keys(courseGroups).length}</div><div className="stat-foot"><span>Unique course names</span></div></article><article className="stat-card"><div className="stat-top"><span>With email</span><div className="stat-icon green"><Mail size={19}/></div></div><div className="stat-number">{loading ? "—" : students.filter(s => s.email).length}</div><div className="stat-foot"><span>Contact records</span></div></article><article className="stat-card"><div className="stat-top"><span>Search results</span><div className="stat-icon orange"><Search size={19}/></div></div><div className="stat-number">{loading ? "—" : filtered.length}</div><div className="stat-foot"><span>Matching students</span></div></article></section>
          <StudentDirectory students={pageStudents} total={filtered.length} loading={loading} query={query} setQuery={setQuery} page={currentPage} pageCount={pageCount} setPage={setPage} onAdd={() => setModal({ student: null })} onEdit={s => setModal({ student: s })} onDelete={deleteStudent} onRefresh={() => loadStudents(true)} />
        </>}
        {activePage === "students" && <><PageIntro eyebrow="DIRECTORY" title="Student directory" subtitle="Search, add and manage student records from one place." action={<button className="btn primary" onClick={() => setModal({ student: null })}><Plus size={17}/> Add student</button>}/>{loadError && <div className="error-banner"><AlertCircle size={18}/><div><strong>Can't reach your student API</strong><p>{loadError}</p></div><button className="btn secondary small" onClick={() => loadStudents(true)}>Retry</button></div>}<StudentDirectory students={pageStudents} total={filtered.length} loading={loading} query={query} setQuery={setQuery} page={currentPage} pageCount={pageCount} setPage={setPage} onAdd={() => setModal({ student: null })} onEdit={s => setModal({ student: s })} onDelete={deleteStudent} onRefresh={() => loadStudents(true)}/></>}
        {activePage === "courses" && <><PageIntro eyebrow="ACADEMIC OVERVIEW" title="Courses" subtitle="Explore courses represented in your student directory." action={<span className="soft-count"><BookOpen size={15}/> {Object.keys(courseGroups).length} course names</span>}/><div className="course-summary-grid"><div className="course-summary-card"><span className="course-summary-icon purple"><BookOpen size={19}/></span><div><span>Course names</span><strong>{Object.keys(courseGroups).length}</strong></div></div><div className="course-summary-card"><span className="course-summary-icon blue"><Users size={19}/></span><div><span>Enrolled student records</span><strong>{students.length}</strong></div></div></div>{Object.keys(courseGroups).length === 0 ? <div className="settings-card empty-courses"><div className="empty-illustration"><BookOpen size={24}/></div><h3>No courses yet</h3><p>Add a student and enter a course name to see it here.</p><button className="btn primary" onClick={() => setModal({ student: null })}><Plus size={16}/> Add student</button></div> : <div className="course-grid">{Object.entries(courseGroups).sort(([a], [b]) => a.localeCompare(b)).map(([course, enrolled], i) => <article className="course-card" key={course}><div className={`course-card-icon course-color-${i % 4}`}><BookOpen size={21}/></div><div className="course-card-top"><span className="course-tag">COURSE</span><span className="course-count">{enrolled.length} student{enrolled.length === 1 ? "" : "s"}</span></div><h3>{course}</h3><p>Student records assigned to this course.</p><div className="course-student-list">{enrolled.slice(0, 4).map(s => <div className="mini-student" key={studentId(s) ?? s.rollNumber}><span className="mini-avatar">{initials(s.name)}</span><span>{s.name || "Unnamed student"}</span></div>)}{enrolled.length > 4 && <span className="more-students">+{enrolled.length - 4} more</span>}</div><button className="text-action" onClick={() => { setQuery(course); setPage(1); navigate("students"); setQuery(course); }}>View students <ArrowUpRight size={14}/></button></article>)}</div>}</>}
        {activePage === "customForms" && <AdminFormManager embedded onBack={() => navigate("dashboard")}/>}
        {activePage === "submissions" && <AdminSubmissions students={students} notify={notify}/>}
        {activePage === "settings" && <><PageIntro eyebrow="PREFERENCES" title="Settings" subtitle="Personalize your StudentHub workspace and account preferences."/><div className="settings-layout"><section className="settings-card"><div className="settings-card-head"><span className="settings-icon purple"><SlidersHorizontal size={19}/></span><div><h2>Workspace preferences</h2><p>Adjust how the dashboard looks and behaves.</p></div></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol"><BellRing size={17}/></span><div><strong>Notifications</strong><p>Show notification indicators and activity updates.</p></div></div><button className={`toggle ${notificationsEnabled ? "on" : ""}`} role="switch" aria-checked={notificationsEnabled} onClick={() => { setNotificationsEnabled(v => !v); notify(`Notifications ${notificationsEnabled ? "disabled" : "enabled"}.`); }}><span/></button></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol"><SlidersHorizontal size={17}/></span><div><strong>Compact layout</strong><p>Reduce spacing to fit more records on screen.</p></div></div><button className={`toggle ${compactMode ? "on" : ""}`} role="switch" aria-checked={compactMode} onClick={() => { setCompactMode(v => !v); notify(`Compact layout ${compactMode ? "disabled" : "enabled"}.`); }}><span/></button></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol">{darkMode ? <Moon size={17}/> : <Sun size={17}/>}</span><div><strong>Dark appearance</strong><p>Switch to a darker dashboard palette.</p></div></div><button className={`toggle ${darkMode ? "on" : ""}`} role="switch" aria-checked={darkMode} onClick={() => { setDarkMode(v => !v); notify(`Dark appearance ${darkMode ? "disabled" : "enabled"}.`); }}><span/></button></div><div className="setting-row"><div className="setting-copy"><span className="setting-symbol"><RefreshCw size={17}/></span><div><strong>Student data</strong><p>Fetch the latest records from the Spring Boot API.</p></div></div><button className="btn secondary" onClick={() => loadStudents(true)} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""}/> Refresh data</button></div></section><section className="settings-card account-settings"><div className="settings-card-head"><span className="settings-icon blue"><UserRound size={19}/></span><div><h2>Administrator profile</h2><p>Update the display name and contact email shown in this workspace.</p></div></div><form className="settings-form" onSubmit={saveAdminSettings}><label>Display name<div className="field"><UserRound size={17}/><input value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Your name"/></div></label><label>Contact email<div className="field"><Mail size={17}/><input type="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="you@example.com"/></div></label><div className="settings-form-footer"><span><ShieldCheck size={14}/> Saved to your administrator account</span><button className="btn primary" type="submit"><Save size={16}/> Save settings</button></div></form></section></div></>}
        {activePage === "profile" && <><PageIntro eyebrow="ACCOUNT" title="My profile" subtitle="Your administrator identity for this StudentHub demo."/><section className="settings-card profile-page-card"><div className="profile-hero"><div className="profile-large-avatar">{initials(savedSettings.name)}</div><div><span className="live-chip">ADMINISTRATOR</span><h2>{savedSettings.name}</h2><p>{savedSettings.email}</p></div><button className="btn secondary" onClick={() => navigate("settings")}><Settings size={15}/> Edit profile</button></div><div className="profile-detail-grid"><div><span>Account role</span><strong>Administrator</strong></div><div><span>Workspace</span><strong>StudentHub</strong></div><div><span>Data source</span><strong>Spring Boot + MySQL</strong></div><div><span>Connection status</span><strong className={loadError ? "text-danger" : "text-success"}>{loadError ? "Disconnected" : "Connected"}</strong></div></div><div className="profile-note"><ShieldCheck size={17}/><p>Your profile name is saved to your authenticated administrator account and remains available after sign-out and sign-in.</p></div></section></>}
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



function AuthScreen({ onLogin }) {
  const [mode,setMode]=useState("role");
  const [selectedRole,setSelectedRole]=useState("STUDENT");
  const [fullName,setFullName]=useState("");
  const [rollNumber,setRollNumber]=useState("");
  const [course,setCourse]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [message,setMessage]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e){
    e.preventDefault();setError("");setMessage("");setBusy(true);
    try{
      const response=await fetch(`/api/auth/${mode==="register"?"register":"login"}`,{
        method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json"},
        body:JSON.stringify(mode==="register"
          ? {fullName:fullName.trim(),rollNumber:rollNumber.trim(),course:course.trim(),email:email.trim(),password}
          : {email:email.trim(),password})
      });
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||`Request failed (${response.status})`);
      if(mode==="register"){setMessage(data.message||"Account created. You can now sign in.");setMode("login");setPassword("");}
      else {
        if(!data.token)throw new Error("Login response did not include a token.");
        if(String(data.role||"").toUpperCase()!==selectedRole) throw new Error(`This account is not registered as ${selectedRole.toLowerCase()}. Please choose the correct login type.`);
        localStorage.setItem("token",data.token);localStorage.setItem("userEmail",data.email||email.trim());localStorage.setItem("userRole",data.role);
        onLogin();
      }
    }catch(err){setError(err.message||"Could not connect to backend.");}
    finally{setBusy(false);}
  }
  return <main style={{minHeight:"100vh",display:"grid",placeItems:"center",padding:24,background:"#f5f6fb",fontFamily:"Inter,system-ui,sans-serif"}}>
    <section style={{width:"100%",maxWidth:440,background:"#fff",border:"1px solid #e7e8f2",borderRadius:20,padding:32,boxShadow:"0 16px 48px rgba(35,32,90,.08)"}}>
      <div style={{fontSize:25,fontWeight:800,color:"#202343",marginBottom:5}}>🎓 student<span style={{color:"#6558ee"}}>hub</span></div>
      <div style={{fontSize:11,fontWeight:700,letterSpacing:1.5,color:"#6558ee",marginBottom:26}}>STUDENT MANAGEMENT PORTAL</div>
      {mode==="role" ? <><h1 style={{margin:"0 0 8px",color:"#202343",fontSize:27}}>Choose your sign-in</h1><p style={{color:"#777d98",fontSize:14}}>Select your account type to continue.</p><div style={{display:"grid",gap:12,marginTop:22}}><button onClick={()=>{setSelectedRole("STUDENT");setMode("login");setError("");setMessage("");}} style={{border:0,borderRadius:10,padding:13,color:"#fff",background:"#6558ee",fontWeight:700,cursor:"pointer"}}>Student Login</button><button onClick={()=>{setSelectedRole("ADMIN");setMode("login");setError("");setMessage("");}} style={{border:"1px solid #dedff0",borderRadius:10,padding:13,color:"#5147d9",background:"#fff",fontWeight:700,cursor:"pointer"}}>Admin Login</button><button onClick={()=>{setSelectedRole("STUDENT");setMode("register");setError("");setMessage("");}} style={{border:0,background:"transparent",color:"#6558ee",fontWeight:700,padding:10,cursor:"pointer"}}>Create Student Account</button></div></> : <>
      <button type="button" onClick={()=>{setMode("role");setError("");setMessage("");}} style={{border:0,background:"transparent",color:"#6558ee",fontWeight:700,cursor:"pointer",marginBottom:12}}>← Back</button>
      <h1 style={{margin:"0 0 8px",color:"#202343",fontSize:27}}>{mode==="login"?`${selectedRole==="ADMIN"?"Admin":"Student"} Login`:"Create student account"}</h1>
      <p style={{color:"#777d98",fontSize:14}}>{mode==="login"?"Sign in to continue to your dashboard.":"Register with your email and a password of at least 8 characters."}</p>
      <form onSubmit={submit} style={{display:"grid",gap:15}}>
        {mode==="register"&&<>
          <label style={{display:"grid",gap:7,fontSize:13,fontWeight:600}}>Full name<input required maxLength={120} value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="e.g. Anil Kushwaha" style={{padding:12,border:"1px solid #dfe1ed",borderRadius:10}}/></label>
          <label style={{display:"grid",gap:7,fontSize:13,fontWeight:600}}>Roll number<input required maxLength={40} value={rollNumber} onChange={e=>setRollNumber(e.target.value)} placeholder="e.g. NIET001" style={{padding:12,border:"1px solid #dfe1ed",borderRadius:10}}/></label>
          <label style={{display:"grid",gap:7,fontSize:13,fontWeight:600}}>Course<input required maxLength={120} value={course} onChange={e=>setCourse(e.target.value)} placeholder="e.g. B.Tech CSE IoT" style={{padding:12,border:"1px solid #dfe1ed",borderRadius:10}}/></label>
        </>}
        <label style={{display:"grid",gap:7,fontSize:13,fontWeight:600}}>Email<input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" style={{padding:12,border:"1px solid #dfe1ed",borderRadius:10}}/></label>
        <label style={{display:"grid",gap:7,fontSize:13,fontWeight:600}}>Password<input required minLength={8} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" style={{padding:12,border:"1px solid #dfe1ed",borderRadius:10}}/></label>
        {error&&<div role="alert" style={{padding:12,borderRadius:10,background:"#fff1ef",color:"#c43d2f",fontSize:13}}>{error}</div>}
        {message&&<div role="status" style={{padding:12,borderRadius:10,background:"#effcf4",color:"#167345",fontSize:13}}>{message}</div>}
        <button disabled={busy} style={{border:0,borderRadius:10,padding:13,color:"#fff",background:"#6558ee",fontWeight:700,cursor:"pointer"}}>{busy?"Please wait...":mode==="login"?"Sign in":"Create account"}</button>
      </form>
      {mode==="login"&&selectedRole==="STUDENT"&&<button onClick={()=>{setMode("register");setError("");setMessage("");}} style={{border:0,background:"transparent",color:"#6558ee",fontWeight:700,marginTop:18,cursor:"pointer"}}>New student? Create an account</button>}
      {selectedRole==="STUDENT"&&<p style={{fontSize:12,color:"#8589a0",lineHeight:1.5}}>Student self-registration creates a STUDENT role. Admin registration is not public.</p>}
      </>}
    </section>
  </main>;
}

function StudentPortal({onLogout}) {
  const [tab,setTab]=useState("profile"),[profile,setProfile]=useState({fullName:"",rollNumber:"",course:"",phone:"",address:""}),[forms,setForms]=useState([]),[subs,setSubs]=useState([]),[submittedFormIds,setSubmittedFormIds]=useState([]),[notice,setNotice]=useState(""),[err,setErr]=useState("");
  const token=localStorage.getItem("token"),email=localStorage.getItem("userEmail")||"";
  async function api(path,opts={}) {
    const r=await fetch(path,{...opts,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...opts.headers}});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);return d;
  }
  async function load(){try{setErr("");const [p,f,s]=await Promise.all([api("/api/student/profile"),api("/api/forms"),api("/api/forms/my-submissions")]);setProfile({fullName:p.fullName||"",rollNumber:p.rollNumber||"",course:p.course||"",phone:p.phone||"",address:p.address||""});setForms(f);setSubs(s);setSubmittedFormIds(s.map(x=>Number(x.formId ?? x.form_id)).filter(Number.isFinite));}catch(e){setErr(e.message);}}
  useEffect(()=>{load();},[]);
  async function saveProfile(e){
    e.preventDefault();
    const requiredFields = [
      ["Full name", profile.fullName],
      ["Roll number", profile.rollNumber ?? profile.roll_number],
      ["Course", profile.course],
      ["Phone", profile.phone],
      ["Address", profile.address]
    ];
    const missing = requiredFields.find(([, value]) => !String(value ?? "").trim());
    if (missing) {
      setErr(`${missing[0]} is required.`);
      setNotice("");
      return;
    }
    try {
      setErr("");
      await api("/api/student/profile",{method:"PUT",body:JSON.stringify(profile)});
      sessionStorage.setItem("studenthubProfileSavedAt", new Date().toISOString());
      window.location.assign("/profile-saved.html");
    } catch(e) {
      setNotice("");
      setErr(e.message || "Could not save profile. Please try again.");
    }
  }
  async function submitForm(form){if(submittedFormIds.includes(Number(form.id))||subs.some(s=>Number(s.formId ?? s.form_id)===Number(form.id))){setErr("You have already submitted this form.");return;}const answers={};for(const field of JSON.parse(form.fieldsJson||"[]")){const input=document.getElementById(`form-${form.id}-${field.name}`);
 if(field.type==="file"){
   const files=Array.from(input?.files||[]);
   if(field.required&&!files.length){setErr(`${field.label} is required`);return;}
   if(files.length){
     const uploaded=[];
     for(const file of files){
       if(file.size > (Number(field.maxSizeMb||10)*1024*1024)){setErr(`${file.name} exceeds the ${field.maxSizeMb||10} MB limit.`);return;}
       const fd=new FormData();fd.append("file",file);
       const response=await fetch("/api/forms/uploads",{method:"POST",headers:{Authorization:`Bearer ${token}`},body:fd});
       const data=await response.json().catch(()=>({}));
       if(!response.ok){setErr(data.error||`Could not upload ${file.name}`);return;}
       uploaded.push(data);
     }
     answers[field.name]=uploaded;
   } else answers[field.name]=[];
 } else {
   const value=input?.value||"";
   if(field.required&&!value.trim()){setErr(`${field.label} is required`);return;}
   answers[field.name]=value;
 }}try{setErr("");await api(`/api/forms/${form.id}/submissions`,{method:"POST",body:JSON.stringify({answersJson:JSON.stringify(answers)})});setSubmittedFormIds(old=>old.includes(Number(form.id))?old:[...old,Number(form.id)]);setNotice(`You have successfully filled the form: ${form.title}`);await load();}catch(e){setNotice("");setErr(e.message);await load();}}
  return <main style={{minHeight:"100vh",background:"#f5f6fb",fontFamily:"Inter,system-ui,sans-serif",color:"#202343"}}>
    <header style={{background:"#fff",padding:"18px 5%",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid #e8e9f2"}}><strong style={{fontSize:23}}>🎓 student<span style={{color:"#6558ee"}}>hub</span> <small style={{fontSize:11,color:"#6558ee"}}>STUDENT</small></strong><span>{email} <button onClick={onLogout} style={{marginLeft:12,padding:"9px 14px",border:"1px solid #ddd",borderRadius:9,background:"#fff",cursor:"pointer"}}>Sign out</button></span></header>
    <div style={{maxWidth:1100,margin:"28px auto",padding:"0 18px"}}><h1>Student Dashboard</h1><p style={{color:"#777d98"}}>Complete your profile and view forms assigned by your administrator.</p>
    <nav style={{display:"flex",gap:10,flexWrap:"wrap",margin:"22px 0"}}>{[["profile","My profile"],["forms","Assigned forms"],["submissions","My submissions"]].map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{padding:"11px 16px",border:0,borderRadius:10,background:tab===id?"#6558ee":"#fff",color:tab===id?"#fff":"#4d5270",fontWeight:700,cursor:"pointer"}}>{label}</button>)}</nav>
    {err&&<p style={{background:"#fff1ef",color:"#b83226",padding:12,borderRadius:9}}>{err}</p>}{notice&&<p style={{background:"#effcf4",color:"#167345",padding:12,borderRadius:9}}>{notice}</p>}
    {tab==="profile"&&<form onSubmit={saveProfile} style={{background:"#fff",padding:24,borderRadius:16,display:"grid",gap:14,maxWidth:700}}><h2>My profile</h2><label style={{fontWeight:700}}>Full name<input required value={profile.fullName} onChange={e=>setProfile({...profile,fullName:e.target.value})} style={fieldStyle}/></label><label style={{fontWeight:700}}>Email (login account)<input required disabled value={email} style={fieldStyle} /></label><label style={{fontWeight:700}}>Roll number<input required value={profile.rollNumber} onChange={e=>setProfile({...profile,rollNumber:e.target.value})} style={fieldStyle}/></label><label style={{fontWeight:700}}>Course<input required value={profile.course} onChange={e=>setProfile({...profile,course:e.target.value})} style={fieldStyle}/></label><label style={{fontWeight:700}}>Phone<input required value={profile.phone} onChange={e=>setProfile({...profile,phone:e.target.value})} style={fieldStyle}/></label><label style={{fontWeight:700}}>Address<textarea required value={profile.address} onChange={e=>setProfile({...profile,address:e.target.value})} style={fieldStyle}/></label><button style={primaryStyle}>Save profile</button></form>}
    {tab==="forms"&&<div style={{display:"grid",gap:16}}>{forms.length===0?<section style={panelStyle}>No forms assigned right now.</section>:forms.map(f=>{const alreadySubmitted=submittedFormIds.includes(Number(f.id))||subs.some(s=>Number(s.formId ?? s.form_id)===Number(f.id));return <section key={f.id} style={panelStyle}><h2>{f.title}</h2>{alreadySubmitted?<p style={{background:"#effcf4",color:"#167345",padding:12,borderRadius:9,marginBottom:0}}>✓ You have successfully filled this form.</p>:<><p>{f.description}</p>{JSON.parse(f.fieldsJson||"[]").map((x,i)=><label key={i} style={{display:"block",margin:"12px 0",fontWeight:650}}>{x.label}{x.required?" *":""}{x.type==="file"?<><input id={`form-${f.id}-${x.name}`} type="file" multiple={!!x.multiple} accept={x.accept||".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"} style={{...fieldStyle,padding:12}}/><small style={{display:"block",color:"#777",marginTop:5}}>Allowed: {x.accept||"PDF, Word, PowerPoint, Excel, images, TXT, ZIP"} · Max {x.maxSizeMb||10} MB per file {x.multiple?"· Multiple files allowed":""}</small></>:x.type==="textarea"?<textarea id={`form-${f.id}-${x.name}`} required={!!x.required} rows={4} style={fieldStyle}/>:x.type==="select"?<select id={`form-${f.id}-${x.name}`} required={!!x.required} style={fieldStyle}>{(x.options||"Option 1,Option 2").split(",").map(v=><option key={v} value={v.trim()}>{v.trim()}</option>)}</select>:<input id={`form-${f.id}-${x.name}`} type={["number","date","email"].includes(x.type)?x.type:"text"} required={!!x.required} style={fieldStyle}/>}</label>)}<button onClick={()=>submitForm(f)} style={primaryStyle}>Submit form</button></>}</section>})}</div>}
    {tab==="submissions"&&<div style={{display:"grid",gap:12}}>{Array.from(new Map(subs.slice().sort((a,b)=>new Date(b.submittedAt||0)-new Date(a.submittedAt||0)).map(s=>[Number(s.formId ?? s.form_id),s])).values()).map(s=>{const sid=Number(s.formId ?? s.form_id);const form=forms.find(f=>Number(f.id)===sid);return <section key={s.id} style={panelStyle}><h2 style={{marginTop:0}}>{s.formTitle||s.title||form?.title||`Form #${s.formId}`}</h2><p>Status: {s.status||"SUBMITTED"}</p><small>{s.submittedAt?new Date(s.submittedAt).toLocaleString():"Submission time unavailable"}</small></section>})}{subs.length===0&&<section style={panelStyle}>No submissions yet.</section>}</div>}
    </div></main>;
}
const fieldStyle={display:"block",boxSizing:"border-box",width:"100%",padding:12,marginTop:6,border:"1px solid #dfe1ed",borderRadius:9,font:"inherit"};
const primaryStyle={border:0,borderRadius:9,padding:"12px 16px",color:"#fff",background:"#6558ee",fontWeight:700,cursor:"pointer",width:"fit-content"};
const panelStyle={background:"#fff",padding:22,borderRadius:14,border:"1px solid #e7e8f2"};


function AdminFormManager({onBack, embedded=false}) {
 const [forms,setForms]=useState([]),[title,setTitle]=useState(""),[description,setDescription]=useState(""),[fields,setFields]=useState([{name:"fullName",label:"Full name",type:"text",required:true}]),[accessMode,setAccessMode]=useState("ALL"),[allowedCourses,setAllowedCourses]=useState(""),[message,setMessage]=useState(""),[error,setError]=useState(""),[editingId,setEditingId]=useState(null),[busy,setBusy]=useState(false),[refreshing,setRefreshing]=useState(false);
 const token=localStorage.getItem("token");
 async function request(url,opts={}) {
   const r=await fetch(url,{...opts,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`,...opts.headers}});
   const d=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(d.error||`Request failed (${r.status})`);
   return d;
 }
 async function loadForms(showMessage=false){
   setRefreshing(true);
   try{
     setError("");
     const data=await request("/api/forms");
     const list=Array.isArray(data)?data:Array.isArray(data?.content)?data.content:Array.isArray(data?._embedded?.forms)?data._embedded.forms:[];
     setForms(list);
     if(showMessage)setMessage("Forms list refreshed successfully.");
   }catch(e){setError(e.message||"Could not load forms.");}
   finally{setRefreshing(false);}
 }
 useEffect(()=>{loadForms();},[]);
 function reset(){setEditingId(null);setTitle("");setDescription("");setFields([{name:"fullName",label:"Full name",type:"text",required:true}]);setAccessMode("ALL");setAllowedCourses("");}
 function editForm(f){setEditingId(f.id);setTitle(f.title||"");setDescription(f.description||"");try{setFields(JSON.parse(f.fieldsJson||"[]"));}catch{setFields([]);}setAccessMode(f.accessMode||"ALL");setAllowedCourses(f.allowedCourses||"");setMessage("");setError("");window.scrollTo({top:0,behavior:"smooth"});}
 async function save(e){e.preventDefault();setBusy(true);setMessage("");setError("");try{
   const payload={title:title.trim(),description:description.trim(),fieldsJson:JSON.stringify(fields),accessMode,allowedCourses,active:true};
   await request(editingId?`/api/forms/${editingId}`:"/api/forms",{method:editingId?"PUT":"POST",body:JSON.stringify(payload)});
   setMessage(editingId?"Form updated successfully.":"Form created successfully.");
   reset();await loadForms();
   window.clearTimeout(window.__studentHubFormToast);window.__studentHubFormToast=window.setTimeout(()=>setMessage(""),3500);
 }catch(e){setError(e.message);}finally{setBusy(false);}}
 async function removeForm(f){if(!window.confirm(`Permanently delete "${f.title}" and ALL submissions associated with it? This cannot be undone.`))return;try{await request(`/api/forms/${f.id}`,{method:"DELETE"});setForms(old=>old.filter(x=>x.id!==f.id));if(editingId===f.id)reset();setMessage("Form and its associated submissions permanently deleted.");window.clearTimeout(window.__studentHubFormToast);window.__studentHubFormToast=window.setTimeout(()=>setMessage(""),3500);}catch(e){setError(e.message);}}
 const content=<div style={{display:"grid",gap:18}}>
   <section style={panelStyle}>
    <h1 style={{marginTop:0}}>{editingId?"Update Custom Form":"Custom Form Builder"}</h1>
    <p>Create a form and choose which students can access it.</p>
    <form onSubmit={save} style={{display:"grid",gap:14}}>
     <label>Form title<input required value={title} onChange={e=>setTitle(e.target.value)} style={fieldStyle}/></label>
     <label>Description<textarea required value={description} onChange={e=>setDescription(e.target.value)} style={fieldStyle}/></label>
     <h3>Fields</h3>
     {fields.map((f,i)=><div key={`field-${i}`} style={{display:"grid",gap:8}}><div style={{display:"grid",gridTemplateColumns:"minmax(100px,1fr) minmax(100px,1fr) 120px auto auto",gap:8,alignItems:"center"}}>
      <input
  required
  aria-label="Field key"
  value={f.name}
  onChange={e => {
    const name = e.target.value
      .replace(/[^a-zA-Z0-9_]/g, "");
    setFields(old => old.map((x, j) =>
      j === i ? { ...x, name } : x
    ));
  }}
  placeholder="Internal key (e.g. fullName)"
  style={fieldStyle}
/>
       <input required aria-label="Field label" value={f.label} onChange={e=>setFields(old=>old.map((x,j)=>j===i?{...x,label:e.target.value}:x))} placeholder="Field label" style={fieldStyle}/>
       <select value={f.type} onChange={e=>setFields(old=>old.map((x,j)=>j===i?{...x,type:e.target.value}:x))} style={fieldStyle}><option value="text">Short text</option><option value="textarea">Long answer</option><option value="email">Email</option><option value="number">Number</option><option value="date">Date</option><option value="select">Dropdown</option><option value="file">File upload</option></select>
       <label style={{whiteSpace:"nowrap"}}><input type="checkbox" checked={!!f.required} onChange={e=>setFields(old=>old.map((x,j)=>j===i?{...x,required:e.target.checked}:x))}/> Required</label>
       <button type="button" disabled={fields.length===1} onClick={()=>setFields(old=>old.filter((_,j)=>j!==i))} style={{...primaryStyle,background:"#777",padding:9}}>Remove</button>
     </div>{f.type==="file"&&<div key={`file-options-${i}`} style={{display:"grid",gridTemplateColumns:"minmax(160px,1fr) minmax(140px,1fr) auto",gap:10,alignItems:"center",background:"#f7f7ff",padding:12,borderRadius:10}}><label>Allowed extensions<input value={f.accept||".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.txt,.zip"} onChange={e=>setFields(old=>old.map((x,j)=>j===i?{...x,accept:e.target.value}:x))} style={fieldStyle} placeholder=".pdf,.docx,.jpg"/></label><label>Max size (MB)<input type="number" min="1" max="10" value={f.maxSizeMb||10} onChange={e=>setFields(old=>old.map((x,j)=>j===i?{...x,maxSizeMb:Math.min(10,Math.max(1,Number(e.target.value)||1))}:x))} style={fieldStyle}/></label><label style={{whiteSpace:"nowrap"}}><input type="checkbox" checked={!!f.multiple} onChange={e=>setFields(old=>old.map((x,j)=>j===i?{...x,multiple:e.target.checked}:x))}/> Multiple files</label></div>}</div>)}
     <button type="button" onClick={()=>setFields(old=>[...old,{name:`field${old.length+1}`,label:"New field",type:"text",required:false}])} style={{...primaryStyle,background:"#777"}}>+ Add field</button>
     <label>Access rule<select value={accessMode} onChange={e=>setAccessMode(e.target.value)} style={fieldStyle}><option value="ALL">All students</option><option value="COURSES">Specific courses</option><option value="EMAILS">Specific student emails</option></select></label>
     {accessMode!=="ALL"&&<label>{accessMode==="COURSES"?"Allowed course names (comma-separated)":"Allowed student emails (comma-separated)"}<input required value={allowedCourses} onChange={e=>setAllowedCourses(e.target.value)} style={fieldStyle}/></label>}
     <div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button disabled={busy} style={primaryStyle}>{busy?(editingId?"Updating...":"Creating..."):(editingId?"Update form":"Create form")}</button><button type="button" onClick={()=>{if(window.confirm("Clear the current unsaved form inputs? Saved forms and submissions will not be deleted.")){reset();setMessage("");setError("");}}} style={{...primaryStyle,background:"#fff",color:"#5147d9",border:"1px solid #dedff0"}}>Clear form inputs</button>{editingId&&<button type="button" onClick={reset} style={{...primaryStyle,background:"#777"}}>Cancel edit</button>}</div>
    </form>
    {message&&<p role="status" style={{background:"#effcf4",color:"#167345",padding:12,borderRadius:9}}>{message}</p>}
    {error&&<p role="alert" style={{background:"#fff1ef",color:"#b83226",padding:12,borderRadius:9}}>{error}</p>}
   </section>
   <section style={panelStyle}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><h2 style={{marginTop:0}}>Manage forms</h2><button type="button" onClick={()=>loadForms(true)} disabled={refreshing} style={{...primaryStyle,background:"#fff",color:"#5147d9",border:"1px solid #dedff0",opacity:refreshing ? 0.65 : 1,cursor:refreshing?"wait":"pointer"}}>{refreshing?"Refreshing...":"Refresh"}</button></div>
    {forms.length===0?<p>No custom forms created yet.</p>:forms.map(f=><article key={f.id} style={{border:"1px solid #e7e8f2",borderRadius:12,padding:16,marginTop:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"start",gap:12,flexWrap:"wrap"}}><div><h3 style={{margin:"0 0 6px"}}>{f.title}</h3><p style={{margin:"0 0 8px"}}>{f.description}</p><small>Access: {f.accessMode==="ALL"?"All students":f.accessMode==="COURSES"?`Courses: ${f.allowedCourses}`:`Emails: ${f.allowedCourses}`}</small></div><div style={{display:"flex",gap:8}}><button onClick={()=>editForm(f)} style={{...primaryStyle,background:"#e9e7ff",color:"#5147d9"}}>Edit</button><button onClick={()=>removeForm(f)} style={{...primaryStyle,background:"#fff0ef",color:"#b83226"}}>Delete</button></div></div>
    </article>)}
   </section>
  </div>;
 return embedded?content:<main style={{minHeight:"100vh",background:"#f5f6fb",padding:30,fontFamily:"Inter,system-ui,sans-serif",color:"#202343"}}><button onClick={onBack} style={{...primaryStyle,marginBottom:20}}>← Back to admin dashboard</button>{content}</main>;
}

function AdminSubmissions({students}) {
 const [subs,setSubs]=useState([]),[forms,setForms]=useState([]),[error,setError]=useState(""),[busy,setBusy]=useState(false),[query,setQuery]=useState(""),[expanded,setExpanded]=useState({});
 async function load(){setBusy(true);setError("");try{const token=localStorage.getItem("token");const headers={Authorization:`Bearer ${token}`};const [sr,fr]=await Promise.all([fetch("/api/forms/my-submissions",{headers}),fetch("/api/forms",{headers})]);const sd=await sr.json().catch(()=>[]),fd=await fr.json().catch(()=>[]);if(!sr.ok)throw new Error(sd.error||`Submissions request failed (${sr.status})`);if(!fr.ok)throw new Error(fd.error||`Forms request failed (${fr.status})`);setSubs(Array.isArray(sd)?sd:[]);setForms(Array.isArray(fd)?fd:[]);}catch(e){setError(e.message);}finally{setBusy(false);}}
 useEffect(()=>{load();},[]);
 async function deleteSubmission(s){
   const student=students.find(x=>(x.email||"").toLowerCase()===(s.studentEmail||"").toLowerCase());
   if(!window.confirm(`Permanently delete this submission for ${student?.name||s.studentEmail||"this student"} from "${s.formTitle||"the form"}"? This cannot be undone.`))return;
   try{const r=await fetch(`/api/forms/submissions/${s.id}`,{method:"DELETE",headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});
     if(!r.ok)throw new Error((await r.text())||`Delete failed (${r.status})`);
     setSubs(old=>old.filter(x=>String(x.id)!==String(s.id)));setExpanded(old=>({...old,[s.id]:false}));
   }catch(e){setError(e.message||"Could not delete submission.");}
 }
 const normalizedQuery=query.trim().toLowerCase();
 const visibleSubs=subs.filter(s=>{
   const student=students.find(x=>(x.email||"").toLowerCase()===(s.studentEmail||"").toLowerCase());
   const f=forms.find(x=>Number(x.id)===Number(s.formId));
   let answers={};try{answers=JSON.parse(s.answersJson||"{}");}catch{}
   return [student?.name,student?.rollNumber,student?.roll_number,student?.course,student?.email,s.studentEmail,s.formTitle,f?.title,s.status,...Object.values(answers).map(v=>typeof v==="string"?v:JSON.stringify(v))]
     .some(v=>String(v||"").toLowerCase().includes(normalizedQuery));
 });
 return <section style={panelStyle}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><h1 style={{marginTop:0}}>Form submissions</h1><p>Search student responses and expand a record to view full details.</p></div><button onClick={load} disabled={busy} style={primaryStyle}>{busy?"Loading...":"Refresh"}</button></div>
   <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap",margin:"18px 0 8px"}}>
     <input aria-label="Search submissions" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by student name, roll number, course, email or form..." style={{...fieldStyle,flex:"1 1 320px",minWidth:220}}/>
     <button type="button" onClick={()=>setQuery("")} disabled={!query} style={{...primaryStyle,background:"#fff",color:"#5147d9",border:"1px solid #dedff0"}}>Clear search</button>
     <span style={{color:"#777d98",fontSize:13}}>{visibleSubs.length} of {subs.length} submissions</span>
   </div>
   {error&&<p role="alert" style={{color:"#b83226",background:"#fff1ef",padding:12,borderRadius:8}}>{error}</p>}
   {busy&&subs.length===0?<p>Loading submissions...</p>:visibleSubs.length===0?<p style={{padding:18,background:"#f7f7fc",borderRadius:10}}>{subs.length?"No submissions match your search.":"No submissions yet."}</p>:visibleSubs.map(s=>{
     const f=forms.find(x=>Number(x.id)===Number(s.formId));let answers={};try{answers=JSON.parse(s.answersJson||"{}");}catch{}
     const student=students.find(x=>(x.email||"").toLowerCase()===(s.studentEmail||"").toLowerCase());
     const isOpen=!!expanded[s.id];
     return <article key={s.id} style={{border:"1px solid #e7e8f2",borderRadius:12,padding:16,marginTop:12,background:"#fff"}}>
       <button type="button" onClick={()=>setExpanded(old=>({...old,[s.id]:!old[s.id]}))} aria-expanded={isOpen} style={{display:"flex",width:"100%",textAlign:"left",alignItems:"center",justifyContent:"space-between",gap:12,border:0,background:"transparent",padding:0,color:"#202343",cursor:"pointer"}}>
         <span><strong style={{display:"block",fontSize:17}}>{s.formTitle||f?.title||`Archived form #${s.formId}`}</strong><span style={{display:"block",marginTop:8}}>{student?.name||s.studentEmail||"Unknown student"} · {student?.rollNumber||student?.roll_number||"Roll number unavailable"} · {student?.course||"Course unavailable"}</span><span style={{display:"block",marginTop:6,fontSize:13,color:"#777d98"}}>{s.studentEmail} · {s.status||"SUBMITTED"} · {s.submittedAt?new Date(s.submittedAt).toLocaleString():"Time unavailable"}</span></span>
         <span style={{fontWeight:700,color:"#5147d9",whiteSpace:"nowrap"}}>{isOpen?"Hide details ▲":"View details ▼"}</span>
       </button>
       {isOpen&&<div style={{display:"grid",gap:8,marginTop:16}}>
         {Object.entries(answers).map(([k,v])=>{let fieldLabel=k;try{const schema=JSON.parse(f?.fieldsJson||"[]");fieldLabel=schema.find(field=>field.name===k)?.label||k;}catch{}return <div key={k} style={{background:"#f7f7fc",padding:10,borderRadius:8,overflowWrap:"anywhere"}}><strong>{fieldLabel}</strong><div>{Array.isArray(v)&&v.length&&v.every(a=>a&&a.downloadUrl)?v.map((a,idx)=><button key={a.id||idx} type="button" onClick={async()=>{try{const r=await fetch(a.downloadUrl,{headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}});if(!r.ok)throw new Error("Download failed");const blob=await r.blob();const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=a.name||"attachment";link.click();URL.revokeObjectURL(url);}catch(e){setError(e.message);}}} style={{...primaryStyle,display:"block",marginTop:6,background:"#e9e7ff",color:"#5147d9"}}>Download {a.name||"attachment"} ({Math.max(1,Math.round((a.size||0)/1024))} KB)</button>):String(v??"")}</div></div>;})}
         <div style={{display:"flex",justifyContent:"flex-end",marginTop:6}}><button type="button" onClick={()=>deleteSubmission(s)} style={{...primaryStyle,background:"#fff0ef",color:"#b83226",border:"1px solid #ffd5d0"}}>Delete submission permanently</button></div>
       </div>}
     </article>;
   })}
 </section>;
}

export default function App() {
 const [session,setSession]=useState(()=>({token:localStorage.getItem("token"),role:localStorage.getItem("userRole")}));

 function logout(){["token","userEmail","userRole"].forEach(k=>localStorage.removeItem(k));setSession({token:null,role:null});}
 function refreshSession(){setSession({token:localStorage.getItem("token"),role:localStorage.getItem("userRole")});}
 useEffect(()=>{const fn=()=>logout();window.addEventListener("studenthub:unauthorized",fn);return()=>window.removeEventListener("studenthub:unauthorized",fn);},[]);
 if(!session.token||!session.role)return <AuthScreen onLogin={refreshSession}/>;
 if(session.role==="STUDENT")return <StudentPortal onLogout={logout}/>;

 return <StudentDashboard onLogout={logout}/>;
}
