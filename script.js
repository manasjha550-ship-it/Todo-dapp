// Todo dApp JavaScript
// Contract configuration - UPDATE THIS WITH YOUR DEPLOYED CONTRACT ADDRESS
const MODULE_ADDRESS = "0xc9bc8d634c75078751b213939ddd851065364e3d08fce88b1ec40b19b6984dae";

// Global variables
let walletConnected = false;
let currentAccount = null;
let tasks = [];
let currentFilter = 'all';

// Priority mapping
const PRIORITIES = {
    1: { name: "🟢 Low", class: "priority-low" },
    2: { name: "🟡 Medium", class: "priority-medium" },
    3: { name: "🔴 High", class: "priority-high" }
};

// Status constants
const STATUS = {
    PENDING: 0,
    COMPLETED: 1
};

// DOM Elements
const connectWalletBtn = document.getElementById('connect-wallet-btn');
const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
const walletDisconnected = document.getElementById('wallet-disconnected');
const walletConnectedDiv = document.getElementById('wallet-connected');
const walletAddress = document.getElementById('wallet-address');
const mainContent = document.getElementById('main-content');
const taskForm = document.getElementById('task-form');
const addTaskBtn = document.getElementById('add-task-btn');
const refreshBtn = document.getElementById('refresh-btn');
const tasksList = document.getElementById('tasks-list');
const loading = document.getElementById('loading');
const emptyTasks = document.getElementById('empty-tasks');
const alertsContainer = document.getElementById('alerts');

// Statistics elements
const totalTasksElement = document.getElementById('total-tasks');
const completedTasksElement = document.getElementById('completed-tasks');
const pendingTasksElement = document.getElementById('pending-tasks');
const overdueTasksElement = document.getElementById('overdue-tasks');
const categoryBreakdown = document.getElementById('category-breakdown');
const filteredCount = document.getElementById('filtered-count');
const tasksSectionTitle = document.getElementById('tasks-section-title');

// Filter elements
const filterButtons = document.querySelectorAll('.filter-btn');
const priorityFilter = document.getElementById('priority-filter');
const categoryFilter = document.getElementById('category-filter');

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    checkWalletConnection();
});

function setupEventListeners() {
    connectWalletBtn.addEventListener('click', connectWallet);
    disconnectWalletBtn.addEventListener('click', disconnectWallet);
    taskForm.addEventListener('submit', handleAddTask);
    refreshBtn.addEventListener('click', loadTasks);
    
    // Filter event listeners
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filter = e.target.dataset.filter;
            setActiveFilter(filter);
        });
    });
    
    priorityFilter.addEventListener('change', applyFilters);
    categoryFilter.addEventListener('change', applyFilters);
}

// Wallet connection functions
async function checkWalletConnection() {
    try {
        if (typeof window.aptos !== 'undefined') {
            const account = await window.aptos.account();
            if (account) {
                handleWalletConnected(account);
            }
        } else {
            setTimeout(() => {
                showAlert('Petra wallet not detected. Enabling demo mode...', 'info');
                enableDemoMode();
            }, 3000);
        }
    } catch (error) {
        console.log('No wallet connected');
        setTimeout(() => {
            enableDemoMode();
        }, 5000);
    }
}

async function connectWallet() {
    try {
        if (typeof window.aptos === 'undefined') {
            showAlert('Please install Petra wallet extension', 'error');
            window.open('https://petra.app/', '_blank');
            return;
        }

        const account = await window.aptos.connect();
        if (account) {
            handleWalletConnected(account);
            showAlert('Wallet connected successfully!', 'success');
        }
    } catch (error) {
        console.error('Wallet connection error:', error);
        showAlert('Failed to connect wallet. Enabling demo mode...', 'info');
        enableDemoMode();
    }
}

async function disconnectWallet() {
    try {
        if (window.aptos) {
            await window.aptos.disconnect();
        }
        handleWalletDisconnected();
        showAlert('Wallet disconnected', 'info');
    } catch (error) {
        console.error('Disconnect error:', error);
    }
}

