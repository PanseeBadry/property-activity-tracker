const state = {
    token: localStorage.getItem('token') || null,
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    socket: null,
    currentTab: 'dashboard',
    data: {
        activities: [],
        properties: [],
        salesReps: []
    }
};

// API Configuration
const API_BASE = 'http://localhost:3000';
const api = {
    async request(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(state.token && { Authorization: `Bearer ${state.token}` })
            },
            ...options
        };
        // console.log("options", options);

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            // console.log(`API Request: ${endpoint}`, config);
            
            if (response.status === 401) {
                this.handleUnauthorized();
                return null;
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            showNotification(error.message, 'error');
            return null;
        }
    },

    handleUnauthorized() {
        logout();
        showNotification('Session expired. Please login again.', 'warning');
    },

    // Auth endpoints
    async login(name) {
        return this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ name })
        });
    },

    async logout() {
        return this.request('/auth/logout', { method: 'POST' });
    },

    // Sales Reps endpoints
    async getSalesReps() {
        console.log("getSalesReps called",  this.request('/sales-reps'));
        return this.request('/sales-reps');
    },

    async createSalesRep(data) {
        return this.request('/sales-reps', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateSalesRep(id, data) {
        return this.request(`/sales-reps/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async deleteSalesRep(id) {
        return this.request(`/sales-reps/${id}`, { method: 'DELETE' });
    },

    // Properties endpoints
    async getProperties() {
        // console.log("getProperties called", await this.request('/property'));
        return await this.request('/property');
    },

    async createProperty(data) {
        return this.request('/property', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateProperty(id, data) {
        return this.request(`/property/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async deleteProperty(id) {
        return this.request(`/property/${id}`, { method: 'DELETE' });
    },

    // Activities endpoints
    async getActivities(filters = {}) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value) params.append(key, value);
        });
        const query = params.toString() ? `?${params.toString()}` : '';
        return this.request(`/activities${query}`);
    },

    async createActivity(data) {
        return this.request('/activities', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async updateActivity(id, data) {
        return this.request(`/activities/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    },

    async deleteActivity(id) {
        return this.request(`/activities/${id}`, { method: 'DELETE' });
    }
};

// WebSocket Management
function initializeSocket() {
    if (!state.token || state.socket) return;

    state.socket = io('http://localhost:3000');

    state.socket.on('connect', () => {
        console.log('Connected to server');
        if (state.user) {
            state.socket.emit('user:online', { salesRepId: state.user._id });
        }
    });

    state.socket.on('activity:new', (activity) => {
        showNotification(`New activity: ${activity.activityType} by ${activity.salesRepId.name}`, 'info');
        loadData();
    });

    state.socket.on('activity:replay', (activities) => {
        if (activities.length > 0) {
            showNotification(`You have ${activities.length} missed activities`, 'info');
            loadData();
        }
    });

    state.socket.on('notification', (message) => {
        showNotification(message, 'success');
    });

    state.socket.on('disconnect', () => {
        console.log('Disconnected from server');
    });
}

function disconnectSocket() {
    if (state.socket) {
        state.socket.disconnect();
        state.socket = null;
    }
}

// Authentication
async function login(name) {
    try {
        const response = await api.login(name);
        console.log("login response", response);
        if (response) {
            state.token = response.access_token;
            state.user = response.salesRep;
            
            localStorage.setItem('token', state.token);
            localStorage.setItem('user', JSON.stringify(state.user));
            
            showNotification('Login successful!', 'success');
            hideLoginOverlay();
            updateUserInfo();
            initializeSocket();
            await loadData();
        }
    } catch (error) {
        showNotification('Login failed', 'error');
    }
}

async function logout() {
    try {
        if (state.token) {
            await api.logout();
        }
    } finally {
        state.token = null;
        state.user = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        disconnectSocket();
        showLoginOverlay();
        updateUserInfo();
    }
}

function showLoginOverlay() {
    document.getElementById('loginOverlay').style.display = 'flex';
}

function hideLoginOverlay() {
    document.getElementById('loginOverlay').style.display = 'none';
}

function updateUserInfo() {
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userScore = document.getElementById('userScore');

    if (state.user) {
        userInfo.style.display = 'flex';
        userName.textContent = state.user.name;
        userScore.textContent = `Score: ${state.user.score}`;
    } else {
        userInfo.style.display = 'none';
    }
}

// Data Loading
async function loadData() {
    if (!state.token) return;

    await Promise.all([
        loadActivities(),
        loadProperties(),
        loadSalesReps()
    ]);

    updateDashboard();
}

async function loadActivities() {
    const activities = await api.getActivities();
    if (activities) {
        state.data.activities = activities;
        renderActivities();
        renderRecentActivities();
    }
}

async function loadProperties() {
    const properties = await api.getProperties();
    if (properties) {
        state.data.properties = properties;
        renderProperties();
        updatePropertySelects();
    }
}

async function loadSalesReps() {
    const salesReps = await api.getSalesReps();
    console.log("salesReps", salesReps);
    if (salesReps) {
        state.data.salesReps = salesReps;
        renderSalesReps();
        updateSalesRepSelects();
        updateCurrentUserScore();
    }
}

function updateCurrentUserScore() {
    if (state.user) {
        const currentUser = state.data.salesReps.find(rep => rep._id === state.user._id);
        if (currentUser) {
            state.user.score = currentUser.score;
            localStorage.setItem('user', JSON.stringify(state.user));
            updateUserInfo();
        }
    }
}

// Dashboard
function updateDashboard() {
    document.getElementById('totalActivities').textContent = state.data.activities.length;
    // document.getElementById('totalProperties').textContent = state.data.properties.length;
    document.getElementById('totalSalesReps').textContent = state.data.salesReps.length;
    document.getElementById('currentScore').textContent = state.user ? state.user.score : 0;
}

function renderRecentActivities() {
    const container = document.getElementById('recentActivities');
    const recentActivities = state.data.activities
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 5);

    if (recentActivities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard"></i><p>No activities yet</p></div>';
        return;
    }

    container.innerHTML = recentActivities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon ${activity.activityType}">
                <i class="fas ${getActivityIcon(activity.activityType)}"></i>
            </div>
            <div class="activity-details">
                <div class="activity-type">${activity.activityType}</div>
                <div class="activity-info">
                    ${activity.propertyId.name} - ${activity.salesRepId.name}
                </div>
                <div class="activity-time">${formatTime(activity.timestamp)}</div>
            </div>
        </div>
    `).join('');
}

// Activities Management
function renderActivities() {
    const container = document.getElementById('activitiesList');
    
    if (state.data.activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>No activities found</p></div>';
        return;
    }

    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Type</th>
                    <th>Property</th>
                    <th>Sales Rep</th>
                    <th>Date</th>
                    <th>Points</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${state.data.activities.map(activity => `
                    <tr>
                        <td>
                            <span class="activity-type ${activity.activityType}">
                                <i class="fas ${getActivityIcon(activity.activityType)}"></i>
                                ${activity.activityType}
                            </span>
                        </td>
                        <td>${activity.propertyId.name}</td>
                        <td>${activity.salesRepId.name}</td>
                        <td>${formatDateTime(activity.timestamp)}</td>
                        <td><strong>${activity.weight}</strong></td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn edit" onclick="editActivity('${activity._id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="deleteActivity('${activity._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

async function createActivity(formData) {
    const data = {
        propertyId: formData.get('propertyId'),
        activityType: formData.get('activityType'),
        timestamp: new Date(),
        location: {
            lat: parseFloat(formData.get('lat')),
            lng: parseFloat(formData.get('lng'))
        },
        note: formData.get('note') || undefined
    };

    const response = await api.createActivity(data);
    if (response) {
        showNotification('Activity created successfully!', 'success');
        closeModal('activityModal');
        await loadData();
    }
}

async function deleteActivity(id) {
    if (confirm('Are you sure you want to delete this activity?')) {
        const response = await api.deleteActivity(id);
        if (response) {
            showNotification('Activity deleted successfully!', 'success');
            await loadData();
        }
    }
}

// Properties Management
function renderProperties() {
    const container = document.getElementById('propertiesList');
    
    if (state.data.properties.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-building"></i><p>No properties found</p></div>';
        return;
    }

    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Location</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${state.data.properties.map(property => `
                    <tr>
                        <td><strong>${property.name}</strong></td>
                        <td>${property.address}</td>
                        <td>${property.lat.toFixed(4)}, ${property.lng.toFixed(4)}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn edit" onclick="editProperty('${property._id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="deleteProperty('${property._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

async function createProperty(formData) {
    const data = {
        propertyName: formData.get('propertyName'),
        address: formData.get('address'),
        location: {
            lat: parseFloat(formData.get('lat')),
            lng: parseFloat(formData.get('lng'))
        }
    };

    const response = await api.createProperty(data);
    if (response) {
        showNotification('Property created successfully!', 'success');
        // closeModal('propertyModal');
        await loadData();
    }
}

async function deleteProperty(id) {
    if (confirm('Are you sure you want to delete this property?')) {
        const response = await api.deleteProperty(id);
        if (response) {
            showNotification('Property deleted successfully!', 'success');
            await loadData();
        }
    }
}

// Sales Reps Management
function renderSalesReps() {
    const container = document.getElementById('salesRepsList');
    
    if (state.data.salesReps.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>No sales reps found</p></div>';
        return;
    }
    console.log("salesRepsList", state.data.salesReps);

    const tableHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Last Online</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${state.data.salesReps
                    .filter(rep => rep._id !== state.user._id)

                    .map(rep => `
                    <tr>
                        <td><strong>${rep.name}</strong></td>
                        <td>
                            <span class="status-badge ${rep.isOnline ? 'online' : 'offline'}">
                                ${rep.isOnline ? 'Online' : 'Offline'}
                            </span>
                        </td>
                        <td><strong>${rep.score}</strong></td>
                        <td>${rep.lastOnline ? formatDateTime(rep.lastOnline) : 'Never'}</td>
                        <td>
                            <div class="action-buttons">
                                <button class="action-btn edit" onclick="editSalesRep('${rep._id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="deleteSalesRep('${rep._id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = tableHTML;
}

async function createSalesRep(formData) {
    const data = {
        name: formData.get('name')
    };

    const response = await api.createSalesRep(data);
    if (response) {
        showNotification('Sales rep created successfully!', 'success');
        closeModal('salesRepModal');
        await loadData();
    }
}

async function deleteSalesRep(id) {
    if (confirm('Are you sure you want to delete this sales rep?')) {
        const response = await api.deleteSalesRep(id);
        if (response) {
            showNotification('Sales rep deleted successfully!', 'success');
            await loadData();
        }
    }
}

// UI Helpers
function updatePropertySelects() {
    const selects = document.querySelectorAll('#activityProperty');
    selects.forEach(select => {
        const currentValue = select.value;
        console.log("here", state.data.properties);
        select.innerHTML = '<option value="">Select Property</option>' +
            state.data.properties.map(property => 
                `<option value="${property._id}">${property.name}</option>`
            ).join('');
        if (currentValue) select.value = currentValue;
    });
}

function updateSalesRepSelects() {
    const selects = document.querySelectorAll('#salesRepFilter');
    selects.forEach(select => {
        const currentValue = select.value;
        // console.log("here", state.data.salesReps);
        select.innerHTML = '<option value="">All Sales Reps</option>' +
            state.data.salesReps.map(rep => 
                `<option value="${rep._id}">${rep.name}</option>`
            ).join('');

        if (currentValue) select.value = currentValue;
    });
}

function getActivityIcon(type) {
    const icons = {
        visit: 'fa-home',
        call: 'fa-phone',
        inspection: 'fa-search',
        'follow-up': 'fa-redo',
        note: 'fa-sticky-note'
    };
    return icons[type] || 'fa-clipboard';
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleTimeString();
}

function formatDateTime(dateString) {
    return new Date(dateString).toLocaleString();
}

// Tab Management
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    state.currentTab = tabName;
}

// Modal Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    // Reset form if exists
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
}

// Notifications
function showNotification(message, type = 'info') {
    const container = document.getElementById('notifications');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <strong>${type.charAt(0).toUpperCase()}${type.slice(1)} </strong>
        <div>${message}</div>
    `;
    
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    if (state.token && state.user) {
        hideLoginOverlay();
        updateUserInfo();
        initializeSocket();
        loadData();
    } else {
        showLoginOverlay();
    }

    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('salesRepName').value;
        await login(name);
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchTab(btn.getAttribute('data-tab'));
        });
    });

    // Modal controls
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal');
            closeModal(modal.id);
        });
    });

    // New item buttons
    document.getElementById('newActivityBtn').addEventListener('click', () => openModal('activityModal'));
    // document.getElementById('newPropertyBtn').addEventListener('click', () => openModal('propertyModal'));
    document.getElementById('newSalesRepBtn').addEventListener('click', () => openModal('salesRepModal'));

    // Cancel buttons
    document.getElementById('cancelActivity').addEventListener('click', () => closeModal('activityModal'));
    // document.getElementById('cancelProperty').addEventListener('click', () => closeModal('propertyModal'));
    document.getElementById('cancelSalesRep').addEventListener('click', () => closeModal('salesRepModal'));

    // Form submissions
    document.getElementById('activityForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await createActivity(formData);
    });

    document.getElementById('propertyForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await createProperty(formData);
    });

    document.getElementById('salesRepForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        await createSalesRep(formData);
    });

    // Filters
    document.getElementById('activityTypeFilter').addEventListener('change', async (e) => {
        const type = e.target.value;
        const repId = document.getElementById('salesRepFilter').value;
        const activities = await api.getActivities({ activityType: type, salesRepId: repId });
        if (activities) {
            state.data.activities = activities;
            renderActivities();
        }
    });

    document.getElementById('salesRepFilter').addEventListener('change', async (e) => {
        const repId = e.target.value;
        const type = document.getElementById('activityTypeFilter').value;
        const activities = await api.getActivities({ activityType: type, salesRepId: repId });
        if (activities) {
            state.data.activities = activities;
            renderActivities();
        }
    });

    // Close modals when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
});

// Helper function for form data
FormData.prototype.get = function(name) {
    const value = this.getAll(name)[0];
    return value || null;
};
