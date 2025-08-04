// Configuration
const API_BASE_URL = 'http://localhost:3000';
let currentUser = null;
let socket = null;
let map = null;
let activities = [];
let properties = [];
let salesReps = [];
let notifications = [];
let missedActivities = [];
const activityColors = {
    'visit': '#10b981',        
    'call': '#3b82f6',         
    'inspection': '#f59e0b',
    'follow-up': '#8b5cf6',    
    'note': '#6b7280'         
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
        currentUser = JSON.parse(userData);
        console.log('User logged in:', currentUser);
        hideLoginModal();
        initializeMainApp();
    } else {
        showLoginModal();
    }
    
    setupEventListeners();
}

function setupEventListeners() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchTab(e.target.dataset.tab));
    });
    
    // Add activity modal
    document.getElementById('addActivityBtn').addEventListener('click', showAddActivityModal);
    document.getElementById('cancelActivityBtn').addEventListener('click', hideAddActivityModal);
    document.getElementById('addActivityForm').addEventListener('submit', handleAddActivity);
    
    // Notification panel
    document.getElementById('notificationBtn').addEventListener('click', toggleNotificationPanel);
    
    // Replay button
    document.getElementById('replayBtn').addEventListener('click', handleReplay);
    
    // Activity filters
    document.getElementById('filterType').addEventListener('change', filterActivities);
    document.getElementById('filterProperty').addEventListener('change', filterActivities);
        document.getElementById('filterSalesRep').addEventListener('change', filterActivities);

    
    // Close modals when clicking outside
    document.addEventListener('click', (e) => {
        if (e.target.id === 'addActivityModal') {
            hideAddActivityModal();
        }
        if (!e.target.closest('#notificationPanel') && !e.target.closest('#notificationBtn')) {
            hideNotificationPanel();
        }
    });
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    const name = document.getElementById('salesRepName').value.trim();
    
    if (!name) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name }),
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('userData', JSON.stringify(data.salesRep));
            currentUser = data.salesRep;
            console.log(data)
            hideLoginModal();
            initializeMainApp();
        } else {
            alert('Login failed: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed. Please check your connection.');
    }
}

async function handleLogout() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }
    
    // Clean up
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    currentUser = null;
    
    if (socket) {
        socket.disconnect();
        socket = null;
    }
    
    showLoginModal();
}

function showLoginModal() {
    document.getElementById('loginModal').classList.remove('hidden');
}

function hideLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
}

// Main app initialization
function initializeMainApp() {
    updateUserInfo();
    initializeSocket();
    initializeMap();
    loadInitialData();
}

async function updateUserInfo() {
    currentUser = await fetch(`${API_BASE_URL}/sales-reps/${currentUser._id}`, {
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
    }).then(response => response.json());
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userScore').textContent = currentUser.score || 0;
        document.getElementById('userInitial').textContent = currentUser.name.charAt(0).toUpperCase();
    }
}

function initializeSocket() {
    if (socket) {
        socket.disconnect();
        socket.removeAllListeners(); 
    }
    
    socket = io(API_BASE_URL, {
        transports: ['websocket'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 1000,   
        reconnectionAttempts: 5,    
        timeout: 5000
    });
    
    socket.on('connect', () => {
        console.log('Connected to server');
        
        if (currentUser && currentUser._id) {
            socket.emit('user:online', { salesRepId: currentUser._id });
        } else {
            console.warn('Cannot emit user:online - currentUser not available');
        }
    });
    
    socket.on('activity:new', (activity) => {
        console.log('📝 New activity received:', activity);
        handleNewActivity(activity);
    });
    
    socket.on('activity:replay', (replayActivities) => {
        console.log('🔄 Replay activities received:', replayActivities?.length || 0);
        handleReplayActivities(replayActivities);
    });
    
    socket.on('notification', (message) => {
        console.log('🔔 Notification received:', message);
        addNotification(message);
    });
    
    socket.on('disconnect', (reason) => {
        console.log('🔴 Disconnected from server. Reason:', reason);
        
        if (reason === 'io server disconnect') {
            socket.connect();
        }
    });
    
    socket.on('reconnect', (attemptNumber) => {
        console.log('🔄 Reconnected to server after', attemptNumber, 'attempts');
        
        if (currentUser && currentUser._id) {
            socket.emit('user:online', { salesRepId: currentUser._id });
        }
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
        console.log('🔄 Attempting to reconnect...', attemptNumber);
    });
    
    socket.on('reconnect_error', (error) => {
        console.error('❌ Reconnection error:', error);
    });
    
    socket.on('reconnect_failed', () => {
        console.error('❌ Failed to reconnect to server after maximum attempts');
        addNotification('Connection lost. Please refresh the page.');
    });
    
    socket.on('connect_error', (error) => {
        console.error('❌ Connection error:', error);
    });
}

function disconnectSocket() {
    if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socket = null;
    }
}

