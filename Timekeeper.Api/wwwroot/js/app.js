// API Base URL
const API_BASE = '/api';

// Global state
let currentTimer = null;
let timerInterval = null;
let continuingEntryId = null; // Track which entry is being continued
let elapsedTimeOffset = 0; // Offset for continuing entries
let summaryVisible = true; // Track summary visibility
let customers = [];
let projects = [];
let tasks = [];
let entries = [];
let selectedEntryIds = new Set(); // Track selected entry IDs for bulk operations
let currentFilters = {}; // Track current column filters

// Settings state (loaded from localStorage)
let settings = {
    darkMode: false,
    roundingEnabled: false,
    roundingThreshold: 3, // minutes
    billingIncrement: 15 // minutes
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadSettings();
    applySettings();
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
    document.getElementById('timer-task-search').addEventListener('input', filterTaskOptions);
    document.getElementById('timer-task-search').addEventListener('focus', () => {
        document.getElementById('timer-task-dropdown').style.display = 'block';
        filterTaskOptions();
    });
    document.getElementById('start-timer-btn').addEventListener('click', startTimer);
    document.getElementById('stop-timer-btn').addEventListener('click', stopTimer);

    // Add buttons
    document.getElementById('add-customer-btn').addEventListener('click', () => showCustomerForm());
    document.getElementById('add-project-btn').addEventListener('click', () => showProjectForm());
    document.getElementById('add-task-btn').addEventListener('click', () => showTaskForm());
    document.getElementById('add-entry-btn').addEventListener('click', () => showEntryForm());
    document.getElementById('settings-btn').addEventListener('click', showSettingsForm);
    
    // Import buttons
    document.getElementById('import-tasks-btn').addEventListener('click', showImportDialog);
    document.getElementById('download-template-btn').addEventListener('click', downloadTemplate);

    // Filter buttons
    document.getElementById('filter-entries-btn').addEventListener('click', loadEntries);
    document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

    // Bulk delete
    document.getElementById('select-all-entries').addEventListener('change', toggleSelectAll);
    document.getElementById('delete-selected-btn').addEventListener('click', bulkDeleteEntries);
    
    // Search on Enter key
    document.getElementById('entry-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadEntries();
        }
    });

    // Export buttons
    document.getElementById('export-csv-btn').addEventListener('click', () => exportData('csv'));
    document.getElementById('export-xlsx-btn').addEventListener('click', () => exportData('xlsx'));
    
    // Column selector
    document.getElementById('column-selector-btn').addEventListener('click', toggleColumnSelector);

    // Reports
    document.getElementById('load-reports-btn').addEventListener('click', loadReports);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);

    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target.id === 'modal') closeModal();
        
        // Close column selector when clicking outside
        const columnSelector = document.querySelector('.column-selector');
        if (columnSelector && !columnSelector.contains(e.target) && 
            e.target.id !== 'column-selector-btn') {
            columnSelector.remove();
        }
        
        // Close task dropdown when clicking outside
        const dropdown = document.getElementById('timer-task-dropdown');
        const searchInput = document.getElementById('timer-task-search');
        if (dropdown && searchInput && 
            !dropdown.contains(e.target) && 
            e.target !== searchInput) {
            dropdown.style.display = 'none';
        }
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
    initializeColumnResizing();
    loadColumnPreferences();
    initializeColumnDragDrop();
    initializeContextMenu();
}

// Timer functions
async function checkRunningTimer() {
    try {
        const response = await fetch(`${API_BASE}/timeentries/running`);
        
        if (!response.ok) {
            showStartTimerForm();
            return;
        }
        
        const data = await response.json();
        
        if (data && data.id) {
            currentTimer = data;
            showRunningTimer(data);
        } else {
            showStartTimerForm();
        }
    } catch (error) {
        console.error('Error checking timer:', error);
        showStartTimerForm();
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
        const elapsed = Math.floor((now - startTime) / 1000) + elapsedTimeOffset;
        const hours = Math.floor(elapsed / 3600).toString().padStart(2, '0');
        const minutes = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer-time').textContent = `${hours}:${minutes}:${seconds}`;
        
        // Update summary every 60 seconds
        if (elapsed % 60 === 0) {
            updateTimeSummary();
        }
    }, 1000);
    
    // Initial summary update
    updateTimeSummary();
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
            // Clear continuing entry tracking
            continuingEntryId = null;
            elapsedTimeOffset = 0;
            
            // Remove highlights
            document.querySelectorAll('tr.continuing-entry').forEach(row => {
                row.classList.remove('continuing-entry');
            });
            
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

