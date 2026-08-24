// ============================================
// SUPABASE CONFIGURATION
// ============================================
const SUPABASE_URL = 'https://yccfysavrsffpztvdhiy.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljY2Z5c2F2cnNmZnB6dHZkaGl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY4OTgwMDYsImV4cCI6MjEwMjQ3NDAwNn0.3NDs75nsM1X2eJKaREOcEmOtLN-cIVpe2W2UaS_yJ4Y'
const { createClient } = supabase
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ============================================
// STATE
// ============================================
let allSupporters = []
let allMembers = []
let allMeetings = []
let currentTab = 'supporters'

// ============================================
// DOM ELEMENTS
// ============================================
const loginScreen = document.getElementById('admin-login')
const dashboard = document.getElementById('admin-dashboard')
const loginBtn = document.getElementById('admin-login-btn')
const logoutBtn = document.getElementById('logout-btn')
const loginFeedback = document.getElementById('login-feedback')
 
// ============================================
// LOGIN / LOGOUT — SUPABASE AUTH
// ============================================

// Check if already logged in on page load
db.auth.getSession().then(({ data: { session } }) => {
    if (session) {
        loginScreen.style.display = 'none'
        dashboard.style.display = 'block'
        initDashboard()
    }
})

loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('admin-username').value.trim()
    const password = document.getElementById('admin-password').value.trim()

    if (!email || !password) {
        loginFeedback.style.color = '#dc3545'
        loginFeedback.textContent = 'Please enter your email and password.'
        return
    }

    loginBtn.textContent = 'Logging in...'
    loginBtn.disabled = true

    const { error } = await db.auth.signInWithPassword({ email, password })

    if (error) {
        loginFeedback.style.color = '#dc3545'
        loginFeedback.textContent = 'Invalid email or password.'
        loginBtn.textContent = 'Login'
        loginBtn.disabled = false
        return
    }

    loginScreen.style.display = 'none'
    dashboard.style.display = 'block'
    initDashboard()
})

logoutBtn.addEventListener('click', async () => {
    await db.auth.signOut()
    loginScreen.style.display = 'flex'
    dashboard.style.display = 'none'
    document.getElementById('admin-username').value = ''
    document.getElementById('admin-password').value = ''
})

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && loginScreen.style.display !== 'none') {
        loginBtn.click()
    }
})

// ============================================
// LIVE CLOCK
// ============================================
function startClock() {
    const timeEl = document.getElementById('admin-time')
    setInterval(() => {
        timeEl.textContent = new Date().toLocaleString('en-KE', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }, 1000)
}

// ============================================
// TAB SWITCHING
// ============================================
let autoRefreshTimer = null

function startAutoRefresh(tab) {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer)
        autoRefreshTimer = null
    }

    autoRefreshTimer = setInterval(async () => {
        if (tab === 'supporters') await loadSupporters()
        else if (tab === 'members') await loadMembers()
        else if (tab === 'attendance') await loadMeetings()
        else if (tab === 'news') await loadPosts()
        else if (tab === 'contacts') await loadContacts()
        showRefreshIndicator()
    }, 60000)
}

function showRefreshIndicator() {
    const timeEl = document.getElementById('admin-time')
    const originalText = timeEl.textContent
    timeEl.innerHTML = `${originalText} <span style="color: var(--primary); font-size: 0.8rem;">
        <i class="fa-solid fa-rotate fa-spin"></i> Refreshed
    </span>`
    setTimeout(() => {
        timeEl.textContent = originalText
    }, 2000)
}

function initTabs() {
    const tabs = document.querySelectorAll('.admin-tab')
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            const target = tab.dataset.tab
            currentTab = target
            document.querySelectorAll('.tab-section').forEach(section => {
                section.style.display = 'none'
            })
            document.getElementById(`tab-${target}`).style.display = 'block'
            startAutoRefresh(target)
        })
    })

    startAutoRefresh('supporters')
}

// ============================================
// INIT DASHBOARD
// ============================================
async function initDashboard() {
    startClock()
    initTabs()
    await loadSupporters()
    await loadMembers()
    await loadMeetings()
    await loadPosts()
    await loadContacts()
}

// ============================================
// TAB 1 — SUPPORTERS
// ============================================
async function loadSupporters() {
    try {
        const { data, error } = await db
            .from('supporters')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        allSupporters = data
        updateStats(data)
        renderSupportersTable(data)

    } catch (error) {
        console.error('Load supporters error:', error)
    }
}

