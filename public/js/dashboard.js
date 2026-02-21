// Dashboard JavaScript
document.addEventListener("DOMContentLoaded", function () {
  console.log("Dashboard loading...");

  // Check authentication
  if (!APIUtils.isAuthenticated()) {
    console.log("Not authenticated, redirecting to login");
    window.location.href = "login.html";
    return;
  }

  // Initialize dashboard
  initDashboard();
});

async function initDashboard() {
  try {
    // Load user data
    await loadUserData();

    // Load contacts and stats
    await loadContacts();
    await loadContactStats();

    // Setup event listeners
    setupEventListeners();
    const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileForm = document.getElementById("editProfileForm");
const profileDetails = document.querySelector(".profile-details");

if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    const user = APIUtils.getUser();

    if (user) {
      document.getElementById("editFirstName").value = user.first_name || "";
      document.getElementById("editLastName").value = user.last_name || "";
      document.getElementById("editPhone").value = user.phone || "";
      document.getElementById("editAddress").value = user.address || "";
      document.getElementById("editTimezone").value = user.timezone || "";
    }

    profileDetails.style.display = "none";
    editProfileForm.style.display = "block";
  });
}

const cancelEditProfile = document.getElementById("cancelEditProfile");

if (cancelEditProfile) {
  cancelEditProfile.addEventListener("click", () => {
    editProfileForm.style.display = "none";
    profileDetails.style.display = "block";
  });
}



    // Initialize UI components
    initUIComponents();

    // Update UI with user data
    updateUIWithUserData();
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    APIUtils.showToast("Failed to load dashboard data", "error");

    // If authentication error, redirect to login
    if (
      error.message.includes("Session expired") ||
      error.message.includes("Unauthorized")
    ) {
      setTimeout(() => {
        window.location.href = "login.html";
      }, 2000);
    }
  }
}

async function loadUserData() {
  try {
    const user = APIUtils.getUser();

    // If we have user data in localStorage, that's good enough
    if (user && user.email) {
      console.log("User data loaded from localStorage");
      return user;
    }

    // Try to fetch fresh data if available
    try {
      const userData = await AuthAPI.getProfile();
      if (userData && user) {
        const updatedUser = { ...user, ...userData };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      }
    } catch (profileError) {
      console.warn("Could not fetch profile data:", profileError);
      // Use localStorage data as fallback
      return user;
    }

    return user;
  } catch (error) {
    console.error("Error loading user data:", error);
    throw error;
  }
}

async function loadContacts(params = {}, showLoadingOverlay = true) {
  try {
    if (showLoadingOverlay) {
      APIUtils.showLoading();
    }

    const response = await ContactsAPI.getAllContacts(params);
    // Handle both wrapped and unwrapped responses
    const contacts = Array.isArray(response)
      ? response
      : response.data || response.contacts || [];

    // Save to localStorage for recent contacts display
    localStorage.setItem("lastLoadedContacts", JSON.stringify(contacts));

    // Update UI
    updateContactsUI(contacts);
    updateContactCounts(contacts);

    return contacts;
  } catch (error) {
    console.error("Error loading contacts:", error);
    APIUtils.showToast("Failed to load contacts", "error");
    throw error;
  } finally {
    if (showLoadingOverlay) {
      APIUtils.hideLoading();
    }
  }
}

async function loadContactStats() {
  try {
    const stats = await ContactsAPI.getContactStats();

    // Update stats cards
    document.getElementById("totalContactsCount").textContent =
      stats.total || 0;
    document.getElementById("favoritesCount").textContent =
      stats.favorites || 0;
    document.getElementById("companiesCount").textContent =
      stats.companies || 0;
    document.getElementById("recentContactsCount").textContent =
      stats.recent || 0;

    // Update sidebar badges
    document.getElementById("contactsBadge").textContent = stats.total || 0;
    document.getElementById("favoritesBadge").textContent =
      stats.favorites || 0;
    document.getElementById("totalContacts").textContent = stats.total || 0;

    // Update storage progress (simulated)
    const storagePercent = Math.min(100, Math.floor((stats.total / 500) * 100));
    document.getElementById("storagePercent").textContent =
      `${storagePercent}%`;
    document.getElementById("storageProgress").style.width =
      `${storagePercent}%`;

    return stats;
  } catch (error) {
    console.error("Error loading contact stats:", error);
    throw error;
  }
}

function updateContactsUI(contacts) {
  const gridView = document.getElementById("contactsGrid");
  const tableView = document.getElementById("contactsTable");
  const tableBody = document.getElementById("contactsTableBody");
  const emptyState = document.getElementById("emptyState");

  // Clear existing content
  if (gridView) {
    gridView.innerHTML = "";
  }
  if (tableBody) {
    tableBody.innerHTML = "";
  }

  // Check if there are contacts
  if (contacts.length === 0) {
    if (gridView) gridView.style.display = "none";
    if (tableView) tableView.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
    return;
  }

  // Hide empty state
  if (emptyState) emptyState.style.display = "none";

  // Determine which view is active
  const tableViewActive = tableView && tableView.style.display === "block";

  if (tableViewActive && tableBody) {
    // Populate table view
    contacts.forEach((contact) => {
      const row = createContactTableRow(contact);
      tableBody.appendChild(row);
    });
    if (gridView) gridView.style.display = "none";
    if (tableView) tableView.style.display = "block";
  } else {
    // Populate grid view (default)
    contacts.forEach((contact) => {
      const card = createContactCard(contact);
      gridView.appendChild(card);
    });

    if (gridView) gridView.style.display = "grid";
    if (tableView) tableView.style.display = "none";
  }
}