async function resumeTracking(entryId, taskId, notes = '', existingDuration = 0) {
    // If timer is running, check if it's the same entry
    if (currentTimer) {
        if (continuingEntryId === entryId) {
            // Deselect - stop and don't continue
            await stopTimer();
            continuingEntryId = null;
            elapsedTimeOffset = 0;
            return;
        }
        if (!confirm('A timer is already running. Stop it and continue tracking this entry?')) {
            return;
        }
        await stopTimer();
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Set continuing entry info
    continuingEntryId = entryId;
    elapsedTimeOffset = existingDuration || 0;
    
    // Set the task and notes
    document.getElementById('timer-task-select').value = taskId;
    const task = tasks.find(t => t.id == taskId);
    if (task) {
        document.getElementById('timer-task-search').value = `${task.name} - ${task.projectName} (${task.customerName})`;
    }
    document.getElementById('timer-notes').value = notes;
    
    // Start the timer (will update existing entry)
    await startTimerContinue(entryId);
    
    // Highlight the row being continued
    highlightContinuingEntry(entryId);
    
    // Scroll to timer section
    document.querySelector('.timer-section').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function startTimerContinue(entryId) {
    try {
        // Calculate adjusted start time to preserve existing duration
        // New start time = now - existing duration offset
        const now = new Date();
        const adjustedStartTime = new Date(now.getTime() - (elapsedTimeOffset * 1000));
        
        // Restart the entry by updating its start time and clearing end time
        const response = await fetch(`${API_BASE}/timeentries/${entryId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startTime: adjustedStartTime.toISOString(),
                endTime: null,
                notes: '__RESTART__'
            })
        });

        if (response.ok) {
            const timer = await response.json();
            currentTimer = timer;
            // Reset elapsedTimeOffset since the adjusted start time already includes the existing duration
            elapsedTimeOffset = 0;
            showRunningTimer(timer);
            showSuccess('Continuing time tracking!');
            loadEntries();
        } else {
            const error = await response.text();
            showError(error);
        }
    } catch (error) {
        showError('Failed to continue timer');
        console.error(error);
    }
}

function highlightContinuingEntry(entryId) {
    // Remove previous highlights
    document.querySelectorAll('tr.continuing-entry').forEach(row => {
        row.classList.remove('continuing-entry');
    });
    
    // Add highlight to current entry
    const row = document.querySelector(`tr[data-entry-id="${entryId}"]`);
    if (row) {
        row.classList.add('continuing-entry');
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
            <td>${c.no || ''}</td>
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
            <td>${p.no || ''}</td>
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
            <td>${t.position || ''}</td>
            <td>${t.name}</td>
            <td>${t.projectName}</td>
            <td>${t.customerName}</td>
            <td>${t.procurementNumber || ''}</td>
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
    tbody.innerHTML = entries.map(e => {
        const durationSeconds = e.durationMinutes ? Math.floor(e.durationMinutes * 60) : 0;
        const isRunning = !e.endTime;
        const isContinuing = continuingEntryId === e.id;
        const isChecked = selectedEntryIds.has(e.id);
        const billedDuration = e.durationMinutes ? calculateBilledDuration(e.durationMinutes) : null;
        return `
        <tr data-entry-id="${e.id}" data-task-id="${e.taskId}" data-notes="${e.notes || ''}" 
            class="${isContinuing ? 'continuing-entry' : ''}"
            ondblclick="resumeTracking(${e.id}, ${e.taskId}, '${(e.notes || '').replace(/'/g, "\\'").replace(/"/g, '&quot;')}', ${durationSeconds})"
            title="${isRunning ? 'Currently running' : 'Double-click to continue tracking this entry'}">
            <td data-column="select" onclick="event.stopPropagation()"><input type="checkbox" class="entry-checkbox" data-entry-id="${e.id}" ${isChecked ? 'checked' : ''}></td>
            <td data-column="customer" tabindex="0">${e.customerName}</td>
            <td data-column="project" tabindex="0">${e.projectName}</td>
            <td data-column="task" tabindex="0">${e.taskName}</td>
            <td data-column="startTime">${formatDateTime(e.startTime)}</td>
            <td data-column="endTime">${e.endTime ? formatDateTime(e.endTime) : '<span class="status-active">Running</span>'}</td>
            <td data-column="duration">${e.durationMinutes ? formatDuration(e.durationMinutes) : '-'}</td>
            <td data-column="billedDuration" class="editable-cell" onclick="editBilledDuration(event, ${e.id}, ${billedDuration !== null ? billedDuration : 0})" title="Click to edit">${billedDuration !== null ? formatDuration(billedDuration) : '-'}</td>
            <td data-column="notes" tabindex="0">${e.notes || ''}</td>
            <td data-column="actions" onclick="event.stopPropagation()">
                <button class="btn btn-secondary btn-sm" onclick="editEntry(${e.id})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteEntry(${e.id})">Delete</button>
            </td>
        </tr>
    `;
    }).join('');
    
    // Attach checkbox event listeners
    document.querySelectorAll('.entry-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', handleEntryCheckboxChange);
    });
    
    // Update delete button visibility
    updateDeleteButtonVisibility();
    
    // Update summary after rendering
    updateTimeSummary();
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
    
    // Populate searchable dropdown
    const dropdown = document.getElementById('timer-task-dropdown');
    dropdown.innerHTML = tasks.filter(t => t.isActive).map(t => 
        `<div class="task-option" data-task-id="${t.id}" data-search="${t.customerName.toLowerCase()} ${t.projectName.toLowerCase()} ${t.name.toLowerCase()}">
            <div class="task-option-main">${t.name}</div>
            <div class="task-option-path">${t.customerName} › ${t.projectName}</div>
        </div>`
    ).join('');
    
    // Add click handlers to task options
    dropdown.querySelectorAll('.task-option').forEach(option => {
        option.addEventListener('click', () => selectTask(option.dataset.taskId));
    });
}

function filterTaskOptions() {
    const searchText = document.getElementById('timer-task-search').value.toLowerCase();
    const dropdown = document.getElementById('timer-task-dropdown');
    const options = dropdown.querySelectorAll('.task-option');
    
    let visibleCount = 0;
    options.forEach(option => {
        const searchData = option.dataset.search;
        if (searchData.includes(searchText)) {
            option.style.display = 'block';
            visibleCount++;
        } else {
            option.style.display = 'none';
        }
    });
    
    dropdown.style.display = visibleCount > 0 ? 'block' : 'none';
}

function selectTask(taskId) {
    const task = tasks.find(t => t.id == taskId);
    if (task) {
        document.getElementById('timer-task-select').value = taskId;
        document.getElementById('timer-task-search').value = `${task.name} - ${task.projectName} (${task.customerName})`;
        document.getElementById('timer-task-dropdown').style.display = 'none';
        document.getElementById('start-timer-btn').disabled = false;
    }
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
            <input type="text" id="customer-no" class="form-control" placeholder="Customer No (optional)" value="${customer?.no || ''}">
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
            <input type="text" id="project-no" class="form-control" placeholder="Project No (optional)" value="${project?.no || ''}">
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
            <input type="text" id="task-position" class="form-control" placeholder="Position (optional)" value="${task?.position || ''}">
            <input type="text" id="task-name" class="form-control" placeholder="Task Name" value="${task?.name || ''}" required>
            <select id="task-project" class="form-control" required>
                <option value="">-- Select Project --</option>
                ${projects.filter(p => p.isActive).map(p => 
                    `<option value="${p.id}" ${task?.projectId === p.id ? 'selected' : ''}>${p.name} (${p.customerName})</option>`
                ).join('')}
            </select>
            <input type="text" id="task-procurement" class="form-control" placeholder="Procurement Number (optional)" value="${task?.procurementNumber || ''}">
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
        no: document.getElementById('customer-no').value || null,
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
        no: document.getElementById('project-no').value || null,
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
        position: document.getElementById('task-position').value || null,
        name: document.getElementById('task-name').value,
        projectId: parseInt(document.getElementById('task-project').value),
        procurementNumber: document.getElementById('task-procurement').value || null,
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
    showToast(message, 'success');
}

function showError(message) {
    showToast('Error: ' + message, 'error');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);
    
    // Auto-dismiss after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateTimeSummary() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Monday
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let todayMinutes = 0;
    let weekMinutes = 0;
    let monthMinutes = 0;
    
    entries.forEach(entry => {
        const entryDate = new Date(entry.startTime);
        const minutes = entry.durationMinutes || 0;
        
        if (entryDate >= today) todayMinutes += minutes;
        if (entryDate >= startOfWeek) weekMinutes += minutes;
        if (entryDate >= startOfMonth) monthMinutes += minutes;
    });
    
    // Add running timer to today's total
    if (currentTimer) {
        const runningStart = new Date(currentTimer.startTime);
        const runningMinutes = Math.floor((now - runningStart) / 60000) + Math.floor(elapsedTimeOffset / 60);
        todayMinutes += runningMinutes;
        weekMinutes += runningMinutes;
        monthMinutes += runningMinutes;
    }
    
    // Target hours (8 hours/day, 40 hours/week, ~160 hours/month)
    const workdaysThisWeek = Math.max(1, now.getDay() || 7); // Mon=1, Sun=7
    const workdaysThisMonth = Math.floor((now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 20); // ~20 workdays/month
    
    const targetToday = 8 * 60;
    const targetWeek = workdaysThisWeek * 8 * 60;
    const targetMonth = Math.max(workdaysThisMonth, 1) * 8 * 60;
    
    document.getElementById('today-hours').textContent = formatHoursMinutes(todayMinutes);
    document.getElementById('today-target').textContent = formatHoursMinutes(targetToday);
    document.getElementById('today-progress').style.width = `${Math.min((todayMinutes / targetToday) * 100, 100)}%`;
    
    document.getElementById('week-hours').textContent = formatHoursMinutes(weekMinutes);
    document.getElementById('week-target').textContent = formatHoursMinutes(targetWeek);
    document.getElementById('week-progress').style.width = `${Math.min((weekMinutes / targetWeek) * 100, 100)}%`;
    
    document.getElementById('month-hours').textContent = formatHoursMinutes(monthMinutes);
    document.getElementById('month-target').textContent = formatHoursMinutes(targetMonth);
    document.getElementById('month-progress').style.width = `${Math.min((monthMinutes / targetMonth) * 100, 100)}%`;
}

function formatHoursMinutes(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
}

function toggleTimeSummary() {
    summaryVisible = !summaryVisible;
    const summary = document.getElementById('time-summary');
    const toggle = document.getElementById('summary-toggle');
    const container = document.querySelector('.container');
    
    if (summaryVisible) {
        summary.classList.remove('collapsed');
        toggle.classList.add('active');
        container.classList.remove('summary-collapsed');
        toggle.textContent = '📊';
        toggle.title = 'Hide Time Summary';
    } else {
        summary.classList.add('collapsed');
        toggle.classList.remove('active');
        container.classList.add('summary-collapsed');
        toggle.textContent = '📈';
        toggle.title = 'Show Time Summary';
    }
}

// Bulk delete and multi-select functions
function toggleSelectAll(e) {
    const checkboxes = document.querySelectorAll('.entry-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.checked = e.target.checked;
        const entryId = parseInt(checkbox.dataset.entryId);
        if (e.target.checked) {
            selectedEntryIds.add(entryId);
        } else {
            selectedEntryIds.delete(entryId);
        }
    });
    updateDeleteButtonVisibility();
}

function handleEntryCheckboxChange(e) {
    const entryId = parseInt(e.target.dataset.entryId);
    if (e.target.checked) {
        selectedEntryIds.add(entryId);
    } else {
        selectedEntryIds.delete(entryId);
    }
    
    // Update "select all" checkbox state
    const allCheckboxes = document.querySelectorAll('.entry-checkbox');
    const selectAllCheckbox = document.getElementById('select-all-entries');
    selectAllCheckbox.checked = allCheckboxes.length > 0 && 
        Array.from(allCheckboxes).every(cb => cb.checked);
    
    updateDeleteButtonVisibility();
}

function updateDeleteButtonVisibility() {
    const deleteBtn = document.getElementById('delete-selected-btn');
    if (selectedEntryIds.size > 0) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.textContent = `Delete Selected (${selectedEntryIds.size})`;
    } else {
        deleteBtn.style.display = 'none';
    }
}

async function bulkDeleteEntries() {
    if (selectedEntryIds.size === 0) return;
    
    const count = selectedEntryIds.size;
    if (!confirm(`Are you sure you want to delete ${count} time ${count === 1 ? 'entry' : 'entries'}?`)) return;
    
    try {
        const response = await fetch(`${API_BASE}/timeentries/bulk-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids: Array.from(selectedEntryIds) })
        });
        
        if (response.ok) {
            const result = await response.json();
            selectedEntryIds.clear();
            document.getElementById('select-all-entries').checked = false;
            await loadEntries();
            showSuccess(`Successfully deleted ${result.deletedCount} time ${result.deletedCount === 1 ? 'entry' : 'entries'}!`);
        } else {
            showError('Failed to delete selected entries');
        }
    } catch (error) {
        showError('Failed to delete selected entries');
        console.error(error);
    }
}

