// Search functionality
document.addEventListener("DOMContentLoaded", function () {
  if (!APIUtils.isAuthenticated()) return;
  initSearch();
});

// Debounce timer
let searchDebounceTimer = null;
let lastSearchQuery = null;
let isSearching = false;

function initSearch() {
  const searchInput = document.getElementById("searchInput");
  const clearBtn = document.getElementById("clearSearch");

  if (!searchInput) return;

  let debounceTimer = null;

  // 🔍 Live search (debounced)
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      const query = searchInput.value.trim();

      if (query.length === 0) {
        hideSearchResults();
        return;
      }

      performSearch(query); // your existing search logic
    }, 300);
  });


  
  // 🚫 HARD BLOCK ENTER (THIS FIXES THE BLINK)
  searchInput.addEventListener(
    "keydown",
    (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        return false;
      }

      if (e.key === "Escape") {
        hideSearchResults();
      }
    },
    true // 👈 CAPTURE PHASE (VERY IMPORTANT)
  );

  // ❌ Clear search
  clearBtn?.addEventListener("click", () => {
    searchInput.value = "";
    hideSearchResults();
  });
}


// ===============================
// SEARCH API
// ===============================
async function performSearch(query) {
  if (query.length < 2) {
    hideSearchResults();
    return;
  }

  // Prevent duplicate searches
  if (query === lastSearchQuery || isSearching) {
    return;
  }

  lastSearchQuery = query;
  isSearching = true;

  try {
    const response = await ContactsAPI.searchContacts(query);
    displaySearchResults(response.data || [], query);
  } catch (error) {
    console.error("Search error:", error);
    APIUtils.showToast("Search failed", "error");
  } finally {
    isSearching = false;
  }
}

// ===============================
// RENDER RESULTS
// ===============================
function displaySearchResults(contacts, query) {
  const searchResults = document.getElementById("searchResults");
  if (!searchResults) return;

  // Use requestAnimationFrame to batch DOM updates
  requestAnimationFrame(() => {
    const htmlContent = !contacts.length 
      ? `
        <div class="search-result-empty">
          <i class="fas fa-search"></i>
          <p>No contacts found for "${query}"</p>
        </div>
      `
      : contacts.slice(0, 10).map(contact => `
        <div class="search-result-item" data-contact-id="${contact.id}">
          <div class="search-result-avatar">${APIUtils.getInitials(contact.name)}</div>
          <div class="search-result-info">
            <div class="search-result-name">${contact.name}</div>
            ${contact.phone ? `<div class="search-result-phone">${APIUtils.formatPhoneNumber(contact.phone)}</div>` : ""}
            ${contact.company ? `<div class="search-result-company">${contact.company}</div>` : ""}
          </div>
        </div>
      `).join("") + (contacts.length > 10 ? `
        <div class="search-result-more">
          <a href="#" id="viewAllResults">View all ${contacts.length} results</a>
        </div>
      ` : "");

    searchResults.innerHTML = htmlContent;
    showSearchResults();

    if (contacts.length > 0) {
      // Click result → open contact
      searchResults.querySelectorAll(".search-result-item").forEach(item => {
        item.addEventListener("click", () => {
          showContactDetails(item.dataset.contactId);
          hideSearchResults();
          document.getElementById("searchInput").value = "";
          document.getElementById("clearSearch").style.display = "none";
        });
      });

      // View all
      const viewAllBtn = document.getElementById("viewAllResults");
      if (viewAllBtn) {
        viewAllBtn.addEventListener("click", e => {
          e.preventDefault();
          loadContacts({ search: query });
          hideSearchResults();
        });
      }
    }
  });
}

// ===============================
// HELPERS
// ===============================
function showContactDetails(contactId) {
  // Use dashboard function if available, otherwise show toast
  if (typeof showContactDetailsModal === 'function') {
    showContactDetailsModal(contactId);
  } else {
    APIUtils.showToast(`Opening contact details...`, "info");
  }
}

function showSearchResults() {
  document.getElementById("searchResults")?.classList.add("show");
}

function hideSearchResults() {
  document.getElementById("searchResults")?.classList.remove("show");
}

// ===============================
// STYLES (UNCHANGED)
// ===============================
const searchStyles = document.createElement("style");
searchStyles.textContent = `
.search-results{position:absolute;top:100%;left:0;right:0;background:#fff;border:1px solid var(--gray-200);border-radius:var(--border-radius);margin-top:.5rem;box-shadow:var(--shadow-lg);max-height:400px;overflow-y:auto;display:none;z-index:100;opacity:0;transition:opacity 0.15s ease}
.search-results.show{display:block;opacity:1}
.search-result-item{display:flex;align-items:center;gap:1rem;padding:.75rem 1rem;cursor:pointer;border-bottom:1px solid var(--gray-100)}
.search-result-item:hover{background:var(--gray-50)}
.search-result-avatar{width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--primary-light),var(--primary-color));color:#fff;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:600}
.search-result-name{font-weight:600;color:var(--gray-900)}
.search-result-phone,.search-result-company{font-size:.875rem;color:var(--gray-600)}
.search-result-empty{text-align:center;padding:2rem;color:var(--gray-500)}
.search-result-more{text-align:center;padding:.75rem}
`;
document.head.appendChild(searchStyles);

// Exports
window.performSearch = performSearch;
window.hideSearchResults = hideSearchResults;