function createContactCard(contact) {
  const card = document.createElement("div");
  card.className = "contact-card";
  card.dataset.contactId = contact.id;

  const initials = APIUtils.getInitials(contact.name);
  const phone = APIUtils.formatPhoneNumber(contact.phone);
  const tags = contact.tags ? contact.tags.split(",").slice(0, 3) : [];

  card.innerHTML = `
        <div class="contact-header">
            <div class="contact-avatar">
                ${initials}
            </div>
            <div class="contact-actions">
                <button class="favorite ${contact.is_favorite ? "active" : ""}">
                    <i class="fas fa-star"></i>
                </button>
                <button class="more-actions">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="contact-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
        <div class="contact-info">
            <h4>${contact.name}</h4>
            ${contact.company ? `<p><i class="fas fa-building"></i> ${contact.company}</p>` : ""}
            ${contact.job_title ? `<p><i class="fas fa-user-tie"></i> ${contact.job_title}</p>` : ""}
            ${phone ? `<p><i class="fas fa-phone"></i> ${phone}</p>` : ""}
            ${contact.email ? `<p><i class="fas fa-envelope"></i> ${contact.email}</p>` : ""}
        </div>
        ${
          tags.length > 0
            ? `
            <div class="contact-tags">
                ${tags.map((tag) => `<span class="tag">${tag.trim()}</span>`).join("")}
            </div>
        `
            : ""
        }
    `;

  // Add event listeners
  card.addEventListener("click", (e) => {
    if (!e.target.closest(".contact-actions")) {
      editContact(contact.id);
    }
  });

  const favoriteBtn = card.querySelector(".favorite");
  favoriteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await toggleFavorite(contact.id, favoriteBtn);
  });

  const editBtn = card.querySelector(".more-actions");
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    editContact(contact.id);
  });

const deleteBtn = card.querySelector(".contact-delete");

deleteBtn.addEventListener("click", async (e) => {
  e.stopPropagation();
  await deleteContact(contact.id);
});

  return card;
}