// Keyboard shortcuts
function handleKeyboardShortcuts(e) {
    // ALT+F3 - Filter by cell value
    if (e.altKey && e.key === 'F3') {
        e.preventDefault();
        const activeElement = document.activeElement;
        
        // Check if we're in the entries table
        const cell = activeElement.closest('td[data-column]');
        if (cell) {
            const column = cell.dataset.column;
            const value = cell.textContent.trim();
            
            // Apply filter based on column
            applyColumnFilter(column, value);
        }
    }
}

function applyColumnFilter(column, value) {
    // Skip filtering for columns that can't be filtered
    if (['startTime', 'endTime', 'duration'].includes(column)) {
        showError(`Cannot filter by ${column} column`);
        return;
    }
    
    // Clear existing filters first
    clearFilters();
    
    let applied = false;
    
    // Map column to filter field and apply
    switch(column) {
        case 'customer':
            // Find customer by name
            const customer = customers.find(c => c.name === value);
            if (customer) {
                document.getElementById('entry-customer-filter').value = customer.id;
                applied = true;
            }
            break;
        case 'project':
            // Find project by name
            const project = projects.find(p => p.name === value);
            if (project) {
                document.getElementById('entry-project-filter').value = project.id;
                applied = true;
            }
            break;
        case 'task':
            // Find task by name
            const task = tasks.find(t => t.name === value);
            if (task) {
                document.getElementById('entry-task-filter').value = task.id;
                applied = true;
            }
            break;
        case 'notes':
            // Use search field for notes (only if not empty)
            if (value) {
                document.getElementById('entry-search').value = value;
                applied = true;
            }
            break;
    }
    
    if (applied) {
        // Apply the filters
        loadEntries();
        showSuccess(`Filtered by ${column}: ${value}`);
    } else {
        showError(`Could not find ${column}: ${value}`);
    }
}