function isSocketConnected() {
    return socket && socket.connected;
}

function logout() {
    console.log('Logging out...');
    
    disconnectSocket();
    
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    currentUser = null;
    
    showLoginModal();
    clearAppData();
}

function initializeMap() {
    const container = document.getElementById('map');

    if (map) {
        map.remove();
    }

    map = L.map('map').setView([30.0444, 31.2357], 12); // Cairo center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
}

async function loadInitialData() {
    await Promise.all([
        loadProperties(),
        loadActivities(),
        loadSalesReps()
    ]);
    
    populatePropertySelects();
    updateMap();
    updateActivitiesTable();
    updateSalesRepsTable();
}

// Data loading functions
async function loadProperties() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/property`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        if (response.ok) {
            properties = await response.json();
            console.log('Properties loaded:', properties);
        }
    } catch (error) {
        console.error('Error loading properties:', error);
    }
}

async function loadActivities(filters = {}) {
    try {
        const token = localStorage.getItem('token');
        
        // Build query string from filters
        const queryParams = new URLSearchParams();
        if (filters.activityType) queryParams.append('activityType', filters.activityType);
        if (filters.propertyId) queryParams.append('propertyId', filters.propertyId);
        if (filters.salesRepId) queryParams.append('salesRepId', filters.salesRepId);
        
        const queryString = queryParams.toString();
        const url = `${API_BASE_URL}/activities${queryString ? '?' + queryString : ''}`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            activities = await response.json();
            console.log('Activities loaded with filters:', filters, activities.length);
        }
    } catch (error) {
        console.error('Error loading activities:', error);
    }
}

async function loadSalesReps() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/sales-reps`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            salesReps = await response.json();
        }
    } catch (error) {
        console.error('Error loading sales reps:', error);
    }
}

// UI Update functions
function populatePropertySelects() {
    const selects = [
        document.getElementById('filterProperty'),
        document.getElementById('activityProperty'),
        document.getElementById('editActivityProperty'),
    ];
    
    selects.forEach(select => {
        // Clear existing options (except first one)
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }
        
        properties.forEach(property => {
            const option = document.createElement('option');
            option.value = property._id;
            option.textContent = property.name;
            select.appendChild(option);
        });
    });
    
    // Populate sales rep filter
    const salesRepSelect = document.getElementById('filterSalesRep');
    while (salesRepSelect.children.length > 1) {
        salesRepSelect.removeChild(salesRepSelect.lastChild);
    }
    
    salesReps.forEach(rep => {
        const option = document.createElement('option');
        option.value = rep._id;
        option.textContent = rep.name;
        salesRepSelect.appendChild(option);
    });
}

function updateMap() {
    // Clear existing markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Marker) {
            map.removeLayer(layer);
        }
    });
    
    // Add property markers
    // properties.forEach(property => {
    //     if (property.location) {
    //         L.marker([property.location.lat, property.location.lng])
    //             .addTo(map)
    //             .bindPopup(`<strong>${property.name}</strong><br>${property.address}`);
    //     }
    // });
    
    // Add activity markers
    activities.forEach(activity => {
    if (activity.location) {
        const activityClass = `activity-${activity.activityType}`;
        
        const activityColor = activityColors[activity.activityType] || '#6b7280'; 
        
        const marker = L.circleMarker([activity.location.lat, activity.location.lng], {
            radius: 8,
            className: activityClass,
            fillColor: activityColor,    
            fillOpacity: 0.8,
            stroke: true,
            weight: 2,
            color: activityColor,       
            opacity: 1
        }).addTo(map);
        
        const popupContent = `
            <strong>${activity.activityType.charAt(0).toUpperCase() + activity.activityType.slice(1)}</strong><br>
            Property: ${activity.propertyId?.name || 'Unknown'}<br>
            Sales Rep: ${activity.salesRepId?.name || 'Unknown'}<br>
            Date: ${new Date(activity.timestamp).toLocaleDateString()}<br>
            ${activity.note ? `Note: ${activity.note}` : ''}
        `;
        
        marker.bindPopup(popupContent);
    }
});
}