function createContactTableRow(contact) {
  const row = document.createElement("tr");
  row.dataset.contactId = contact.id;

  const phone = APIUtils.formatPhoneNumber(contact.phone);

  row.innerHTML = `
        <td><input type="checkbox" class="contact-checkbox"></td>
        <td>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <div class="contact-avatar" style="width: 32px; height: 32px; font-size: 0.75rem;">
                    ${APIUtils.getInitials(contact.name)}
                </div>
                <strong>${contact.name}</strong>
                ${contact.is_favorite ? '<i class="fas fa-star" style="color: #f59e0b;"></i>' : ""}
            </div>
        </td>
        <td>${phone || "-"}</td>
        <td>${contact.email || "-"}</td>
        <td>${contact.company || "-"}</td>
        <td>
            <div class="table-actions">
                <button class="icon-btn edit-btn" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="icon-btn favorite-btn ${contact.is_favorite ? "active" : ""}" title="Favorite">
                    <i class="fas fa-star"></i>
                </button>
                <button class="icon-btn delete-btn" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;

  // Add event listeners
  const editBtn = row.querySelector(".edit-btn");
  editBtn.addEventListener("click", () => editContact(contact.id));

  const favoriteBtn = row.querySelector(".favorite-btn");
  favoriteBtn.addEventListener("click", async () => {
    await toggleFavorite(contact.id, favoriteBtn);
  });

  const deleteBtn = row.querySelector(".delete-btn");
  deleteBtn.addEventListener("click", async (e) => {
    e.stopPropagation();
    await deleteContact(contact.id);
  });

  return row;
}

async function toggleFavorite(contactId, button) {
  try {

    if (button.disabled) return;
    button.disabled = true;

    await ContactsAPI.toggleFavorite(contactId);

    // Toggle star UI immediately
    button.classList.toggle("active");

    // 🔥 IMPORTANT: Reload sections properly
    const activeSection = document.querySelector(".content-section.active");

    if (activeSection?.id === "favoritesSection") {
      // If inside favorites → reload favorites
      await loadFavorites();
    } else {
      // Otherwise just reload contacts silently
      await loadContacts({}, false);
    }

    // Update stats
    loadContactStats().catch(console.error);

    APIUtils.showToast("Contact updated", "success");
  } catch (error) {
    console.error("Error toggling favorite:", error);
    APIUtils.showToast("Failed to update contact", "error");
  } finally {
    button.disabled = false;
  }
}

// ==========================================
// RECENT CONTACTS TRACKING (24-hour window)
// ==========================================

function trackRecentContact(contactId) {
  try {
    let recentContacts = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    const now = new Date().getTime();
    
    // Remove if already exists (to move to top)
    recentContacts = recentContacts.filter((item) => item.contactId !== contactId);
    
    // Add to beginning with timestamp
    recentContacts.unshift({
      contactId: contactId,
      timestamp: now,
    });
    
    // Keep only last 20 recent views
    recentContacts = recentContacts.slice(0, 20);
    
    localStorage.setItem("recentlyViewed", JSON.stringify(recentContacts));
  } catch (error) {
    console.error("Error tracking recent contact:", error);
  }
}

function getRecent24HourContacts(contacts) {
  try {
    const recentViewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    const now = new Date().getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    
    // Filter contacts viewed in last 24 hours
    const recent24h = recentViewed.filter(
      (item) => now - item.timestamp <= twentyFourHours
    );
    
    // Map to actual contact objects
    const recentContactIds = recent24h.map((item) => item.contactId);
    const recentContacts = contacts.filter((c) =>
      recentContactIds.includes(c.id)
    );
    
    // Sort by view timestamp (most recent first)
    return recentContacts.sort((a, b) => {
      const aIndex = recentContactIds.indexOf(a.id);
      const bIndex = recentContactIds.indexOf(b.id);
      return aIndex - bIndex;
    });
  } catch (error) {
    console.error("Error getting recent contacts:", error);
    return [];
  }
}

function getTimeSinceViewed(contactId) {
  try {
    const recentViewed = JSON.parse(localStorage.getItem("recentlyViewed") || "[]");
    const item = recentViewed.find((r) => r.contactId === contactId);
    
    if (!item) return "Never";
    
    const now = new Date().getTime();
    const diff = now - item.timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  } catch (error) {
    console.error("Error getting time since viewed:", error);
    return "Unknown";
  }
}

async function loadRecent24Hours() {
  try {
    APIUtils.showLoading();

    const response = await ContactsAPI.getAllContacts();
    const contacts = Array.isArray(response)
      ? response
      : response.data || response.contacts || [];

    // Get contacts viewed in last 24 hours
    const recent24h = getRecent24HourContacts(contacts);

    const recentContainer = document.getElementById("recent24Container");
    const recentEmptyState = document.getElementById("recent24EmptyState");

    if (!recentContainer) return;

    // Clear existing content
    recentContainer.innerHTML = "";

    if (recent24h.length === 0) {
      if (recentContainer) recentContainer.style.display = "none";
      if (recentEmptyState) recentEmptyState.style.display = "block";
      return;
    }

    // Hide empty state
    if (recentEmptyState) recentEmptyState.style.display = "none";
    if (recentContainer) recentContainer.style.display = "grid";

    // Populate recent contacts
    recent24h.forEach((contact) => {
      const card = createRecentContactCard(contact);
      recentContainer.appendChild(card);
    });

  } catch (error) {
    console.error("Error loading recent contacts:", error);
    APIUtils.showToast("Failed to load recent contacts", "error");
  } finally {
    APIUtils.hideLoading();
  }
}

function createRecentContactCard(contact) {
  const card = document.createElement("div");
  card.className = "recent-contact-card";
  card.dataset.contactId = contact.id;

  const initials = APIUtils.getInitials(contact.name);
  const phone = APIUtils.formatPhoneNumber(contact.phone);
  const timeSince = getTimeSinceViewed(contact.id);

  card.innerHTML = `
    <div class="recent-card-header">
      <div class="recent-card-avatar">
        ${initials}
      </div>
      <div class="recent-card-time">
        <i class="fas fa-clock"></i> ${timeSince}
      </div>
    </div>
    <div class="recent-card-info">
      <h4>${contact.name}</h4>
      ${contact.company ? `<p><i class="fas fa-building"></i> ${contact.company}</p>` : ""}
      ${phone ? `<p><i class="fas fa-phone"></i> ${phone}</p>` : ""}
    </div>
  `;

  card.addEventListener("click", async () => {
    await showContactDetailsModal(contact.id);
  });

  return card;
}

async function showContactDetailsModal(contactId) {
  try {
    // Track this contact as recently viewed
    trackRecentContact(contactId);
    
    // Fetch full contact details from API
    const contact = await ContactsAPI.getContact(contactId);
    
    // Create and display a detailed view modal
    const modal = document.createElement("div");
    modal.className = "contact-details-modal";
    modal.id = "contactDetailsModal";
    modal.innerHTML = `
      <div class="contact-details-overlay"></div>
      <div class="contact-details-content">
        <div class="contact-details-header">
          <div class="contact-details-avatar">
            ${APIUtils.getInitials(contact.name)}
          </div>
          <div class="contact-details-title">
            <h2>${contact.name}</h2>
            ${contact.company ? `<p class="company">${contact.company}</p>` : ""}
            ${contact.job_title ? `<p class="job">${contact.job_title}</p>` : ""}
          </div>
          <button class="close-details" id="closeDetails">
            <i class="fas fa-times"></i>
          </button>
        </div>
        
        <div class="contact-details-body">
          <div class="details-section">
            <h3>Contact Information</h3>
            <div class="details-list">
              ${contact.phone ? `
                <div class="detail-row">
                  <span class="detail-label"><i class="fas fa-phone"></i> Phone:</span>
                  <span class="detail-value">${APIUtils.formatPhoneNumber(contact.phone)}</span>
                </div>
              ` : ""}
              ${contact.email ? `
                <div class="detail-row">
                  <span class="detail-label"><i class="fas fa-envelope"></i> Email:</span>
                  <span class="detail-value"><a href="mailto:${contact.email}">${contact.email}</a></span>
                </div>
              ` : ""}
              ${contact.address ? `
                <div class="detail-row">
                  <span class="detail-label"><i class="fas fa-map-marker-alt"></i> Address:</span>
                  <span class="detail-value">${APIUtils.formatAddress(contact.address)}</span>
                </div>
              ` : ""}
              ${contact.birthday ? `
                <div class="detail-row">
                  <span class="detail-label"><i class="fas fa-birthday-cake"></i> Birthday:</span>
                  <span class="detail-value">${APIUtils.formatDate(contact.birthday)}</span>
                </div>
              ` : ""}
            </div>
          </div>

          ${contact.notes ? `
            <div class="details-section">
              <h3>Notes</h3>
              <div class="detail-row">
                <span class="detail-value">${contact.notes}</span>
              </div>
            </div>
          ` : ""}

          ${contact.tags ? `
            <div class="details-section">
              <h3>Tags</h3>
              <div class="tags-list">
                ${contact.tags.split(",").map((tag) => `<span class="tag">${tag.trim()}</span>`).join("")}
              </div>
            </div>
          ` : ""}
        </div>

        <div class="contact-details-footer">
          <button class="btn-secondary" id="closeDetailsBtn">Close</button>
          <button class="btn-primary" id="editDetailsBtn">
            <i class="fas fa-edit"></i> Edit Contact
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Add event listeners
    const closeBtn = modal.querySelector("#closeDetails");
    const closeBtnFooter = modal.querySelector("#closeDetailsBtn");
    const editBtn = modal.querySelector("#editDetailsBtn");
    const overlay = modal.querySelector(".contact-details-overlay");

    closeBtn?.addEventListener("click", () => {
      modal.remove();
    });

    closeBtnFooter?.addEventListener("click", () => {
      modal.remove();
    });

    editBtn?.addEventListener("click", () => {
      modal.remove();
      editContact(contactId);
    });

    overlay?.addEventListener("click", () => {
      modal.remove();
    });

  } catch (error) {
    console.error("Error loading contact details:", error);
    APIUtils.showToast("Failed to load contact details", "error");
  }
}

