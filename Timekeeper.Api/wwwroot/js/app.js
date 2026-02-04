// API Base URL
const API_BASE = '/api';

// Global state
let currentTimer = null;
let timerInterval = null;
let customers = [];
let projects = [];
let tasks = [];
let entries = [];

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadInitialData();
    checkRunningTimer();
});

// Setup event listeners
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Timer controls
    document.getElementById('timer-task-select').addEventListener('change', (e) => {
        document.getElementById('start-timer-btn').disabled = !e.target.value;
    });
    document.getElementById('start-timer-btn').addEventListener('click', startTimer);
    document.getElementById('stop-timer-btn').addEventListener('click', stopTimer);

    // Add buttons
    document.getElementById('add-customer-btn').addEventListener('click', () => showCustomerForm());
    document.getElementById('add-project-btn').addEventListener('click', () => showProjectForm());
    document.getElementById('add-task-btn').addEventListener('click', () => showTaskForm());
    document.getElementById('add-entry-btn').addEventListener('click', () => showEntryForm());

    // Filter buttons
    document.getElementById('filter-entries-btn').addEventListener('click', loadEntries);
    document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

    // Export buttons
    document.getElementById('export-csv-btn').addEventListener('click', () => exportData('csv'));
    document.getElementById('export-xlsx-btn').addEventListener('click', () => exportData('xlsx'));

    // Reports
    document.getElementById('load-reports-btn').addEventListener('click', loadReports);

    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
    });
}

// Tab switching
function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load data for the tab
    switch(tabName) {
        case 'entries': loadEntries(); break;
        case 'customers': loadCustomers(); break;
        case 'projects': loadProjects(); break;
        case 'tasks': loadTasks(); break;
        case 'reports': loadReports(); break;
    }
}

// Load initial data
async function loadInitialData() {
    await Promise.all([
        loadCustomers(),
        loadProjects(),
        loadTasks(),
        loadEntries()
    ]);
    populateFilters();
}

// Timer functions
async function checkRunningTimer() {
    try {
        const response = await fetch(`${API_BASE}/timeentries/running`);
        const data = await response.json();
        
        if (data && data.id) {
            currentTimer = data;
            showRunningTimer(data);
        } else {
            showStartTimerForm();
        }
    } catch (error) {
        console.error('Error checking timer:', error);
    }
}

function showRunningTimer(timer) {
    currentTimer = timer;
    document.getElementById('start-timer-form').style.display = 'none';
    document.getElementById('stop-timer-form').style.display = 'block';
    document.getElementById('timer-info').style.display = 'block';
    document.getElementById('running-task-name').textContent = timer.taskName;
    document.getElementById('running-project-name').textContent = timer.projectName;
    document.getElementById('running-customer-name').textContent = timer.customerName;
    startTimerDisplay(new Date(timer.startTime));
}

function showStartTimerForm() {
    currentTimer = null;
    document.getElementById('start-timer-form').style.display = 'block';
    document.getElementById('stop-timer-form').style.display = 'none';
    document.getElementById('timer-info').style.display = 'none';
    stopTimerDisplay();
}

function startTimerDisplay(startTime) {
    if (timerInterval) clearInterval(timerInterval);
    
    timerInterval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer-time').textContent = `${hours}:${minutes}:${seconds}`;
    }, 1000);
}

function stopTimerDisplay() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    document.getElementById('timer-time').textContent = '00:00:00';
}

