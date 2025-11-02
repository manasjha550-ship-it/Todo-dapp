# Todo dApp

A decentralized task management application built on Aptos blockchain. Users can create, manage, and track their tasks permanently on-chain with priority levels, categories, and due dates.

## Project Structure

```
todo-app/
├── sources/
│   └── todo_list.move        # Smart contract
├── Move.toml                 # Move configuration
├── index.html               # Frontend HTML
├── script.js                # Frontend JavaScript
├── styles.css               # Frontend CSS
├── deploy.sh                # Deployment script
└── README.md                # Documentation
```

## Features

- Permanent task storage on Aptos blockchain
- Priority-based task organization (Low, Medium, High)
- Category management (Work, Personal, Health, Shopping, Study, Other)
- Due date tracking with overdue detection
- Task completion tracking
- Real-time statistics dashboard
- Demo mode for testing without wallet connection
- Responsive web interface
- Petra wallet integration

## Quick Start

1. **Clone and setup**
```bash
git clone [your-repo-url]
cd todo-app
```

2. **Install Aptos CLI and initialize account**
```bash
aptos init --network testnet
```

3. **Fund your account**
Visit https://aptos.dev/network/faucet

4. **Deploy the smart contract**
```bash
chmod +x deploy.sh
./deploy.sh
```

5. **Update contract address**
Edit `script.js` line 3:
```javascript
const MODULE_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS";
```

6. **Open `index.html` in browser or deploy to hosting platform**

## Smart Contract Functions

**Core Functions:**
- `initialize_todo_list()` - Set up task management for a user
- `add_task(title, description, priority, due_date, category)` - Create new task
- `complete_task(task_id)` - Mark task as completed
- `delete_task(task_id)` - Remove a task
- `update_task_priority(task_id, new_priority)` - Change task priority

**View Functions:**
- `get_tasks(user_address)` - Retrieve all user tasks
- `get_task_stats(user_address)` - Get task statistics
- `get_tasks_by_status(user_address, status)` - Filter by completion status
- `get_tasks_by_priority(user_address, priority)` - Filter by priority level
- `get_overdue_tasks(user_address)` - Get overdue tasks

## Usage

**With Petra Wallet:**
Connect your wallet to store tasks permanently on the blockchain. All operations require wallet approval and small gas fees.

**Demo Mode:**
Automatically enabled when no wallet is detected. Uses local storage to simulate blockchain functionality.

## Technical Details

**Smart Contract Features:**
- Event-driven architecture with task lifecycle events
- Comprehensive error handling and validation
- Efficient vector operations for task management
- Multi-level filtering and statistics

**Frontend Features:**
- Modern responsive design with CSS gradients
- Real-time statistics and category breakdowns
- Advanced filtering and sorting options
- Mobile-friendly interface
- Professional UI/UX

This Todo dApp demonstrates practical blockchain application development with user-friendly interface design and efficient smart contract architecture.