function editContact(contactId) {
  // Load contact data and switch to edit mode
  const contactCard = document.querySelector(
    `[data-contact-id="${contactId}"]`,
  );
  if (!contactCard) return;

  // Get contact info from card
  const contactName = contactCard.querySelector("h4").textContent;
  const contactPhone =
    contactCard
      .querySelector(".contact-info p:nth-child(3)")
      ?.textContent?.replace(/.*\s/, "") || "";
  const contactEmail =
    contactCard
      .querySelector(".contact-info p:nth-child(4)")
      ?.textContent?.replace(/.*\s/, "") || "";
  const contactCompany =
    contactCard
      .querySelector(".contact-info p:nth-child(2)")
      ?.textContent?.replace(/.*\s/, "") || "";

  // Populate form
  document.getElementById("contactId").value = contactId;
  document.getElementById("contactName").value = contactName;
  document.getElementById("contactPhone").value = contactPhone;
  document.getElementById("contactEmail").value = contactEmail;
  document.getElementById("contactCompany").value = contactCompany;

  // Update form title
  document.getElementById("contactFormTitle").textContent = "Edit Contact";
  document.getElementById("contactFormSubtitle").textContent =
    `Editing ${contactName}`;

  // Show form section
  showSection("addContactSection");
  updateBreadcrumb("Edit Contact");
}

async function deleteContact(contactId) {
  const confirmed = confirm("Are you sure you want to delete this contact?");
  if (!confirmed) return;

  // Find the contact element first
  const contactElement = document.querySelector(
    `[data-contact-id="${contactId}"]`,
  );

  try {
    // Fade out and remove immediately (optimistic update)
    if (contactElement) {
      contactElement.style.opacity = "0";
      contactElement.style.transform = "scale(0.95)";
      contactElement.style.transition = "all 0.2s ease";
      
      setTimeout(() => {
        if (contactElement.parentElement) {
          contactElement.remove();
        }
      }, 200);
    }

    // Delete from backend
    await ContactsAPI.deleteContact(contactId);
    
    // Show success toast message
    setTimeout(() => {
      APIUtils.showToast("Contact deleted successfully", "success");
    }, 250);
    
    // Refresh stats in background without blocking
    setTimeout(() => {
      loadContactStats().catch(console.error);
    }, 500);
    
  } catch (error) {
    console.error("Error deleting contact:", error);
    
    // Show error message
    APIUtils.showToast("Contact deleted successfully", "success");
    
    // Restore element on error
    if (contactElement) {
      contactElement.style.opacity = "1";
      contactElement.style.transform = "scale(1)";
    }
  }
}

function updateContactCounts(contacts) {
  const total = contacts.length;
  const favorites = contacts.filter((c) => c.is_favorite).length;

  // Update UI elements if they exist
  const totalEl = document.getElementById("totalContactsCount");
  const favoritesEl = document.getElementById("favoritesCount");

  if (totalEl) totalEl.textContent = total;
  if (favoritesEl) favoritesEl.textContent = favorites;
}

function updateUIWithUserData() {
  const user = APIUtils.getUser();
  if (!user) return;

  // Update sidebar
  const userNameEl = document.getElementById("userName");
  const userEmailEl = document.getElementById("userEmail");
  const userRoleEl = document.getElementById("userRole");

  if (userNameEl)
    userNameEl.textContent =
      `${user.first_name} ${user.last_name}` || user.email;
  if (userEmailEl) userEmailEl.textContent = user.email;
  if (userRoleEl) userRoleEl.textContent = user.role || "User";

  // Update profile section
  const profileNameEl = document.getElementById("profileName");
  const profileEmailEl = document.getElementById("profileEmail");
  const profileRoleEl = document.getElementById("profileRole");
  const userIdEl = document.getElementById("userId");
  const memberSinceEl = document.getElementById("memberSince");
  const profilePhoneEl = document.getElementById("profilePhone");
  const profileAddressEl = document.getElementById("profileAddress");
  const profileTimezoneEl = document.getElementById("profileTimezone");

  if (profileNameEl)
    profileNameEl.textContent =
      `${user.first_name} ${user.last_name}` || user.email;
  if (profileEmailEl) profileEmailEl.textContent = user.email;
  if (profileRoleEl) profileRoleEl.textContent = user.role || "User";
  if (userIdEl) userIdEl.textContent = user.id;
  if (memberSinceEl && user.created_at) {
    memberSinceEl.textContent = APIUtils.formatDate(user.created_at);
  }
  if (profilePhoneEl) profilePhoneEl.textContent = user.phone || "-";
  if (profileAddressEl) profileAddressEl.textContent = user.address || "-";
  if (profileTimezoneEl) profileTimezoneEl.textContent = user.timezone || "-";
  
  if (profileAddressEl) {
    profileAddressEl.value = user.address || "";

    // Auto-save address with debounce on input and immediate save on blur
    const saveProfileAddress = async () => {
      try {
        const newAddress = profileAddressEl.value.trim();
        await UsersAPI.updateUser(user.id, { address: newAddress });
        APIUtils.updateUserInStorage({ address: newAddress });
        APIUtils.showToast("Address updated", "success");
      } catch (error) {
        console.error("Error updating address:", error);
        APIUtils.showToast("Failed to save address", "error");
      }
    };

    const debouncedSave = APIUtils.debounce(saveProfileAddress, 800);

    profileAddressEl.addEventListener("input", debouncedSave);
    profileAddressEl.addEventListener("blur", saveProfileAddress);
  }

  // Update avatar if present
  if (user.avatar_url) {
    // Ensure avatar URL is absolute (points to API server) so it loads when frontend
    const base = API_BASE_URL.replace("/api", "");
    const avatarUrl = user.avatar_url.startsWith("http")
      ? user.avatar_url
      : `${base}${user.avatar_url}`;
    updateAvatarDisplay(avatarUrl);
    // Persist absolute URL back to storage for future loads
    user.avatar_url = avatarUrl;
    APIUtils.updateUserInStorage(user);
  }
}

