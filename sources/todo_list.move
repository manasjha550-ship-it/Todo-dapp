module todo_address::todo_list {
    use std::string::String;
    use std::vector;
    use std::signer;
    use std::timestamp;
    use aptos_framework::event;

    // Error codes
    const ETODO_LIST_NOT_INITIALIZED: u64 = 1;
    const ETASK_NOT_FOUND: u64 = 2;
    const ETASK_ALREADY_COMPLETED: u64 = 3;
    const EINVALID_TASK_ID: u64 = 4;
    const EUNAUTHORIZED: u64 = 5;

    // Task priority levels
    const PRIORITY_LOW: u8 = 1;
    const PRIORITY_MEDIUM: u8 = 2;
    const PRIORITY_HIGH: u8 = 3;

    // Task status
    const STATUS_PENDING: u8 = 0;
    const STATUS_COMPLETED: u8 = 1;

    /// Individual task structure
    struct Task has copy, drop, store {
        id: u64,
        title: String,
        description: String,
        priority: u8,
        status: u8,
        created_at: u64,
        completed_at: u64,
        due_date: u64,
        category: String,
    }

    /// Todo list for a user
    struct TodoList has key {
        tasks: vector<Task>,
        next_task_id: u64,
        total_tasks: u64,
        completed_tasks: u64,
    }

    /// Events
    #[event]
    struct TaskCreatedEvent has drop, store {
        task_id: u64,
        owner: address,
        title: String,
        priority: u8,
        created_at: u64,
    }

    #[event]
    struct TaskCompletedEvent has drop, store {
        task_id: u64,
        owner: address,
        title: String,
        completed_at: u64,
    }

    #[event]
    struct TaskDeletedEvent has drop, store {
        task_id: u64,
        owner: address,
        title: String,
    }

    /// Initialize todo list for a user
    public entry fun initialize_todo_list(account: &signer) {
        let account_addr = signer::address_of(account);
        
        if (!exists<TodoList>(account_addr)) {
            let todo_list = TodoList {
                tasks: vector::empty<Task>(),
                next_task_id: 1,
                total_tasks: 0,
                completed_tasks: 0,
            };
            
            move_to(account, todo_list);
        }
    }

    /// Add a new task
    public entry fun add_task(
        account: &signer,
        title: String,
        description: String,
        priority: u8,
        due_date: u64,
        category: String,
    ) acquires TodoList {
        let account_addr = signer::address_of(account);
        assert!(exists<TodoList>(account_addr), ETODO_LIST_NOT_INITIALIZED);
        
        let todo_list = borrow_global_mut<TodoList>(account_addr);
        let task_id = todo_list.next_task_id;
        let current_time = timestamp::now_seconds();
        
        let new_task = Task {
            id: task_id,
            title,
            description,
            priority,
            status: STATUS_PENDING,
            created_at: current_time,
            completed_at: 0,
            due_date,
            category,
        };
        
        vector::push_back(&mut todo_list.tasks, new_task);
        todo_list.next_task_id = task_id + 1;
        todo_list.total_tasks = todo_list.total_tasks + 1;
        
        // Emit event
        event::emit(TaskCreatedEvent {
            task_id,
            owner: account_addr,
            title: new_task.title,
            priority,
            created_at: current_time,
        });
    }

    /// Mark a task as completed
    public entry fun complete_task(
        account: &signer,
        task_id: u64,
    ) acquires TodoList {
        let account_addr = signer::address_of(account);
        assert!(exists<TodoList>(account_addr), ETODO_LIST_NOT_INITIALIZED);
        
        let todo_list = borrow_global_mut<TodoList>(account_addr);
        let tasks = &mut todo_list.tasks;
        let tasks_len = vector::length(tasks);
        let i = 0;
        
        while (i < tasks_len) {
            let task = vector::borrow_mut(tasks, i);
            if (task.id == task_id) {
                assert!(task.status == STATUS_PENDING, ETASK_ALREADY_COMPLETED);
                
                task.status = STATUS_COMPLETED;
                task.completed_at = timestamp::now_seconds();
                todo_list.completed_tasks = todo_list.completed_tasks + 1;
                
                // Emit event
                event::emit(TaskCompletedEvent {
                    task_id,
                    owner: account_addr,
                    title: task.title,
                    completed_at: task.completed_at,
                });
                
                return
            };
            i = i + 1;
        };
        
        abort ETASK_NOT_FOUND
    }

    /// Delete a task
    public entry fun delete_task(
        account: &signer,
        task_id: u64,
    ) acquires TodoList {
        let account_addr = signer::address_of(account);
        assert!(exists<TodoList>(account_addr), ETODO_LIST_NOT_INITIALIZED);
        
        let todo_list = borrow_global_mut<TodoList>(account_addr);
        let tasks = &mut todo_list.tasks;
        let tasks_len = vector::length(tasks);
        let i = 0;
        
        while (i < tasks_len) {
            let task = vector::borrow(tasks, i);
            if (task.id == task_id) {
                let removed_task = vector::remove(tasks, i);
                todo_list.total_tasks = todo_list.total_tasks - 1;
                
                if (removed_task.status == STATUS_COMPLETED) {
                    todo_list.completed_tasks = todo_list.completed_tasks - 1;
                };
                
                // Emit event
                event::emit(TaskDeletedEvent {
                    task_id,
                    owner: account_addr,
                    title: removed_task.title,
                });
                
                return
            };
            i = i + 1;
        };
        
        abort ETASK_NOT_FOUND
    }

    /// Update task priority
    public entry fun update_task_priority(
        account: &signer,
        task_id: u64,
        new_priority: u8,
    ) acquires TodoList {
        let account_addr = signer::address_of(account);
        assert!(exists<TodoList>(account_addr), ETODO_LIST_NOT_INITIALIZED);
        
        let todo_list = borrow_global_mut<TodoList>(account_addr);
        let tasks = &mut todo_list.tasks;
        let tasks_len = vector::length(tasks);
        let i = 0;
        
        while (i < tasks_len) {
            let task = vector::borrow_mut(tasks, i);
            if (task.id == task_id) {
                task.priority = new_priority;
                return
            };
            i = i + 1;
        };
        
        abort ETASK_NOT_FOUND
    }

    #[view]
    public fun get_tasks(user_address: address): vector<Task> acquires TodoList {
        if (!exists<TodoList>(user_address)) {
            return vector::empty<Task>()
        };
        
        let todo_list = borrow_global<TodoList>(user_address);
        todo_list.tasks
    }

    #[view]
    public fun get_task_stats(user_address: address): (u64, u64, u64) acquires TodoList {
        if (!exists<TodoList>(user_address)) {
            return (0, 0, 0)
        };
        
        let todo_list = borrow_global<TodoList>(user_address);
        let pending_tasks = todo_list.total_tasks - todo_list.completed_tasks;
        
        (todo_list.total_tasks, todo_list.completed_tasks, pending_tasks)
    }

    #[view]
    public fun get_tasks_by_status(user_address: address, status: u8): vector<Task> acquires TodoList {
        if (!exists<TodoList>(user_address)) {
            return vector::empty<Task>()
        };
        
        let todo_list = borrow_global<TodoList>(user_address);
        let all_tasks = &todo_list.tasks;
        let filtered_tasks = vector::empty<Task>();
        let tasks_len = vector::length(all_tasks);
        let i = 0;
        
        while (i < tasks_len) {
            let task = vector::borrow(all_tasks, i);
            if (task.status == status) {
                vector::push_back(&mut filtered_tasks, *task);
            };
            i = i + 1;
        };
        
        filtered_tasks
    }

    #[view]
    public fun get_tasks_by_priority(user_address: address, priority: u8): vector<Task> acquires TodoList {
        if (!exists<TodoList>(user_address)) {
            return vector::empty<Task>()
        };
        
        let todo_list = borrow_global<TodoList>(user_address);
        let all_tasks = &todo_list.tasks;
        let filtered_tasks = vector::empty<Task>();
        let tasks_len = vector::length(all_tasks);
        let i = 0;
        
        while (i < tasks_len) {
            let task = vector::borrow(all_tasks, i);
            if (task.priority == priority) {
                vector::push_back(&mut filtered_tasks, *task);
            };
            i = i + 1;
        };
        
        filtered_tasks
    }

    #[view]
    public fun get_overdue_tasks(user_address: address): vector<Task> acquires TodoList {
        if (!exists<TodoList>(user_address)) {
            return vector::empty<Task>()
        };
        
        let todo_list = borrow_global<TodoList>(user_address);
        let all_tasks = &todo_list.tasks;
        let overdue_tasks = vector::empty<Task>();
        let current_time = timestamp::now_seconds();
        let tasks_len = vector::length(all_tasks);
        let i = 0;
        
        while (i < tasks_len) {
            let task = vector::borrow(all_tasks, i);
            if (task.status == STATUS_PENDING && task.due_date > 0 && task.due_date < current_time) {
                vector::push_back(&mut overdue_tasks, *task);
            };
            i = i + 1;
        };
        
        overdue_tasks
    }

    #[view]
    public fun todo_list_exists(user_address: address): bool {
        exists<TodoList>(user_address)
    }

    #[view]
    public fun get_category_stats(user_address: address): vector<String> acquires TodoList {
        if (!exists<TodoList>(user_address)) {
            return vector::empty<String>()
        };
        
        let todo_list = borrow_global<TodoList>(user_address);
        let all_tasks = &todo_list.tasks;
        let categories = vector::empty<String>();
        let tasks_len = vector::length(all_tasks);
        let i = 0;
        
        while (i < tasks_len) {
            let task = vector::borrow(all_tasks, i);
            let category_exists = false;
            let j = 0;
            let categories_len = vector::length(&categories);
            
            while (j < categories_len) {
                let existing_category = vector::borrow(&categories, j);
                if (*existing_category == task.category) {
                    category_exists = true;
                    break
                };
                j = j + 1;
            };
            
            if (!category_exists) {
                vector::push_back(&mut categories, task.category);
            };
            
            i = i + 1;
        };
        
        categories
    }
}