function updateStats(data) {
    document.getElementById('stat-total').textContent = data.length.toLocaleString()
    document.getElementById('stat-voters').textContent = data.filter(s => s.role === 'voter').length.toLocaleString()
    document.getElementById('stat-volunteers').textContent = data.filter(s => s.role === 'volunteer').length.toLocaleString()
    document.getElementById('stat-agents').textContent = data.filter(s => s.role === 'agent').length.toLocaleString()
    document.getElementById('stat-mobilizers').textContent = data.filter(s => s.role === 'mobilizer').length.toLocaleString()
}

function renderSupportersTable(data) {
    const tbody = document.getElementById('supporters-tbody')
    const noData = document.getElementById('no-data-msg')

    if (data.length === 0) {
        tbody.innerHTML = ''
        noData.style.display = 'block'
        return
    }

    noData.style.display = 'none'
    tbody.innerHTML = data.map((s, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${s.full_name}</td>
            <td>${s.phone}</td>
            <td>${s.email || '—'}</td>
            <td>${s.ward}</td>
            <td><span class="role-badge ${s.role}">${s.role}</span></td>
            <td>${new Date(s.created_at).toLocaleDateString('en-KE')}</td>
        </tr>
    `).join('')

    renderWardBreakdown(data)
}

function renderWardBreakdown(data) {
    const wardGrid = document.getElementById('ward-grid')
    const wardCounts = {}

    data.forEach(s => {
        wardCounts[s.ward] = (wardCounts[s.ward] || 0) + 1
    })

    wardGrid.innerHTML = Object.entries(wardCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([ward, count]) => `
            <div class="ward-card">
                <h3>${count.toLocaleString()}</h3>
                <p>${ward}</p>
            </div>
        `).join('')
}

document.getElementById('search-input').addEventListener('input', filterSupporters)
document.getElementById('ward-filter').addEventListener('change', filterSupporters)
document.getElementById('role-filter').addEventListener('change', filterSupporters)

function filterSupporters() {
    const search = document.getElementById('search-input').value.toLowerCase()
    const ward = document.getElementById('ward-filter').value
    const role = document.getElementById('role-filter').value

    let filtered = allSupporters

    if (search) {
        filtered = filtered.filter(s =>
            s.full_name.toLowerCase().includes(search) ||
            s.phone.includes(search)
        )
    }

    if (ward !== 'all') {
        filtered = filtered.filter(s => s.ward === ward)
    }

    if (role !== 'all') {
        filtered = filtered.filter(s => s.role === role)
    }

    renderSupportersTable(filtered)
}

document.getElementById('refresh-btn').addEventListener('click', loadSupporters)

document.getElementById('export-btn').addEventListener('click', () => {
    const headers = ['#', 'Full Name', 'Phone', 'Email', 'Ward', 'Role', 'Registered']
    const rows = allSupporters.map((s, i) => [
        i + 1,
        s.full_name,
        s.phone,
        s.email || '',
        s.ward,
        s.role,
        new Date(s.created_at).toLocaleDateString('en-KE')
    ])

    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `supporters_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
})

// ============================================
// TAB 2 — TEAM MEMBERS
// ============================================
async function loadMembers() {
    try {
        const { data, error } = await db
    .from('members')
    .select('*')
    .order('created_at', { ascending: true })
        if (error) throw error

        allMembers = data
        renderMembersTable(data)

    } catch (error) {
        console.error('Load members error:', error)
    }
}

function renderMembersTable(data) {
    const tbody = document.getElementById('members-tbody')

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#666; padding:40px;">No team members added yet.</td></tr>`
        return
    }

    tbody.innerHTML = data.map((m, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${m.full_name}</td>
            <td>${m.phone}</td>
            <td><span class="level-badge ${m.level}">${m.role_title}</span></td>
            <td>${m.sub_county || m.ward || '—'}</td>
            <td>
                <button class="btn-delete" onclick="deleteMember('${m.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('')
}

document.getElementById('add-member-btn').addEventListener('click', async () => {
    const name = document.getElementById('member-name').value.trim()
    const phone = document.getElementById('member-phone').value.trim()
    const roleTitle = document.getElementById('member-role').value.trim()
    const level = document.getElementById('member-level').value
    const area = document.getElementById('member-area').value.trim()
    const feedback = document.getElementById('member-feedback')

    if (!name || !phone || !roleTitle || !level) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please fill in all required fields.'
        return
    }

    try {
        // Check for duplicate by phone number
        const { data: existing, error: checkError } = await db
            .from('members')
            .select('id, full_name')
            .eq('phone', phone)
            .maybeSingle()

        if (checkError) throw checkError

        if (existing) {
            feedback.style.color = '#dc3545'
            feedback.textContent = `This member already exists — ${existing.full_name} is registered with this phone number.`
            return
        }

        const { error } = await db
            .from('members')
            .insert([{
                full_name: name,
                phone: phone,
                role_title: roleTitle,
                level: level,
                sub_county: level === 'subcounty' ? area : null,
                ward: level === 'ward' ? area : null
            }])

        if (error) throw error

        feedback.style.color = '#28a745'
        feedback.textContent = 'Member added successfully.'

        document.getElementById('member-name').value = ''
        document.getElementById('member-phone').value = ''
        document.getElementById('member-role').value = ''
        document.getElementById('member-level').value = ''
        document.getElementById('member-area').value = ''

        await loadMembers()

    } catch (error) {
        console.error('Add member error:', error)
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Something went wrong. Please try again.'
    }
})
function deleteMember(id) {
    if (!confirm('Are you sure you want to remove this member?')) return

    db.from('members')
        .delete()
        .eq('id', id)
        .then(({ error }) => {
            if (error) {
                console.error('Delete member error:', error)
                return
            }
            loadMembers()
        })
}

// ============================================
// TAB 3 — ATTENDANCE
// ============================================
async function loadMeetings() {
    try {
        const { data, error } = await db
            .from('meetings')
            .select('*')
            .order('meeting_date', { ascending: false })

        if (error) throw error

        allMeetings = data
        renderMeetingsList(data)
        populateMeetingSelect(data)

    } catch (error) {
        console.error('Load meetings error:', error)
    }
}

function openAttendance(meetingId, meetingTitle) {
    document.getElementById('attendance-title').textContent = `Taking Attendance — ${meetingTitle}`
    document.getElementById('attendance-register').style.display = 'block'
    document.getElementById('attendance-meeting-select').value = meetingId
    renderAttendanceRegister(meetingId)
}

function renderMeetingsList(data) {
    const list = document.getElementById('meetings-list')

    if (data.length === 0) {
        list.innerHTML = '<p style="color:#666;">No meetings created yet.</p>'
        return
    }

    list.innerHTML = data.map(m => `
        <div class="meeting-card" onclick="openAttendance('${m.id}', '${m.title}')">
            <div class="meeting-card-left">
                <h3>${m.title}</h3>
                <p><i class="fa-solid fa-location-dot"></i> ${m.location}</p>
            </div>
             <div class="meeting-card-right">
                <span class="meeting-date">${new Date(m.meeting_date).toLocaleDateString('en-KE', {
                    weekday: 'short',
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                })}</span>
                <button class="btn-edit" onclick="event.stopPropagation(); openEditMeeting('${m.id}')">
                    <i class="fa-solid fa-pen"></i> Edit
                </button>
            </div>
        </div>
    `).join('')
}

function populateMeetingSelect(data) {
    const select = document.getElementById('attendance-meeting-select')
    select.innerHTML = '<option value="">Select a meeting</option>' +
        data.map(m => `<option value="${m.id}">${m.title} — ${m.meeting_date}</option>`).join('')
}

document.getElementById('create-meeting-btn').addEventListener('click', async () => {
    const title = document.getElementById('meeting-title').value.trim()
    const location = document.getElementById('meeting-location').value.trim()
    const date = document.getElementById('meeting-date').value
    const feedback = document.getElementById('meeting-feedback')

    if (!title || !location || !date) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please fill in all meeting details.'
        return
    }

    try {
        const { error } = await db
            .from('meetings')
            .insert([{ title, location, meeting_date: date }])

        if (error) throw error

        feedback.style.color = '#28a745'
        feedback.innerHTML = 'Meeting created successfully <i class="fa-solid fa-clipboard-check" style="color: rgb(30, 216, 31);"></i>'

        document.getElementById('meeting-title').value = ''
        document.getElementById('meeting-location').value = ''
        document.getElementById('meeting-date').value = ''

        await loadMeetings()

    } catch (error) {
        console.error('Create meeting error:', error)
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Something went wrong. Please try again.'
    }
})

