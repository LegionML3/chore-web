// Member management with localStorage
function getMembers() {
    const members = localStorage.getItem('familyMembers');
    return members ? JSON.parse(members) : [];
}

function saveMembersToLocalStorage(members) {
    localStorage.setItem('familyMembers', JSON.stringify(members));
}

function addFamilyMember() {
    const input = document.getElementById('memberNameInput');
    const name = input.value.trim();

    if (name === '') {
        alert('Please enter a member name!');
        return;
    }

    // Check if member already exists
    const members = getMembers();
    if (members.some(m => m.name.toLowerCase() === name.toLowerCase())) {
        alert('This member already exists!');
        return;
    }

    const newMember = {
        id: Date.now().toString(),
        name: name,
        avatar: getAvatarForMember(members.length)
    };

    members.push(newMember);
    saveMembersToLocalStorage(members);
    input.value = '';
    
    displayMembers();
    populateMemberSelect();
}

function removeFamilyMember(memberId) {
    if (confirm('This will unassign all tasks from this member. Continue?')) {
        let members = getMembers();
        members = members.filter(m => m.id !== memberId);
        saveMembersToLocalStorage(members);

        // Unassign chores from this member
        let chores = getChores();
        chores = chores.map(c => {
            if (c.member === memberId) {
                c.member = null;
            }
            return c;
        });
        localStorage.setItem('chores', JSON.stringify(chores));

        displayMembers();
        populateMemberSelect();
        loadChores();
        updateLeaderboard();
    }
}

function getAvatarForMember(index) {
    const avatars = ['👨', '👩', '👦', '👧', '👶', '🧒', '👨‍💼', '👩‍💼'];
    return avatars[index % avatars.length];
}

function displayMembers() {
    const membersList = document.getElementById('membersList');
    const members = getMembers();

    membersList.innerHTML = '';

    if (members.length === 0) {
        membersList.innerHTML = '<p style="color: var(--text-tertiary); font-size: 0.9rem;">No family members added yet.</p>';
        return;
    }

    members.forEach(member => {
        const tag = document.createElement('div');
        tag.className = 'member-tag';
        tag.innerHTML = `
            <span class="member-tag-avatar">${member.avatar}</span>
            <span>${member.name}</span>
            <button class="member-tag-remove" onclick="removeFamilyMember('${member.id}')">✕</button>
        `;
        membersList.appendChild(tag);
    });
}

function populateMemberSelect() {
    const select = document.getElementById('memberSelect');
    const members = getMembers();
    
    // Keep the default option
    const currentValue = select.value;
    select.innerHTML = '<option value="">Select a family member...</option>';
    
    members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = `${member.avatar} ${member.name}`;
        select.appendChild(option);
    });

    // Restore selection if it still exists
    if (currentValue) {
        select.value = currentValue;
    }
}

// Get member name by ID
function getMemberName(memberId) {
    const members = getMembers();
    const member = members.find(m => m.id === memberId);
    return member ? member.name : 'Unknown';
}

// Get member avatar by ID
function getMemberAvatar(memberId) {
    const members = getMembers();
    const member = members.find(m => m.id === memberId);
    return member ? member.avatar : '?';
}

// Recurring Tasks Management
function checkAndResetRecurringTasks() {
    let chores = getChores();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    chores = chores.map(chore => {
        if (chore.repeat === 'none' || !chore.repeat) {
            return chore;
        }

        const lastCompleted = chore.lastCompleted ? new Date(chore.lastCompleted) : null;
        if (lastCompleted) {
            lastCompleted.setHours(0, 0, 0, 0);
        }

        let shouldReset = false;

        if (!lastCompleted) {
            return chore; // Never completed, don't reset
        }

        switch (chore.repeat) {
            case 'daily':
                shouldReset = lastCompleted < today;
                break;
            case 'weekly':
                const oneWeekAgo = new Date(today);
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                shouldReset = lastCompleted <= oneWeekAgo;
                break;
            case 'monthly':
                const prevMonth = new Date(today);
                prevMonth.setMonth(prevMonth.getMonth() - 1);
                shouldReset = lastCompleted <= prevMonth;
                break;
        }

        if (shouldReset && chore.completed) {
            chore.completed = false;
        }

        return chore;
    });

    localStorage.setItem('chores', JSON.stringify(chores));
}

