const BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async login(email, password) {
    const url = new URL(`${BASE}/login`);
    url.searchParams.set("email", email);
    url.searchParams.set("password", password);
    const res = await fetch(url.toString(), { method: "POST" });
    if (!res.ok) throw new Error("Invalid credentials");
    return res.json();
  },

  async signup(email, password) {
    const url = new URL(`${BASE}/signup`);
    url.searchParams.set("email", email);
    url.searchParams.set("password", password);
    const res = await fetch(url.toString(), { method: "POST" });
    if (!res.ok) throw new Error("Registration failed");
    return res.json();
  },

  async createProject(token, name, description, files, projectType = "commercial") {
    const form = new FormData();
    form.append("project_name", name);
    form.append("project_description", description || "");
    form.append("project_type", projectType || "commercial");
    files.forEach((f) => form.append("files", f));
    const res = await fetch(`${BASE}/projects/create`, {
      method: "POST",
      headers: authHeaders(token),
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async processProject(token, projectId, model, ocrEngine) {
    const url = new URL(`${BASE}/projects/${projectId}/process`);
    if (model) url.searchParams.set("model", model);
    if (ocrEngine) url.searchParams.set("ocr_engine", ocrEngine);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getParameters(token, projectId) {
    const res = await fetch(`${BASE}/projects/${projectId}/parameters`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /**
   * Open an SSE stream of live extraction events for a project. Returns a
   * native EventSource; caller is responsible for attaching listeners and
   * calling `.close()` on unmount. The endpoint is currently unauthenticated
   * (matches `getParameters`).
   */
  openParameterStream(projectId) {
    return new EventSource(`${BASE}/projects/${projectId}/parameters/stream`);
  },

  async reExtract(token, projectId, model) {
    const url = new URL(`${BASE}/projects/${projectId}/re-extract`);
    if (model) url.searchParams.set("model", model);
    const res = await fetch(url.toString(), {
      method: "POST",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reprocessDocument(token, projectId, documentId) {
    const res = await fetch(`${BASE}/projects/${projectId}/documents/${documentId}/reprocess`, {
      method: "POST",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async reExtractSingle(token, projectId, paramKey) {
    const res = await fetch(`${BASE}/projects/${projectId}/parameters/${paramKey}/re-extract`, {
      method: "POST",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async query(token, projectId, question, model) {
    const form = new FormData();
    form.append("query", question);
    if (model) form.append("model", model);
    const res = await fetch(`${BASE}/projects/${projectId}/query`, {
      method: "POST",
      headers: authHeaders(token),
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async getMe(token) {
    const res = await fetch(`${BASE}/me`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  async getTimings(token, projectId) {
    try {
      const res = await fetch(`${BASE}/projects/${projectId}/timings`, {
        headers: authHeaders(token),
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  },

  async getChatHistory(token, projectId) {
    try {
      const res = await fetch(`${BASE}/projects/${projectId}/chat-history`, {
        headers: authHeaders(token),
      });
      if (!res.ok) return { messages: [] };
      return res.json();
    } catch {
      return { messages: [] };
    }
  },

  getDocumentFileUrl(projectId, documentId) {
    return `${BASE}/projects/${projectId}/documents/${documentId}/file`;
  },

  async listDocuments(token, projectId) {
    const res = await fetch(`${BASE}/projects/${projectId}/documents`, {
      headers: authHeaders(token),
    });
    if (!res.ok) return [];
    return res.json();
  },

  async deleteProject(token, projectId) {
    const res = await fetch(`${BASE}/projects/${projectId}`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async listProjects(token) {
    try {
      const res = await fetch(`${BASE}/projects`, {
        headers: authHeaders(token),
      });
      if (!res.ok) return [];
      return res.json();
    } catch {
      return [];
    }
  },

  async getModels() {
    try {
      const res = await fetch(`${BASE}/models`);
      if (!res.ok) return { models: [], default: "claude-opus-4" };
      return res.json();
    } catch {
      return { models: [], default: "claude-opus-4" };
    }
  },
};