// ============================================
// ATTENDANCE REGISTER — GROUPED BY ROLE
// ============================================
const LEVEL_ORDER = [
    { key: 'national', label: 'President & Deputy President' },
    { key: 'secretariat', label: 'Secretary General & Deputy' },
    { key: 'county', label: 'County Directors' },
    { key: 'subcounty', label: 'Sub-County Coordinators' },
    { key: 'ward', label: 'Ward Coordinators' }
]

async function renderAttendanceRegister(meetingId) {
    const container = document.getElementById('attendance-list')
    container.innerHTML = '<p style="color:#666;">Loading members...</p>'

    try {
        const { data: existing, error } = await db
            .from('attendance')
            .select('member_id, status, checked_at')
            .eq('meeting_id', meetingId)

        if (error) throw error

        const existingMap = {}
        existing.forEach(a => {
            existingMap[a.member_id] = {
                status: a.status,
                checked_at: a.checked_at
            }
        })

        const grouped = {}
        LEVEL_ORDER.forEach(l => { grouped[l.key] = [] })

        allMembers.forEach(m => {
            if (grouped[m.level]) {
                grouped[m.level].push(m)
            }
        })

        let html = ''

        LEVEL_ORDER.forEach(({ key, label }) => {
            const members = grouped[key]
            if (members.length === 0) return

            html += `
                <div class="attendance-group">
                    <div class="attendance-group-header">
                        <i class="fa-solid fa-chevron-right"></i>
                        <h3>${label}</h3>
                        <span class="group-count">${members.length} member${members.length > 1 ? 's' : ''}</span>
                    </div>
                    <div class="attendance-group-body">
                        ${members.map(m => {
                            const record = existingMap[m.id]
                            const isPresent = record?.status === 'present'
                            const checkedAt = record?.checked_at
                                ? new Date(record.checked_at).toLocaleTimeString('en-KE', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    second: '2-digit'
                                })
                                : null

                            return `
                                <div class="attendance-row" id="row-${m.id}">
                                    <div class="att-checkbox-wrapper">
                                        <input
                                            type="checkbox"
                                            class="att-checkbox"
                                            id="chk-${m.id}"
                                            ${isPresent ? 'checked' : ''}
                                            onchange="markAttendance('${meetingId}', '${m.id}', this)">
                                        <label for="chk-${m.id}"></label>
                                    </div>
                                    <div class="att-member-info">
                                        <p class="att-name">${m.full_name}</p>
                                        <p class="att-role">${m.role_title}</p>
                                    </div>
                                    <div class="att-status" id="status-${m.id}">
                                        ${isPresent
                                            ? `<span class="att-present-badge">
                                                <i class="fa-solid fa-circle-check"></i> Present
                                               </span>
                                               <span class="att-time">
                                                <i class="fa-regular fa-clock"></i> ${checkedAt}
                                               </span>`
                                            : record?.status === 'absent'
                                            ? `<span class="att-absent-badge">
                                                <i class="fa-solid fa-circle-xmark"></i> Absent
                                               </span>`
                                            : `<span class="att-pending">
                                                <i class="fa-regular fa-circle"></i> Not marked
                                               </span>`
                                        }
                                    </div>
                                </div>
                            `
                        }).join('')}
                    </div>
                </div>
            `
        })

        container.innerHTML = html

    } catch (error) {
        console.error('Render attendance error:', error)
        container.innerHTML = '<p style="color:#dc3545;">Failed to load attendance.</p>'
    }
}