function updateActivitiesTable() {
    const tbody = document.getElementById('activitiesTableBody');
    tbody.innerHTML = '';
    
    const filteredActivities = getFilteredActivities();
    
    filteredActivities.forEach(activity => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getActivityColor(activity.activityType)}-100 text-${getActivityColor(activity.activityType)}-800">
                    ${activity.activityType.charAt(0).toUpperCase() + activity.activityType.slice(1)}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${activity.propertyId?.name || 'Unknown'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${activity.salesRepId?.name || 'Unknown'}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(activity.timestamp).toLocaleString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${activity.weight}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button class="text-blue-600 hover:text-blue-900 mr-3" onclick="editActivity('${activity._id}')">Edit</button>
                <button class="text-red-600 hover:text-red-900" onclick="deleteActivity('${activity._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateSalesRepsTable() {
    const tbody = document.getElementById('salesRepsTableBody');
    tbody.innerHTML = '';
    
    let onlineCount = 0;
    let offlineCount = 0;
    console.log(salesReps);
    salesReps.forEach(rep => {
        if (rep.isOnline) onlineCount++;
        else offlineCount++;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                    <div class="flex-shrink-0 h-10 w-10">
                        <div class="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                            <span class="text-white font-medium">${rep.name.charAt(0).toUpperCase()}</span>
                        </div>
                    </div>
                    <div class="ml-4">
                        <div class="text-sm font-medium text-gray-900">${rep.name}</div>
                    </div>
                </div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${rep.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                    <span class="w-2 h-2 mr-1.5 rounded-full ${rep.isOnline ? 'bg-green-400' : 'bg-gray-400'}"></span>
                    ${rep.isOnline ? 'Online' : 'Offline'}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                ${rep.score || 0}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${rep.lastOnline ? new Date(rep.lastOnline).toLocaleString() : 'Never'}
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Update stats
    document.getElementById('onlineCount').textContent = onlineCount;
    document.getElementById('offlineCount').textContent = offlineCount;
    document.getElementById('totalCount').textContent = salesReps.length;
}

// Activity management
function showAddActivityModal() {
    document.getElementById('addActivityModal').classList.remove('hidden');   
}

function hideAddActivityModal() {
    document.getElementById('addActivityModal').classList.add('hidden');
    document.getElementById('addActivityForm').reset();
}

async function handleAddActivity(e) {
    e.preventDefault();
    
    const propertyId = document.getElementById('activityProperty').value;
    const activityType = document.getElementById('activityType').value;
    // const timestamp = document.getElementById('activityDateTime').value;
    const note = document.getElementById('activityNote').value;
    
    // Get property location for the activity
    const property = properties.find(p => p._id === propertyId);
    if (!property || !property.location) {
        alert('Selected property does not have location data');
        return;
    }
    
    const activityData = {
        propertyId,
        activityType,
        note: note || undefined
    };
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/activities`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(activityData),
        });
        
        if (response.ok) {
            const result = await response.json();
            hideAddActivityModal();
            // Refresh data
            await loadActivities();
            await loadSalesReps(); // Refresh to get updated scores
            updateActivitiesTable();
            updateSalesRepsTable();
            updateMap();
            updateUserInfo();
        } else {
            const error = await response.json();
            alert('Failed to add activity: ' + (error.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error adding activity:', error);
        alert('Failed to add activity. Please check your connection.');
    }
}

// Filtering
function getFilteredActivities() {
    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

async function filterActivities() {
    const typeFilter = document.getElementById('filterType').value;
    const propertyFilter = document.getElementById('filterProperty').value;
    const salesRepFilter = document.getElementById('filterSalesRep').value;
    
    const filters = {};
    if (typeFilter) filters.activityType = typeFilter;
    if (propertyFilter) filters.propertyId = propertyFilter;
    if (salesRepFilter) filters.salesRepId = salesRepFilter;
    
    console.log('Applying filters:', filters);
    
    // Load activities with filters from backend
    await loadActivities(filters);
    
    // Update UI
    updateActivitiesTable();
    updateMap();
}

// Tab navigation
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.remove('border-transparent', 'text-gray-500');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('border-blue-500', 'text-blue-600');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    
    // Refresh map if switching to dashboard
    if (tabName === 'dashboard' && map) {
        setTimeout(() => map.invalidateSize(), 100);
    }
}

// Notifications
function toggleNotificationPanel() {
    const panel = document.getElementById('notificationPanel');
    panel.classList.toggle('hidden');
    
    if (!panel.classList.contains('hidden')) {
        updateNotificationPanel();
    }
}

function hideNotificationPanel() {
    document.getElementById('notificationPanel').classList.add('hidden');
}

function addNotification(message) {
    notifications.unshift({
        id: Date.now(),
        message,
        timestamp: new Date(),
        read: false
    });
    
    updateNotificationBadge();
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
        new Notification('Property Activity Tracker', {
            body: message,
            icon: '/favicon.ico'
        });
    }
}

function updateNotificationBadge() {
    const unreadCount = notifications.filter(n => !n.read).length;
    const badge = document.getElementById('notificationBadge');
    
    if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function updateNotificationPanel() {
    const list = document.getElementById('notificationList');
    list.innerHTML = '';
    
    if (notifications.length === 0) {
        list.innerHTML = '<div class="p-4 text-center text-gray-500">No notifications</div>';
        return;
    }
    
    notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = `p-4 border-b border-gray-200 ${!notification.read ? 'bg-blue-50' : ''}`;
        item.innerHTML = `
            <p class="text-sm text-gray-900">${notification.message}</p>
            <p class="text-xs text-gray-500 mt-1">${notification.timestamp.toLocaleString()}</p>
        `;
        
        item.addEventListener('click', () => {
            notification.read = true;
            updateNotificationBadge();
            updateNotificationPanel();
        });
        
        list.appendChild(item);
    });
}

// Replay functionality
function handleReplay() {
    if (socket) {
        socket.emit('user:online', { salesRepId: currentUser._id });
        addNotification('Requesting missed activities...');
    }
}

function handleReplayActivities(replayActivities) {
    if (replayActivities.length > 0) {
        addNotification(`Received ${replayActivities.length} missed activities`);
        
        // Add missed activities to current activities
        replayActivities.forEach(activity => {
            const existingIndex = activities.findIndex(a => a._id === activity._id);
            if (existingIndex === -1) {
                activities.push(activity);
            }
        });
        
        // Update UI
        updateActivitiesTable();
        updateMap();
    } else {
        addNotification('No missed activities');
    }
}

function handleNewActivity(activity) {
    // Add to activities list if not already present
    const existingIndex = activities.findIndex(a => a._id === activity._id);
    if (existingIndex === -1) {
        activities.unshift(activity);
    } else {
        activities[existingIndex] = activity;
    }
    
    // Update UI
    updateActivitiesTable();
    updateMap();
    
    // Add notification
    const message = `New ${activity.activityType} activity by ${activity.salesRepId?.name || 'Unknown'} at ${activity.propertyId?.name || 'Unknown property'}`;
    addNotification(message);
}

// Utility functions
function getActivityColor(activityType) {
    const colors = {
        visit: 'green',
        call: 'blue',
        inspection: 'yellow',
        'follow-up': 'purple',
        note: 'gray'
    };
    return colors[activityType] || 'gray';
}

let currentEditingActivityId = null;

async function editActivity(activityId) {
  try {
    console.log('Editing activity with ID:', activityId);
    const res = await fetch(`${API_BASE_URL}/activities/${activityId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    const activity = await res.json();
    console.log('Editing activity:', activity.propertyId.name);

    currentEditingActivityId = activityId;

    document.getElementById('editActivityType').value = activity.activityType || '';
    document.getElementById('editActivityProperty').value = activity.propertyId._id || '';

document.getElementById("editActivityModal").classList.remove("hidden");
  } catch (error) {
    console.error('Error loading activity:', error);
    alert('Failed to load activity for editing.');
  }
}

async function saveActivityChanges() {
  const activityType = document.getElementById('editActivityType').value;
  const propertyId = document.getElementById('editActivityProperty').value;

  try {
    const res = await fetch(`${API_BASE_URL}/activities/${currentEditingActivityId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ activityType, propertyId }),
    });
    console.log("res", await res.json());

    if (!res.ok) throw new Error('Failed to save changes');

document.getElementById("editActivityModal").classList.add("hidden");
    alert('Activity updated successfully');
    loadInitialData(); 

  } catch (error) {
    console.error('Error saving changes:', error);
    alert('Failed to save activity.');
  }
}



async function deleteActivity(activityId) {
    if (!confirm('Are you sure you want to delete this activity?')) {
        return;
    }
    
    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/activities/${activityId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            // Remove from local array
            activities = activities.filter(a => a._id !== activityId);
            updateActivitiesTable();
            updateMap();
        } else {
            alert('Failed to delete activity');
        }
    } catch (error) {
        console.error('Error deleting activity:', error);
        alert('Failed to delete activity. Please check your connection.');
    }
}

// Request notification permission on load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}