async function startTimer() {
    const taskId = document.getElementById('timer-task-select').value;
    const notes = document.getElementById('timer-notes').value;

    try {
        const response = await fetch(`${API_BASE}/timeentries/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ taskId: parseInt(taskId), notes })
        });

        if (response.ok) {
            const timer = await response.json();
            showRunningTimer(timer);
            document.getElementById('timer-notes').value = '';
            showSuccess('Timer started successfully!');
        } else {
            const error = await response.text();
            showError(error);
        }
    } catch (error) {
        showError('Failed to start timer');
        console.error(error);
    }
}

async function stopTimer() {
    if (!currentTimer) return;

    try {
        const response = await fetch(`${API_BASE}/timeentries/${currentTimer.id}/stop`, {
            method: 'POST'
        });

        if (response.ok) {
            showStartTimerForm();
            loadEntries();
            showSuccess('Timer stopped successfully!');
        } else {
            const error = await response.text();
            showError(error);
        }
    } catch (error) {
        showError('Failed to stop timer');
        console.error(error);
    }
}

// CRUD operations
async function loadCustomers() {
    try {
        const response = await fetch(`${API_BASE}/customers`);
        customers = await response.json();
        renderCustomers();
        populateCustomerSelects();
    } catch (error) {
        console.error('Error loading customers:', error);
    }
}

async function loadProjects() {
    try {
        const response = await fetch(`${API_BASE}/projects`);
        projects = await response.json();
        renderProjects();
        populateProjectSelects();
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}

async function loadTasks() {
    try {
        const response = await fetch(`${API_BASE}/tasks`);
        tasks = await response.json();
        renderTasks();
        populateTaskSelects();
    } catch (error) {
        console.error('Error loading tasks:', error);
    }
}

async function loadEntries() {
    try {
        const params = new URLSearchParams();
        
        const startDate = document.getElementById('entry-start-date').value;
        const endDate = document.getElementById('entry-end-date').value;
        const customerId = document.getElementById('entry-customer-filter').value;
        const projectId = document.getElementById('entry-project-filter').value;
        const taskId = document.getElementById('entry-task-filter').value;
        const search = document.getElementById('entry-search').value;

        if (startDate) params.append('startDate', startDate);
        if (endDate) params.append('endDate', endDate);
        if (customerId) params.append('customerId', customerId);
        if (projectId) params.append('projectId', projectId);
        if (taskId) params.append('taskId', taskId);
        if (search) params.append('search', search);

        const response = await fetch(`${API_BASE}/timeentries?${params}`);
        entries = await response.json();
        renderEntries();
    } catch (error) {
        console.error('Error loading entries:', error);
    }
}

// Render functions
function renderCustomers() {
    const tbody = document.getElementById('customers-tbody');
    tbody.innerHTML = customers.map(c => `
        <tr>
            <td>${c.name}</td>
            <td>${c.description || ''}</td>
            <td class="${c.isActive ? 'status-active' : 'status-inactive'}">
                ${c.isActive ? 'Active' : 'Inactive'}
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editCustomer(${c.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteCustomer(${c.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderProjects() {
    const tbody = document.getElementById('projects-tbody');
    tbody.innerHTML = projects.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.customerName}</td>
            <td>${p.description || ''}</td>
            <td class="${p.isActive ? 'status-active' : 'status-inactive'}">
                ${p.isActive ? 'Active' : 'Inactive'}
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editProject(${p.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProject(${p.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderTasks() {
    const tbody = document.getElementById('tasks-tbody');
    tbody.innerHTML = tasks.map(t => `
        <tr>
            <td>${t.name}</td>
            <td>${t.projectName}</td>
            <td>${t.customerName}</td>
            <td>${t.description || ''}</td>
            <td class="${t.isActive ? 'status-active' : 'status-inactive'}">
                ${t.isActive ? 'Active' : 'Inactive'}
            </td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editTask(${t.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

function renderEntries() {
    const tbody = document.getElementById('entries-tbody');
    tbody.innerHTML = entries.map(e => `
        <tr>
            <td>${e.customerName}</td>
            <td>${e.projectName}</td>
            <td>${e.taskName}</td>
            <td>${formatDateTime(e.startTime)}</td>
            <td>${e.endTime ? formatDateTime(e.endTime) : '<span class="status-active">Running</span>'}</td>
            <td>${e.durationMinutes ? formatDuration(e.durationMinutes) : '-'}</td>
            <td>${e.notes || ''}</td>
            <td>
                <button class="btn btn-secondary btn-sm" onclick="editEntry(${e.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEntry(${e.id})">Delete</button>
            </td>
        </tr>
    `).join('');
}

// Populate dropdowns
function populateCustomerSelects() {
    const selects = [
        document.getElementById('entry-customer-filter'),
        document.getElementById('report-customer-filter')
    ];

    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">All Customers</option>' +
            customers.filter(c => c.isActive).map(c => 
                `<option value="${c.id}">${c.name}</option>`
            ).join('');
        select.value = currentValue;
    });
}

function populateProjectSelects() {
    const selects = [
        document.getElementById('entry-project-filter'),
        document.getElementById('report-project-filter')
    ];

    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">All Projects</option>' +
            projects.filter(p => p.isActive).map(p => 
                `<option value="${p.id}">${p.name} (${p.customerName})</option>`
            ).join('');
        select.value = currentValue;
    });
}

function populateTaskSelects() {
    const timerSelect = document.getElementById('timer-task-select');
    const filterSelect = document.getElementById('entry-task-filter');

    const taskOptions = tasks.filter(t => t.isActive).map(t => 
        `<option value="${t.id}">${t.name} - ${t.projectName} (${t.customerName})</option>`
    ).join('');

    timerSelect.innerHTML = '<option value="">-- Select a task --</option>' + taskOptions;
    filterSelect.innerHTML = '<option value="">All Tasks</option>' + taskOptions;
}

function populateFilters() {
    populateCustomerSelects();
    populateProjectSelects();
    populateTaskSelects();
}

// Forms
function showCustomerForm(customer = null) {
    const isEdit = !!customer;
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Edit' : 'New'} Customer</h2>
        <form id="customer-form">
            <input type="text" id="customer-name" class="form-control" placeholder="Customer Name" value="${customer?.name || ''}" required>
            <textarea id="customer-description" class="form-control" placeholder="Description" rows="3">${customer?.description || ''}</textarea>
            ${isEdit ? `
                <label>
                    <input type="checkbox" id="customer-active" ${customer.isActive ? 'checked' : ''}> Active
                </label>
            ` : ''}
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `;

    document.getElementById('customer-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveCustomer(customer?.id);
    });

    openModal();
}

function showProjectForm(project = null) {
    const isEdit = !!project;
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Edit' : 'New'} Project</h2>
        <form id="project-form">
            <input type="text" id="project-name" class="form-control" placeholder="Project Name" value="${project?.name || ''}" required>
            <select id="project-customer" class="form-control" required>
                <option value="">-- Select Customer --</option>
                ${customers.filter(c => c.isActive).map(c => 
                    `<option value="${c.id}" ${project?.customerId === c.id ? 'selected' : ''}>${c.name}</option>`
                ).join('')}
            </select>
            <textarea id="project-description" class="form-control" placeholder="Description" rows="3">${project?.description || ''}</textarea>
            ${isEdit ? `
                <label>
                    <input type="checkbox" id="project-active" ${project.isActive ? 'checked' : ''}> Active
                </label>
            ` : ''}
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `;

    document.getElementById('project-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveProject(project?.id);
    });

    openModal();
}

function showTaskForm(task = null) {
    const isEdit = !!task;
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Edit' : 'New'} Task</h2>
        <form id="task-form">
            <input type="text" id="task-name" class="form-control" placeholder="Task Name" value="${task?.name || ''}" required>
            <select id="task-project" class="form-control" required>
                <option value="">-- Select Project --</option>
                ${projects.filter(p => p.isActive).map(p => 
                    `<option value="${p.id}" ${task?.projectId === p.id ? 'selected' : ''}>${p.name} (${p.customerName})</option>`
                ).join('')}
            </select>
            <textarea id="task-description" class="form-control" placeholder="Description" rows="3">${task?.description || ''}</textarea>
            ${isEdit ? `
                <label>
                    <input type="checkbox" id="task-active" ${task.isActive ? 'checked' : ''}> Active
                </label>
            ` : ''}
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `;

    document.getElementById('task-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveTask(task?.id);
    });

    openModal();
}

function showEntryForm(entry = null) {
    const isEdit = !!entry;
    const modalBody = document.getElementById('modal-body');
    
    modalBody.innerHTML = `
        <h2>${isEdit ? 'Edit' : 'New'} Time Entry</h2>
        <form id="entry-form">
            <select id="entry-task" class="form-control" required ${isEdit ? 'disabled' : ''}>
                <option value="">-- Select Task --</option>
                ${tasks.filter(t => t.isActive).map(t => 
                    `<option value="${t.id}" ${entry?.taskId === t.id ? 'selected' : ''}>${t.name} - ${t.projectName}</option>`
                ).join('')}
            </select>
            <label>Start Time</label>
            <input type="datetime-local" id="entry-start" class="form-control" value="${entry ? formatDateTimeInput(entry.startTime) : ''}" required>
            <label>End Time</label>
            <input type="datetime-local" id="entry-end" class="form-control" value="${entry && entry.endTime ? formatDateTimeInput(entry.endTime) : ''}">
            <textarea id="entry-notes" class="form-control" placeholder="Notes" rows="3">${entry?.notes || ''}</textarea>
            <button type="submit" class="btn btn-primary">Save</button>
            <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
        </form>
    `;

    document.getElementById('entry-form').addEventListener('submit', (e) => {
        e.preventDefault();
        saveEntry(entry?.id);
    });

    openModal();
}

// Save functions
async function saveCustomer(id = null) {
    const data = {
        name: document.getElementById('customer-name').value,
        description: document.getElementById('customer-description').value || null
    };

    if (id) {
        data.isActive = document.getElementById('customer-active').checked;
    }

    try {
        const url = id ? `${API_BASE}/customers/${id}` : `${API_BASE}/customers`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadCustomers();
            showSuccess(`Customer ${id ? 'updated' : 'created'} successfully!`);
        } else {
            showError('Failed to save customer');
        }
    } catch (error) {
        showError('Failed to save customer');
        console.error(error);
    }
}

async function saveProject(id = null) {
    const data = {
        name: document.getElementById('project-name').value,
        customerId: parseInt(document.getElementById('project-customer').value),
        description: document.getElementById('project-description').value || null
    };

    if (id) {
        data.isActive = document.getElementById('project-active').checked;
    }

    try {
        const url = id ? `${API_BASE}/projects/${id}` : `${API_BASE}/projects`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadProjects();
            showSuccess(`Project ${id ? 'updated' : 'created'} successfully!`);
        } else {
            showError('Failed to save project');
        }
    } catch (error) {
        showError('Failed to save project');
        console.error(error);
    }
}

async function saveTask(id = null) {
    const data = {
        name: document.getElementById('task-name').value,
        projectId: parseInt(document.getElementById('task-project').value),
        description: document.getElementById('task-description').value || null
    };

    if (id) {
        data.isActive = document.getElementById('task-active').checked;
    }

    try {
        const url = id ? `${API_BASE}/tasks/${id}` : `${API_BASE}/tasks`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadTasks();
            showSuccess(`Task ${id ? 'updated' : 'created'} successfully!`);
        } else {
            showError('Failed to save task');
        }
    } catch (error) {
        showError('Failed to save task');
        console.error(error);
    }
}

async function saveEntry(id = null) {
    const data = {
        taskId: parseInt(document.getElementById('entry-task').value),
        startTime: document.getElementById('entry-start').value,
        endTime: document.getElementById('entry-end').value || null,
        notes: document.getElementById('entry-notes').value || null
    };

    try {
        const url = id ? `${API_BASE}/timeentries/${id}` : `${API_BASE}/timeentries`;
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            closeModal();
            await loadEntries();
            showSuccess(`Time entry ${id ? 'updated' : 'created'} successfully!`);
        } else {
            const error = await response.text();
            showError(error);
        }
    } catch (error) {
        showError('Failed to save time entry');
        console.error(error);
    }
}

// Edit functions
function editCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (customer) showCustomerForm(customer);
}

function editProject(id) {
    const project = projects.find(p => p.id === id);
    if (project) showProjectForm(project);
}

function editTask(id) {
    const task = tasks.find(t => t.id === id);
    if (task) showTaskForm(task);
}

function editEntry(id) {
    const entry = entries.find(e => e.id === id);
    if (entry) showEntryForm(entry);
}

// Delete functions
async function deleteCustomer(id) {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
        const response = await fetch(`${API_BASE}/customers/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadCustomers();
            showSuccess('Customer deleted successfully!');
        } else {
            showError('Failed to delete customer');
        }
    } catch (error) {
        showError('Failed to delete customer');
        console.error(error);
    }
}

async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
        const response = await fetch(`${API_BASE}/projects/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadProjects();
            showSuccess('Project deleted successfully!');
        } else {
            showError('Failed to delete project');
        }
    } catch (error) {
        showError('Failed to delete project');
        console.error(error);
    }
}

async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
        const response = await fetch(`${API_BASE}/tasks/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadTasks();
            showSuccess('Task deleted successfully!');
        } else {
            showError('Failed to delete task');
        }
    } catch (error) {
        showError('Failed to delete task');
        console.error(error);
    }
}

async function deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this time entry?')) return;

    try {
        const response = await fetch(`${API_BASE}/timeentries/${id}`, { method: 'DELETE' });
        if (response.ok) {
            await loadEntries();
            showSuccess('Time entry deleted successfully!');
        } else {
            showError('Failed to delete time entry');
        }
    } catch (error) {
        showError('Failed to delete time entry');
        console.error(error);
    }
}

// Reports
async function loadReports() {
    const params = new URLSearchParams();
    
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    const customerId = document.getElementById('report-customer-filter').value;
    const projectId = document.getElementById('report-project-filter').value;

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (customerId) params.append('customerId', customerId);
    if (projectId) params.append('projectId', projectId);

    try {
        const [dailyResponse, weeklyResponse] = await Promise.all([
            fetch(`${API_BASE}/timeentries/daily-totals?${params}`),
            fetch(`${API_BASE}/timeentries/weekly-totals?${params}`)
        ]);

        const dailyTotals = await dailyResponse.json();
        const weeklyTotals = await weeklyResponse.json();

        renderDailyTotals(dailyTotals);
        renderWeeklyTotals(weeklyTotals);
    } catch (error) {
        console.error('Error loading reports:', error);
    }
}

function renderDailyTotals(totals) {
    const tbody = document.getElementById('daily-totals-tbody');
    tbody.innerHTML = totals.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.totalHours.toFixed(2)}</td>
            <td>${t.entryCount}</td>
        </tr>
    `).join('');
}

function renderWeeklyTotals(totals) {
    const tbody = document.getElementById('weekly-totals-tbody');
    tbody.innerHTML = totals.map(t => `
        <tr>
            <td>${formatDate(t.date)}</td>
            <td>${t.totalHours.toFixed(2)}</td>
            <td>${t.entryCount}</td>
        </tr>
    `).join('');
}

// Export functions
function exportData(format) {
    const params = new URLSearchParams();
    
    const startDate = document.getElementById('entry-start-date').value;
    const endDate = document.getElementById('entry-end-date').value;
    const customerId = document.getElementById('entry-customer-filter').value;
    const projectId = document.getElementById('entry-project-filter').value;
    const taskId = document.getElementById('entry-task-filter').value;

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (customerId) params.append('customerId', customerId);
    if (projectId) params.append('projectId', projectId);
    if (taskId) params.append('taskId', taskId);

    window.location.href = `${API_BASE}/export/${format}?${params}`;
}

// Utility functions
function clearFilters() {
    document.getElementById('entry-start-date').value = '';
    document.getElementById('entry-end-date').value = '';
    document.getElementById('entry-customer-filter').value = '';
    document.getElementById('entry-project-filter').value = '';
    document.getElementById('entry-task-filter').value = '';
    document.getElementById('entry-search').value = '';
    loadEntries();
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
}

function formatDateTimeInput(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
}

function openModal() {
    document.getElementById('modal').classList.add('active');
}

function closeModal() {
    document.getElementById('modal').classList.remove('active');
}

function showSuccess(message) {
    // You could implement a toast notification here
    console.log('Success:', message);
    alert(message);
}

function showError(message) {
    // You could implement a toast notification here
    console.error('Error:', message);
    alert('Error: ' + message);
}