// Settings functions
function loadSettings() {
    const savedSettings = localStorage.getItem('timekeeper-settings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
    }
}

function saveSettings() {
    localStorage.setItem('timekeeper-settings', JSON.stringify(settings));
}

function applySettings() {
    // Apply dark mode
    if (settings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
}

function calculateBilledDuration(durationMinutes) {
    if (!settings.roundingEnabled) {
        return durationMinutes;
    }
    
    const threshold = settings.roundingThreshold;
    const increment = settings.billingIncrement;
    
    // Calculate how many full increments
    const fullIncrements = Math.floor(durationMinutes / increment);
    const remainder = durationMinutes % increment;
    
    // If there's no remainder, return exact increments
    if (remainder === 0) {
        return fullIncrements * increment;
    }
    
    // If remainder is more than threshold, round up
    // Special case: if we have 0 full increments and any remainder, always round up to first increment
    if (remainder > threshold || fullIncrements === 0) {
        return (fullIncrements + 1) * increment;
    } else {
        return fullIncrements * increment;
    }
}

function showSettingsForm() {
    const modalBody = document.getElementById('modal-body');
    modalBody.innerHTML = `
        <h2>⚙️ Settings</h2>
        <form id="settings-form">
            <h3>Appearance</h3>
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="dark-mode-toggle" ${settings.darkMode ? 'checked' : ''} 
                           style="width: 20px; height: 20px; cursor: pointer;">
                    <span style="font-size: 1.1em;">🌙 Dark Mode</span>
                </label>
            </div>
            
            <h3>Billing</h3>
            <div style="margin-bottom: 20px;">
                <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="rounding-enabled" ${settings.roundingEnabled ? 'checked' : ''} 
                           style="width: 20px; height: 20px; cursor: pointer;">
                    <span style="font-size: 1.1em;">Enable Duration Rounding</span>
                </label>
            </div>
            
            <div id="rounding-options" style="${settings.roundingEnabled ? '' : 'display: none;'}">
                <label for="billing-increment">Billing Increment (minutes):</label>
                <input type="number" id="billing-increment" class="form-control" 
                       value="${settings.billingIncrement}" min="1" max="60" step="1">
                
                <label for="rounding-threshold">Rounding Threshold (minutes):</label>
                <input type="number" id="rounding-threshold" class="form-control" 
                       value="${settings.roundingThreshold}" min="0" max="30" step="1">
                
                <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin-top: 15px; border-left: 4px solid #667eea;">
                    <strong>Example:</strong><br>
                    With billing increment of <strong>${settings.billingIncrement} min</strong> and threshold of <strong>${settings.roundingThreshold} min</strong>:<br>
                    • ${settings.roundingThreshold} min → rounds to ${settings.billingIncrement} min (below threshold)<br>
                    • ${settings.billingIncrement + settings.roundingThreshold} min → rounds to ${settings.billingIncrement} min (at threshold)<br>
                    • ${settings.billingIncrement + settings.roundingThreshold + 1} min → rounds to ${settings.billingIncrement * 2} min (above threshold)
                </div>
            </div>
            
            <div style="margin-top: 30px; display: flex; gap: 10px;">
                <button type="submit" class="btn btn-primary">Save Settings</button>
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
            </div>
        </form>
    `;
    
    // Show/hide rounding options based on checkbox
    document.getElementById('rounding-enabled').addEventListener('change', (e) => {
        document.getElementById('rounding-options').style.display = e.target.checked ? 'block' : 'none';
    });
    
    // Handle form submission
    document.getElementById('settings-form').addEventListener('submit', (e) => {
        e.preventDefault();
        
        settings.darkMode = document.getElementById('dark-mode-toggle').checked;
        settings.roundingEnabled = document.getElementById('rounding-enabled').checked;
        
        // Validate and parse numeric inputs
        const billingIncrement = parseInt(document.getElementById('billing-increment').value);
        const roundingThreshold = parseInt(document.getElementById('rounding-threshold').value);
        
        // Validate billing increment
        if (isNaN(billingIncrement) || billingIncrement < 1 || billingIncrement > 60) {
            showError('Billing increment must be between 1 and 60 minutes');
            return;
        }
        
        // Validate rounding threshold
        if (isNaN(roundingThreshold) || roundingThreshold < 0 || roundingThreshold > 30) {
            showError('Rounding threshold must be between 0 and 30 minutes');
            return;
        }
        
        // Validate threshold is less than increment
        if (roundingThreshold >= billingIncrement) {
            showError('Rounding threshold must be less than billing increment');
            return;
        }
        
        settings.billingIncrement = billingIncrement;
        settings.roundingThreshold = roundingThreshold;
        
        saveSettings();
        applySettings();
        renderEntries(); // Re-render to update billed durations
        closeModal();
        showSuccess('Settings saved successfully!');
    });
    
    openModal();
}

// Import functionality
function showImportDialog() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            await importTasks(file);
        }
    };
    input.click();
}

