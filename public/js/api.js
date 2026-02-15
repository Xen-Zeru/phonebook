// API Configuration
const API_BASE_URL = 'https://phonebook-production-53a.up.railway.app';

// Auth API
class AuthAPI {
    static async login(email, password) {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        return this.handleResponse(response);
    }

    static async register(userData) {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData)
        });
        return this.handleResponse(response);
    }

    static async refreshToken(refreshToken) {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refreshToken })
        });
        return this.handleResponse(response);
    }

    static async logout() {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
            try {
                await fetch(`${API_BASE_URL}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
                    },
                    body: JSON.stringify({ refreshToken })
                });
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        
        // Clear local storage
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        // Redirect to login
        window.location.href = 'login.html';
    }

    static async getProfile() {
        return this.authenticatedRequest(`${API_BASE_URL}/auth/profile`, 'GET');
    }

    static async handleResponse(response) {
        // Handle 204 No Content (successful DELETE with no body)
        if (response.status === 204) {
            return { success: true, message: 'Request successful' };
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'Request failed');
        }
        
        return data;
    }

    static async authenticatedRequest(url, method = 'GET', body = null) {
        let token = localStorage.getItem('access_token');
        
        const headers = {
            'Content-Type': 'application/json',
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            method,
            headers,
        };
        
        if (body) {
            config.body = JSON.stringify(body);
        }
        
        let response = await fetch(url, config);
        
        // If token expired, try to refresh
        if (response.status === 401) {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const refreshResponse = await this.refreshToken(refreshToken);
                    localStorage.setItem('access_token', refreshResponse.access_token);
                    localStorage.setItem('refresh_token', refreshResponse.refresh_token);
                    
                    // Retry original request with new token
                    headers['Authorization'] = `Bearer ${refreshResponse.access_token}`;
                    config.headers = headers;
                    response = await fetch(url, config);
                } catch (error) {
                    // Refresh token failed, logout user
                    await this.logout();
                    throw new Error('Session expired. Please login again.');
                }
            } else {
                await this.logout();
                throw new Error('Session expired. Please login again.');
            }
        }
        
        return this.handleResponse(response);
    }
}

// Contacts API
class ContactsAPI {
    static async getAllContacts(params = {}) {
        const queryParams = new URLSearchParams(params).toString();
        const url = `${API_BASE_URL}/contacts${queryParams ? `?${queryParams}` : ''}`;
        return AuthAPI.authenticatedRequest(url);
    }

    static async getContactStats() {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts/stats`);
    }

    static async getContact(id) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts/${id}`);
    }

    static async createContact(contactData) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts`, 'POST', contactData);
    }

    static async updateContact(id, contactData) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts/${id}`, 'PATCH', contactData);
    }

    static async toggleFavorite(id) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts/${id}/favorite`, 'PATCH');
    }

    static async deleteContact(id) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts/${id}`, 'DELETE');
    }

    static async bulkDeleteContacts(ids) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts/bulk`, 'DELETE', { ids });
    }

    static async searchContacts(query) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/contacts?search=${encodeURIComponent(query)}&limit=10`);
    }
}

// Users API
class UsersAPI {
    static async getProfile() {
        const token = localStorage.getItem('access_token');
        const userId = APIUtils.getUser()?.id;
        if (!userId) {
            throw new Error('User not authenticated');
        }
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/users/${userId}`, 'GET');
    }

    static async updateUser(id, userData) {
        return AuthAPI.authenticatedRequest(`${API_BASE_URL}/users/${id}`, 'PATCH', userData);
    }

    static async uploadAvatar(id, file) {
        const formData = new FormData();
        formData.append('avatar', file);
        
        const token = localStorage.getItem('access_token');
        const response = await fetch(`${API_BASE_URL}/users/${id}/avatar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('Avatar upload failed');
        }
        
        return response.json();
    }
}

// Utility Functions
class APIUtils {
    static isAuthenticated() {
        const token = localStorage.getItem('access_token');
        return !!token;
    }

    static getUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    static updateUserInStorage(userData) {
        const currentUser = this.getUser();
        const updatedUser = { ...currentUser, ...userData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        return updatedUser;
    }

    static showToast(message, type = 'info') {
        // Check if toast container exists
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        
        toast.innerHTML = `
            <i class="fas fa-${icons[type] || 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static showLoading() {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay';
            overlay.style.display = 'none';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading...</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        overlay.style.display = 'flex';
    }

    static hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    static formatPhoneNumber(phone) {
        if (!phone) return '';
        // Remove all non-digit characters
        const cleaned = phone.replace(/\D/g, '');
        
        // Format as (XXX) XXX-XXXX for US numbers
        if (cleaned.length === 10) {
            return `(${cleaned.slice(0,3)}) ${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
        }
        
        // Format as +X (XXX) XXX-XXXX for international numbers
        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            return `+1 (${cleaned.slice(1,4)}) ${cleaned.slice(4,7)}-${cleaned.slice(7)}`;
        }
        
        // Return original if format doesn't match
        return phone;
    }

    static formatAddress(address){
        if (!address) return '';

        return address;
    }

    static formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    static formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    static getInitials(name) {
        if (!name) return '?';
        return name
            .split(' ')
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
}

// Export API classes
window.AuthAPI = AuthAPI;
window.ContactsAPI = ContactsAPI;
window.UsersAPI = UsersAPI;
window.APIUtils = APIUtils;

// Auto-redirect to login if not authenticated on dashboard
if (window.location.pathname.includes('dashboard.html') && !APIUtils.isAuthenticated()) {
    window.location.href = 'login.html';
}