function setupEventListeners() {
  // Sidebar toggle
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.querySelector(".sidebar");

  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }

  // Navigation
  const navItems = document.querySelectorAll(".nav-item[data-section]");
  navItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();

      // Remove active class from all items
      navItems.forEach((nav) => nav.classList.remove("active"));

      // Add active class to clicked item
      item.classList.add("active");

      // Show corresponding section
      const sectionId = item.dataset.section + "Section";
      showSection(sectionId);

      // Update breadcrumb and title
      updateBreadcrumb(item.querySelector("span").textContent);
    });
  });

  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const confirmLogout = confirm("Are you sure you want to logout?");
      if (!confirmLogout) return;

      try {
        APIUtils.showLoading();
        await AuthAPI.logout();
      } catch (error) {
        console.error("Logout failed:", error);
        APIUtils.showToast("Failed to logout", "error");
      } finally {
        APIUtils.hideLoading();
      }
    });
  }

  // View toggle
  const viewToggle = document.getElementById("viewToggle");
  const viewIcon = document.getElementById("viewIcon");

  if (viewToggle && viewIcon) {
    viewToggle.addEventListener("click", () => {
      const gridView = document.getElementById("contactsGrid");
      const tableView = document.getElementById("contactsTable");

      if (gridView && tableView) {
        if (gridView.style.display !== "none") {
          // Switch to table view with smooth fade
          gridView.style.opacity = "0";
          setTimeout(() => {
            gridView.style.display = "none";
            tableView.style.display = "block";
            tableView.style.opacity = "0";
            setTimeout(() => {
              tableView.style.opacity = "1";
            }, 10);
          }, 200);
          tableView.classList.add("active");
          viewIcon.classList.remove("fa-th-large");
          viewIcon.classList.add("fa-list");
        } else {
          // Switch to grid view with smooth fade
          tableView.style.opacity = "0";
          setTimeout(() => {
            tableView.style.display = "none";
            gridView.style.display = "grid";
            gridView.style.opacity = "0";
            setTimeout(() => {
              gridView.style.opacity = "1";
            }, 10);
          }, 200);
          tableView.classList.remove("active");
          viewIcon.classList.remove("fa-list");
          viewIcon.classList.add("fa-th-large");
        }
      }
    });
  }

  // Add contact button
  const addContactBtn = document.getElementById("addContactBtn");
  if (addContactBtn) {
    addContactBtn.addEventListener("click", () => {
      showSection("addContactSection");
      resetContactForm();
      updateBreadcrumb("Add Contact");
    });
  }

  // Back to contacts button
  const backToContactsBtn = document.getElementById("backToContacts");
  if (backToContactsBtn) {
    backToContactsBtn.addEventListener("click", () => {
      showSection("contactsSection");
      updateBreadcrumb("Contacts");
    });
  }

  // Contact form
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveContact();
    });
  }

  // Cancel contact button
  const cancelContactBtn = document.getElementById("cancelContact");
  if (cancelContactBtn) {
    cancelContactBtn.addEventListener("click", () => {
      showSection("contactsSection");
      updateBreadcrumb("Contacts");
    });
  }

  // Search functionality
  const searchInput = document.getElementById("searchInput");
  const searchResults = document.getElementById("searchResults");
  
  if (searchInput && searchResults) {
    const debouncedSearch = APIUtils.debounce(async (query) => {
      if (query.length >= 2) {
        try {
          // Show search results in dropdown
          const response = await ContactsAPI.searchContacts(query);
          const results = Array.isArray(response)
            ? response
            : response.data || response.contacts || [];

          if (results.length > 0) {
            searchResults.innerHTML = results
              .map(
                (contact) => `
              <div class="search-result-item" data-contact-id="${contact.id}">
                <div class="search-result-avatar">
                  ${APIUtils.getInitials(contact.name)}
                </div>
                <div class="search-result-info">
                  <div class="search-result-name">${contact.name}</div>
                  <div class="search-result-meta">
                    ${contact.phone ? `<span><i class="fas fa-phone"></i> ${APIUtils.formatPhoneNumber(contact.phone)}</span>` : ""}
                    ${contact.company ? `<span><i class="fas fa-building"></i> ${contact.company}</span>` : ""}
                  </div>
                </div>
              </div>
            `
              )
              .join("");
            searchResults.classList.add("show");

            // Add click handlers to search results
            document.querySelectorAll(".search-result-item").forEach((item) => {
              item.addEventListener("click", async (e) => {
                e.preventDefault();
                const contactId = item.dataset.contactId;
                searchInput.value = "";
                searchResults.innerHTML = "";
                searchResults.classList.remove("show");
                
                // Show full contact details
                await showContactDetails(contactId);
              });
            });
          } else {
            searchResults.innerHTML = '<div class="search-result-empty">No contacts found</div>';
            searchResults.classList.add("show");
          }
        } catch (error) {
          console.error("Search error:", error);
          searchResults.innerHTML = '<div class="search-result-empty">Search error</div>';
          searchResults.classList.add("show");
        }
      } else if (query.length === 0) {
        searchResults.innerHTML = "";
        searchResults.classList.remove("show");
      }
    }, 300);

    searchInput.addEventListener("input", (e) => {
      debouncedSearch(e.target.value);
    });

    // Close search results when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-box-wrapper")) {
        searchResults.classList.remove("show");
        searchResults.innerHTML = "";
      }
    });
  }

  // Clear search button
  const clearSearchBtn = document.getElementById("clearSearch");
  if (clearSearchBtn) {
    clearSearchBtn.addEventListener("click", () => {
      if (searchInput) searchInput.value = "";
      loadContacts({}, false);
    });
  }

  // Filter badges with debouncing
  const filterBadges = document.querySelectorAll(".filter-badge");
  let filterDebounceTimer;
  
  filterBadges.forEach((badge) => {
    badge.addEventListener("click", async (e) => {
      e.preventDefault();
      
      // Clear previous debounce timer
      clearTimeout(filterDebounceTimer);
      
      // Debounce the filter by 150ms to prevent rapid successive calls
      filterDebounceTimer = setTimeout(async () => {
        // Remove active class from all badges
        filterBadges.forEach((b) => b.classList.remove("active"));

        // Add active class to clicked badge
        badge.classList.add("active");

        // Apply filter
        const filter = badge.dataset.filter;
        let params = {};

        switch (filter) {
          case "favorites":
            params.isFavorite = true;
            break;
          case "recent":
            // Last 7 days
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            break;
          default:
            // All contacts
            break;
        }

        await loadContacts(params, false);
      }, 150);
    });
  });

  // Refresh contacts button
  const refreshBtn = document.getElementById("refreshContacts");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      refreshBtn.disabled = true;
      await loadContactStats();
      APIUtils.showToast("Contacts refreshed", "success");
      refreshBtn.disabled = false;
    });
  }



  // Profile edit button
  const editProfileBtn = document.getElementById("editProfileBtn");
  const editProfileForm = document.getElementById("editProfileForm");
  const profileDetails = document.querySelector(".profile-details");

  if (editProfileBtn) {
    editProfileBtn.addEventListener("click", () => {
      // Populate form with current data
      const user = APIUtils.getUser();
      if (user) {
        document.getElementById("editFirstName").value = user.first_name || "";
        document.getElementById("editLastName").value = user.last_name || "";
        document.getElementById("editPhone").value = user.phone || "";
        document.getElementById("editAddress").value = user.address || "";
        document.getElementById("editTimezone").value = user.timezone || "UTC";
      }

      // Hide profile details and show edit form
      if (profileDetails) profileDetails.style.display = "none";
      if (editProfileForm) editProfileForm.style.display = "block";
    });
  }

  // Edit phone button
  const editPhoneBtn = document.getElementById("editPhoneBtn");
  if (editPhoneBtn) {
    editPhoneBtn.addEventListener("click", () => {
      // Populate form with current data and scroll to edit form
      const user = APIUtils.getUser();
      if (user) {
        document.getElementById("editFirstName").value = user.first_name || "";
        document.getElementById("editLastName").value = user.last_name || "";
        document.getElementById("editPhone").value = user.phone || "";
        document.getElementById("editAddress").value = user.address || "";
        document.getElementById("editTimezone").value = user.timezone || "UTC";
      }

      // Hide profile details and show edit form
      if (profileDetails) profileDetails.style.display = "none";
      if (editProfileForm) {
        editProfileForm.style.display = "block";
        editProfileForm.scrollIntoView({ behavior: "smooth" });
      }
    });
  }

  // Cancel edit profile button
  const cancelEditProfileBtn = document.getElementById("cancelEditProfile");
  if (cancelEditProfileBtn) {
    cancelEditProfileBtn.addEventListener("click", () => {
      if (profileDetails) profileDetails.style.display = "block";
      if (editProfileForm) editProfileForm.style.display = "none";
    });
  }

  // Save profile form
  const editProfileFormEl = document.getElementById("editProfileForm");
  if (editProfileFormEl) {
    editProfileFormEl.addEventListener("submit", async (e) => {
      e.preventDefault();

      try {
        APIUtils.showLoading();

        const userData = {
          first_name: document.getElementById("editFirstName").value,
          last_name: document.getElementById("editLastName").value,
          phone: document.getElementById("editPhone").value,
          address: document.getElementById("editAddress").value,
          timezone: document.getElementById("editTimezone").value,
        };

        await UsersAPI.updateUser(APIUtils.getUser().id, userData);

        // Update localStorage
        APIUtils.updateUserInStorage(userData);
        updateUIWithUserData();

        APIUtils.showToast("Profile updated successfully", "success");

        // Hide edit form and show details
        if (profileDetails) profileDetails.style.display = "block";
        if (editProfileForm) editProfileForm.style.display = "none";
      } catch (error) {
        console.error("Error updating profile:", error);
        APIUtils.showToast("Failed to update profile", "error");
      } finally {
        APIUtils.hideLoading();
      }
    });
  }

  // Avatar upload
  const avatarUploadBtn = document.getElementById("avatarUploadBtn");
  if (avatarUploadBtn) {
    // Create hidden file input if it doesn't exist
    let fileInput = document.getElementById("avatarFileInput");
    if (!fileInput) {
      fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.id = "avatarFileInput";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      document.body.appendChild(fileInput);
    }

    avatarUploadBtn.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        APIUtils.showToast("File size must be less than 5MB", "error");
        return;
      }

      // Validate file type
      if (!file.type.startsWith("image/")) {
        APIUtils.showToast("Please select an image file", "error");
        return;
      }

      try {
        APIUtils.showLoading();

        const user = APIUtils.getUser();
        const data = await UsersAPI.uploadAvatar(user.id, file);

        // Update avatar in UI
        if (data && data.avatar_url) {
          // Ensure absolute URL so image loads correctly from frontend
          const base = API_BASE_URL.replace("/api", "");
          const avatarFull = data.avatar_url.startsWith("http")
            ? data.avatar_url
            : `${base}${data.avatar_url}`;
          updateAvatarDisplay(avatarFull);

          // Update user in localStorage with new avatar_url
          user.avatar_url = avatarFull;
          APIUtils.updateUserInStorage(user);

          APIUtils.showToast("Profile picture updated successfully", "success");
        } else {
          throw new Error("No avatar URL returned from server");
        }

        // Reset file input
        fileInput.value = "";
      } catch (error) {
        console.error("Error uploading avatar:", error);
        APIUtils.showToast(
          "Failed to upload profile picture: " + error.message,
          "error",
        );
      } finally {
        APIUtils.hideLoading();
      }
    });
  }
}

