const state = {
    token: null,
    user: null,
    socket: null,
    currentTab: 'dashboard',
    data: {
        activities: [],
        properties: [],
        salesReps: []
    },
    notifications: [],
    replayActivities: [],
    unreadNotifications: 0,
    missedActivities: 0,
    map: {
        instance: null,
        markers: [],
        infoWindow: null,
        isOnline: navigator.onLine,
        offlineActivities: []
    }
};

function initializeState() {
   state.token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    state.user = userData ? JSON.parse(userData) : null;
    state.notifications = [];
    state.replayActivities = [];
    state.unreadNotifications = 0;
    state.missedActivities = 0;
}

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

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, config);
            
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

// Notification Management
function addNotification(title, message, type = 'info') {
    const notification = {
        id: Date.now() + Math.random(),
        title,
        message,
        type,
        timestamp: new Date(),
        read: false
    };
    
    state.notifications.unshift(notification);
    state.unreadNotifications++;
    updateNotificationBadge();
    
    // Keep only last 50 notifications
    if (state.notifications.length > 50) {
        state.notifications = state.notifications.slice(0, 50);
    }
}

function markNotificationAsRead(id) {
    const notification = state.notifications.find(n => n.id === id);
    if (notification && !notification.read) {
        notification.read = true;
        state.unreadNotifications--;
        updateNotificationBadge();
    }
}