// Reward System Management
function getPoints() {
    const points = localStorage.getItem('familyPoints');
    return points ? JSON.parse(points) : {};
}

function savePoints(points) {
    localStorage.setItem('familyPoints', JSON.stringify(points));
}

function getRewards() {
    const rewards = localStorage.getItem('rewards');
    return rewards ? JSON.parse(rewards) : [
        { id: 'movie', emoji: '🎬', name: 'Pick the Movie', description: 'Choose tonight\'s movie', cost: 100 },
        { id: 'snack', emoji: '🍿', name: 'Special Snack', description: 'Get a special treat', cost: 75 },
        { id: 'bedtime', emoji: '⏰', name: 'Later Bedtime', description: 'Stay up 1 hour later', cost: 150 },
        { id: 'game', emoji: '🎮', name: 'Extra Game Time', description: '30 minutes extra screen time', cost: 120 },
        { id: 'pizza', emoji: '🍕', name: 'Pizza Night', description: 'Choose pizza toppings', cost: 200 },
        { id: 'trip', emoji: '🚗', name: 'Family Outing', description: 'Plan a small outing', cost: 300 }
    ];
}

function getRedeemedRewards() {
    const redeemed = localStorage.getItem('redeemedRewards');
    return redeemed ? JSON.parse(redeemed) : [];
}

function saveRedeemedRewards(redeemed) {
    localStorage.setItem('redeemedRewards', JSON.stringify(redeemed));
}

function redeemReward(rewardId) {
    const rewards = getRewards();
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    const memberId = extractCurrentMemberId();
    if (!memberId) {
        alert('Please select a family member to redeem rewards for!');
        return;
    }

    const points = getPoints();
    const memberPoints = points[memberId] || 0;

    if (memberPoints < reward.cost) {
        alert(`Not enough points! You have ${memberPoints} but need ${reward.cost}.`);
        return;
    }

    points[memberId] = memberPoints - reward.cost;
    savePoints(points);

    const redeemed = getRedeemedRewards();
    redeemed.push({
        rewardId: reward.id,
        memberId: memberId,
        date: new Date().toISOString(),
        name: reward.name,
        emoji: reward.emoji
    });
    saveRedeemedRewards(redeemed);

    populateRewards();
    updateMemberPointsDisplay();
}

// Extract current member from member select (for rewards)
function extractCurrentMemberId() {
    const memberSelect = document.getElementById('memberSelect');
    return memberSelect ? memberSelect.value : null;
}

// Populate rewards grid
function populateRewards() {
    const rewardsGrid = document.getElementById('rewardsGrid');
    const rewards = getRewards();
    rewardsGrid.innerHTML = '';

    const memberId = extractCurrentMemberId();
    const points = getPoints();
    const memberPoints = points[memberId] || 0;

    rewards.forEach(reward => {
        const canAfford = memberPoints >= reward.cost;
        const card = document.createElement('div');
        card.className = `reward-card ${!canAfford ? 'locked' : ''}`;
        
        card.innerHTML = `
            <div class="reward-emoji">${reward.emoji}</div>
            <div class="reward-name">${reward.name}</div>
            <div class="reward-description">${reward.description}</div>
            <div class="reward-cost">
                <span>✨</span>
                <span>${reward.cost} pts</span>
            </div>
            <button class="reward-btn" onclick="redeemReward('${reward.id}')" ${!canAfford ? 'disabled' : ''}>
                ${canAfford ? 'Redeem' : 'Locked'}
            </button>
        `;
        rewardsGrid.appendChild(card);
    });
}

// Update member points display
function updateMemberPointsDisplay() {
    const display = document.getElementById('memberPointsDisplay');
    const memberId = extractCurrentMemberId();
    const points = getPoints();
    const memberPoints = points[memberId] || 0;

    if (display) {
        display.innerHTML = `<div style="color: var(--text-secondary); font-size: 0.9rem;">
            Your Points: <span class="member-points-value">${memberPoints} ✨</span>
        </div>`;
    }
}