function showSection(sectionId) {
  // Handle data-section to sectionId mapping
  const sectionMap = {
    contacts: "contactsSection",
    "add-contact": "addContactSection",
    profile: "profileSection",
    settings: "settingsSection",
    favorites: "favoritesSection",
    recent24: "recent24Section",
  };

  // If sectionId is a data-section value, map it
  const actualSectionId = sectionMap[sectionId] || sectionId;

  // Hide all sections
  const sections = document.querySelectorAll(".content-section");
  sections.forEach((section) => {
    section.style.display = "none";
    section.classList.remove("active");
  });

  // Show target section
  const targetSection = document.getElementById(actualSectionId);
  if (targetSection) {
    targetSection.style.display = "block";
    targetSection.classList.add("active");
  }

  // Update section title
  const sectionTitle = document.getElementById("sectionTitle");
  const sectionDescription = document.getElementById("sectionDescription");

  if (sectionTitle && sectionDescription) {
    switch (actualSectionId) {
      case "contactsSection":
        sectionTitle.textContent = "Contacts";
        sectionDescription.textContent =
          "Manage all your contacts in one place";
        break;
      case "addContactSection":
        sectionTitle.textContent =
          document.getElementById("contactFormTitle")?.textContent ||
          "Add Contact";
        sectionDescription.textContent =
          document.getElementById("contactFormSubtitle")?.textContent ||
          "Add a new contact";
        break;
      case "profileSection":
        sectionTitle.textContent = "Profile";
        sectionDescription.textContent = "Manage your account information";
        break;
      case "settingsSection":
        sectionTitle.textContent = "Settings";
        sectionDescription.textContent = "Customize your application settings";
        break;
      case "favoritesSection":
        sectionTitle.textContent = "Favorites";
        sectionDescription.textContent = "Your most important contacts";
        loadFavorites();
        break;
    }
  }
}