function handleWalletConnected(account) {
    walletConnected = true;
    currentAccount = account;
    
    walletDisconnected.classList.add('hidden');
    walletConnectedDiv.classList.remove('hidden');
    mainContent.classList.remove('hidden');
    
    walletAddress.textContent = `${account.address.substring(0, 12)}...${account.address.substring(account.address.length - 8)}`;
    
    // Initialize todo list and load tasks
    initializeTodoList();
    loadTasks();
}

function handleWalletDisconnected() {
    walletConnected = false;
    currentAccount = null;
    tasks = [];
    
    walletDisconnected.classList.remove('hidden');
    walletConnectedDiv.classList.add('hidden');
    mainContent.classList.add('hidden');
}

// Demo mode for testing without wallet
function enableDemoMode() {
    const demoAccount = { address: "0xdemo123456789abcdef..." };
    currentAccount = demoAccount;
    walletConnected = true;
    
    walletDisconnected.classList.add('hidden');
    walletConnectedDiv.classList.remove('hidden');
    mainContent.classList.remove('hidden');
    
    walletAddress.textContent = "Demo Mode - Try the features!";
    
    // Load demo tasks
    tasks = getDemoTasks();
    displayTasks();
    updateStatistics();
    updateCategoryBreakdown();
    
    showAlert('Demo mode enabled - Try creating tasks!', 'success');
}

// Smart contract functions
async function initializeTodoList() {
    try {
        const payload = {
            type: "entry_function_payload",
            function: `${MODULE_ADDRESS}::todo_list::initialize_todo_list`,
            type_arguments: [],
            arguments: []
        };

        await window.aptos.signAndSubmitTransaction(payload);
        console.log('Todo list initialized');
    } catch (error) {
        console.log('Todo list might already be initialized or error:', error);
    }
}

async function handleAddTask(event) {
    event.preventDefault();
    
    if (!currentAccount) {
        showAlert('Please connect your wallet first', 'error');
        return;
    }

    const formData = new FormData(event.target);
    const title = formData.get('title').trim();
    const description = formData.get('description').trim();
    const priority = parseInt(formData.get('priority'));
    const category = formData.get('category');
    const dueDate = formData.get('due-date');

    if (!title) {
        showAlert('Please enter a task title', 'error');
        return;
    }

    try {
        addTaskBtn.disabled = true;
        addTaskBtn.textContent = '⏳ Adding to Blockchain...';
        
        // If in demo mode, add to local storage
        if (currentAccount.address.includes('demo')) {
            addDemoTask(title, description, priority, category, dueDate);
            return;
        }
        
        // Convert due date to timestamp
        let dueDateTimestamp = 0;
        if (dueDate) {
            dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
        }
        
        const payload = {
            type: "entry_function_payload",
            function: `${MODULE_ADDRESS}::todo_list::add_task`,
            type_arguments: [],
            arguments: [
                title,
                description || "",
                priority.toString(),
                dueDateTimestamp.toString(),
                category
            ]
        };

        const response = await window.aptos.signAndSubmitTransaction(payload);
        
        // Reset form
        taskForm.reset();
        
        showAlert('Task added successfully to blockchain!', 'success');
        
        // Reload tasks after a short delay
        setTimeout(() => {
            loadTasks();
        }, 3000);
        
    } catch (error) {
        console.error('Add task error:', error);
        showAlert('Failed to add task. Please try again.', 'error');
    } finally {
        addTaskBtn.disabled = false;
        addTaskBtn.textContent = '🚀 Add to Blockchain';
    }
}

function addDemoTask(title, description, priority, category, dueDate) {
    const currentTime = Math.floor(Date.now() / 1000);
    let dueDateTimestamp = 0;
    if (dueDate) {
        dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
    }

    const newTask = {
        id: tasks.length + 1,
        title: title,
        description: description || "",
        priority: priority,
        status: STATUS.PENDING,
        created_at: currentTime,
        completed_at: 0,
        due_date: dueDateTimestamp,
        category: category
    };

    tasks.push(newTask);
    
    // Save to localStorage for demo persistence
    localStorage.setItem('demoTasks', JSON.stringify(tasks));
    
    // Reset form
    taskForm.reset();
    
    displayTasks();
    updateStatistics();
    updateCategoryBreakdown();
    
    showAlert('Task added successfully! (Demo Mode)', 'success');
}