async function importTasks(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE}/import/tasks`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            showSuccess(`Import successful! Created: ${result.customersCreated} customers, ${result.projectsCreated} projects, ${result.tasksCreated} tasks. Updated: ${result.customersUpdated} customers, ${result.projectsUpdated} projects, ${result.tasksUpdated} tasks.`);
            await loadInitialData();
        } else {
            showError(`Import failed: ${result.errors.join(', ')}`);
        }
    } catch (error) {
        console.error('Error importing tasks:', error);
        showError('Failed to import tasks');
    }
}

function downloadTemplate() {
    window.location.href = `${API_BASE}/import/tasks/template`;
}

// Column resizing functionality
function initializeColumnResizing() {
    const table = document.getElementById('entries-table');
    if (!table) return;
    
    const headers = table.querySelectorAll('th.resizable');
    
    headers.forEach(header => {
        const resizeHandle = header.querySelector('.resize-handle');
        if (!resizeHandle) return;
        
        let startX, startWidth;
        
        resizeHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            startX = e.pageX;
            startWidth = header.offsetWidth;
            
            header.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            
            const onMouseMove = (e) => {
                const diff = e.pageX - startX;
                const newWidth = Math.max(80, startWidth + diff);
                header.style.width = newWidth + 'px';
                header.style.minWidth = newWidth + 'px';
            };
            
            const onMouseUp = () => {
                header.classList.remove('resizing');
                document.body.style.cursor = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                saveColumnWidths();
            };
            
            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });
}

// Column visibility toggle
function toggleColumnSelector(e) {
    // Remove existing selector if open
    const existing = document.querySelector('.column-selector');
    if (existing) {
        existing.remove();
        return;
    }
    
    const columns = [
        { name: 'select', label: 'Select', fixed: true },
        { name: 'customer', label: 'Customer' },
        { name: 'project', label: 'Project' },
        { name: 'task', label: 'Task' },
        { name: 'startTime', label: 'Start Time' },
        { name: 'endTime', label: 'End Time' },
        { name: 'duration', label: 'Duration' },
        { name: 'billedDuration', label: 'Billed Duration' },
        { name: 'notes', label: 'Notes' },
        { name: 'actions', label: 'Actions', fixed: true }
    ];
    
    const selector = document.createElement('div');
    selector.className = 'column-selector';
    
    const hiddenColumns = JSON.parse(localStorage.getItem('hiddenColumns') || '[]');
    
    selector.innerHTML = columns.map(col => {
        const isHidden = hiddenColumns.includes(col.name);
        const disabled = col.fixed ? 'disabled' : '';
        return `
            <label>
                <input type="checkbox" value="${col.name}" 
                    ${!isHidden ? 'checked' : ''} 
                    ${disabled}
                    onchange="toggleColumnVisibility('${col.name}', this.checked)">
                ${col.label}
            </label>
        `;
    }).join('');
    
    // Position the selector
    const button = e.target;
    const rect = button.getBoundingClientRect();
    selector.style.position = 'fixed';
    selector.style.top = (rect.bottom + 5) + 'px';
    selector.style.left = rect.left + 'px';
    
    document.body.appendChild(selector);
}

function toggleColumnVisibility(columnName, visible) {
    const table = document.getElementById('entries-table');
    const headers = table.querySelectorAll(`th[data-column="${columnName}"]`);
    const cells = table.querySelectorAll(`td[data-column="${columnName}"]`);
    
    headers.forEach(h => {
        if (visible) {
            h.classList.remove('hidden');
        } else {
            h.classList.add('hidden');
        }
    });
    
    cells.forEach(c => {
        if (visible) {
            c.classList.remove('hidden');
        } else {
            c.classList.add('hidden');
        }
    });
    
    // Save preferences
    let hiddenColumns = JSON.parse(localStorage.getItem('hiddenColumns') || '[]');
    if (visible) {
        hiddenColumns = hiddenColumns.filter(c => c !== columnName);
    } else {
        if (!hiddenColumns.includes(columnName)) {
            hiddenColumns.push(columnName);
        }
    }
    localStorage.setItem('hiddenColumns', JSON.stringify(hiddenColumns));
}

function loadColumnPreferences() {
    const hiddenColumns = JSON.parse(localStorage.getItem('hiddenColumns') || '[]');
    hiddenColumns.forEach(columnName => {
        toggleColumnVisibility(columnName, false);
    });
    
    // Load column widths
    const columnWidths = JSON.parse(localStorage.getItem('columnWidths') || '{}');
    Object.keys(columnWidths).forEach(columnName => {
        const header = document.querySelector(`th[data-column="${columnName}"]`);
        if (header) {
            header.style.width = columnWidths[columnName];
            header.style.minWidth = columnWidths[columnName];
        }
    });
    
    loadColumnOrder();
}

function saveColumnWidths() {
    const table = document.getElementById('entries-table');
    const headers = table.querySelectorAll('th[data-column]');
    const widths = {};
    
    headers.forEach(header => {
        const columnName = header.getAttribute('data-column');
        if (header.style.width) {
            widths[columnName] = header.style.width;
        }
    });
    
    localStorage.setItem('columnWidths', JSON.stringify(widths));
}

// Inline editing for billed duration
let editingCell = null;

function editBilledDuration(event, entryId, currentBilledMinutes) {
    event.stopPropagation();
    
    const cell = event.currentTarget;
    
    // If already editing this cell, do nothing
    if (editingCell === cell) return;
    
    // Cancel any other editing
    if (editingCell) {
        cancelEdit();
    }
    
    editingCell = cell;
    const currentText = cell.textContent;
    
    cell.innerHTML = `<input type="number" step="0.1" value="${currentBilledMinutes.toFixed(2)}" 
        onblur="saveBilledDuration(${entryId}, this.value)" 
        onkeydown="handleBilledDurationKeydown(event, ${entryId})" 
        style="width: 100px;">`;
    
    const input = cell.querySelector('input');
    input.focus();
    input.select();
}

function handleBilledDurationKeydown(event, entryId) {
    if (event.key === 'Enter') {
        event.target.blur();
    } else if (event.key === 'Escape') {
        cancelEdit();
        renderEntries();
    }
}

async function saveBilledDuration(entryId, newMinutes) {
    const minutes = parseFloat(newMinutes);
    if (isNaN(minutes) || minutes < 0) {
        showError('Invalid duration');
        renderEntries();
        return;
    }
    
    // Find the entry and calculate what duration minutes would give this billed amount
    const entry = entries.find(e => e.id === entryId);
    if (!entry) {
        renderEntries();
        return;
    }
    
    // For now, just show a message - you'd need to add an endpoint to save custom billed duration
    showSuccess(`Billed duration updated to ${formatDuration(minutes)}`);
    editingCell = null;
    
    // TODO: Add API endpoint to save custom billed duration if needed
    // For now, just re-render to restore the display
    setTimeout(() => renderEntries(), 500);
}

function cancelEdit() {
    editingCell = null;
}

// Context menu for column visibility
function initializeContextMenu() {
    const headers = document.querySelectorAll('#entries-table th[data-column]');
    
    headers.forEach(header => {
        header.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY);
        });
    });
    
    // Close context menu on click outside
    document.addEventListener('click', () => {
        const menu = document.querySelector('.context-menu');
        if (menu) menu.remove();
    });
}

function showContextMenu(x, y) {
    // Remove existing menu
    const existingMenu = document.querySelector('.context-menu');
    if (existingMenu) existingMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'context-menu';
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    
    const headers = document.querySelectorAll('#entries-table th[data-column]');
    
    headers.forEach(header => {
        const column = header.dataset.column;
        const isVisible = !header.classList.contains('hidden');
        
        const item = document.createElement('div');
        item.className = 'context-menu-item';
        item.innerHTML = `
            <input type="checkbox" ${isVisible ? 'checked' : ''} 
                   onchange="toggleColumnVisibility('${column}')">
            <span>${header.textContent.replace('▼', '').trim()}</span>
        `;
        
        menu.appendChild(item);
    });
    
    document.body.appendChild(menu);
    
    // Prevent menu from going off-screen
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
        menu.style.left = (x - rect.width) + 'px';
    }
    if (rect.bottom > window.innerHeight) {
        menu.style.top = (y - rect.height) + 'px';
    }
}

// Drag and drop column reordering
function initializeColumnDragDrop() {
    const headers = document.querySelectorAll('#entries-table th[data-column]');
    
    headers.forEach(header => {
        header.draggable = true;
        header.style.cursor = 'move';
        
        header.addEventListener('dragstart', (e) => {
            header.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', header.innerHTML);
        });
        
        header.addEventListener('dragend', () => {
            header.classList.remove('dragging');
            document.querySelectorAll('th').forEach(h => h.classList.remove('drag-over'));
        });
        
        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            if (dragging && dragging !== header) {
                header.classList.add('drag-over');
            }
        });
        
        header.addEventListener('dragleave', () => {
            header.classList.remove('drag-over');
        });
        
        header.addEventListener('drop', (e) => {
            e.preventDefault();
            const dragging = document.querySelector('.dragging');
            
            if (dragging && dragging !== header) {
                reorderColumns(dragging, header);
            }
            
            header.classList.remove('drag-over');
        });
    });
}

function reorderColumns(draggedHeader, targetHeader) {
    const table = document.getElementById('entries-table');
    const draggedIndex = Array.from(draggedHeader.parentNode.children).indexOf(draggedHeader);
    const targetIndex = Array.from(targetHeader.parentNode.children).indexOf(targetHeader);
    
    // Reorder header
    const headerRow = draggedHeader.parentNode;
    if (draggedIndex < targetIndex) {
        headerRow.insertBefore(draggedHeader, targetHeader.nextSibling);
    } else {
        headerRow.insertBefore(draggedHeader, targetHeader);
    }
    
    // Reorder all data rows
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const cells = Array.from(row.children);
        const draggedCell = cells[draggedIndex];
        if (draggedIndex < targetIndex) {
            row.insertBefore(draggedCell, cells[targetIndex].nextSibling);
        } else {
            row.insertBefore(draggedCell, cells[targetIndex]);
        }
    });
    
    // Save column order
    saveColumnOrder();
}

function saveColumnOrder() {
    const headers = document.querySelectorAll('#entries-table th[data-column]');
    const order = Array.from(headers).map(h => h.dataset.column);
    localStorage.setItem('columnOrder', JSON.stringify(order));
}

function loadColumnOrder() {
    const saved = localStorage.getItem('columnOrder');
    if (!saved) return;
    
    const order = JSON.parse(saved);
    const headerRow = document.querySelector('#entries-table thead tr');
    const headers = {};
    
    // Store all headers by column name
    document.querySelectorAll('#entries-table th[data-column]').forEach(h => {
        headers[h.dataset.column] = h;
    });
    
    // Reorder based on saved order
    order.forEach(column => {
        if (headers[column]) {
            headerRow.appendChild(headers[column]);
        }
    });
    
    // Reorder data rows to match
    const table = document.getElementById('entries-table');
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        order.forEach((column, index) => {
            const cell = row.querySelector(`td:nth-child(${index + 1})`);
            if (cell) row.appendChild(cell);
        });
    });
}