function updateBreadcrumb(title) {
  const breadcrumbTitle = document.getElementById("breadcrumbTitle");
  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = title;
  }
}

function resetContactForm() {
  const form = document.getElementById("contactForm");
  if (form) {
    form.reset();
    document.getElementById("contactId").value = "";
    document.getElementById("contactFormTitle").textContent = "Add New Contact";
    document.getElementById("contactFormSubtitle").textContent =
      "Fill in the details";
  }
  populateRecentContacts();
}

function populateRecentContacts() {
  try {
    // Get current contacts from localStorage or fetch
    const contactsStr = localStorage.getItem("lastLoadedContacts");
    const contacts = contactsStr ? JSON.parse(contactsStr) : [];

    const recentList = document.getElementById("recentContactsList");
    if (!recentList) return;

    // Get last 5 contacts
    const recentContacts = contacts.slice(0, 5);

    if (recentContacts.length === 0) {
      recentList.innerHTML = '<p class="empty-state">No recent contacts</p>';
      return;
    }

    recentList.innerHTML = recentContacts
      .map(
        (contact) => `
            <div class="recent-contact-item" data-contact-id="${contact.id}">
                <div class="recent-contact-info">
                    <h4>${contact.name || "Unknown"}</h4>
                    <p><i class="fas fa-phone"></i> ${contact.phone || "N/A"}</p>
                    ${contact.company ? `<p><i class="fas fa-building"></i> ${contact.company}</p>` : ""}
                </div>
                <div class="recent-contact-actions">
                    <button class="icon-btn" onclick="editContact('${contact.id}')" title="Edit">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="icon-btn" onclick="deleteContact('${contact.id}')" title="Delete">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `,
      )
      .join("");
  } catch (error) {
    console.error("Error populating recent contacts:", error);
  }
}

function updateAvatarDisplay(avatarUrl) {
  try {
    // Update profile avatar
    const profileAvatar = document.querySelector(".profile-avatar");
    if (profileAvatar) {
      profileAvatar.style.backgroundImage = `url('${avatarUrl}')`;
      profileAvatar.style.backgroundSize = "cover";
      profileAvatar.style.backgroundPosition = "center";
      profileAvatar.style.backgroundRepeat = "no-repeat";
      profileAvatar.style.backgroundColor = "transparent";
      // Hide icon if image is present
      const icon = profileAvatar.querySelector("i");
      if (icon) {
        icon.style.display = "none";
      }
    }

    // Update sidebar avatar
    const userAvatar = document.querySelector(".user-avatar");
    if (userAvatar) {
      userAvatar.style.backgroundImage = `url('${avatarUrl}')`;
      userAvatar.style.backgroundSize = "cover";
      userAvatar.style.backgroundPosition = "center";
      userAvatar.style.backgroundRepeat = "no-repeat";
      userAvatar.style.backgroundColor = "transparent";
      // Hide icon if image is present
      const icon = userAvatar.querySelector("i");
      if (icon) {
        icon.style.display = "none";
      }
    }

    // Update user data in localStorage
    const user = APIUtils.getUser();
    if (user) {
      user.avatar_url = avatarUrl;
      APIUtils.updateUserInStorage(user);
    }
  } catch (error) {
    console.error("Error updating avatar display:", error);
  }
}

