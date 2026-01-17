(() => {
  const API_BASE = "https://places-to-visit-server.onrender.com";
  const section = document.querySelector(".comments-section");
  if (!section) {
    return;
  }

  const accordion = section.querySelector(".comments-accordion");
  const form = section.querySelector(".comments-form");
  const nameInput = section.querySelector("#comment-name");
  const commentInput = section.querySelector("#comment-text");
  const list = section.querySelector(".comments-list");
  const emptyMessage = section.querySelector(".comments-empty");
  const errorMessage = section.querySelector(".comments-error");
  const submitBtn = form ? form.querySelector("button") : null;
  const honeypotInput = form
    ? form.querySelector('input[name="website"]')
    : null;
  const formStartTime = Date.now();
  const commentKey =
    section.getAttribute("data-comment-key") || window.location.pathname;
  const sessionIdsKey = `comments:own:${commentKey}`;
  const accordionStateKey = `comments:accordion:${commentKey}`;
  const loadAccordionState = () => {
    try {
      return sessionStorage.getItem(accordionStateKey) === "open";
    } catch (error) {
      return false;
    }
  };
  const saveAccordionState = (isOpen) => {
    try {
      sessionStorage.setItem(accordionStateKey, isOpen ? "open" : "closed");
    } catch (error) {
      // ignore storage issues
    }
  };
  const loadOwnIds = () => {
    try {
      const raw = sessionStorage.getItem(sessionIdsKey);
      const parsed = JSON.parse(raw || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };
  const saveOwnIds = (ids) => {
    sessionStorage.setItem(sessionIdsKey, JSON.stringify(ids));
  };

  const setError = (message) => {
    if (!errorMessage) {
      return;
    }
    errorMessage.textContent = message || "";
  };

  const formatDate = (isoDate) => {
    if (!isoDate) {
      return "";
    }
    try {
      const date = new Date(isoDate);
      if (Number.isNaN(date.getTime())) {
        return "";
      }
      return date.toLocaleDateString();
    } catch (error) {
      return "";
    }
  };

  const renderComments = (comments) => {
    const safeComments = Array.isArray(comments) ? comments : [];
    const ownIds = new Set(loadOwnIds());
    list.querySelectorAll(".comments-item").forEach((item) => item.remove());

    if (!safeComments.length) {
      if (emptyMessage) {
        emptyMessage.style.display = "block";
      }
      return;
    }

    if (emptyMessage) {
      emptyMessage.style.display = "none";
    }

    safeComments.forEach((comment) => {
      const item = document.createElement("div");
      item.className = "comments-item";

      const meta = document.createElement("div");
      meta.className = "comments-meta";
      meta.textContent = `${comment.name || "Anonymous"} - ${formatDate(comment.createdAt)}`;

      const text = document.createElement("p");
      text.className = "comments-text";
      text.textContent = comment.text || "";

      item.appendChild(meta);
      item.appendChild(text);

      if (comment.id && ownIds.has(comment.id)) {
        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "comments-delete";
        deleteBtn.textContent = "Erase Your Comment";
        deleteBtn.addEventListener("click", () => {
          deleteComment(comment.id, deleteBtn);
        });
        item.appendChild(deleteBtn);
      }
      list.appendChild(item);
    });
  };

  if (accordion) {
    accordion.open = loadAccordionState();
    accordion.addEventListener("toggle", () => {
      saveAccordionState(accordion.open);
    });
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(
        `${API_BASE}/api/comments?key=${encodeURIComponent(commentKey)}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to load comments.");
      }
      const payload = await response.json();
      renderComments(payload.comments || []);
    } catch (error) {
      setError("Unable to load comments right now.");
    }
  };

  const postComment = async () => {
    if (!nameInput || !commentInput) {
      return;
    }

    if (Date.now() - formStartTime < 1500) {
      setError("Please wait a moment before posting.");
      return;
    }

    if (honeypotInput && honeypotInput.value.trim()) {
      return;
    }

    const name = nameInput.value.trim();
    const text = commentInput.value.trim();

    if (!text) {
      setError("Please write a comment before posting.");
      return;
    }

    setError("");
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    try {
      if (accordion) {
        accordion.open = true;
        saveAccordionState(true);
      }
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          key: commentKey,
          name,
          comment: text,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to post comment.");
      }

      const payload = await response.json();
      const createdId = payload.createdId;
      if (createdId) {
        const existing = loadOwnIds();
        if (!existing.includes(createdId)) {
          existing.unshift(createdId);
          saveOwnIds(existing);
        }
      }
      renderComments(payload.comments || []);
      commentInput.value = "";
    } catch (error) {
      setError("Unable to post comment right now.");
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
      }
    }
  };

  if (form && submitBtn) {
    submitBtn.addEventListener("click", postComment);
  }

  fetchComments();

  const deleteComment = async (id, buttonEl) => {
    if (!id) {
      return;
    }

    setError("");
    if (buttonEl) {
      buttonEl.disabled = true;
    }

    try {
      if (accordion) {
        accordion.open = true;
        saveAccordionState(true);
      }
      const response = await fetch(`${API_BASE}/api/comments`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          key: commentKey,
          id,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete comment.");
      }

      const payload = await response.json();
      const existing = loadOwnIds().filter((item) => item !== id);
      saveOwnIds(existing);
      renderComments(payload.comments || []);
    } catch (error) {
      setError("Unable to delete comment right now.");
      if (buttonEl) {
        buttonEl.disabled = false;
      }
    }
  };
})();
