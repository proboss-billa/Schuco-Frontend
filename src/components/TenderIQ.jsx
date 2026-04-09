"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { C, F } from "@/lib/design";
import { api } from "@/lib/api";
import ProfileScreen from "@/components/ProfileScreen";
import AuthScreen from "@/components/AuthScreen";
import ResultsPanel from "@/components/ResultsPanel";
import { ChatCtxMenu, RenameModal, DeleteModal, DeleteDocumentsModal } from "@/components/Modals";
import {
  SchucoMark, SendIcon, UploadIcon, FileIcon, ChatIcon,
  PlusIcon, MenuIcon, CloseIcon, PanelIcon, MoreIcon,
  ChevronLeftIcon,
} from "@/components/Icons";

// ── Typing indicator ────────────────────────────────
const STAGES = [
  "Extracting text from document",
  "Identifying performance parameters",
  "Cross-referencing Schüco specs",
  "Generating analysis summary",
];

function TypingIndicator({ stage }) {
  const [dots, setDots] = useState("");
  useEffect(() => {
    const iv = setInterval(() => setDots(d => d.length >= 3 ? "" : d + "."), 400);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ display: "flex", gap: 12, marginBottom: 20, animation: "fadeUp .3s ease" }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}><SchucoMark /></div>
      <div style={{ padding: "14px 18px", background: C.bg1, borderRadius: "14px 14px 14px 4px", border: `1px solid ${C.border}`, minWidth: 280 }}>
        <div style={{ height: 3, background: C.border, borderRadius: 2, marginBottom: 12, overflow: "hidden" }}>
          <div style={{ height: "100%", background: `linear-gradient(90deg, ${C.green}, ${C.accentHover})`, borderRadius: 2, width: `${((stage + 1) / STAGES.length) * 100}%`, transition: "width 0.6s ease" }} />
        </div>
        <div style={{ fontSize: 13, color: C.text1, fontWeight: 500, marginBottom: 4 }}>{STAGES[stage]}{dots}</div>
        <div style={{ fontSize: 11, color: C.text3 }}>Step {stage + 1} of {STAGES.length}</div>
      </div>
    </div>
  );
}

// ── Markdown-lite renderer (bold, bullets, line breaks) ──
function RichText({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const trimmed = line.trim();
    // Bullet points: - or • or *
    const isBullet = /^[-•*]\s+/.test(trimmed);
    const content = isBullet ? trimmed.replace(/^[-•*]\s+/, "") : trimmed;
    // Bold rendering
    const parts = content.split("**").map((part, j) =>
      j % 2 === 1 ? <strong key={j}>{part}</strong> : <span key={j}>{part}</span>
    );
    if (isBullet) {
      return <div key={i} style={{ display: "flex", gap: 6, marginLeft: 4, marginTop: 2, marginBottom: 2 }}><span style={{ flexShrink: 0, opacity: 0.5 }}>•</span><span>{parts}</span></div>;
    }
    if (trimmed === "") {
      return <div key={i} style={{ height: 8 }} />;
    }
    return <div key={i}>{parts}</div>;
  });
}