// Display redeemed rewards
function displayRedeemedRewards() {
    const list = document.getElementById('yourRewardsList');
    const redeemed = getRedeemedRewards();
    const memberId = extractCurrentMemberId();
    
    if (!memberId) {
        list.innerHTML = '<p style="color: var(--text-tertiary);">Select a family member to see redeemed rewards.</p>';
        return;
    }

    const memberRedeemed = redeemed.filter(r => r.memberId === memberId);

    if (memberRedeemed.length === 0) {
        list.innerHTML = '<p style="color: var(--text-tertiary);">No redeemed rewards yet!</p>';
        return;
    }

    list.innerHTML = '';
    memberRedeemed.forEach(reward => {
        const date = new Date(reward.date).toLocaleDateString();
        const card = document.createElement('div');
        card.className = 'redeemed-reward';
        card.innerHTML = `
            <div class="redeemed-reward-emoji">${reward.emoji}</div>
            <div class="redeemed-reward-name">${reward.name}</div>
            <div class="redeemed-reward-date">${date}</div>
        `;
        list.appendChild(card);
    });
}

// Calendar state
let currentCalendarDate = new Date();

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    displayCurrentDate();
    displayMembers();
    populateMemberSelect();
    setupTabNavigation();
    setupEventListeners();
    checkAndResetRecurringTasks();
    loadChores();
    updateSummary();
    updateProgressBar();
    updateLeaderboard();
    initializeCalendar();
    populateRewards();
    updateMemberPointsDisplay();
});

// TAB NAVIGATION
function setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.getAttribute('data-tab');

            // Remove active class from all
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

// EVENT LISTENERS
function setupEventListeners() {
    const form = document.getElementById('choreForm');
    form.addEventListener('submit', addChore);

    // Priority input change listener
    const priorityInput = document.getElementById('priorityInput');
    if (priorityInput) {
        priorityInput.addEventListener('input', (e) => {
            const value = parseInt(e.target.value) || 3;
            const labels = {
                1: 'Not Urgent',
                2: 'Low',
                3: 'Medium',
                4: 'High',
                5: 'Immediate'
            };
            document.getElementById('priorityLabel').textContent = labels[value] || 'Medium';
        });
    }

    // Member select change listener (for rewards tab)
    const memberSelect = document.getElementById('memberSelect');
    if (memberSelect) {
        memberSelect.addEventListener('change', () => {
            populateRewards();
            updateMemberPointsDisplay();
            displayRedeemedRewards();
        });
    }

    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
        renderCalendar();
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
        renderCalendar();
    });
}

// Display current date
function displayCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    dateElement.textContent = today;
}

// Add new chore
function addChore(e) {
    e.preventDefault();

    const choreInput = document.getElementById('choreInput');
    const memberSelect = document.getElementById('memberSelect');
    const frequencySelect = document.getElementById('frequencySelect');
    const priorityInput = document.getElementById('priorityInput');
    const dueDateInput = document.getElementById('dueDateInput');
    const repeatSelect = document.getElementById('repeatSelect');
    const statusNote = document.getElementById('statusNote');

    if (choreInput.value.trim() === '') {
        alert('Please enter a chore name!');
        return;
    }

    if (!memberSelect.value) {
        alert('Please assign a family member!');
        return;
    }

    if (!dueDateInput.value) {
        alert('Please select a due date!');
        return;
    }

    const priority = parseInt(priorityInput.value) || 3;
    
    if (priority < 1 || priority > 5) {
        alert('Priority must be between 1 and 5!');
        return;
    }

    const chore = {
        id: Date.now(),
        text: choreInput.value.trim(),
        member: memberSelect.value,
        frequency: frequencySelect.value,
        priority: priority,
        dueDate: dueDateInput.value,
        repeat: repeatSelect.value || 'none',
        statusNote: statusNote.value.trim() || '',
        lastCompleted: null,
        completed: false,
        completionDates: [],
        createdAt: new Date().toLocaleString()
    };

    saveChore(chore);
    choreInput.value = '';
    memberSelect.value = '';
    frequencySelect.value = 'weekly';
    priorityInput.value = '3';
    dueDateInput.value = '';
    repeatSelect.value = 'none';
    statusNote.value = '';
    document.getElementById('priorityLabel').textContent = 'Medium';
    
    // Switch to dashboard tab
    document.querySelector('[data-tab="dashboard"]').click();
    
    loadChores();
    updateSummary();
    updateProgressBar();
    updateLeaderboard();
    renderCalendar();
}

// Save chore to localStorage
function saveChore(chore) {
    const chores = getChores();
    chores.push(chore);
    localStorage.setItem('chores', JSON.stringify(chores));
}

// Get chores from localStorage
function getChores() {
    const chores = localStorage.getItem('chores');
    return chores ? JSON.parse(chores) : [];
}