function markAttendance(meetingId, memberId, checkbox) {
    const status = checkbox.checked ? 'present' : 'absent'
    const now = new Date().toISOString()
    const statusEl = document.getElementById(`status-${memberId}`)

    if (status === 'present') {
        const displayTime = new Date().toLocaleTimeString('en-KE', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        })
        statusEl.innerHTML = `
            <span class="att-present-badge">
                <i class="fa-solid fa-circle-check"></i> Present
            </span>
            <span class="att-time">
                <i class="fa-regular fa-clock"></i> ${displayTime}
            </span>
        `
    } else {
        statusEl.innerHTML = `
            <span class="att-absent-badge">
                <i class="fa-solid fa-circle-xmark"></i> Absent
            </span>
        `
    }

    db.from('attendance')
        .upsert([{
            meeting_id: meetingId,
            member_id: memberId,
            status: status,
            checked_at: status === 'present' ? now : null
        }], { onConflict: 'meeting_id,member_id' })
        .then(({ error }) => {
            if (error) {
                console.error('Mark attendance error:', error)
                checkbox.checked = !checkbox.checked
                statusEl.innerHTML = `<span class="att-pending">
                    <i class="fa-regular fa-circle"></i> Not marked
                </span>`
            }
        })
}
// ============================================
// EDIT MEMBER MODAL
// ============================================
function openEditMember(id) {
    const member = allMembers.find(m => m.id === id)
    if (!member) return

    document.getElementById('edit-member-id').value = member.id
    document.getElementById('edit-member-name').value = member.full_name
    document.getElementById('edit-member-phone').value = member.phone
    document.getElementById('edit-member-role').value = member.role_title
    document.getElementById('edit-member-level').value = member.level
    document.getElementById('edit-member-area').value = member.sub_county || member.ward || ''
    document.getElementById('edit-member-feedback').textContent = ''
    document.getElementById('edit-member-modal').style.display = 'flex'
}

