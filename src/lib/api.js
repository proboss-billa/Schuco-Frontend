const BASE =
  process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  async login(email, password) {
    const res = await fetch(`${BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Invalid credentials");
    }
    return res.json();
  },

  async signup(email, password, name, phone) {
    const res = await fetch(`${BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name: name || undefined, phone: phone || undefined }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  async createProject(token, name, description, files, projectType = "commercial", streamingExtraction = true) {
    const form = new FormData();
    form.append("project_name", name);
    form.append("project_description", description || "");
    form.append("project_type", projectType || "commercial");
    form.append("streaming_extraction", streamingExtraction ? "true" : "false");
    files.forEach((f) => form.append("files", f));
    const res = await fetch(`${BASE}/projects/create`, {
      method: "POST",
      headers: authHeaders(token),
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  /**
   * Fetch structured sources and change-history for a single parameter.
   * Used by the history popover in ResultsPanel.
   */
  async getParameterSources(token, projectId, parameterKey) {
    const res = await fetch(
      `${BASE}/projects/${projectId}/parameters/${encodeURIComponent(parameterKey)}/sources`,
      { headers: authHeaders(token) }
    );
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Processing failed");
    }
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
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Query failed");
    }
    return res.json();
  },

  async verifySignupOtp(email, otp) {
    const res = await fetch(`${BASE}/verify-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "OTP verification failed");
    }
    return res.json();
  },

  async resendOtp(email, purpose = "signup") {
    const res = await fetch(`${BASE}/resend-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, purpose }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Failed to resend OTP");
    }
    return res.json();
  },

  async forgotPassword(email) {
    const res = await fetch(`${BASE}/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Request failed");
    }
    return res.json();
  },

  async resetPassword(email, otp, new_password) {
    const res = await fetch(`${BASE}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, new_password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Password reset failed");
    }
    return res.json();
  },

  async getMe(token) {
    const res = await fetch(`${BASE}/me`, {
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to fetch user");
    return res.json();
  },

  async updateProfile(token, { name, phone }) {
    const res = await fetch(`${BASE}/me`, {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone }),
    });
    if (!res.ok) throw new Error("Failed to update profile");
    return res.json();
  },

  async changePassword(token, { current_password, new_password }) {
    const res = await fetch(`${BASE}/me/password`, {
      method: "PUT",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ current_password, new_password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || "Password change failed");
    }
    return res.json();
  },

  async deleteAccount(token) {
    const res = await fetch(`${BASE}/me`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Failed to delete account");
    return res.json();
  },

  async uploadAvatar(token, file) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/me/avatar`, {
      method: "PUT",
      headers: authHeaders(token),
      body: form,
    });
    if (!res.ok) throw new Error("Avatar upload failed");
    return res.json();
  },

  async deleteAvatar(token) {
    const res = await fetch(`${BASE}/me/avatar`, {
      method: "DELETE",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error("Avatar delete failed");
    return res.json();
  },

  getAvatarUrl(token) {
    return `${BASE}/me/avatar?token=${token}&t=${Date.now()}`;
  },

  async uploadFiles(token, projectId, files) {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    const res = await fetch(`${BASE}/projects/${projectId}/upload`, {
      method: "POST",
      headers: authHeaders(token),
      body: form,
    });
    if (!res.ok) {
      let msg = "Upload failed";
      try { const j = await res.json(); msg = j.detail || msg; } catch { msg = await res.text(); }
      throw new Error(msg);
    }
    return res.json();
  },

  async deleteDocuments(token, projectId, documentIds) {
    const res = await fetch(`${BASE}/projects/${projectId}/documents`, {
      method: "DELETE",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async archiveDocuments(token, projectId, documentIds) {
    const res = await fetch(`${BASE}/projects/${projectId}/documents/archive`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async restoreDocuments(token, projectId, documentIds) {
    const res = await fetch(`${BASE}/projects/${projectId}/documents/restore`, {
      method: "POST",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ document_ids: documentIds }),
    });
    if (!res.ok) throw new Error(await res.text());
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

  async toggleStar(token, projectId) {
    const res = await fetch(`${BASE}/projects/${projectId}/star`, {
      method: "PATCH",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async toggleArchive(token, projectId) {
    const res = await fetch(`${BASE}/projects/${projectId}/archive`, {
      method: "PATCH",
      headers: authHeaders(token),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  async bulkUpdateProjects(token, projectIds, action) {
    const res = await fetch(`${BASE}/projects/bulk`, {
      method: "PATCH",
      headers: { ...authHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ project_ids: projectIds, action }),
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
      if (!res.ok) return { models: [], default: "gemini-3-flash" };
      return res.json();
    } catch {
      return { models: [], default: "gemini-3-flash" };
    }
  },
};