// Load and display chores
function loadChores() {
    const choresList = document.getElementById('choresList');
    const emptyState = document.getElementById('emptyState');
    const chores = getChores();

    choresList.innerHTML = '';

    if (chores.length === 0) {
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';

    // Sort by: not completed first, then by priority (highest first), then by due date
    chores.sort((a, b) => {
        // Completed chores go to bottom
        if (a.completed !== b.completed) {
            return a.completed - b.completed;
        }
        // Sort by priority descending (5 first, then 4, etc.)
        if (a.priority !== b.priority) {
            return b.priority - a.priority;
        }
        // Sort by due date
        return new Date(a.dueDate) - new Date(b.dueDate);
    });

    chores.forEach(chore => {
        const card = createChoreCard(chore);
        choresList.appendChild(card);
    });
}

// Create a chore card element
function createChoreCard(chore) {
    const card = document.createElement('div');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(chore.dueDate + 'T00:00:00');
    const isOverdue = dueDate < today && !chore.completed;
    
    card.className = `chore-card ${chore.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`;
    card.dataset.id = chore.id;

    const memberName = getMemberName(chore.member);
    const memberAvatar = getMemberAvatar(chore.member);
    const frequencyLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
    
    // Format due date
    const dueDateStr = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Priority as numeric value (1-5)
    const priorityValue = parseInt(chore.priority) || 3;
    const priorityClass = `priority-${priorityValue}`;

    // Repeat label
    const repeatLabels = { none: '', daily: '🔄 Daily', weekly: '🔄 Weekly', monthly: '🔄 Monthly' };
    const repeatLabel = repeatLabels[chore.repeat] || '';

    const overdueBadge = isOverdue ? '<span class="overdue-badge">⚠️ Overdue</span>' : '';
    const statusDisplay = chore.statusNote ? `<div class="status-note-display">📝 ${escapeHtml(chore.statusNote)}</div>` : '';

    card.innerHTML = `
        <input 
            type="checkbox" 
            class="chore-checkbox" 
            ${chore.completed ? 'checked' : ''}
            onchange="toggleChore(${chore.id})"
        >
        <div class="member-avatar">${memberAvatar}</div>
        <div class="chore-content">
            <div class="chore-header">
                <div class="chore-text">${escapeHtml(chore.text)}</div>
                <div class="member-name">${memberName}</div>
            </div>
            <div class="chore-tags">
                <span class="chore-frequency ${chore.frequency}">
                    ${frequencyLabels[chore.frequency]}
                </span>
                <span class="chore-priority ${priorityClass}">
                    P${priorityValue}
                </span>
                <span style="background: var(--bg-tertiary); color: var(--text-tertiary); padding: 4px 10px; border-radius: 4px; font-size: 0.75em; font-weight: 600; border: 1px solid var(--border-color); font-family: 'JetBrains Mono', monospace;">
                    📅 ${dueDateStr}
                </span>
                ${repeatLabel ? `<span style="color: var(--accent-blue); font-size: 0.75em;">${repeatLabel}</span>` : ''}
                ${overdueBadge}
            </div>
            ${statusDisplay}
        </div>
        <div class="chore-actions">
            <button class="btn-complete" onclick="toggleChore(${chore.id})">
                ${chore.completed ? '✓ Done' : 'Complete'}
            </button>
            <button class="btn-delete" onclick="deleteChore(${chore.id})">
                Delete
            </button>
        </div>
    `;

    return card;
}

// Toggle chore completion
function toggleChore(id) {
    const chores = getChores();
    const chore = chores.find(c => c.id === id);

    if (chore) {
        chore.completed = !chore.completed;
        
        // Track completion dates for leaderboard
        if (chore.completed) {
            if (!chore.completionDates) {
                chore.completionDates = [];
            }
            chore.completionDates.push(new Date().toISOString());
            chore.lastCompleted = new Date().toISOString();
            
            // Award points
            const points = getPoints();
            const memberId = chore.member;
            const pointsAwarded = 10 + (chore.priority * 5); // 15-35 points based on priority
            points[memberId] = (points[memberId] || 0) + pointsAwarded;
            savePoints(points);
        } else {
            // Deduct points if uncompleting
            const points = getPoints();
            const memberId = chore.member;
            const pointsAwarded = 10 + (chore.priority * 5);
            points[memberId] = Math.max(0, (points[memberId] || 0) - pointsAwarded);
            savePoints(points);
        }
        
        localStorage.setItem('chores', JSON.stringify(chores));
        loadChores();
        updateSummary();
        updateProgressBar();
        updateLeaderboard();
        renderCalendar();
        updateMemberPointsDisplay();
        displayRedeemedRewards();
    }
}

// Delete chore
function deleteChore(id) {
    if (confirm('Are you sure you want to delete this chore?')) {
        let chores = getChores();
        chores = chores.filter(c => c.id !== id);
        localStorage.setItem('chores', JSON.stringify(chores));
        loadChores();
        updateSummary();
        updateProgressBar();
        updateLeaderboard();
        renderCalendar();
    }
}

// Clear all completed chores
function clearAllCompleted() {
    let chores = getChores();
    chores = chores.filter(c => !c.completed);
    localStorage.setItem('chores', JSON.stringify(chores));
    loadChores();
    updateSummary();
    updateProgressBar();
    updateLeaderboard();
    renderCalendar();
}

// Send nudge to assignee using Web Notifications API
function nudgeAssignee() {
    const menuSelect = document.getElementById('memberSelect');
    if (!menuSelect || !menuSelect.value) {
        alert('Please select a family member to nudge!');
        return;
    }

    const memberId = menuSelect.value;
    const member = getMembers().find(m => m.id === memberId);
    
    // Get pending tasks for this member
    const chores = getChores();
    const pendingChores = chores.filter(c => !c.completed && c.member === memberId);

    if (pendingChores.length === 0) {
        alert(`${member.name} has no pending chores!`);
        return;
    }

    // Request notification permission if needed
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Nudge for ${member.name}! 📢`, {
            body: `You have ${pendingChores.length} pending chore(s)!`,
            icon: member.avatar,
            tag: 'nudge-' + memberId
        });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification(`Nudge for ${member.name}! 📢`, {
                    body: `You have ${pendingChores.length} pending chore(s)!`,
                    icon: member.avatar,
                    tag: 'nudge-' + memberId
                });
            }
        });
    } else {
        alert(`📢 Nudge sent to ${member.name}! They have ${pendingChores.length} pending chore(s).`);
    }
}

// Update summary stats
function updateSummary() {
    const chores = getChores();
    const total = chores.length;
    const completed = chores.filter(c => c.completed).length;
    const pending = total - completed;

    document.getElementById('totalTasks').textContent = total;
    document.getElementById('pendingTasks').textContent = pending;
    document.getElementById('completedTasks').textContent = completed;
}

// Update progress bar
function updateProgressBar() {
    const chores = getChores();
    const total = chores.length;

    let progress = 0;

    if (total > 0) {
        const completed = chores.filter(c => c.completed).length;
        progress = Math.min((completed / total) * 100, 100);
    }

    const progressFill = document.getElementById('progressFill');
    const levelPercentage = document.getElementById('levelPercentage');

    progressFill.style.width = progress + '%';
    levelPercentage.textContent = Math.round(progress) + '%';
}

// Update leaderboard
function updateLeaderboard() {
    const chores = getChores();
    const leaderboardList = document.getElementById('leaderboardList');
    const leaderboardEmpty = document.getElementById('leaderboardEmpty');
    const members = getMembers();

    // Calculate scores per member
    const scores = {};
    
    members.forEach(member => {
        scores[member.id] = {
            name: member.name,
            avatar: member.avatar,
            completed: 0
        };
    });

    // Count completed chores per member
    chores.forEach(chore => {
        if (chore.completed && scores[chore.member]) {
            scores[chore.member].completed += 1;
        }
    });

    // Sort by score
    const sorted = Object.entries(scores)
        .sort(([, a], [, b]) => b.completed - a.completed)
        .filter(([, score]) => score.completed > 0);

    leaderboardList.innerHTML = '';

    if (sorted.length === 0) {
        leaderboardEmpty.style.display = 'block';
        leaderboardList.style.display = 'none';
    } else {
        leaderboardEmpty.style.display = 'none';
        leaderboardList.style.display = 'flex';

        sorted.forEach(([memberId, score], index) => {
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉';
            
            const item = document.createElement('div');
            item.className = `leaderboard-item top-${rank}`;
            
            item.innerHTML = `
                <div class="leaderboard-rank">${medal}</div>
                <div class="leaderboard-info">
                    <div class="leaderboard-avatar">${score.avatar}</div>
                    <div class="leaderboard-name">${score.name}</div>
                </div>
                <div class="leaderboard-score">
                    <span>${score.completed}</span>
                    <span style="font-size: 0.8em;">✓</span>
                </div>
            `;
            
            leaderboardList.appendChild(item);
        });
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// CALENDAR FUNCTIONS
function initializeCalendar() {
    // Set today's date as default
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById('dueDateInput').value = `${year}-${month}-${day}`;
    
    renderCalendar();
}

function renderCalendar() {
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Update header
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('calendarMonthYear').textContent = `${monthNames[month]} ${year}`;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const calendarGrid = document.getElementById('calendarGrid');
    calendarGrid.innerHTML = '';
    
    // Get chores data
    const chores = getChores();
    const today = new Date();
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        const dayElement = createDayElement(day, 'other-month', null, null);
        calendarGrid.appendChild(dayElement);
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
        
        // Get tasks for this date
        const dayChores = chores.filter(c => c.dueDate === dateStr);
        
        let classes = '';
        if (isToday) classes += 'today ';
        if (dayChores.length > 0) classes += 'has-tasks';
        
        const dayElement = createDayElement(day, classes, dateStr, dayChores.length);
        dayElement.addEventListener('click', () => showDayTasks(dateStr, dayChores));
        
        calendarGrid.appendChild(dayElement);
    }
    
    // Next month days
    const totalCells = calendarGrid.children.length + (42 - firstDay - daysInMonth);
    for (let day = 1; day <= (42 - firstDay - daysInMonth); day++) {
        const dayElement = createDayElement(day, 'other-month', null, null);
        calendarGrid.appendChild(dayElement);
    }
}

function createDayElement(day, classes, dateStr, taskCount) {
    const dayDiv = document.createElement('div');
    dayDiv.className = `calendar-day ${classes}`;
    if (dateStr) dayDiv.dataset.date = dateStr;
    
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    dayDiv.appendChild(dayNumber);
    
    if (taskCount > 0) {
        const indicator = document.createElement('div');
        indicator.className = 'task-indicator';
        indicator.textContent = taskCount;
        dayDiv.appendChild(indicator);
    }
    
    return dayDiv;
}

function showDayTasks(dateStr, dayChores) {
    const tasksSection = document.getElementById('calendarTasksSection');
    const selectedDateElement = document.getElementById('calendarSelectedDate');
    const tasksList = document.getElementById('calendarTasksList');
    
    // Format date
    const date = new Date(dateStr + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    
    selectedDateElement.textContent = `Tasks for ${formattedDate}`;
    tasksList.innerHTML = '';
    
    if (dayChores.length === 0) {
        tasksList.innerHTML = '<p style="color: var(--text-tertiary); text-align: center; padding: 20px;">No tasks scheduled for this date</p>';
    } else {
        dayChores.forEach(chore => {
            const memberName = getMemberName(chore.member);
            const memberAvatar = getMemberAvatar(chore.member);
            const taskCard = document.createElement('div');
            taskCard.className = `calendar-task-card ${chore.completed ? 'completed' : ''}`;
            
            const frequencyLabels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly' };
            const priorityValue = parseInt(chore.priority) || 3;
            
            taskCard.innerHTML = `
                <input 
                    type="checkbox" 
                    class="task-checkbox" 
                    ${chore.completed ? 'checked' : ''}
                    onchange="handleCalendarTaskToggle(${chore.id})"
                >
                <div class="calendar-task-info">
                    <div class="calendar-task-title">${escapeHtml(chore.text)}</div>
                    <div class="calendar-task-meta">
                        <span class="calendar-task-member">${memberAvatar} ${memberName}</span>
                        <span class="calendar-task-freq">${frequencyLabels[chore.frequency]}</span>
                        <span style="background: var(--bg-tertiary); color: var(--text-tertiary); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 3px; font-family: 'JetBrains Mono', monospace;">P${priorityValue}</span>
                    </div>
                </div>
            `;
            
            tasksList.appendChild(taskCard);
        });
    }
    
    tasksSection.style.display = 'block';
    tasksSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function handleCalendarTaskToggle(id) {
    toggleChore(id);
    // Re-render calendar to update display
    setTimeout(() => {
        renderCalendar();
    }, 100);
}