function clearAllNotifications() {
    state.notifications = [];
    state.unreadNotifications = 0;
    updateNotificationBadge();
    renderNotifications();
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    if (state.unreadNotifications > 0) {
        badge.textContent = state.unreadNotifications > 99 ? '99+' : state.unreadNotifications;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderNotifications() {
    const container = document.getElementById('notificationList');
    
    if (state.notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-panel">
                <i class="fas fa-bell-slash"></i>
                <p>No notifications</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.notifications.map(notification => `
        <div class="notification-item ${!notification.read ? 'unread' : ''}" 
             onclick="markNotificationAsRead(${notification.id})">
            <div class="notification-title">${notification.title}</div>
            <div class="notification-text">${notification.message}</div>
            <div class="notification-time">${formatDateTime(notification.timestamp)}</div>
        </div>
    `).join('');
}

// Replay Activities Management
function addReplayActivity(activity) {
    const replayItem = {
        id: activity._id || Date.now() + Math.random(),
        activity,
        timestamp: new Date(activity.timestamp),
        viewed: false
    };
    
    state.replayActivities.unshift(replayItem);
    state.missedActivities++;
    updateReplayBadge();
    
    // Keep only last 100 replay activities
    if (state.replayActivities.length > 100) {
        state.replayActivities = state.replayActivities.slice(0, 100);
    }
}

function markReplayAsViewed(id) {
    const replayItem = state.replayActivities.find(r => r.id === id);
    if (replayItem && !replayItem.viewed) {
        replayItem.viewed = true;
        state.missedActivities--;
        updateReplayBadge();
    }
}

function clearReplayActivities() {
    state.replayActivities = [];
    state.missedActivities = 0;
    updateReplayBadge();
    renderReplayActivities();
}

function updateReplayBadge() {
    const badge = document.getElementById('replayBadge');
    if (state.missedActivities > 0) {
        badge.textContent = state.missedActivities > 99 ? '99+' : state.missedActivities;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function renderReplayActivities() {
    const container = document.getElementById('replayList');
    
    if (state.replayActivities.length === 0) {
        container.innerHTML = `
            <div class="empty-panel">
                <i class="fas fa-clock"></i>
                <p>No missed activities</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = state.replayActivities.map(replayItem => `
        <div class="replay-item ${!replayItem.viewed ? 'missed' : ''}" 
             onclick="markReplayAsViewed(${replayItem.id})">
            <div class="notification-title">
                <i class="fas ${getActivityIcon(replayItem.activity.activityType)}"></i>
                ${replayItem.activity.activityType} Activity
            </div>
            <div class="replay-text">
                ${replayItem.activity.propertyId?.name || 'Unknown Property'} - 
                ${replayItem.activity.salesRepId?.name || 'Unknown Rep'}
                ${replayItem.activity.note ? `<br><small>${replayItem.activity.note}</small>` : ''}
            </div>
            <div class="replay-time">${formatDateTime(replayItem.timestamp)}</div>
        </div>
    `).join('');
}

// Panel Management
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    const replayPanel = document.getElementById('replayPanel');
    
    // Close replay panel if open
    replayPanel.style.display = 'none';
    
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        renderNotifications();
    }
}

function toggleReplayPanel() {
    const panel = document.getElementById('replayPanel');
    const notificationPanel = document.getElementById('notificationPanel');
    
    // Close notification panel if open
    notificationPanel.style.display = 'none';
    
    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        renderReplayActivities();
    }
}

function closeNotificationPanel() {
    document.getElementById('notificationPanel').style.display = 'none';
}

function closeReplayPanel() {
    document.getElementById('replayPanel').style.display = 'none';
}

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
        const message = `New activity: ${activity.activityType} by ${activity.salesRepId.name}`;
        
        // Add to notifications
        addNotification('New Activity', message, 'info');
        
        // Also show as toast notification
        showNotification(message, 'info');
        
        loadData();
    });

    state.socket.on('activity:replay', (activities) => {
        if (activities.length > 0) {
            // Add each activity to replay list
            activities.forEach(activity => {
                addReplayActivity(activity);
            });
            
            // Add notification about missed activities
            addNotification(
                'Missed Activities', 
                `You have ${activities.length} missed activities while you were offline`, 
                'warning'
            );
            
            // Show toast notification
            showNotification(`You have ${activities.length} missed activities`, 'info');
            
            loadData();
        }
    });

    state.socket.on('notification', (message) => {
        // Add to notifications panel
        addNotification('System Notification', message, 'success');
        
        // Also show as toast
        showNotification(message, 'success');
    });

    state.socket.on('disconnect', () => {
        console.log('Disconnected from server');
        addNotification('Connection', 'Disconnected from server', 'warning');
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
        if (response) {
            state.token = response.access_token;
            state.user = response.salesRep;
            localStorage.setItem('token', state.token);
            localStorage.setItem('user', JSON.stringify(state.user));
            showNotification('Login successful!', 'success');
            addNotification('Login', `Welcome back, ${state.user.name}!`, 'success');
            
            hideLoginOverlay();
            updateUserInfo();
            initializeSocket();
            await loadData();
        }
    } catch (error) {
        showNotification('Login failed', 'error');
        addNotification('Login Failed', 'Unable to authenticate user', 'error');
    }
}

async function logout() {
    try {
        if (state.token) {
            await api.logout();
        }
    } finally {
        addNotification('Logout', 'You have been logged out', 'info');

        localStorage.removeItem('token');
        localStorage.removeItem('user');

        state.token = null;
        state.user = null;
        state.notifications = [];
        state.replayActivities = [];
        state.unreadNotifications = 0;
        state.missedActivities = 0;

        disconnectSocket();
        showLoginOverlay();
        updateUserInfo();
        updateNotificationBadge();
        updateReplayBadge();
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
    
    // Load map data if map is initialized
    if (state.map.instance) {
        loadMapData();
    }
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
            updateUserInfo();
        }
    }
}

// Dashboard
function updateDashboard() {
    document.getElementById('totalActivities').textContent = state.data.activities.length;
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
            lat: parseFloat(formData.get('lat')) || 0,
            lng: parseFloat(formData.get('lng')) || 0
        },
        note: formData.get('note') || undefined
    };

    const response = await api.createActivity(data);
    if (response) {
        // showNotification('Activity created successfully!', 'success');
        // addNotification('Activity Created', `${data.activityType} activity created successfully`, 'success');
        closeModal('activityModal');
        await loadData();
    }
}

async function deleteActivity(id) {
    if (confirm('Are you sure you want to delete this activity?')) {
        const response = await api.deleteActivity(id);
        if (response) {
            showNotification('Activity deleted successfully!', 'success');
            addNotification('Activity Deleted', 'Activity has been removed', 'info');
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
        addNotification('Property Created', `${data.propertyName} has been added`, 'success');
        await loadData();
    }
}

async function deleteProperty(id) {
    if (confirm('Are you sure you want to delete this property?')) {
        const response = await api.deleteProperty(id);
        if (response) {
            showNotification('Property deleted successfully!', 'success');
            addNotification('Property Deleted', 'Property has been removed', 'info');
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
        addNotification('Sales Rep Created', `${data.name} has been added to the team`, 'success');
        closeModal('salesRepModal');
        await loadData();
    }
}

async function deleteSalesRep(id) {
    if (confirm('Are you sure you want to delete this sales rep?')) {
        const response = await api.deleteSalesRep(id);
        if (response) {
            showNotification('Sales rep deleted successfully!', 'success');
            addNotification('Sales Rep Deleted', 'Sales representative has been removed', 'info');
            await loadData();
        }
    }
}

// UI Helpers
function updatePropertySelects() {
    const selects = document.querySelectorAll('#activityProperty');
    selects.forEach(select => {
        const currentValue = select.value;
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    state.currentTab = tabName;
    
    // Special handling for maps tab
    if (tabName === 'maps' && state.map.instance) {
        // Trigger map resize and reload data
        setTimeout(() => {
            google.maps.event.trigger(state.map.instance, 'resize');
            loadMapData();
        }, 100);
    }
}

// Modal Management
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
    const form = document.querySelector(`#${modalId} form`);
    if (form) form.reset();
}

// Notifications (Toast notifications)
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
    // Initialize state
    initializeState();
    
    // Check if user is already logged in (in this case, always show login)
    // Check if user is already logged in
const savedToken = localStorage.getItem('token');
const savedUser = localStorage.getItem('user');

if (savedToken && savedUser) {
    state.token = savedToken;
    state.user = JSON.parse(savedUser);
    updateUserInfo();
    initializeSocket();
    loadData();
    hideLoginOverlay();
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

    // Notification and Replay buttons
    document.getElementById('notificationBtn').addEventListener('click', toggleNotificationPanel);
    document.getElementById('replayBtn').addEventListener('click', toggleReplayPanel);

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
    document.getElementById('newSalesRepBtn').addEventListener('click', () => openModal('salesRepModal'));

    // Cancel buttons
    document.getElementById('cancelActivity').addEventListener('click', () => closeModal('activityModal'));
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

    // Close modals and panels when clicking outside
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });

    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
        const notificationPanel = document.getElementById('notificationPanel');
        const replayPanel = document.getElementById('replayPanel');
        const notificationBtn = document.getElementById('notificationBtn');
        const replayBtn = document.getElementById('replayBtn');
        
        if (!notificationPanel.contains(e.target) && !notificationBtn.contains(e.target)) {
            notificationPanel.style.display = 'none';
        }
        
        if (!replayPanel.contains(e.target) && !replayBtn.contains(e.target)) {
            replayPanel.style.display = 'none';
        }
    });
    // Map controls
    document.getElementById('refreshMapBtn')?.addEventListener('click', refreshMap);
    document.getElementById('centerMapBtn')?.addEventListener('click', centerMap);
});

// Google Maps Functions
let map, markers = [], infoWindow;

function initMap() {
    // Default center (New York City)
    const defaultCenter = { lat: 40.7128, lng: -74.0060 };
    
    map = new google.maps.Map(document.getElementById("googleMap"), {
        zoom: 12,
        center: defaultCenter,
        styles: [
            {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
            }
        ]
    });
    
    state.map.instance = map;
    infoWindow = new google.maps.InfoWindow();
    state.map.infoWindow = infoWindow;
    
    // Hide loading indicator
    document.getElementById('mapLoading').style.display = 'none';
    
    // Load map data if user is logged in
    if (state.token) {
        loadMapData();
    }
}

function loadMapData() {
    if (!state.map.instance) return;
    
    clearMapMarkers();
    
    // Add property markers
    state.data.properties.forEach(property => {
        addPropertyMarker(property);
    });
    
    // Add activity markers for new activities (online)
    const newActivities = state.data.activities.filter(activity => {
        const activityDate = new Date(activity.timestamp);
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return activityDate > hourAgo && state.map.isOnline;
    });
    
    newActivities.forEach(activity => {
        addActivityMarker(activity, 'new');
    });
    
    // Add markers for missed activities (from offline period)
    state.map.offlineActivities.forEach(activity => {
        addActivityMarker(activity, 'missed');
    });
    
    // Center map on activities if available
    if (state.data.properties.length > 0) {
        centerMapOnData();
    }
}

function addPropertyMarker(property) {
    const marker = new google.maps.Marker({
        position: { lat: parseFloat(property.lat), lng: parseFloat(property.lng) },
        map: state.map.instance,
        title: property.propertyName,
        icon: {
            url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
                    <circle cx="12" cy="12" r="8" fill="#4299e1" stroke="white" stroke-width="2"/>
                    <text x="12" y="16" text-anchor="middle" fill="white" font-size="12" font-family="Arial">P</text>
                </svg>
            `),
            scaledSize: new google.maps.Size(24, 24)
        }
    });
    
    marker.addListener('click', () => {
        showPropertyInfo(property);
    });
    
    state.map.markers.push(marker);
}

function addActivityMarker(activity, type) {
    const property = state.data.properties.find(p => p.id === activity.propertyId);
    if (!property) return;
    
    const color = type === 'new' ? '#48bb78' : '#f56565';
    const letter = type === 'new' ? 'N' : 'M';
    
    const marker = new google.maps.Marker({
        position: { lat: parseFloat(property.lat), lng: parseFloat(property.lng) },
        map: state.map.instance,
        title: `${type === 'new' ? 'New' : 'Missed'} Activity: ${activity.activityType}`,
        icon: {
            url: 'data:image/svg+xml;base64,' + btoa(`
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="28" height="28">
                    <circle cx="12" cy="12" r="10" fill="${color}" stroke="white" stroke-width="2"/>
                    <text x="12" y="16" text-anchor="middle" fill="white" font-size="10" font-family="Arial" font-weight="bold">${letter}</text>
                </svg>
            `),
            scaledSize: new google.maps.Size(28, 28)
        },
        zIndex: type === 'new' ? 1000 : 999
    });
    
    marker.addListener('click', () => {
        showActivityInfo(activity, property, type);
    });
    
    state.map.markers.push(marker);
}

function clearMapMarkers() {
    state.map.markers.forEach(marker => {
        marker.setMap(null);
    });
    state.map.markers = [];
}

function showPropertyInfo(property) {
    const activities = state.data.activities.filter(a => a.propertyId === property.id);
    const content = `
        <div style="max-width: 250px;">
            <h4 style="margin: 0 0 10px 0; color: #5a67d8;">${property.propertyName}</h4>
            <p style="margin: 5px 0;"><strong>Address:</strong> ${property.address}</p>
            <p style="margin: 5px 0;"><strong>Activities:</strong> ${activities.length}</p>
            ${activities.length > 0 ? `<p style="margin: 5px 0;"><strong>Last Activity:</strong> ${formatDateTime(activities[activities.length - 1].timestamp)}</p>` : ''}
        </div>
    `;
    
    state.map.infoWindow.setContent(content);
    state.map.infoWindow.open(state.map.instance, state.map.markers.find(m => 
        m.getPosition().lat() === parseFloat(property.lat) && 
        m.getPosition().lng() === parseFloat(property.lng)
    ));
}

function showActivityInfo(activity, property, type) {
    const salesRep = state.data.salesReps.find(rep => rep.id === activity.salesRepId);
    const typeLabel = type === 'new' ? 'New Activity (Online)' : 'Missed Activity (Offline)';
    const typeColor = type === 'new' ? '#48bb78' : '#f56565';
    
    const content = `
        <div style="max-width: 280px;">
            <h4 style="margin: 0 0 10px 0; color: ${typeColor};">${typeLabel}</h4>
            <p style="margin: 5px 0;"><strong>Property:</strong> ${property.propertyName}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${activity.activityType}</p>
            <p style="margin: 5px 0;"><strong>Sales Rep:</strong> ${salesRep ? salesRep.name : 'Unknown'}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${formatDateTime(activity.timestamp)}</p>
            ${activity.note ? `<p style="margin: 5px 0;"><strong>Note:</strong> ${activity.note}</p>` : ''}
            <button onclick="showActivityDetails('${activity.id}')" style="
                background: #5a67d8; 
                color: white; 
                border: none; 
                padding: 8px 12px; 
                border-radius: 4px; 
                cursor: pointer; 
                margin-top: 8px;
            ">View Details</button>
        </div>
    `;
    
    state.map.infoWindow.setContent(content);
    state.map.infoWindow.open(state.map.instance, state.map.markers.find(m => 
        m.getTitle().includes(activity.activityType)
    ));
}

function showActivityDetails(activityId) {
    const activity = state.data.activities.find(a => a.id === activityId);
    const property = state.data.properties.find(p => p.id === activity.propertyId);
    const salesRep = state.data.salesReps.find(rep => rep.id === activity.salesRepId);
    
    if (!activity) return;
    
    const panel = document.getElementById('activityDetailsPanel');
    const content = document.getElementById('activityDetailsContent');
    
    content.innerHTML = `
        <div class="activity-detail-item">
            <div class="activity-detail-label">Property</div>
            <div class="activity-detail-value">${property ? property.propertyName : 'Unknown'}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">Address</div>
            <div class="activity-detail-value">${property ? property.address : 'Unknown'}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">Activity Type</div>
            <div class="activity-detail-value">${activity.activityType}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">Sales Representative</div>
            <div class="activity-detail-value">${salesRep ? salesRep.name : 'Unknown'}</div>
        </div>
        <div class="activity-detail-item">
            <div class="activity-detail-label">Date & Time</div>
            <div class="activity-detail-value">${formatDateTime(activity.timestamp)}</div>
        </div>
        ${activity.note ? `
        <div class="activity-detail-item">
            <div class="activity-detail-label">Note</div>
            <div class="activity-detail-value">${activity.note}</div>
        </div>
        ` : ''}
    `;
    
    panel.style.display = 'block';
}

function closeActivityDetails() {
    document.getElementById('activityDetailsPanel').style.display = 'none';
}

function refreshMap() {
    if (state.map.instance) {
        loadMapData();
        showNotification('Map refreshed with latest data', 'success');
    }
}

function centerMap() {
    if (state.map.instance && state.data.properties.length > 0) {
        centerMapOnData();
        showNotification('Map centered on activities', 'info');
    }
}

function centerMapOnData() {
    if (!state.map.instance || state.data.properties.length === 0) return;
    
    const bounds = new google.maps.LatLngBounds();
    
    state.data.properties.forEach(property => {
        bounds.extend(new google.maps.LatLng(parseFloat(property.lat), parseFloat(property.lng)));
    });
    
    state.map.instance.fitBounds(bounds);
    
    // Ensure minimum zoom level
    google.maps.event.addListenerOnce(state.map.instance, 'bounds_changed', function() {
        if (state.map.instance.getZoom() > 15) {
            state.map.instance.setZoom(15);
        }
    });
}

// Online/Offline detection for missed activities
window.addEventListener('online', function() {
    state.map.isOnline = true;
    showNotification('You are back online! Checking for missed activities...', 'info');
    
    // Load any activities that occurred while offline
    if (state.token) {
        loadData().then(() => {
            const newOfflineActivities = state.data.activities.filter(activity => {
                const activityDate = new Date(activity.timestamp);
                return activityDate > new Date(Date.now() - 24 * 60 * 60 * 1000) && // Within last 24 hours
                       !state.map.offlineActivities.find(offline => offline.id === activity.id);
            });
            
            if (newOfflineActivities.length > 0) {
                state.map.offlineActivities = [...state.map.offlineActivities, ...newOfflineActivities];
                showNotification(`Found ${newOfflineActivities.length} missed activities while offline`, 'warning');
                
                if (state.currentTab === 'maps') {
                    loadMapData();
                }
            }
        });
    }
});

window.addEventListener('offline', function() {
    state.map.isOnline = false;
    showNotification('You are offline. Activities will be marked when you return online.', 'warning');
});

// Helper function for form data
FormData.prototype.get = function(name) {
    const value = this.getAll(name)[0];
    return value || null;
};