function closeEditMember() {
    document.getElementById('edit-member-modal').style.display = 'none'
}

document.getElementById('close-member-modal').addEventListener('click', closeEditMember)
document.getElementById('close-member-modal-btn').addEventListener('click', closeEditMember)
document.getElementById('edit-member-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('edit-member-modal')) closeEditMember()
})

document.getElementById('save-member-btn').addEventListener('click', async () => {
    const id = document.getElementById('edit-member-id').value
    const name = document.getElementById('edit-member-name').value.trim()
    const phone = document.getElementById('edit-member-phone').value.trim()
    const roleTitle = document.getElementById('edit-member-role').value.trim()
    const level = document.getElementById('edit-member-level').value
    const area = document.getElementById('edit-member-area').value.trim()
    const feedback = document.getElementById('edit-member-feedback')

    if (!name || !phone || !roleTitle || !level) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please fill in all required fields.'
        return
    }

    try {
        const { error } = await db
            .from('members')
            .update({
                full_name: name,
                phone: phone,
                role_title: roleTitle,
                level: level,
                sub_county: level === 'subcounty' ? area : null,
                ward: level === 'ward' ? area : null
            })
            .eq('id', id)

        if (error) throw error

        feedback.style.color = '#28a745'
        feedback.innerHTML = '<i class="fa-solid fa-square-check"></i> Member updated successfully.'
        await loadMembers()
        setTimeout(() => closeEditMember(), 1000)

    } catch (error) {
        console.error('Edit member error:', error)
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Something went wrong. Please try again.'
    }
})

// ============================================
// EDIT MEETING MODAL
// ============================================
function openEditMeeting(id) {
    const meeting = allMeetings.find(m => m.id === id)
    if (!meeting) return

    document.getElementById('edit-meeting-id').value = meeting.id
    document.getElementById('edit-meeting-title').value = meeting.title
    document.getElementById('edit-meeting-location').value = meeting.location
    document.getElementById('edit-meeting-date').value = meeting.meeting_date
    document.getElementById('edit-meeting-feedback').textContent = ''
    document.getElementById('edit-meeting-modal').style.display = 'flex'
}

function closeEditMeeting() {
    document.getElementById('edit-meeting-modal').style.display = 'none'
}

document.getElementById('close-meeting-modal').addEventListener('click', closeEditMeeting)
document.getElementById('close-meeting-modal-btn').addEventListener('click', closeEditMeeting)
document.getElementById('edit-meeting-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('edit-meeting-modal')) closeEditMeeting()
})