async function loadTasks() {
    if (!currentAccount) return;

    try {
        showLoading(true);
        
        // If in demo mode, load from localStorage
        if (currentAccount.address.includes('demo')) {
            const saved = localStorage.getItem('demoTasks');
            tasks = saved ? JSON.parse(saved) : getDemoTasks();
            displayTasks();
            updateStatistics();
            updateCategoryBreakdown();
            return;
        }
        
        // Try to get tasks from blockchain
        try {
            const response = await window.aptos.view({
                function: `${MODULE_ADDRESS}::todo_list::get_tasks`,
                type_arguments: [],
                arguments: [currentAccount.address],
            });
            
            const tasksData = response[0] || [];
            tasks = tasksData.map(task => ({
                id: parseInt(task.id),
                title: task.title,
                description: task.description,
                priority: parseInt(task.priority),
                status: parseInt(task.status),
                created_at: parseInt(task.created_at),
                completed_at: parseInt(task.completed_at),
                due_date: parseInt(task.due_date),
                category: task.category
            }));
            
        } catch (error) {
            console.log('Error loading from blockchain, using demo data:', error);
            tasks = getDemoTasks();
            showAlert('Demo mode: Using sample data for presentation', 'info');
        }
        
        displayTasks();
        updateStatistics();
        updateCategoryBreakdown();
        
    } catch (error) {
        console.error('Load tasks error:', error);
        showAlert('Failed to load tasks', 'error');
        tasks = [];
        displayTasks();
    } finally {
        showLoading(false);
    }
}

function getDemoTasks() {
    const currentTime = Math.floor(Date.now() / 1000);
    return [
        {
            id: 1,
            title: "Complete project documentation",
            description: "Write comprehensive documentation for the blockchain project",
            priority: 3,
            status: STATUS.PENDING,
            created_at: currentTime - 86400,
            completed_at: 0,
            due_date: currentTime + 86400,
            category: "Work"
        },
        {
            id: 2,
            title: "Buy groceries",
            description: "Milk, bread, eggs, vegetables",
            priority: 2,
            status: STATUS.COMPLETED,
            created_at: currentTime - 172800,
            completed_at: currentTime - 86400,
            due_date: 0,
            category: "Personal"
        },
        {
            id: 3,
            title: "Schedule health checkup",
            description: "Annual physical examination",
            priority: 2,
            status: STATUS.PENDING,
            created_at: currentTime - 259200,
            completed_at: 0,
            due_date: currentTime + 604800,
            category: "Health"
        }
    ];
}

async function completeTask(taskId) {
    if (!currentAccount) return;

    try {
        // If in demo mode, update local array
        if (currentAccount.address.includes('demo')) {
            const taskIndex = tasks.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].status = STATUS.COMPLETED;
                tasks[taskIndex].completed_at = Math.floor(Date.now() / 1000);
                localStorage.setItem('demoTasks', JSON.stringify(tasks));
                displayTasks();
                updateStatistics();
                updateCategoryBreakdown();
                showAlert('Task completed! (Demo Mode)', 'success');
            }
            return;
        }

        const payload = {
            type: "entry_function_payload",
            function: `${MODULE_ADDRESS}::todo_list::complete_task`,
            type_arguments: [],
            arguments: [taskId.toString()]
        };

        await window.aptos.signAndSubmitTransaction(payload);
        showAlert('Task completed successfully!', 'success');
        
        setTimeout(() => {
            loadTasks();
        }, 2000);
        
    } catch (error) {
        console.error('Complete task error:', error);
        showAlert('Failed to complete task', 'error');
    }
}