async function saveContact() {
  try {
    // Prevent multiple rapid submissions
    const submitBtn = document.querySelector("#contactForm button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = true;
    }

    // Helper to safely read values from optional form fields
    const getVal = (id) => {
      const el = document.getElementById(id);
      return el ? el.value.trim() : "";
    };

    // Build contact data with only available form fields, exclude empty optional fields
    const formData = {
      name: getVal("contactName"),
      phone: getVal("contactPhone"),
    };

    // Add optional fields only if they have a value
    const email = getVal("contactEmail");
    if (email) formData.email = email;

    const birthday = getVal("contactBirthday");
    if (birthday) formData.birthday = birthday;

    const company = getVal("contactCompany");
    if (company) formData.company = company;

    const job_title = getVal("contactJobTitle");
    if (job_title) formData.job_title = job_title;

    const address = getVal("contactAddress");
    if (address) formData.address = address;

    const notes = getVal("contactNotes");
    if (notes) formData.notes = notes;

    const contactIdEl = document.getElementById("contactId");
    const contactId = contactIdEl ? contactIdEl.value : "";

    let response;
    if (contactId) {
      // Update existing contact
      response = await ContactsAPI.updateContact(contactId, formData);
      APIUtils.showToast("Contact updated successfully", "success");
    } else {
      // Create new contact
      response = await ContactsAPI.createContact(formData);
      APIUtils.showToast("Contact created successfully", "success");
    }

    // Reset form and go back to contacts
    resetContactForm();
    showSection("contactsSection");
    updateBreadcrumb("Contacts");

    // Refresh contacts list and stats (non-blocking, no loading overlay)
    loadContacts({}, false).catch(console.error);
    loadContactStats().catch(console.error);
  } catch (error) {
    console.error("Error saving contact:", error);
    APIUtils.showToast("Failed to save contact: " + error.message, "error");
  } finally {
    const submitBtn = document.querySelector("#contactForm button[type='submit']");
    if (submitBtn) {
      submitBtn.disabled = false;
    }
  }
}

function initUIComponents() {
  // Initialize tooltips
  const tooltips = document.querySelectorAll("[title]");
  tooltips.forEach((element) => {
    element.addEventListener("mouseenter", (e) => {
      const tooltip = document.createElement("div");
      tooltip.className = "tooltip";
      tooltip.textContent = e.target.title;
      document.body.appendChild(tooltip);

      const rect = e.target.getBoundingClientRect();
      tooltip.style.top = `${rect.top - tooltip.offsetHeight - 10}px`;
      tooltip.style.left = `${rect.left + (rect.width - tooltip.offsetWidth) / 2}px`;

      e.target.dataset.tooltipId = tooltip.id;
    });

    element.addEventListener("mouseleave", (e) => {
      const tooltip = document.querySelector(`#${e.target.dataset.tooltipId}`);
      if (tooltip) {
        tooltip.remove();
      }
    });
  });

  // Initialize date picker
  const dateInputs = document.querySelectorAll('input[type="date"]');
  dateInputs.forEach((input) => {
    // Set max date to today
    input.max = new Date().toISOString().split("T")[0];
  });
}

// Add CSS for tooltips
const tooltipStyle = document.createElement("style");
tooltipStyle.textContent = `
    .tooltip {
        position: fixed;
        background: var(--gray-900);
        color: white;
        padding: 0.5rem 0.75rem;
        border-radius: var(--border-radius);
        font-size: 0.75rem;
        z-index: 9999;
        pointer-events: none;
        white-space: nowrap;
        animation: fadeIn 0.2s ease;
    }
    
    .tooltip:before {
        content: '';
        position: absolute;
        bottom: -5px;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px 5px 0;
        border-style: solid;
        border-color: var(--gray-900) transparent transparent;
    }
`;
document.head.appendChild(tooltipStyle);

// Initialize favorites section
document.addEventListener("DOMContentLoaded", function () {
  // Load favorites when section is shown
  const favoritesBtn = document.querySelector(
    '.nav-item[data-section="favorites"]',
  );
  if (favoritesBtn) {
    favoritesBtn.addEventListener("click", loadFavorites);
  }

  // Browse contacts button in favorites empty state
  const browseContactsBtn = document.getElementById("browseContactsBtn");
  if (browseContactsBtn) {
    browseContactsBtn.addEventListener("click", () => {
      showSection("contactsSection");
      updateBreadcrumb("Contacts");
      const navItems = document.querySelectorAll(".nav-item");
      navItems.forEach((item) => item.classList.remove("active"));
      const contactsNavItem = document.querySelector(
        '.nav-item[data-section="contacts"]',
      );
      if (contactsNavItem) contactsNavItem.classList.add("active");
    });
  }
});

async function loadFavorites() {
  try {
    APIUtils.showLoading();

    const response = await ContactsAPI.getAllContacts({ isFavorite: true });
    const favorites = Array.isArray(response)
      ? response
      : response.data || response.contacts || [];

    const favoritesContainer = document.getElementById("favoritesContainer");
    const favoritesEmptyState = document.getElementById("favoritesEmptyState");

    if (!favoritesContainer) return;

    // Clear existing content
    favoritesContainer.innerHTML = "";

    if (favorites.length === 0) {
      if (favoritesContainer) favoritesContainer.style.display = "none";
      if (favoritesEmptyState) favoritesEmptyState.style.display = "block";
      return;
    }

    // Hide empty state
    if (favoritesEmptyState) favoritesEmptyState.style.display = "none";
    if (favoritesContainer) favoritesContainer.style.display = "grid";

    // Populate favorites
    favorites.forEach((contact) => {
      const card = createContactCard(contact);
      favoritesContainer.appendChild(card);
    });

    // Update favorites stats
    document.getElementById("favoritesTotal").textContent = favorites.length;

    const companies = new Set(favorites.map((c) => c.company).filter(Boolean));
    document.getElementById("favoritesCompanies").textContent = companies.size;
  } catch (error) {
    console.error("Error loading favorites:", error);
    APIUtils.showToast("Failed to load favorites", "error");
  } finally {
    APIUtils.hideLoading();
  }
}

// Export dashboard functions
window.initDashboard = initDashboard;
window.loadContacts = loadContacts;
window.loadContactStats = loadContactStats;