// ── Main App ─────────────────────────────────────────
export default function TenderIQ() {
  const [screen, setScreen] = useState("auth");
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [sideOpen, setSideOpen] = useState(true);
  const [showResults, setShowResults] = useState(false);
  const [mobResults, setMobResults] = useState(false);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [files, setFiles] = useState([]);
  const [isMob, setIsMob] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typingStage, setTypingStage] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [panelPos, setPanelPos] = useState(null); // {x, y} — null = default position
  const [panelWidth, setPanelWidth] = useState(400);
  const [panelHeight, setPanelHeight] = useState(null); // null = full height
  const panelDragRef = useRef(null);
  const resizeState = useRef(null);
  const [ctxMenu, setCtxMenu] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [currentProjectName, setCurrentProjectName] = useState("");
  const [currentProjectType, setCurrentProjectType] = useState("commercial");
  const [chats, setChats] = useState([]);
  const [sidebarFilter, setSidebarFilter] = useState("all"); // "all" | "favourites" | "archived"
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectedChats, setSelectedChats] = useState(new Set());
  // Project creation dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createDialogName, setCreateDialogName] = useState("");
  const [createDialogType, setCreateDialogType] = useState("commercial");
  const [createDialogModel, setCreateDialogModel] = useState("gemini-3-flash");
  const [createDialogOcr, setCreateDialogOcr] = useState("auto");
  // Streaming extraction is parked on backend — pipeline runs in batch mode.
  // Keep state for API shape but force to false so the flag is a no-op.
  const [createDialogStreaming, setCreateDialogStreaming] = useState(false);
  const [chatModel, setChatModel] = useState("gemini-3-flash");
  const [isProcessing, setIsProcessing] = useState(false);
  const wasProcessingRef = useRef(false);
  const [uploadTrigger, setUploadTrigger] = useState(0);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [availableModels, setAvailableModels] = useState([]);
  const [chatCounts, setChatCounts] = useState({});
  const [errorPopup, setErrorPopup] = useState(null); // { title, message }
  const [avatarUrl, setAvatarUrl] = useState(null);
  const fileRef = useRef(null);

  // Track processing state — summary messages are now sent from ResultsPanel
  const handleProcessingChange = useCallback((processing) => {
    wasProcessingRef.current = processing;
    setIsProcessing(processing);
  }, []);
  const chatEnd = useRef(null);
  const dragState = useRef(null);

  // Restore token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("tiq_token");
    if (savedToken) {
      api.getMe(savedToken)
        .then(userData => {
          setToken(savedToken);
          setUser(userData);
          if (userData.has_avatar) setAvatarUrl(api.getAvatarUrl(savedToken));
          setScreen("main");
          api.listProjects(savedToken).then(projects => {
            if (Array.isArray(projects) && projects.length > 0) {
              setChats(projects.map(p => ({
                id: p.project_id || p.id,
                title: p.project_name || p.name || "Untitled",
                type: p.project_type || "commercial",
                is_starred: p.is_starred || false,
                is_archived: p.is_archived || false,
                date: p.created_at || "",
                updated: p.updated_at || p.created_at || "",
              })));
            }
          });
        })
        .catch(() => {
          localStorage.removeItem("tiq_token");
        });
    }
    // Fetch available models
    api.getModels().then(data => {
      setAvailableModels(data.models || []);
      if (data.default) {
        setCreateDialogModel(data.default);
        setChatModel(data.default);
      }
    });
  }, []);

  // Responsive
  useEffect(() => {
    const c = () => setIsMob(window.innerWidth < 768);
    c(); window.addEventListener("resize", c);
    return () => window.removeEventListener("resize", c);
  }, []);

  // Auto-scroll
  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, isTyping]);

  // Track per-project chat counts
  useEffect(() => {
    if (currentProjectId) {
      const userMsgs = msgs.filter(m => m.role === "user").length;
      if (userMsgs > 0) setChatCounts(prev => ({ ...prev, [currentProjectId]: userMsgs }));
    }
  }, [msgs, currentProjectId]);

  // Panel drag handlers
  const onPanelMouseDown = (e) => {
    e.preventDefault();
    const panel = panelDragRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragState.current = { startX: e.clientX - rect.left, startY: e.clientY - rect.top };
    const onMove = (ev) => {
      const x = Math.max(0, Math.min(window.innerWidth - rect.width, ev.clientX - dragState.current.startX));
      const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - dragState.current.startY));
      setPanelPos({ x, y });
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const onResizeMouseDown = (e, dir) => {
    e.preventDefault();
    e.stopPropagation();
    const panel = panelDragRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const startX = e.clientX, startY = e.clientY;
    const startW = rect.width, startH = rect.height;
    const startLeft = rect.left, startTop = rect.top;
    const onMove = (ev) => {
      const dx = ev.clientX - startX, dy = ev.clientY - startY;
      if (dir.includes("e")) setPanelWidth(w => Math.max(300, Math.min(900, startW + dx)));
      if (dir.includes("w")) { setPanelWidth(Math.max(300, Math.min(900, startW - dx))); setPanelPos(p => ({ x: Math.max(0, startLeft + dx), y: p ? p.y : startTop })); }
      if (dir.includes("s")) setPanelHeight(Math.max(200, Math.min(window.innerHeight - 20, startH + dy)));
      if (dir.includes("n")) { setPanelHeight(Math.max(200, Math.min(window.innerHeight - 20, startH - dy))); setPanelPos(p => ({ x: p ? p.x : startLeft, y: Math.max(0, startTop + dy) })); }
    };
    const onUp = () => { document.removeEventListener("mousemove", onMove); document.removeEventListener("mouseup", onUp); };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  // Project history is loaded on login, no need to reload on mount

  // ── Run the 4-stage typing animation ──
  const runTypingAnimation = (onDone) => {
    setIsTyping(true);
    setTypingStage(0);
    let s = 0;
    const iv = setInterval(async () => {
      s++;
      if (s >= STAGES.length) {
        clearInterval(iv);
        await onDone();
        setIsTyping(false);
      } else {
        setTypingStage(s);
      }
    }, 900);
    return iv;
  };

  // ── Send handler ──
  const handleSend = async () => {
    if (!input.trim() && files.length === 0) return;
    const userText = input.trim();
    const uploadedFiles = [...files];
    setInput("");
    setFiles([]);

    // Build user message
    const userMsg = uploadedFiles.length > 0
      ? { role: "user", type: "file", content: uploadedFiles.map(f => f.name).join(", "), text: userText || "Analyze this tender document" }
      : { role: "user", type: "text", content: userText };

    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);

    if (uploadedFiles.length > 0 && currentProjectId) {
      // Upload to existing project
      handleUploadMore(uploadedFiles);
      return;
    } else if (uploadedFiles.length > 0) {
      // Show project creation dialog for new project
      const defaultName = userText || uploadedFiles[0].name.replace(/\.[^/.]+$/, "");
      setPendingFiles(uploadedFiles);
      setCreateDialogName(defaultName);
      const allNames = uploadedFiles.map(f => f.name.toLowerCase()).join(" ");
      const residentialHints = ["residential", "villa", "apartment", "flat", "house", "dwelling", "home", "tower", "floor"];
      const isResidential = residentialHints.some(kw => allNames.includes(kw));
      setCreateDialogType(isResidential ? "residential" : "commercial");
      setShowCreateDialog(true);
      return;
    } else if (currentProjectId) {
      // Chat with existing project
      try {
        const res = await api.query(token, currentProjectId, userText, chatModel);
        const sources = (res.sources || []).filter(s => s.page || s.section);
        setMsgs([...newMsgs, {
          role: "assistant", type: "text",
          content: res.answer || res.response || "No response.",
          sources: sources.map(s => `${s.document}${s.page ? ` · Page ${s.page}` : ""}${s.section ? ` · ${s.section}` : ""}`),
        }]);
      } catch (e) {
        const isOutOfCredits = e.message === "OUT_OF_CREDITS";
        const content = isOutOfCredits
          ? "**You are out of Credits**\n\nPlease contact:\n\n**Michael Stanley**\nmike@sooru.ai\n+91 97427 24935\n\nOr\n\n**Brijesh Shivakumar**\nbrijesh@sooru.ai\n+91 97438 10910"
          : `Query failed: ${e.message}`;
        setMsgs([...newMsgs, { role: "assistant", type: "text", content }]);
      }
    } else {
      // No project loaded — guide user
      setMsgs([...newMsgs, { role: "assistant", type: "text", content: "Please upload a tender document first so I can analyse it and answer your questions." }]);
    }
  };

  // ── Create project after dialog confirmation ──
  const handleCreateProject = () => {
    const projectName = createDialogName.trim() || "Untitled Project";
    const projectType = createDialogType;
    const modelKey = createDialogModel;
    const ocrEngine = createDialogOcr;
    const streamingExtraction = createDialogStreaming;
    const uploadedFiles = pendingFiles;
    setShowCreateDialog(false);
    setPendingFiles([]);

    const userMsg = { role: "user", type: "file", content: uploadedFiles.map(f => f.name).join(", "), text: projectName };
    const newMsgs = [...msgs, userMsg];
    setMsgs(newMsgs);

    runTypingAnimation(async () => {
      try {
        const created = await api.createProject(token, projectName, "", uploadedFiles, projectType, streamingExtraction);
        const pid = created.project_id;
        await api.processProject(token, pid, modelKey, ocrEngine);
        wasProcessingRef.current = true;
        setCurrentProjectId(pid);
        setCurrentProjectName(projectName);
        setCurrentProjectType(projectType);
        setShowResults(true);
        const typeLabel = projectType === "residential" ? "Residential" : "Commercial";
        const assistantMsg = {
          role: "assistant", type: "text",
          content: `Project **${projectName}** (${typeLabel}) created. Processing **${uploadedFiles.length}** document(s)...`,
        };
        setMsgs([...newMsgs, assistantMsg]);
        setChats(prev => [{ id: pid, title: projectName, type: projectType, is_starred: false, is_archived: false, date: "Today", updated: "Just now" }, ...prev]);
      } catch (e) {
        const isOutOfCredits = e.message === "OUT_OF_CREDITS";
        const content = isOutOfCredits
          ? "**You are out of Credits**\n\nPlease contact:\n\n**Michael Stanley**\nmike@sooru.ai\n+91 97427 24935\n\nOr\n\n**Brijesh Shivakumar**\nbrijesh@sooru.ai\n+91 97438 10910"
          : `Error during analysis: ${e.message}`;
        setMsgs([...newMsgs, { role: "assistant", type: "text", content }]);
      }
    });
  };

  // ── Upload more files to existing project ──
  const handleUploadMore = async (newFiles) => {
    if (!currentProjectId || !newFiles?.length) return;
    wasProcessingRef.current = true;
    setIsProcessing(true);
    try {
      const res = await api.uploadFiles(token, currentProjectId, Array.from(newFiles));
      setMsgs(prev => [...prev, {
        role: "assistant", type: "text",
        content: `Uploaded ${res.documents_uploaded} new file(s). Processing...`,
      }]);
      await api.processProject(token, currentProjectId);
      // Force ResultsPanel to re-poll
      setUploadTrigger(k => k + 1);
    } catch (e) {
      setIsProcessing(false);
      if (e.message === "OUT_OF_CREDITS") {
        setMsgs(prev => [...prev, {
          role: "assistant", type: "text",
          content: "**You are out of Credits**\n\nPlease contact:\n\n**Michael Stanley**\nmike@sooru.ai\n+91 97427 24935\n\nOr\n\n**Brijesh Shivakumar**\nbrijesh@sooru.ai\n+91 97438 10910",
        }]);
      } else if (e.message.startsWith("ARCHIVED:")) {
        const fileNames = e.message.replace(/^ARCHIVED:/, "");
        setErrorPopup({ type: "archived", fileNames });
        setMsgs(prev => [...prev, {
          role: "assistant", type: "text",
          content: `The file(s) **${fileNames}** ${fileNames.includes(",") ? "are" : "is"} already in your **Archived** folder. You can restore ${fileNames.includes(",") ? "them" : "it"} from the Archived section in the parameters panel instead of re-uploading.`,
        }]);
      } else if (e.message.startsWith("Duplicate file(s)")) {
        const fileNames = e.message.replace(/^Duplicate file\(s\) already in this project:\s*/, "");
        setErrorPopup({ type: "duplicate", fileNames });
        setMsgs(prev => [...prev, {
          role: "assistant", type: "text",
          content: `The file(s) **${fileNames}** already exist in this project and have been scanned for parameters. Try uploading different files, or delete the existing ones and try again.`,
        }]);
      } else {
        setErrorPopup({ type: "generic", message: e.message });
      }
    }
  };

  // Persist chat messages to localStorage whenever they change
  useEffect(() => {
    if (currentProjectId && msgs.length > 0) {
      try {
        localStorage.setItem(`tiq_chat_${currentProjectId}`, JSON.stringify(msgs));
      } catch {}
    }
  }, [msgs, currentProjectId]);

  const openChat = async (chat) => {
    setCurrentProjectId(chat.id);
    setCurrentProjectName(chat.title);
    setCurrentProjectType(chat.type || "commercial");
    setShowResults(true);
    if (isMob) setSideOpen(false);

    // 1) Try localStorage first (instant)
    try {
      const cached = localStorage.getItem(`tiq_chat_${chat.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMsgs(parsed);
          // Still fetch from server in background to sync
          api.getChatHistory(token, chat.id).then(data => {
            if (data.messages && data.messages.length > 0) {
              const welcomeMsg = { role: "assistant", type: "analysis", content: `Loaded **${chat.title}**. The extracted parameters are ready in the side panel.\n\nWhat would you like to know?` };
              setMsgs([welcomeMsg, ...data.messages]);
            }
          }).catch(() => {});
          return;
        }
      }
    } catch {}

    // 2) Fetch from server
    const loadingMsgs = [
      { role: "assistant", type: "analysis", content: `Loading **${chat.title}**...` },
    ];
    setMsgs(loadingMsgs);

    try {
      const data = await api.getChatHistory(token, chat.id);
      const welcomeMsg = { role: "assistant", type: "analysis", content: `Loaded **${chat.title}**. The extracted parameters are ready in the side panel.\n\nWhat would you like to know?` };
      if (data.messages && data.messages.length > 0) {
        setMsgs([welcomeMsg, ...data.messages]);
      } else {
        setMsgs([welcomeMsg]);
      }
    } catch {
      setMsgs([
        { role: "assistant", type: "analysis", content: `Loaded **${chat.title}**. The extracted parameters are ready in the side panel.\n\nWhat would you like to know?` },
      ]);
    }
  };

  const handleCtx = (e, chat) => { e.preventDefault(); e.stopPropagation(); setCtxMenu({ x: e.clientX, y: e.clientY, chat }); };

  const newAnalysis = () => {
    setMsgs([]);
    setShowResults(false);
    setFiles([]);
    setIsTyping(false);
    setCurrentProjectId(null);
    setCurrentProjectName("");
    setCurrentProjectType("commercial");
    setShowCreateDialog(false);
    setPendingFiles([]);
    setMultiSelect(false);
    setSelectedChats(new Set());
  };

  const handleStar = async (chatId) => {
    try {
      const res = await api.toggleStar(token, chatId);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_starred: res.is_starred } : c));
      if (chatId === currentProjectId) {
        const chatName = chats.find(c => c.id === chatId)?.title || "Project";
        setMsgs(prev => [...prev, {
          role: "assistant", type: "text",
          content: res.is_starred ? `⭐ **${chatName}** added to favourites` : `**${chatName}** removed from favourites`,
        }]);
      }
    } catch (e) { console.error("Star failed:", e); }
  };

  const handleArchive = async (chatId) => {
    try {
      await api.toggleArchive(token, chatId);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_archived: true, is_starred: false } : c));
      if (currentProjectId === chatId) newAnalysis();
    } catch (e) { console.error("Archive failed:", e); }
  };

  const handleUnarchive = async (chatId) => {
    try {
      await api.toggleArchive(token, chatId);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, is_archived: false } : c));
    } catch (e) { console.error("Unarchive failed:", e); }
  };

  const handleBulkAction = async (action) => {
    const ids = Array.from(selectedChats);
    if (!ids.length) return;
    try {
      if (action === "delete") {
        await api.bulkUpdateProjects(token, ids, "delete");
        setChats(prev => prev.filter(c => !selectedChats.has(c.id)));
        if (selectedChats.has(currentProjectId)) newAnalysis();
      } else if (action === "archive") {
        await api.bulkUpdateProjects(token, ids, "archive");
        setChats(prev => prev.map(c => selectedChats.has(c.id) ? { ...c, is_archived: true, is_starred: false } : c));
        if (selectedChats.has(currentProjectId)) newAnalysis();
      } else if (action === "unarchive") {
        await api.bulkUpdateProjects(token, ids, "unarchive");
        setChats(prev => prev.map(c => selectedChats.has(c.id) ? { ...c, is_archived: false } : c));
      } else if (action === "star") {
        await api.bulkUpdateProjects(token, ids, "star");
        setChats(prev => prev.map(c => selectedChats.has(c.id) ? { ...c, is_starred: true } : c));
      } else if (action === "unstar") {
        await api.bulkUpdateProjects(token, ids, "unstar");
        setChats(prev => prev.map(c => selectedChats.has(c.id) ? { ...c, is_starred: false } : c));
      }
    } catch (e) { console.error("Bulk action failed:", e); }
    setMultiSelect(false);
    setSelectedChats(new Set());
  };

  const filteredChats = chats.filter(c => {
    if (sidebarFilter === "favourites") return c.is_starred && !c.is_archived;
    if (sidebarFilter === "archived") return c.is_archived;
    return !c.is_archived;
  });

  // ── Auth screen ──
  const handleLogin = (accessToken, userData) => {
    localStorage.setItem("tiq_token", accessToken);
    setToken(accessToken);
    if (userData) {
      setUser(userData);
      if (userData.has_avatar) setAvatarUrl(api.getAvatarUrl(accessToken));
    }
    setScreen("main");
    // Load project history after login
    api.listProjects(accessToken).then(projects => {
      if (Array.isArray(projects) && projects.length > 0) {
        setChats(projects.map(p => ({
          id: p.project_id || p.id,
          title: p.project_name || p.name || "Untitled",
          type: p.project_type || "commercial",
          is_starred: p.is_starred || false,
          is_archived: p.is_archived || false,
          date: p.created_at || "",
          updated: p.updated_at || p.created_at || "",
        })));
      }
    });
  };

  const logout = () => { localStorage.removeItem("tiq_token"); setToken(null); setUser(null); setAvatarUrl(null); setScreen("auth"); setChats([]); newAnalysis(); };

  if (screen === "auth") return <AuthScreen onLogin={handleLogin} />;

  // ── Profile screen ──
  if (screen === "profile") return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <ProfileScreen user={user} token={token} avatarUrl={avatarUrl} onAvatarChange={setAvatarUrl} onBack={() => setScreen("main")} onLogout={logout} onDeleteAccount={async () => { await api.deleteAccount(token); logout(); }} />
    </div>
  );

  const hasContent = msgs.length > 0 || isTyping;

  const SIDE_W = 258;
  const SIDE_MINI = 64;
  const sidebarW = sideOpen ? SIDE_W : SIDE_MINI;

  // Compute initials: first letter of first name + first letter of last name, or first letter of email
  const getInitials = (u) => {
    if (!u) return "?";
    if (u.name) {
      const parts = u.name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      return parts[0][0].toUpperCase();
    }
    return (u.email || "?")[0].toUpperCase();
  };

  const iconBtn = (onClick, title, children, danger = false) => (
    <button onClick={onClick} title={title}
      style={{ width: 40, height: 40, borderRadius: 10, background: "transparent", border: "none", color: danger ? C.text3 : C.text2, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", fontFamily: F.sans }}
      onMouseEnter={e => { e.currentTarget.style.background = danger ? "rgba(255,90,90,0.1)" : C.bg2; e.currentTarget.style.color = danger ? C.err : C.text1; }}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = danger ? C.text3 : C.text2; }}>
      {children}
    </button>
  );

  return (
    <div style={{ height: "100vh", background: C.bg, fontFamily: F.sans, overflow: "hidden" }}>

      {/* ── Floating Sidebar ── */}
      <div style={{
        position: "fixed", left: 10, top: 10, bottom: 10,
        width: sidebarW,
        background: C.navyDark,
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1)",
        zIndex: 100,
      }}>

        {/* ── Header: TenderIQ + Partnership ── */}
        <div style={{ padding: sideOpen ? "14px 12px 4px" : "12px 0 10px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          {sideOpen ? (
            <>
              {/* Row 1: TenderIQ logo + name + collapse */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <img src="/teiq.png" alt="TenderIQ" style={{ height: 26, width: "auto", objectFit: "contain" }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: C.text1, whiteSpace: "nowrap", letterSpacing: "-0.02em" }}>TenderIQ</span>
                </div>
                <button onClick={() => setSideOpen(false)}
                  style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 4, borderRadius: 6, display: "flex", flexShrink: 0, transition: "color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.color = C.text1}
                  onMouseLeave={e => e.currentTarget.style.color = C.text3}>
                  <ChevronLeftIcon />
                </button>
              </div>
              {/* Row 2: Schüco × Sooru */}
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: -14 }}>
                <img src="/schu.png" alt="Schüco" style={{ height: 40, width: "auto", objectFit: "contain" }} />
                <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, fontWeight: 300 }}>×</span>
                <img src="/suru.png" alt="Sooru" style={{ height: 10, width: "auto", objectFit: "contain" }} />
                <span style={{ color: C.text2, fontSize: 10, fontWeight: 600, whiteSpace: "nowrap" }}>Sooru.AI</span>
              </div>
            </>
          ) : (
            /* Collapsed: teiq logo + expand button (inline) */
            <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4 }}>
              <img src="/teiq.png" alt="TenderIQ" style={{ height: 22, width: "auto", objectFit: "contain", flexShrink: 0 }} />
              <button onClick={() => setSideOpen(true)} title="Expand"
                style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 5, color: C.text3, cursor: "pointer", padding: "1px 4px", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s", flexShrink: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = C.text1; e.currentTarget.style.borderColor = C.text2; }}
                onMouseLeave={e => { e.currentTarget.style.color = C.text3; e.currentTarget.style.borderColor = C.border; }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          )}
        </div>

        {/* ── New Analysis ── */}
        <div style={{ padding: sideOpen ? "10px 10px 6px" : "10px 0 6px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
          {sideOpen ? (
            <button onClick={newAnalysis}
              style={{ width: "100%", padding: "9px 14px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 9, color: C.green, cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.sans, display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.greenGlow}
              onMouseLeave={e => e.currentTarget.style.background = C.greenSubtle}>
              <PlusIcon /> New Analysis
            </button>
          ) : (
            iconBtn(newAnalysis, "New Analysis", <PlusIcon />)
          )}
        </div>

        {/* ── Chats ── */}
        <div style={{ flex: 1, overflowY: "auto", padding: sideOpen ? "4px 8px" : "4px 0", display: "flex", flexDirection: "column" }}>
          {sideOpen ? (
            <>
              {/* Filter dropdown row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 8px 5px" }}>
                <select
                  value={sidebarFilter}
                  onChange={e => { setSidebarFilter(e.target.value); setMultiSelect(false); setSelectedChats(new Set()); }}
                  style={{ fontSize: 10, fontWeight: 600, color: C.text3, background: "transparent", border: "none", cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: F.sans, outline: "none", padding: 0 }}>
                  <option value="all" style={{ background: C.navyDark, color: C.text2 }}>All Projects</option>
                  <option value="favourites" style={{ background: C.navyDark, color: C.text2 }}>Favourites</option>
                  <option value="archived" style={{ background: C.navyDark, color: C.text2 }}>Archived</option>
                </select>
              </div>

              {/* Multi-select action bar */}
              {multiSelect && selectedChats.size > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 8px 6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10, color: C.text2, fontWeight: 600 }}>{selectedChats.size} selected</span>
                  <div style={{ flex: 1 }} />
                  {sidebarFilter === "archived" ? (<>
                    <button onClick={() => handleBulkAction("unarchive")} style={{ fontSize: 9, padding: "3px 8px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 4, color: C.green, cursor: "pointer", fontWeight: 600, fontFamily: F.sans }}>Restore</button>
                    <button onClick={() => handleBulkAction("delete")} style={{ fontSize: 9, padding: "3px 8px", background: "rgba(255,90,90,0.08)", border: "1px solid rgba(255,90,90,0.2)", borderRadius: 4, color: C.err, cursor: "pointer", fontWeight: 600, fontFamily: F.sans }}>Delete</button>
                  </>) : sidebarFilter === "favourites" ? (<>
                    <button onClick={() => handleBulkAction("unstar")} style={{ fontSize: 9, padding: "3px 8px", background: "rgba(255,179,64,0.08)", border: "1px solid rgba(255,179,64,0.2)", borderRadius: 4, color: "#FFB340", cursor: "pointer", fontWeight: 600, fontFamily: F.sans }}>Remove</button>
                  </>) : (<>
                    <button onClick={() => handleBulkAction("star")} style={{ fontSize: 9, padding: "3px 8px", background: "rgba(255,179,64,0.08)", border: "1px solid rgba(255,179,64,0.2)", borderRadius: 4, color: "#FFB340", cursor: "pointer", fontWeight: 600, fontFamily: F.sans }}>Favourite</button>
                    <button onClick={() => handleBulkAction("archive")} style={{ fontSize: 9, padding: "3px 8px", background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 4, color: C.text2, cursor: "pointer", fontWeight: 600, fontFamily: F.sans }}>Archive</button>
                  </>)}
                  <button onClick={() => { setMultiSelect(false); setSelectedChats(new Set()); }} style={{ fontSize: 9, padding: "3px 6px", background: "none", border: "none", color: C.text3, cursor: "pointer", fontFamily: F.sans }}>Cancel</button>
                </div>
              )}

              {filteredChats.length === 0 && <div style={{ padding: "10px 8px", fontSize: 12, color: C.text3 }}>
                {sidebarFilter === "favourites" ? "No favourites yet" : sidebarFilter === "archived" ? "No archived projects" : "No analyses yet"}
              </div>}
              {filteredChats.map(chat => {
                const isComm = (chat.type || "commercial") === "commercial";
                const typeBadge = isComm ? "C" : "R";
                const typeBg = isComm ? "rgba(74,158,255,0.15)" : "rgba(0,196,140,0.15)";
                const typeColor = isComm ? "#4A9EFF" : "#00C48C";
                const isSelected = selectedChats.has(chat.id);
                const fmtDate = (d) => {
                  if (!d) return "";
                  try { const dt = new Date(d); return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) + " " + dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; }
                };
                return (
                <div key={chat.id} style={{ position: "relative", marginBottom: 2 }}>
                  <button
                    onClick={() => {
                      if (multiSelect) {
                        setSelectedChats(prev => { const next = new Set(prev); if (next.has(chat.id)) next.delete(chat.id); else next.add(chat.id); return next; });
                      } else if (!chat.is_archived) {
                        openChat(chat);
                      }
                    }}
                    onContextMenu={e => handleCtx(e, chat)}
                    style={{ width: "100%", padding: "8px 28px 8px 10px", background: isSelected ? "rgba(139,197,63,0.08)" : currentProjectId === chat.id ? C.bg2 : "transparent", border: isSelected ? `1px solid rgba(139,197,63,0.2)` : "1px solid transparent", borderRadius: 7, color: currentProjectId === chat.id ? C.text1 : C.text2, cursor: "pointer", textAlign: "left", fontFamily: F.sans, fontSize: 12, display: "flex", alignItems: "flex-start", gap: 8, transition: "all 0.1s" }}
                    onMouseEnter={e => { if (!isSelected && currentProjectId !== chat.id) { e.currentTarget.style.background = C.bg2; e.currentTarget.style.color = C.text1; } }}
                    onMouseLeave={e => { if (!isSelected && currentProjectId !== chat.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.text2; } }}>
                    <div
                      style={{ position: "relative", flexShrink: 0, marginTop: 2, cursor: "pointer" }}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!multiSelect) { setMultiSelect(true); setSelectedChats(new Set([chat.id])); }
                        else { setSelectedChats(prev => { const next = new Set(prev); if (next.has(chat.id)) next.delete(chat.id); else next.add(chat.id); return next; }); }
                      }}
                      title="Select">
                      {multiSelect ? (
                        <input type="checkbox" checked={isSelected} readOnly style={{ width: 14, height: 14, accentColor: C.green, cursor: "pointer" }} />
                      ) : (
                        <ChatIcon />
                      )}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden", minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 500 }}>{chat.title}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 3, background: typeBg, color: typeColor, flexShrink: 0, letterSpacing: "0.03em" }}>{typeBadge}</span>
                        {chat.is_starred && <svg width="10" height="10" viewBox="0 0 24 24" fill="#FFB340" stroke="#FFB340" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                      </div>
                      <div style={{ fontSize: 10, color: C.text3, marginTop: 2, display: "flex", gap: 6 }}>
                        <span title="Created">{fmtDate(chat.date)}</span>
                        {chat.updated && chat.updated !== chat.date && (
                          <span title="Last modified" style={{ opacity: 0.7 }}>| {fmtDate(chat.updated)}</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {!multiSelect && (
                    <button onClick={e => handleCtx(e, chat)}
                      style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 2, opacity: 0.4, transition: "opacity 0.15s" }}
                      onMouseEnter={e => e.currentTarget.style.opacity = 1}
                      onMouseLeave={e => e.currentTarget.style.opacity = 0.4}>
                      <MoreIcon />
                    </button>
                  )}
                </div>
                );
              })}
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, paddingTop: 4 }}>
              {/* Collapsed filter selector */}
              <div style={{ position: "relative", marginBottom: 4 }}>
                <select
                  value={sidebarFilter}
                  onChange={e => { setSidebarFilter(e.target.value); setMultiSelect(false); setSelectedChats(new Set()); }}
                  style={{ width: 44, height: 28, fontSize: 9, fontWeight: 700, color: C.text3, background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", textAlign: "center", fontFamily: F.sans, outline: "none", padding: "0 2px", appearance: "none", WebkitAppearance: "none" }}>
                  <option value="all">All</option>
                  <option value="favourites">Fav</option>
                  <option value="archived">Arc</option>
                </select>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              {filteredChats.length === 0 && (
                <div style={{ color: C.text3, fontSize: 10, textAlign: "center", padding: "8px 0" }}>—</div>
              )}
              {filteredChats.map(chat => (
                <div key={chat.id} style={{ position: "relative" }}>
                  <button onClick={() => !chat.is_archived && openChat(chat)} title={chat.title}
                    style={{ width: 40, height: 40, borderRadius: 10, background: currentProjectId === chat.id ? C.bg2 : "transparent", border: currentProjectId === chat.id ? `1px solid ${C.border}` : "none", color: currentProjectId === chat.id ? C.green : C.text3, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}
                    onMouseEnter={e => { if (currentProjectId !== chat.id) { e.currentTarget.style.background = C.bg2; e.currentTarget.style.color = C.text2; } }}
                    onMouseLeave={e => { if (currentProjectId !== chat.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.text3; } }}>
                    <ChatIcon />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Profile ── */}
        <div style={{ padding: sideOpen ? "6px 10px" : "6px 0", borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "center", flexShrink: 0 }}>
          {sideOpen ? (
            <button onClick={() => setScreen("profile")}
              style={{ width: "100%", padding: "8px 10px", background: "transparent", border: "none", borderRadius: 8, color: C.text1, cursor: "pointer", fontSize: 13, fontFamily: F.sans, display: "flex", alignItems: "center", gap: 10, transition: "all 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = C.bg3}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              {avatarUrl ? (
                <img src={avatarUrl} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              ) : (
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: C.green, color: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {getInitials(user)}
                </div>
              )}
              <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13, fontWeight: 500 }}>
                {user?.name || user?.email || "Profile"}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          ) : avatarUrl ? (
              <button onClick={() => setScreen("profile")} title="Profile"
                style={{ width: 36, height: 36, borderRadius: "50%", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                <img src={avatarUrl} style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover" }} />
              </button>
            ) : (
              <button onClick={() => setScreen("profile")} title="Profile"
                style={{ width: 36, height: 36, borderRadius: "50%", background: C.green, color: "#111", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700 }}>
                {getInitials(user)}
              </button>
            )}
        </div>

      </div>

      {/* Mobile overlay */}
      {isMob && sideOpen && <div onClick={() => setSideOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 99 }} />}

      {/* ── Main area ── */}
      <div style={{ marginLeft: isMob ? 0 : sidebarW + 20, height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", transition: "margin-left 0.25s cubic-bezier(0.4,0,0.2,1)" }}>
        {/* Topbar */}
        <div style={{ height: 50, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: C.text1 }}>{currentProjectName || (hasContent ? "Analysis" : "New Analysis")}</span>
          </div>
          {currentProjectId && (
            isMob ? (
              <button onClick={() => setMobResults(true)}
                style={{ padding: "5px 12px", background: C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 6, color: C.green, cursor: "pointer", fontSize: 12, fontFamily: F.sans, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                <PanelIcon /> Results
              </button>
            ) : (
              <button onClick={() => setShowResults(v => !v)}
                style={{ padding: "5px 12px", background: showResults ? C.green : C.greenSubtle, border: `1px solid ${C.greenBorder}`, borderRadius: 6, color: showResults ? "#111" : C.green, cursor: "pointer", fontSize: 12, fontFamily: F.sans, fontWeight: 600, display: "flex", alignItems: "center", gap: 5, transition: "all 0.15s" }}>
                <PanelIcon /> {showResults ? "Hide Parameters" : "Show Parameters"}
              </button>
            )
          )}
        </div>

        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Chat column */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: isMob ? "16px" : "24px" }}>
              {!hasContent && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: 24, animation: "fadeUp 0.5s ease" }}>
                  <div style={{ width: 72, height: 72, borderRadius: 16, background: C.greenSubtle, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, border: `1px solid ${C.greenBorder}` }}>
                    <SchucoMark />
                  </div>
                  <h1 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: C.text1 }}>Welcome to TenderIQ</h1>
                  <p style={{ margin: "0 0 28px", fontSize: 14, color: C.text2, maxWidth: 400, lineHeight: 1.6 }}>
                    Upload a tender document or BoQ to automatically extract wind loads, water resistance, system specs, and compliance data.
                  </p>

                  {/* Drop zone */}
                  <div
                    onClick={() => fileRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragging(false);
                      const dropped = Array.from(e.dataTransfer.files).filter(f =>
                        /\.(pdf|docx?|xlsx?|csv|ods|dxf|dwg)$/i.test(f.name)
                      );
                      if (dropped.length) setFiles(dropped);
                    }}
                    style={{
                      width: "100%", maxWidth: 480, padding: "36px 24px",
                      border: `2px dashed ${isDragging ? C.green : C.border}`,
                      borderRadius: 14, cursor: "pointer", marginBottom: 20,
                      background: isDragging ? C.greenSubtle : C.bg1,
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => { if (!isDragging) e.currentTarget.style.borderColor = C.greenBorder; }}
                    onMouseLeave={e => { if (!isDragging) e.currentTarget.style.borderColor = C.border; }}
                  >
                    <div style={{ color: C.green, marginBottom: 14, display: "flex", justifyContent: "center" }}><UploadIcon /></div>
                    <div style={{ fontSize: 15, fontWeight: 600, color: C.text1, marginBottom: 6 }}>
                      {isDragging ? "Drop to upload" : "Drag & drop your file here"}
                    </div>
                    <div style={{ fontSize: 12, color: C.text3, marginBottom: 16 }}>or click to browse</div>
                    <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
                      {["PDF", "DOCX", "XLSX", "CSV"].map(ext => (
                        <span key={ext} style={{ padding: "3px 10px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 20, fontSize: 11, color: C.text3, fontWeight: 600 }}>{ext}</span>
                      ))}
                    </div>
                  </div>

                  {/* Selected files preview */}
                  {files.length > 0 && (
                    <div style={{ width: "100%", maxWidth: 480, marginBottom: 16 }}>
                      {files.map((f, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", background: C.bg1, borderRadius: 8, border: `1px solid ${C.greenBorder}`, marginBottom: 6, fontSize: 13, color: C.text1 }}>
                          <FileIcon />
                          <span style={{ flex: 1, textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                          <button onClick={e => { e.stopPropagation(); setFiles(files.filter((_, j) => j !== i)); }} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", display: "flex" }}><CloseIcon /></button>
                        </div>
                      ))}
                      <button onClick={handleSend}
                        style={{ width: "100%", padding: "11px 0", background: C.green, border: "none", borderRadius: 8, color: "#111", fontWeight: 700, fontSize: 14, fontFamily: F.sans, cursor: "pointer", marginTop: 4 }}>
                        Analyse Document
                      </button>
                    </div>
                  )}

                  <div style={{ display: "flex", gap: 20, marginTop: 8 }}>
                    {[
                      { icon: <FileIcon />, t: "Auto-Extract", d: "Wind, water, thermal data" },
                      { icon: <ChatIcon />, t: "Ask Questions", d: "Chat about your tender" },
                    ].map((item, i) => (
                      <div key={i} style={{ padding: "14px 18px", background: C.bg1, borderRadius: 10, border: `1px solid ${C.border}`, textAlign: "center", minWidth: 130 }}>
                        <div style={{ color: C.green, marginBottom: 8 }}>{item.icon}</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.text1, marginBottom: 3 }}>{item.t}</div>
                        <div style={{ fontSize: 11, color: C.text3 }}>{item.d}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {msgs.map((m, i) => (
                <div key={i} style={{ display: "flex", gap: 12, marginBottom: 18, justifyContent: m.role === "user" ? "flex-end" : "flex-start", animation: "fadeUp 0.3s ease" }}>
                  {m.role === "assistant" && (
                    <div style={{ width: 32, height: 32, borderRadius: 8, overflow: "hidden", flexShrink: 0 }}><SchucoMark /></div>
                  )}
                  <div style={{ maxWidth: "75%", padding: "12px 16px", background: m.role === "user" ? `linear-gradient(135deg, ${C.green}, ${C.greenDark})` : C.bg1, borderRadius: m.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px", border: m.role === "assistant" ? `1px solid ${C.border}` : "none" }}>
                    {m.type === "file" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "rgba(0,0,0,0.15)", borderRadius: 6, marginBottom: 8, fontSize: 12 }}>
                        <FileIcon /><span style={{ color: m.role === "user" ? "#111" : C.text1 }}>{m.content}</span>
                      </div>
                    )}
                    <div style={{ fontSize: 14, lineHeight: 1.65, color: m.role === "user" ? "#111" : C.text1, whiteSpace: "pre-wrap", fontWeight: m.role === "user" ? 500 : 400 }}>
                      <RichText text={m.text || m.content} />
                    </div>
                    {m.sources?.length > 0 && (
                      <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(0,196,140,0.06)", borderRadius: 8, border: `1px solid rgba(0,196,140,0.15)` }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                          <span style={{ fontWeight: 700, fontSize: 11, color: C.green, textTransform: "uppercase", letterSpacing: "0.06em" }}>Source Documents</span>
                        </div>
                        {m.sources.map((s, j) => (
                          <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", marginBottom: 4, background: "rgba(255,255,255,0.04)", borderRadius: 5, fontSize: 12, color: C.text1 }}>
                            <span style={{ color: C.green, fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{j + 1}.</span>
                            <span style={{ fontWeight: 500 }}>{s}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {m.role === "user" && avatarUrl && (
                    <img src={avatarUrl} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  )}
                  {m.role === "user" && !avatarUrl && (
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: C.green, color: "#111", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {getInitials(user)}
                    </div>
                  )}
                </div>
              ))}

              {isTyping && <TypingIndicator stage={typingStage} />}
              <div ref={chatEnd} />
            </div>

            {/* Input bar */}
            <div style={{ padding: isMob ? "10px 12px 14px" : "10px 24px 18px", borderTop: hasContent ? `1px solid ${C.border}` : "none", flexShrink: 0 }}>
              {/* Processing banner */}
              {isProcessing && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", marginBottom: 8, background: "rgba(139,197,63,0.08)", border: `1px solid rgba(139,197,63,0.2)`, borderRadius: 8, animation: "fadeUp .2s ease" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth="2" style={{ animation: "spin 1.2s linear infinite", flexShrink: 0 }}><path d="M21 12a9 9 0 11-6.22-8.56"/></svg>
                  <span style={{ fontSize: 13, color: C.green, fontWeight: 600 }}>Processing documents...</span>
                  <span style={{ fontSize: 11, color: C.text3 }}>Chat will be available once extraction completes.</span>
                </div>
              )}
              {files.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {files.map((f, i) => (
                    <div key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", background: C.bg1, borderRadius: 6, fontSize: 12, color: C.text2, border: `1px solid ${C.border}` }}>
                      <FileIcon /> {f.name}
                      <button onClick={() => setFiles(files.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", padding: 2, display: "flex" }}><CloseIcon /></button>
                    </div>
                  ))}
                </div>
              )}
              {/* Model dropdown hidden — chatModel is pinned to "gemini-3-flash". */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: C.bg1, borderRadius: 12, border: `1px solid ${C.border}`, padding: "5px 8px 5px 5px", opacity: isProcessing ? 0.5 : 1, pointerEvents: isProcessing ? "none" : "auto" }}>
                <button onClick={() => fileRef.current?.click()}
                  style={{ padding: 8, background: "none", border: "none", color: C.text3, cursor: "pointer", borderRadius: 6, flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.color = C.green}
                  onMouseLeave={e => e.currentTarget.style.color = C.text3}>
                  <UploadIcon />
                </button>
                <input ref={fileRef} type="file" multiple accept=".pdf,.xlsx,.xls,.csv,.ods,.docx,.doc,.dxf,.dwg" style={{ display: "none" }}
                  onChange={e => { setFiles(Array.from(e.target.files)); e.target.value = ""; }} />
                <textarea value={input} onChange={e => setInput(e.target.value)}
                  disabled={isProcessing}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                  placeholder={files.length > 0 ? "Add a project name or notes (optional)…" : currentProjectId ? "Ask a question about this tender…" : "Upload a tender document or ask a question…"}
                  rows={1}
                  style={{ flex: 1, padding: "8px 4px", background: "transparent", border: "none", color: C.text1, fontSize: 14, fontFamily: F.sans, outline: "none", resize: "none", lineHeight: 1.4, minHeight: 22, maxHeight: 120 }} />
                <button onClick={handleSend}
                  style={{ padding: 8, background: (input.trim() || files.length > 0) ? C.green : "transparent", border: "none", borderRadius: 8, cursor: "pointer", color: (input.trim() || files.length > 0) ? "#111" : C.text3, transition: "all 0.2s", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <SendIcon />
                </button>
              </div>
              <div style={{ textAlign: "center", marginTop: 7, fontSize: 10, color: C.text3 }}>
                TenderIQ extracts data from uploaded documents. Always verify against original tender specifications.
              </div>
            </div>
          </div>

          {/* Results panel — desktop fixed right column */}
          {currentProjectId && !isMob && showResults && (
            <div style={{ width: 420, borderLeft: `1px solid ${C.border}`, overflow: "hidden", flexShrink: 0 }}>
              <ResultsPanel token={token} projectId={currentProjectId} projectName={currentProjectName}
                onClose={() => setShowResults(false)} isMobile={false}
                onProcessingChange={handleProcessingChange} onUploadFiles={handleUploadMore} uploadTrigger={uploadTrigger}
                onArchiveProject={() => { handleArchive(currentProjectId); newAnalysis(); }}
                onChatMessage={(msg) => setMsgs(prev => [...prev, { role: "assistant", type: "text", content: msg }])} />
            </div>
          )}
        </div>
      </div>

      {/* Results panel — mobile bottom sheet */}
      {isMob && mobResults && <>
        <div onClick={() => setMobResults(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 200 }} />
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, height: "85vh", zIndex: 201, borderRadius: "16px 16px 0 0", overflow: "hidden", animation: "slideUp 0.3s ease" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: C.text3, margin: "10px auto", opacity: 0.4 }} />
          <ResultsPanel token={token} projectId={currentProjectId} projectName={currentProjectName} onClose={() => setMobResults(false)} isMobile={true}
            onProcessingChange={handleProcessingChange} onUploadFiles={handleUploadMore}
            onArchiveProject={() => { handleArchive(currentProjectId); setMobResults(false); newAnalysis(); }}
            onChatMessage={(msg) => setMsgs(prev => [...prev, { role: "assistant", type: "text", content: msg }])} />
        </div>
      </>}

      {/* Context menu & modals */}
      {ctxMenu && (
        <ChatCtxMenu x={ctxMenu.x} y={ctxMenu.y}
          isArchived={ctxMenu.chat.is_archived}
          isStarred={ctxMenu.chat.is_starred}
          onOpen={() => { openChat(ctxMenu.chat); setCtxMenu(null); }}
          onRename={() => { setRenameModal(ctxMenu.chat); setCtxMenu(null); }}
          onStar={() => { handleStar(ctxMenu.chat.id); setCtxMenu(null); }}
          onArchive={() => { handleArchive(ctxMenu.chat.id); setCtxMenu(null); }}
          onUnarchive={() => { handleUnarchive(ctxMenu.chat.id); setCtxMenu(null); }}
          onDelete={() => { setDeleteModal(ctxMenu.chat); setCtxMenu(null); }}
          onClose={() => setCtxMenu(null)} />
      )}
      {renameModal && (
        <RenameModal name={renameModal.title}
          onSave={n => { setChats(chats.map(c => c.id === renameModal.id ? { ...c, title: n } : c)); setRenameModal(null); }}
          onClose={() => setRenameModal(null)} />
      )}
      {deleteModal && (
        <DeleteModal name={deleteModal.title}
          onConfirm={async () => {
            const delId = deleteModal.id;
            setChats(chats.filter(c => c.id !== delId));
            if (currentProjectId === delId) newAnalysis();
            setDeleteModal(null);
            try { await api.deleteProject(token, delId); } catch(e) { console.error("Delete failed:", e); }
          }}
          onClose={() => setDeleteModal(null)} />
      )}

      {/* ── Error Popup ── */}
      {errorPopup && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,14,20,0.7)", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", animation: "fadeUp 0.2s ease" }}
          onClick={() => setErrorPopup(null)}>
          <div style={{ background: C.bg1, borderRadius: 16, padding: "24px 28px", border: `1px solid ${errorPopup.type === "archived" ? "rgba(255,179,64,0.25)" : "rgba(255,90,90,0.25)"}`, maxWidth: 420, width: "90%", position: "relative", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setErrorPopup(null)}
              style={{ position: "absolute", top: 12, right: 12, background: "transparent", border: "none", color: C.text3, cursor: "pointer", padding: 4, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = `rgba(255,255,255,0.06)`}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <CloseIcon size={16} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: errorPopup.type === "archived" ? "rgba(255,179,64,0.1)" : "rgba(255,90,90,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {errorPopup.type === "archived" ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFB340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5a5a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                )}
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.text1 }}>
                {errorPopup.type === "archived" ? "File Already Archived" : errorPopup.type === "duplicate" ? "Duplicate Files Detected" : "Upload Failed"}
              </div>
            </div>
            <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7 }}>
              {errorPopup.type === "archived" ? (<>
                <span style={{ fontWeight: 600, color: C.text1 }}>{errorPopup.fileNames}</span>{" "}
                {errorPopup.fileNames.includes(",") ? "are" : "is"} in your <span style={{ fontWeight: 600, color: "#FFB340" }}>Archived</span> folder.
                <div style={{ marginTop: 10, color: C.text3 }}>
                  You can restore {errorPopup.fileNames.includes(",") ? "them" : "it"} from the Archived section in the parameters panel instead of re-uploading.
                </div>
              </>) : errorPopup.type === "duplicate" ? (<>
                The file(s) you uploaded{" "}
                <span style={{ fontWeight: 600, color: C.text1 }}>{errorPopup.fileNames}</span>{" "}
                {errorPopup.fileNames.includes(",") ? "are" : "is"} already scanned for parameters.
                <div style={{ marginTop: 10, color: C.text3 }}>
                  Try uploading different files, or delete the existing file(s) from the scan and try again.
                </div>
              </>) : errorPopup.message}
            </div>
            <button onClick={() => setErrorPopup(null)}
              style={{ marginTop: 18, width: "100%", padding: "10px 0", background: errorPopup.type === "archived" ? "rgba(255,179,64,0.08)" : "rgba(255,255,255,0.06)", border: `1px solid ${errorPopup.type === "archived" ? "rgba(255,179,64,0.25)" : C.border}`, borderRadius: 8, color: errorPopup.type === "archived" ? "#FFB340" : C.text1, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: F.sans, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = errorPopup.type === "archived" ? "rgba(255,179,64,0.15)" : "rgba(255,255,255,0.1)"}
              onMouseLeave={e => e.currentTarget.style.background = errorPopup.type === "archived" ? "rgba(255,179,64,0.08)" : "rgba(255,255,255,0.06)"}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── Project Creation Dialog ── */}
      {showCreateDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,14,20,0.85)", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", animation: "fadeUp 0.2s ease" }}>
          <div style={{ background: C.bg1, borderRadius: 16, padding: "20px 24px", border: `1px solid ${C.border}`, maxWidth: 420, width: "90%", maxHeight: "90vh", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: C.text1, marginBottom: 2 }}>New Project</div>
            <div style={{ fontSize: 11, color: C.text3, marginBottom: 14 }}>{pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} selected</div>

            {/* Project Name */}
            <label style={{ fontSize: 10, fontWeight: 600, color: C.text2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5, display: "block" }}>Project Name</label>
            <input
              value={createDialogName}
              onChange={e => setCreateDialogName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") handleCreateProject(); }}
              autoFocus
              style={{ width: "100%", padding: "8px 12px", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text1, fontSize: 13, fontFamily: F.sans, outline: "none", marginBottom: 14, boxSizing: "border-box" }}
              placeholder="Enter project name..."
            />

            {/* Project Type */}
            <label style={{ fontSize: 10, fontWeight: 600, color: C.text2, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6, display: "block" }}>Project Type</label>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              {[
                { value: "commercial", label: "Commercial", icon: "🏢", desc: "Office, Mall, IT Park" },
                { value: "residential", label: "Residential", icon: "🏠", desc: "Villa, Apartment, Tower" },
              ].map(opt => (
                <button key={opt.value}
                  onClick={() => setCreateDialogType(opt.value)}
                  style={{
                    flex: 1, padding: "10px 10px", background: createDialogType === opt.value ? (opt.value === "commercial" ? "rgba(74,158,255,0.1)" : "rgba(0,196,140,0.1)") : C.bg,
                    border: `2px solid ${createDialogType === opt.value ? (opt.value === "commercial" ? "#4A9EFF" : "#00C48C") : C.border}`,
                    borderRadius: 10, cursor: "pointer", textAlign: "center", transition: "all 0.15s", fontFamily: F.sans,
                  }}>
                  <div style={{ fontSize: 20, marginBottom: 2 }}>{opt.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: createDialogType === opt.value ? C.text1 : C.text2 }}>{opt.label}</div>
                  <div style={{ fontSize: 9, color: C.text3, marginTop: 1 }}>{opt.desc}</div>
                </button>
              ))}
            </div>

            {/* AI Model, OCR Engine, Extraction mode — hidden from the UI.
                Defaults are pinned in state (gemini-3-flash / auto / batch);
                the backend still receives the same fields in create_project. */}


            {/* Actions */}
            <div style={{ display: "flex", gap: 10, position: "sticky", bottom: 0, background: C.bg1, paddingTop: 4 }}>
              <button onClick={() => { setShowCreateDialog(false); setPendingFiles([]); }}
                style={{ flex: 1, padding: "10px 0", background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text2, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: F.sans }}>
                Cancel
              </button>
              <button onClick={handleCreateProject}
                style={{ flex: 1, padding: "10px 0", background: C.green, border: "none", borderRadius: 8, color: "#111", cursor: "pointer", fontSize: 13, fontWeight: 700, fontFamily: F.sans }}>
                Start Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Analysing overlay ── */}
      {isTyping && msgs.some(m => m.type === "file") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,14,20,0.85)", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)", animation: "fadeUp 0.3s ease" }}>
          <div style={{ background: C.bg1, borderRadius: 20, padding: "44px 52px", border: `1px solid ${C.border}`, textAlign: "center", maxWidth: 380, width: "90%" }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.text1, marginBottom: 6, letterSpacing: "-0.02em" }}>Analysing</div>
            <div style={{ fontSize: 13, color: C.text3, marginBottom: 32 }}>Reading your document&hellip;</div>
            {/* Scanner line */}
            <div style={{ height: 3, background: C.bg2, borderRadius: 3, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", borderRadius: 3, background: `linear-gradient(90deg, transparent, ${C.green}, transparent)`, animation: "scanner 1.6s ease-in-out infinite" }} />
            </div>
            <style>{`@keyframes scanner { 0% { left: -40%; } 100% { left: 140%; } }`}</style>
          </div>
        </div>
      )}
    </div>
  );
}