async function deleteTask(taskId) {
    if (!currentAccount) return;

    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        // If in demo mode, delete from local array
        if (currentAccount.address.includes('demo')) {
            tasks = tasks.filter(task => task.id !== taskId);
            localStorage.setItem('demoTasks', JSON.stringify(tasks));
            displayTasks();
            updateStatistics();
            updateCategoryBreakdown();
            showAlert('Task deleted! (Demo Mode)', 'success');
            return;
        }

        const payload = {
            type: "entry_function_payload",
            function: `${MODULE_ADDRESS}::todo_list::delete_task`,
            type_arguments: [],
            arguments: [taskId.toString()]
        };

        await window.aptos.signAndSubmitTransaction(payload);
        showAlert('Task deleted successfully!', 'success');
        
        setTimeout(() => {
            loadTasks();
        }, 2000);
        
    } catch (error) {
        console.error('Delete task error:', error);
        showAlert('Failed to delete task', 'error');
    }
}

async function updateTaskPriority(taskId, newPriority) {
    if (!currentAccount) return;

    try {
        // If in demo mode, update local array
        if (currentAccount.address.includes('demo')) {
            const taskIndex = tasks.findIndex(task => task.id === taskId);
            if (taskIndex !== -1) {
                tasks[taskIndex].priority = newPriority;
                localStorage.setItem('demoTasks', JSON.stringify(tasks));
                displayTasks();
                showAlert('Task priority updated! (Demo Mode)', 'success');
            }
            return;
        }

        const payload = {
            type: "entry_function_payload",
            function: `${MODULE_ADDRESS}::todo_list::update_task_priority`,
            type_arguments: [],
            arguments: [taskId.toString(), newPriority.toString()]
        };

        await window.aptos.signAndSubmitTransaction(payload);
        showAlert('Task priority updated successfully!', 'success');
        
        setTimeout(() => {
            loadTasks();
        }, 2000);
        
    } catch (error) {
        console.error('Update priority error:', error);
        showAlert('Failed to update task priority', 'error');
    }
}

// Display functions
function displayTasks() {
    const filteredTasks = getFilteredTasks();
    
    if (filteredTasks.length === 0) {
        tasksList.innerHTML = '';
        emptyTasks.classList.remove('hidden');
        filteredCount.textContent = '0';
        return;
    }

    emptyTasks.classList.add('hidden');
    filteredCount.textContent = filteredTasks.length;
    
    // Sort tasks by priority (high to low) then by created date (newest first)
    const sortedTasks = filteredTasks.sort((a, b) => {
        if (a.priority !== b.priority) {
            return b.priority - a.priority;
        }
        return b.created_at - a.created_at;
    });
    
    tasksList.innerHTML = sortedTasks.map(task => `
        <div class="task-item ${task.status === STATUS.COMPLETED ? 'completed' : ''} ${isTaskOverdue(task) ? 'overdue' : ''}">
            <div class="task-header">
                <div class="task-title ${task.status === STATUS.COMPLETED ? 'completed' : ''}">${escapeHtml(task.title)}</div>
                <div class="task-priority ${PRIORITIES[task.priority].class}">${PRIORITIES[task.priority].name}</div>
            </div>
            ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
            <div class="task-meta">
                <div class="task-info">
                    <div class="task-category">${escapeHtml(task.category)}</div>
                    <div class="task-date">Created: ${formatDate(task.created_at)}</div>
                    ${task.due_date > 0 ? `<div class="task-due ${isTaskOverdue(task) ? 'overdue' : ''}">Due: ${formatDate(task.due_date)}</div>` : ''}
                    ${task.status === STATUS.COMPLETED ? `<div class="task-completed">Completed: ${formatDate(task.completed_at)}</div>` : ''}
                </div>
                <div class="task-actions">
                    ${task.status === STATUS.PENDING ? `<button class="task-btn complete-btn" onclick="completeTask(${task.id})">✅ Complete</button>` : ''}
                    <button class="task-btn priority-btn" onclick="promptPriorityChange(${task.id}, ${task.priority})">🏷️ Priority</button>
                    <button class="task-btn delete-btn" onclick="deleteTask(${task.id})">🗑️ Delete</button>
                </div>
            </div>
        </div>
    `).join('');
}