document.getElementById('save-meeting-btn').addEventListener('click', async () => {
    const id = document.getElementById('edit-meeting-id').value
    const title = document.getElementById('edit-meeting-title').value.trim()
    const location = document.getElementById('edit-meeting-location').value.trim()
    const date = document.getElementById('edit-meeting-date').value
    const feedback = document.getElementById('edit-meeting-feedback')

    if (!title || !location || !date) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please fill in all fields.'
        return
    }

    try {
        const { error } = await db
            .from('meetings')
            .update({ title, location, meeting_date: date })
            .eq('id', id)

        if (error) throw error

        feedback.style.color = '#28a745'
        feedback.innerHTML = '<i class="fa-solid fa-square-check"></i> Meeting updated successfully.'
        await loadMeetings()
        setTimeout(() => closeEditMeeting(), 1000)

    } catch (error) {
        console.error('Edit meeting error:', error)
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Something went wrong. Please try again.'
    }
})
// ============================================
// TAB 4 — NEWS & POSTS
// ============================================
let allPosts = []
let currentPostId = null

// Image preview
document.getElementById('post-image').addEventListener('change', (e) => {
    const file = e.target.files[0]
    const preview = document.getElementById('image-preview')

    if (!file) return

    // Validate webp
    if (!file.name.endsWith('.webp') && file.type !== 'image/webp') {
        alert('Only WebP images are allowed.')
        e.target.value = ''
        return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
        preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`
    }
    reader.readAsDataURL(file)
})

// Create post
document.getElementById('create-post-btn').addEventListener('click', async () => {
    const title = document.getElementById('post-title').value.trim()
    const category = document.getElementById('post-category').value
    const date = document.getElementById('post-date').value
    const content = document.getElementById('post-content').value.trim()
    const imageFile = document.getElementById('post-image').files[0]
    const feedback = document.getElementById('post-feedback')

    if (!title || !category || !date || !content) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please fill in all required fields.'
        return
    }

    const btn = document.getElementById('create-post-btn')
    btn.disabled = true
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...'

    try {
        let imageUrl = null

        // Upload image if provided
        if (imageFile) {
            const fileName = `post-${Date.now()}.webp`
            const { data: uploadData, error: uploadError } = await db
                .storage
                .from('post-images')
                .upload(fileName, imageFile, {
                    contentType: 'image/webp',
                    upsert: false
                })

            if (uploadError) throw uploadError

            // Get public URL
            const { data: urlData } = db
                .storage
                .from('post-images')
                .getPublicUrl(fileName)

            imageUrl = urlData.publicUrl
        }

        // Insert post
        const { error } = await db
            .from('posts')
            .insert([{
                title,
                category,
                content,
                image_url: imageUrl,
                created_at: new Date(date).toISOString()
            }])

        if (error) throw error

        feedback.style.color = '#28a745'
        feedback.innerHTML = '<i class="fa-solid fa-square-check"></i>  Post published successfully.'

        // Clear form
        document.getElementById('post-title').value = ''
        document.getElementById('post-category').value = ''
        document.getElementById('post-date').value = ''
        document.getElementById('post-content').value = ''
        document.getElementById('post-image').value = ''
        document.getElementById('image-preview').innerHTML = `
            <i class="fa-solid fa-image"></i>
            <p>Click to select a WebP image</p>
        `

        await loadPosts()

    } catch (error) {
        console.error('Create post error:', error)
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Something went wrong. Please try again.'
    } finally {
        btn.disabled = false
        btn.innerHTML = '<i class="fa-solid fa-plus"></i> Publish Post'
    }
})

async function loadPosts() {
    try {
        const { data, error } = await db
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        allPosts = data
        renderAdminPosts(data)

    } catch (error) {
        console.error('Load posts error:', error)
    }
}

function renderAdminPosts(data) {
    const list = document.getElementById('admin-posts-list')

    if (data.length === 0) {
        list.innerHTML = '<p style="color:#666;">No posts published yet.</p>'
        return
    }

    list.innerHTML = data.map(p => `
        <div class="admin-post-card">
            <div class="admin-post-left">
                ${p.image_url
                    ? `<img src="${p.image_url}" alt="${p.title}" class="admin-post-thumb">`
                    : `<div class="admin-post-no-img"><i class="fa-solid fa-image"></i></div>`
                }
            </div>
            <div class="admin-post-body">
                <div class="admin-post-meta">
                    <span class="news-tag">${p.category}</span>
                    <span class="news-date">
                        <i class="fa-regular fa-calendar"></i>
                        ${new Date(p.created_at).toLocaleDateString('en-KE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                </div>
                <h3>${p.title}</h3>
                <p>${p.content.substring(0, 120)}...</p>
            </div>
            <div class="admin-post-actions">
                <button class="btn-edit" onclick="viewComments('${p.id}', '${p.title.replace(/'/g, "\\'")}')">
                    <i class="fa-solid fa-comments"></i> Comments
                </button>
                <button class="btn-delete" onclick="deletePost('${p.id}', '${p.image_url || ''}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('')
}

async function deletePost(id, imageUrl) {
    if (!confirm('Delete this post and all its comments?')) return

    try {
        // Delete image from storage if exists
        if (imageUrl) {
            const fileName = imageUrl.split('/').pop()
            await db.storage.from('post-images').remove([fileName])
        }

        const { error } = await db
            .from('posts')
            .delete()
            .eq('id', id)

        if (error) throw error

        await loadPosts()

        // Hide comments section if open
        document.getElementById('admin-comments-section').style.display = 'none'

    } catch (error) {
        console.error('Delete post error:', error)
    }
}

async function viewComments(postId, postTitle) {
    currentPostId = postId
    const section = document.getElementById('admin-comments-section')
    const titleEl = document.getElementById('comments-post-title')
    const list = document.getElementById('admin-comments-list')

    titleEl.textContent = postTitle
    section.style.display = 'block'
    list.innerHTML = '<p style="color:#666;">Loading comments...</p>'

    // Scroll to comments
    section.scrollIntoView({ behavior: 'smooth' })

    try {
        const { data, error } = await db
            .from('comments')
            .select('*')
            .eq('post_id', postId)
            .order('created_at', { ascending: false })

        if (error) throw error

        if (data.length === 0) {
            list.innerHTML = '<p style="color:#666;">No comments yet on this post.</p>'
            return
        }

        list.innerHTML = data.map(c => `
            <div class="admin-comment-card">
                <div class="admin-comment-left">
                    <p class="comment-email">${maskEmail(c.email)}</p>
                    <p class="comment-time">
                        <i class="fa-regular fa-clock"></i>
                        ${new Date(c.created_at).toLocaleString('en-KE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </p>
                </div>
                <p class="comment-text">${c.comment}</p>
                <button class="btn-delete" onclick="deleteComment('${c.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </div>
        `).join('')

    } catch (error) {
        console.error('Load comments error:', error)
        list.innerHTML = '<p style="color:#dc3545;">Failed to load comments.</p>'
    }
}

async function deleteComment(id) {
    if (!confirm('Delete this comment?')) return

    try {
        const { error } = await db
            .from('comments')
            .delete()
            .eq('id', id)

        if (error) throw error

        // Reload comments for current post
        const post = allPosts.find(p => p.id === currentPostId)
        if (post) viewComments(currentPostId, post.title)

    } catch (error) {
        console.error('Delete comment error:', error)
    }
}

function maskEmail(email) {
    const [user, domain] = email.split('@')
    const masked = user.substring(0, 2) + '****'
    return `${masked}@${domain}`
}

// ============================================
// TAB 5 — CONTACT INQUIRIES
// ============================================
let allContacts = []
let currentContactId = null

async function loadContacts() {
    try {
        const { data, error } = await db
            .from('contacts')
            .select('*')
            .order('created_at', { ascending: false })

        if (error) throw error

        allContacts = data
        updateContactStats(data)
        renderContacts(data)

    } catch (error) {
        console.error('Load contacts error:', error)
    }
}

function updateContactStats(data) {
    document.getElementById('contact-stat-total').textContent = data.length
    document.getElementById('contact-stat-unread').textContent = data.filter(c => c.status === 'unread').length
    document.getElementById('contact-stat-read').textContent = data.filter(c => c.status === 'read').length
    document.getElementById('contact-stat-resolved').textContent = data.filter(c => c.status === 'resolved').length
}

function renderContacts(data) {
    const list = document.getElementById('contacts-list')

    if (data.length === 0) {
        list.innerHTML = '<p style="color:#666; padding:20px;">No contact inquiries yet.</p>'
        return
    }

    list.innerHTML = data.map(c => `
        <div class="contact-inquiry-card ${c.status}" onclick="openContactDetail('${c.id}')">
            <div class="contact-inquiry-left">
                <div class="contact-status-dot ${c.status}"></div>
                <div>
                    <p class="contact-inquiry-name">${c.full_name}</p>
                    <p class="contact-inquiry-email">${c.email}</p>
                </div>
            </div>
            <div class="contact-inquiry-center">
                <span class="contact-subject-badge">${c.subject}</span>
                <p class="contact-inquiry-preview">${c.message.substring(0, 80)}...</p>
            </div>
            <div class="contact-inquiry-right">
                <span class="contact-status-badge ${c.status}">${c.status}</span>
                <p class="contact-inquiry-date">
                    ${new Date(c.created_at).toLocaleDateString('en-KE', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </p>
            </div>
        </div>
    `).join('')
}

function filterContacts() {
    const search = document.getElementById('contact-search').value.toLowerCase()
    const status = document.getElementById('contact-status-filter').value
    const subject = document.getElementById('contact-subject-filter').value

    let filtered = allContacts

    if (search) {
        filtered = filtered.filter(c =>
            c.full_name.toLowerCase().includes(search) ||
            c.email.toLowerCase().includes(search)
        )
    }

    if (status !== 'all') {
        filtered = filtered.filter(c => c.status === status)
    }

    if (subject !== 'all') {
        filtered = filtered.filter(c => c.subject === subject)
    }

    renderContacts(filtered)
}

function openContactDetail(id) {
    const contact = allContacts.find(c => c.id === id)
    if (!contact) return

    currentContactId = id

    document.getElementById('modal-contact-subject').textContent = contact.subject
    document.getElementById('modal-contact-name').textContent = contact.full_name
    document.getElementById('modal-contact-email').textContent = contact.email
    document.getElementById('modal-contact-phone').textContent = contact.phone || 'Not provided'
    document.getElementById('modal-contact-date').textContent = new Date(contact.created_at).toLocaleString('en-KE', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
    document.getElementById('modal-contact-message').textContent = contact.message

    // Update button states based on current status
    const markReadBtn = document.getElementById('mark-read-btn')
    const markResolvedBtn = document.getElementById('mark-resolved-btn')

    markReadBtn.style.display = contact.status === 'unread' ? 'flex' : 'none'
    markResolvedBtn.style.display = contact.status === 'resolved' ? 'none' : 'flex'

    document.getElementById('contact-detail-modal').style.display = 'flex'

    // Auto mark as read when opened
    if (contact.status === 'unread') {
        updateContactStatus(id, 'read')
    }
}

function closeContactDetail() {
    document.getElementById('contact-detail-modal').style.display = 'none'
    currentContactId = null
}

async function updateContactStatus(id, status) {
    try {
        const { error } = await db
            .from('contacts')
            .update({ status })
            .eq('id', id)

        if (error) throw error

        // Update local state
        const contact = allContacts.find(c => c.id === id)
        if (contact) contact.status = status

        updateContactStats(allContacts)
        filterContacts()

    } catch (error) {
        console.error('Update contact status error:', error)
    }
}

async function deleteContact(id) {
    if (!confirm('Delete this inquiry permanently?')) return

    try {
        const { error } = await db
            .from('contacts')
            .delete()
            .eq('id', id)

        if (error) throw error

        allContacts = allContacts.filter(c => c.id !== id)
        updateContactStats(allContacts)
        filterContacts()
        closeContactDetail()

    } catch (error) {
        console.error('Delete contact error:', error)
    }
}

// Event listeners for contacts tab
document.getElementById('contact-search').addEventListener('input', filterContacts)
document.getElementById('contact-status-filter').addEventListener('change', filterContacts)
document.getElementById('contact-subject-filter').addEventListener('change', filterContacts)
document.getElementById('refresh-contacts-btn').addEventListener('click', loadContacts)
document.getElementById('close-contact-modal').addEventListener('click', closeContactDetail)

document.getElementById('mark-read-btn').addEventListener('click', () => {
    if (currentContactId) updateContactStatus(currentContactId, 'read')
    closeContactDetail()
})

document.getElementById('mark-resolved-btn').addEventListener('click', () => {
    if (currentContactId) updateContactStatus(currentContactId, 'resolved')
    closeContactDetail()
})

document.getElementById('delete-contact-btn').addEventListener('click', () => {
    if (currentContactId) deleteContact(currentContactId)
})

document.getElementById('contact-detail-modal').addEventListener('click', (e) => {
    if (e.target === document.getElementById('contact-detail-modal')) closeContactDetail()
})
window.deletePost = deletePost
window.viewComments = viewComments
window.deleteComment = deleteComment
window.openContactDetail = openContactDetail