function getFilteredTasks() {
    let filtered = [...tasks];
    
    // Apply status filter
    switch (currentFilter) {
        case 'pending':
            filtered = filtered.filter(task => task.status === STATUS.PENDING);
            break;
        case 'completed':
            filtered = filtered.filter(task => task.status === STATUS.COMPLETED);
            break;
        case 'overdue':
            filtered = filtered.filter(task => task.status === STATUS.PENDING && isTaskOverdue(task));
            break;
    }
    
    // Apply priority filter
    const priorityValue = priorityFilter.value;
    if (priorityValue) {
        filtered = filtered.filter(task => task.priority === parseInt(priorityValue));
    }
    
    // Apply category filter
    const categoryValue = categoryFilter.value;
    if (categoryValue) {
        filtered = filtered.filter(task => task.category === categoryValue);
    }
    
    return filtered;
}

function setActiveFilter(filter) {
    currentFilter = filter;
    
    // Update button states
    filterButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    
    // Update section title
    const filterTitles = {
        all: '📋 All Tasks',
        pending: '⏳ Pending Tasks',
        completed: '✅ Completed Tasks',
        overdue: '⚠️ Overdue Tasks'
    };
    tasksSectionTitle.textContent = filterTitles[filter];
    
    displayTasks();
}

function applyFilters() {
    displayTasks();
}

function updateStatistics() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === STATUS.COMPLETED).length;
    const pendingTasks = tasks.filter(task => task.status === STATUS.PENDING).length;
    const overdueTasks = tasks.filter(task => task.status === STATUS.PENDING && isTaskOverdue(task)).length;
    
    totalTasksElement.textContent = totalTasks.toString();
    completedTasksElement.textContent = completedTasks.toString();
    pendingTasksElement.textContent = pendingTasks.toString();
    overdueTasksElement.textContent = overdueTasks.toString();
}

function updateCategoryBreakdown() {
    const categoryStats = {};
    
    // Calculate stats by category
    tasks.forEach(task => {
        if (!categoryStats[task.category]) {
            categoryStats[task.category] = { total: 0, completed: 0 };
        }
        categoryStats[task.category].total++;
        if (task.status === STATUS.COMPLETED) {
            categoryStats[task.category].completed++;
        }
    });
    
    // Sort categories by total count
    const sortedCategories = Object.entries(categoryStats)
        .sort(([,a], [,b]) => b.total - a.total);
    
    if (sortedCategories.length === 0) {
        categoryBreakdown.innerHTML = '<p style="text-align: center; color: #666;">No tasks to categorize</p>';
        return;
    }
    
    const maxCount = Math.max(...sortedCategories.map(([,stats]) => stats.total));
    
    categoryBreakdown.innerHTML = sortedCategories.map(([category, stats]) => {
        const percentage = maxCount > 0 ? (stats.total / maxCount) * 100 : 0;
        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        return `
            <div class="category-item">
                <div class="category-info">
                    <div class="category-name">${escapeHtml(category)}</div>
                    <div class="category-bar" style="width: ${percentage}%"></div>
                </div>
                <div class="category-count">${stats.total} tasks (${completionRate}% done)</div>
            </div>
        `;
    }).join('');
}

function isTaskOverdue(task) {
    if (task.status === STATUS.COMPLETED || task.due_date === 0) {
        return false;
    }
    const currentTime = Math.floor(Date.now() / 1000);
    return task.due_date < currentTime;
}

function promptPriorityChange(taskId, currentPriority) {
    const newPriority = prompt(
        `Change priority for task (current: ${PRIORITIES[currentPriority].name}):\n\n1 = Low\n2 = Medium\n3 = High\n\nEnter new priority (1-3):`,
        currentPriority.toString()
    );
    
    if (newPriority && ['1', '2', '3'].includes(newPriority)) {
        const priority = parseInt(newPriority);
        if (priority !== currentPriority) {
            updateTaskPriority(taskId, priority);
        }
    }
}

// Utility functions
function showLoading(show) {
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function showAlert(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    alertsContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.remove();
    }, 5000);
}

function formatDate(timestamp) {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make functions globally available for onclick handlers
window.completeTask = completeTask;
window.deleteTask = deleteTask;
window.promptPriorityChange = promptPriorityChange;

console.log('Todo dApp loaded successfully!');