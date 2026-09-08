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
    await loadSurveys()
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

// ============================================
// TAB 6 — SURVEYS
// Add these state variables near the top
// of admin.js with existing state variables
// ============================================
let allSurveys = []
let currentSurveyId = null
let questionCounter = 0

// ============================================
// LOAD SURVEYS
// ============================================
async function loadSurveys() {
    try {
        const { data, error } = await db
            .from('surveys')
            .select('*, survey_questions(id), survey_responses(id)')
            .order('created_at', { ascending: false })

        if (error) throw error

        allSurveys = data || []
        renderSurveysList(allSurveys)

    } catch (error) {
        console.error('Load surveys error:', error)
    }
}

// ============================================
// RENDER SURVEYS LIST
// ============================================
function renderSurveysList(data) {
    const list = document.getElementById('surveys-list')
    if (!list) return

    if (!data || data.length === 0) {
        list.innerHTML = `
            <p style="color:var(--text-light); padding:20px 0;">
                No surveys created yet. Create your first survey above.
            </p>
        `
        return
    }

    list.innerHTML = data.map(s => {
        const questionCount = s.survey_questions ? s.survey_questions.length : 0
        const responseCount = s.survey_responses ? s.survey_responses.length : 0
        const isActive = s.status === 'active'

        let targetLabel = 'Both'
        if (s.target_level === 'ward') targetLabel = 'Ward Coordinators'
        if (s.target_level === 'agent') targetLabel = 'Ward Agents'

        return `
            <div class="survey-card">
                <div class="survey-card-header">
                    <h3>${s.title}</h3>
                    <span class="survey-status-badge ${s.status}">
                        <i class="fa-solid fa-${isActive ? 'circle-check' : 'circle-xmark'}"></i>
                        ${isActive ? 'Active' : 'Closed'}
                    </span>
                </div>
                ${s.description ? `<p class="survey-card-description">${s.description}</p>` : ''}
                <div class="survey-card-meta">
                    <span>
                        <i class="fa-solid fa-users"></i>
                        ${targetLabel}
                    </span>
                    <span>
                        <i class="fa-solid fa-list-ol"></i>
                        ${questionCount} question${questionCount !== 1 ? 's' : ''}
                    </span>
                    <span>
                        <i class="fa-solid fa-inbox"></i>
                        ${responseCount} response${responseCount !== 1 ? 's' : ''}
                    </span>
                    <span>
                        <i class="fa-regular fa-calendar"></i>
                        ${new Date(s.created_at).toLocaleDateString('en-KE', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                        })}
                    </span>
                </div>
                <div class="survey-card-actions">
                    <button class="btn-edit" onclick="viewSurveyResults('${s.id}')">
                        <i class="fa-solid fa-chart-bar"></i> View Results
                    </button>
                    ${isActive ? `
                        <button class="btn-secondary" style="width:auto; padding:6px 14px; font-size:0.85rem;"
                            onclick="closeSurvey('${s.id}')">
                            <i class="fa-solid fa-lock"></i> Close Survey
                        </button>
                    ` : ''}
                    <button class="btn-delete" onclick="deleteSurvey('${s.id}', ${responseCount})">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `
    }).join('')
}

// ============================================
// QUESTION BUILDER — ADD QUESTION
// ============================================
function addQuestion() {
    questionCounter++
    const index = questionCounter

    const placeholder = document.getElementById('no-questions-placeholder')
    if (placeholder) placeholder.style.display = 'none'

    const container = document.getElementById('questions-container')
    if (!container) return

    const block = document.createElement('div')
    block.className = 'question-block'
    block.id = `question-block-${index}`

    block.innerHTML = `
        <div class="question-block-header">
            <span class="question-number-badge">Q${index}</span>
            <button class="btn-delete" onclick="deleteQuestion(${index})">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>

        <div class="form-group">
            <label>Question Text *</label>
            <input type="text" id="q-text-${index}"
                placeholder="e.g. Has the opposition team campaigned in your zone today?">
        </div>

        <div class="question-block-meta">
            <div class="form-group" style="flex:1;">
                <label>Question Type *</label>
                <select id="q-type-${index}" onchange="toggleQuestionType(${index})">
                    <option value="yes_no">Yes / No</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="rating">Rating (1 to 5)</option>
                    <option value="text">Open Text</option>
                </select>
            </div>
            <div class="form-group required-toggle">
                <label>Required</label>
                <label class="toggle-switch">
                    <input type="checkbox" id="q-required-${index}" checked>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>

        <div class="question-options-area" id="q-options-${index}" style="display:none;">
            <label>Answer Options (min 2, max 6)</label>
            <div id="q-options-list-${index}">
                <div class="option-row">
                    <input type="text" placeholder="Option 1" class="option-input">
                    <button class="btn-remove-option" onclick="removeChoiceOption(this, ${index})">
                        <i class="fa-solid fa-minus"></i>
                    </button>
                </div>
                <div class="option-row">
                    <input type="text" placeholder="Option 2" class="option-input">
                    <button class="btn-remove-option" onclick="removeChoiceOption(this, ${index})">
                        <i class="fa-solid fa-minus"></i>
                    </button>
                </div>
            </div>
            <button class="btn-add-option" onclick="addChoiceOption(${index})">
                <i class="fa-solid fa-plus"></i> Add Option
            </button>
        </div>
    `

    container.appendChild(block)
}

// ============================================
// QUESTION BUILDER — TOGGLE TYPE
// ============================================
function toggleQuestionType(index) {
    const typeSelect = document.getElementById(`q-type-${index}`)
    const optionsArea = document.getElementById(`q-options-${index}`)
    if (!typeSelect || !optionsArea) return

    if (typeSelect.value === 'multiple_choice') {
        optionsArea.style.display = 'block'
    } else {
        optionsArea.style.display = 'none'
    }
}

// ============================================
// QUESTION BUILDER — DELETE QUESTION
// ============================================
function deleteQuestion(index) {
    const block = document.getElementById(`question-block-${index}`)
    if (block) block.remove()

    // Renumber remaining questions
    const blocks = document.querySelectorAll('.question-block')
    blocks.forEach((block, i) => {
        const badge = block.querySelector('.question-number-badge')
        if (badge) badge.textContent = `Q${i + 1}`
    })

    // Show placeholder if no questions left
    if (blocks.length === 0) {
        const placeholder = document.getElementById('no-questions-placeholder')
        if (placeholder) placeholder.style.display = 'flex'
    }
}

// ============================================
// QUESTION BUILDER — ADD CHOICE OPTION
// ============================================
function addChoiceOption(index) {
    const list = document.getElementById(`q-options-list-${index}`)
    if (!list) return

    const existing = list.querySelectorAll('.option-row').length
    if (existing >= 6) {
        alert('Maximum 6 options allowed.')
        return
    }

    const row = document.createElement('div')
    row.className = 'option-row'
    row.innerHTML = `
        <input type="text" placeholder="Option ${existing + 1}" class="option-input">
        <button class="btn-remove-option" onclick="removeChoiceOption(this, ${index})">
            <i class="fa-solid fa-minus"></i>
        </button>
    `
    list.appendChild(row)
}

// ============================================
// QUESTION BUILDER — REMOVE CHOICE OPTION
// ============================================
function removeChoiceOption(btn, index) {
    const list = document.getElementById(`q-options-list-${index}`)
    if (!list) return

    const rows = list.querySelectorAll('.option-row')
    if (rows.length <= 2) {
        alert('Minimum 2 options required.')
        return
    }

    btn.closest('.option-row').remove()
}

// ============================================
// VALIDATE SURVEY FORM
// ============================================
function validateSurveyForm() {
    const title = document.getElementById('survey-title').value.trim()
    const targetLevel = document.getElementById('survey-target-level').value
    const description = document.getElementById('survey-description').value.trim()
    const feedback = document.getElementById('survey-create-feedback')

    if (!title) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please enter a survey title.'
        return false
    }

    if (!targetLevel) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please select a target audience.'
        return false
    }

    const blocks = document.querySelectorAll('.question-block')
    if (blocks.length === 0) {
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Please add at least one question.'
        return false
    }

    const questions = []
    let valid = true

    blocks.forEach((block, i) => {
        const idMatch = block.id.match(/question-block-(\d+)/)
        if (!idMatch) return
        const index = idMatch[1]

        const text = document.getElementById(`q-text-${index}`)?.value.trim()
        const type = document.getElementById(`q-type-${index}`)?.value
        const required = document.getElementById(`q-required-${index}`)?.checked

        if (!text) {
            feedback.style.color = '#dc3545'
            feedback.textContent = `Question ${i + 1} is missing its text.`
            valid = false
            return
        }

        let options = null

        if (type === 'multiple_choice') {
            const optionInputs = document.querySelectorAll(`#q-options-list-${index} .option-input`)
            const optionValues = Array.from(optionInputs)
                .map(inp => inp.value.trim())
                .filter(v => v !== '')

            if (optionValues.length < 2) {
                feedback.style.color = '#dc3545'
                feedback.textContent = `Question ${i + 1} needs at least 2 answer options.`
                valid = false
                return
            }

            options = JSON.stringify(optionValues)
        }

        questions.push({
            question_text: text,
            question_type: type,
            required: required,
            options: options,
            order_index: i + 1
        })
    })

    if (!valid) return false

    return { title, description, targetLevel, questions }
}

// ============================================
// PUBLISH SURVEY
// ============================================
async function publishSurvey() {
    const feedback = document.getElementById('survey-create-feedback')
    feedback.textContent = ''

    const formData = validateSurveyForm()
    if (!formData) return

    const publishBtn = document.getElementById('publish-survey-btn')
    publishBtn.disabled = true
    publishBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publishing...'

    try {
        // Insert survey
        const { data: surveyData, error: surveyError } = await db
            .from('surveys')
            .insert([{
                title: formData.title,
                description: formData.description || null,
                target_level: formData.targetLevel,
                status: 'active'
            }])
            .select()
            .single()

        if (surveyError) throw surveyError

        const surveyId = surveyData.id

        // Insert questions
        const questionsToInsert = formData.questions.map(q => ({
            ...q,
            survey_id: surveyId
        }))

        const { error: questionsError } = await db
            .from('survey_questions')
            .insert(questionsToInsert)

        if (questionsError) throw questionsError

        // Fetch eligible members based on target level
        let levelFilter = []
        if (formData.targetLevel === 'ward') levelFilter = ['ward']
        if (formData.targetLevel === 'agent') levelFilter = ['agent']
        if (formData.targetLevel === 'both') levelFilter = ['ward', 'agent']

        const { data: members, error: membersError } = await db
            .from('members')
            .select('id, full_name, phone, level')
            .in('level', levelFilter)

        if (membersError) throw membersError

        // Show OTP dispatch modal
        const modal = document.getElementById('otp-dispatch-modal')
        if (modal) modal.style.display = 'flex'

        // Dispatch OTPs
        await dispatchOtpsToMembers(surveyId, members || [])

        // Clear form
        document.getElementById('survey-title').value = ''
        document.getElementById('survey-description').value = ''
        document.getElementById('survey-target-level').value = ''
        document.getElementById('questions-container').innerHTML = `
            <div class="no-questions-placeholder" id="no-questions-placeholder">
                <i class="fa-solid fa-circle-info"></i>
                Click "Add Question" to start building your survey.
            </div>
        `
        questionCounter = 0

        feedback.style.color = '#28a745'
        feedback.textContent = 'Survey published successfully.'

        await loadSurveys()

    } catch (error) {
        console.error('Publish survey error:', error)
        feedback.style.color = '#dc3545'
        feedback.textContent = 'Something went wrong. Please try again.'
    } finally {
        publishBtn.disabled = false
        publishBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publish Survey & Send OTPs'
    }
}

// ============================================
// DISPATCH OTPs TO MEMBERS
// ============================================
async function dispatchOtpsToMembers(surveyId, members) {
    const progressBar = document.getElementById('otp-dispatch-progress-bar')
    const counter = document.getElementById('otp-dispatch-counter')
    const summary = document.getElementById('otp-dispatch-summary')
    const footer = document.getElementById('otp-dispatch-footer')

    const total = members.length
    let sent = 0
    let failed = 0

    if (total === 0) {
        if (counter) counter.textContent = 'No eligible members found for this survey.'
        if (summary) summary.style.display = 'block'
        if (footer) footer.style.display = 'flex'
        return
    }

    for (const member of members) {
        try {
            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/request-otp`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        phone: member.phone,
                        survey_id: surveyId
                    })
                }
            )

            if (response.ok) {
                sent++
            } else {
                failed++
            }
        } catch (err) {
            console.error('OTP dispatch error for member:', member.id, err)
            failed++
        }

        // Update progress
        const processed = sent + failed
        const percent = Math.round((processed / total) * 100)

        if (progressBar) progressBar.style.width = `${percent}%`
        if (counter) counter.textContent = `Sending OTPs... ${processed} of ${total} sent`
    }

    // Show summary
    if (summary) summary.style.display = 'block'

    const sentRow = document.getElementById('otp-summary-sent')
    const failedRow = document.getElementById('otp-summary-failed')

    if (sentRow) {
        sentRow.querySelector('span').textContent =
            `${sent} OTP${sent !== 1 ? 's' : ''} sent successfully`
    }

    if (failedRow && failed > 0) {
        failedRow.style.display = 'flex'
        failedRow.querySelector('span').textContent =
            `${failed} failed to send — members can request manually`
    }

    if (counter) counter.textContent = 'Dispatch complete.'
    if (footer) footer.style.display = 'flex'
}

// ============================================
// VIEW SURVEY RESULTS
// ============================================
async function viewSurveyResults(surveyId) {
    currentSurveyId = surveyId

    const panel = document.getElementById('survey-results-panel')
    if (panel) {
        panel.style.display = 'block'
        panel.scrollIntoView({ behavior: 'smooth' })
    }

    document.getElementById('results-survey-title').textContent = 'Loading results...'
    document.getElementById('results-response-rate').textContent = ''
    document.getElementById('results-stats').innerHTML = ''
    document.getElementById('results-questions').innerHTML = ''
    document.getElementById('results-ward-grid').innerHTML = ''
    document.getElementById('results-responses-tbody').innerHTML = ''

    try {
        // Fetch survey with questions
        const { data: survey, error: surveyError } = await db
            .from('surveys')
            .select('*, survey_questions(*)')
            .eq('id', surveyId)
            .single()

        if (surveyError) throw surveyError

        const questions = (survey.survey_questions || [])
            .sort((a, b) => a.order_index - b.order_index)

        // Fetch responses
        const { data: responses, error: responsesError } = await db
            .from('survey_responses')
            .select('*')
            .eq('survey_id', surveyId)
            .order('submitted_at', { ascending: false })

        if (responsesError) throw responsesError

        // Fetch answers
        const responseIds = (responses || []).map(r => r.id)
        let answers = []

        if (responseIds.length > 0) {
            const { data: answersData, error: answersError } = await db
                .from('survey_answers')
                .select('*')
                .in('response_id', responseIds)

            if (!answersError) answers = answersData || []
        }

        // Fetch eligible member count
        let levelFilter = []
        if (survey.target_level === 'ward') levelFilter = ['ward']
        if (survey.target_level === 'agent') levelFilter = ['agent']
        if (survey.target_level === 'both') levelFilter = ['ward', 'agent']

        const { count: eligibleCount } = await db
            .from('members')
            .select('id', { count: 'exact', head: true })
            .in('level', levelFilter)

        const responseCount = responses ? responses.length : 0
        const responseRate = eligibleCount > 0
            ? Math.round((responseCount / eligibleCount) * 100)
            : 0

        // Render title and rate
        document.getElementById('results-survey-title').textContent = survey.title
        document.getElementById('results-response-rate').textContent =
            `${responseCount} of ${eligibleCount || 0} eligible members responded (${responseRate}%)`

        // Render summary stats
        renderResultsStats(responseCount, eligibleCount || 0, responseRate, survey)

        // Render per-question aggregates
        const questionsContainer = document.getElementById('results-questions')
        if (questionsContainer) {
            questionsContainer.innerHTML = questions.map(q => {
                const questionAnswers = answers
                    .filter(a => a.question_id === q.id)
                    .map(a => a.answer_text)
                return renderQuestionAggregate(q, questionAnswers)
            }).join('')
        }

        // Render ward breakdown
        renderWardBreakdown(responses || [])

        // Render responses table
        renderResponsesTable(responses || [])

    } catch (error) {
        console.error('View results error:', error)
        document.getElementById('results-survey-title').textContent = 'Failed to load results.'
    }
}

// ============================================
// RENDER RESULTS STATS
// ============================================
function renderResultsStats(responseCount, eligibleCount, responseRate, survey) {
    const container = document.getElementById('results-stats')
    if (!container) return

    let targetLabel = 'Both'
    if (survey.target_level === 'ward') targetLabel = 'Ward Coordinators'
    if (survey.target_level === 'agent') targetLabel = 'Ward Agents'

    container.innerHTML = `
        <div class="stat-card">
            <h3>${responseCount}</h3>
            <p>Total Responses</p>
        </div>
        <div class="stat-card">
            <h3>${eligibleCount}</h3>
            <p>Eligible Members</p>
        </div>
        <div class="stat-card">
            <h3>${responseRate}%</h3>
            <p>Response Rate</p>
        </div>
        <div class="stat-card">
            <h3>${targetLabel}</h3>
            <p>Target Audience</p>
        </div>
    `
}

// ============================================
// RENDER QUESTION AGGREGATE
// ============================================
function renderQuestionAggregate(question, answers) {
    const total = answers.length

    let aggregateHTML = ''

    if (question.question_type === 'yes_no') {
        const yesCount = answers.filter(a => a === 'Yes').length
        const noCount = answers.filter(a => a === 'No').length
        const yesPercent = total > 0 ? Math.round((yesCount / total) * 100) : 0
        const noPercent = total > 0 ? Math.round((noCount / total) * 100) : 0

        aggregateHTML = `
            <div class="aggregate-bar-row">
                <span class="aggregate-label">Yes</span>
                <div class="aggregate-bar-track">
                    <div class="aggregate-bar-fill success"
                        style="width:${yesPercent}%"></div>
                </div>
                <span class="aggregate-count">${yesCount} (${yesPercent}%)</span>
            </div>
            <div class="aggregate-bar-row">
                <span class="aggregate-label">No</span>
                <div class="aggregate-bar-track">
                    <div class="aggregate-bar-fill danger"
                        style="width:${noPercent}%"></div>
                </div>
                <span class="aggregate-count">${noCount} (${noPercent}%)</span>
            </div>
        `
    }

    if (question.question_type === 'multiple_choice') {
        let options = []
        try {
            options = typeof question.options === 'string'
                ? JSON.parse(question.options)
                : question.options || []
        } catch (e) { options = [] }

        aggregateHTML = options.map(option => {
            const count = answers.filter(a => a === option).length
            const percent = total > 0 ? Math.round((count / total) * 100) : 0
            return `
                <div class="aggregate-bar-row">
                    <span class="aggregate-label">${option}</span>
                    <div class="aggregate-bar-track">
                        <div class="aggregate-bar-fill primary"
                            style="width:${percent}%"></div>
                    </div>
                    <span class="aggregate-count">${count} (${percent}%)</span>
                </div>
            `
        }).join('')
    }

    if (question.question_type === 'rating') {
        const numericAnswers = answers.map(a => parseInt(a)).filter(n => !isNaN(n))
        const average = numericAnswers.length > 0
            ? (numericAnswers.reduce((sum, n) => sum + n, 0) / numericAnswers.length).toFixed(1)
            : 'N/A'

        const distribution = [1, 2, 3, 4, 5].map(n => {
            const count = numericAnswers.filter(a => a === n).length
            const percent = numericAnswers.length > 0
                ? Math.round((count / numericAnswers.length) * 100)
                : 0
            return { n, count, percent }
        })

        aggregateHTML = `
            <div class="rating-average-display">
                <span class="rating-average-number">${average}</span>
                <span class="rating-average-label">out of 5</span>
            </div>
            ${distribution.map(d => `
                <div class="aggregate-bar-row">
                    <span class="aggregate-label">
                        <i class="fa-solid fa-star" style="color:var(--accent);"></i> ${d.n}
                    </span>
                    <div class="aggregate-bar-track">
                        <div class="aggregate-bar-fill accent"
                            style="width:${d.percent}%"></div>
                    </div>
                    <span class="aggregate-count">${d.count} (${d.percent}%)</span>
                </div>
            `).join('')}
        `
    }

    if (question.question_type === 'text') {
        aggregateHTML = `
            <div class="text-responses-feed">
                ${answers.length === 0
                    ? '<p style="color:var(--text-light); font-style:italic;">No text responses yet.</p>'
                    : answers.map(a => `
                        <div class="text-response-item">
                            <i class="fa-solid fa-quote-left" style="color:var(--primary); margin-right:8px;"></i>
                            ${a}
                        </div>
                    `).join('')
                }
            </div>
        `
    }

    return `
        <div class="question-aggregate">
            <div class="question-aggregate-header">
                <p class="question-aggregate-type">
                    ${question.question_type.replace('_', ' ').toUpperCase()}
                    ${question.required ? '' : '<span style="color:var(--text-light); font-size:0.78rem;">(Optional)</span>'}
                </p>
                <p class="question-aggregate-text">${question.question_text}</p>
                <p class="question-aggregate-count">
                    <i class="fa-solid fa-inbox"></i>
                    ${total} response${total !== 1 ? 's' : ''}
                </p>
            </div>
            <div class="question-aggregate-body">
                ${aggregateHTML}
            </div>
        </div>
    `
}

// ============================================
// RENDER WARD BREAKDOWN
// ============================================
function renderWardBreakdown(responses) {
    const grid = document.getElementById('results-ward-grid')
    if (!grid) return

    if (responses.length === 0) {
        grid.innerHTML = '<p style="color:var(--text-light);">No responses yet.</p>'
        return
    }

    const wardCounts = {}
    responses.forEach(r => {
        const ward = r.respondent_ward || 'Unknown'
        wardCounts[ward] = (wardCounts[ward] || 0) + 1
    })

    grid.innerHTML = Object.entries(wardCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([ward, count]) => `
            <div class="ward-card">
                <h3>${count}</h3>
                <p>${ward}</p>
            </div>
        `).join('')
}

// ============================================
// RENDER RESPONSES TABLE
// ============================================
function renderResponsesTable(responses) {
    const tbody = document.getElementById('results-responses-tbody')
    const noData = document.getElementById('results-no-responses')
    if (!tbody) return

    if (responses.length === 0) {
        tbody.innerHTML = ''
        if (noData) noData.style.display = 'block'
        return
    }

    if (noData) noData.style.display = 'none'

    tbody.innerHTML = responses.map((r, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${r.respondent_name}</td>
            <td>${r.respondent_ward || '—'}</td>
            <td>
                <span class="level-badge ${r.respondent_level}">
                    ${r.respondent_level === 'ward' ? 'Ward Coordinator' : 'Ward Agent'}
                </span>
            </td>
            <td>${new Date(r.submitted_at).toLocaleString('en-KE', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}</td>
            <td>
                <span class="role-badge ${r.sync_status === 'synced' ? 'voter' : 'mobilizer'}">
                    ${r.sync_status}
                </span>
            </td>
        </tr>
    `).join('')
}

// ============================================
// EXPORT SURVEY CSV
// ============================================
async function exportSurveyCSV(surveyId) {
    if (!surveyId) return

    try {
        const { data: survey } = await db
            .from('surveys')
            .select('*, survey_questions(*)')
            .eq('id', surveyId)
            .single()

        const questions = (survey.survey_questions || [])
            .sort((a, b) => a.order_index - b.order_index)

        const { data: responses } = await db
            .from('survey_responses')
            .select('*')
            .eq('survey_id', surveyId)

        const responseIds = (responses || []).map(r => r.id)
        let answers = []

        if (responseIds.length > 0) {
            const { data: answersData } = await db
                .from('survey_answers')
                .select('*')
                .in('response_id', responseIds)
            answers = answersData || []
        }

        // Build CSV headers
        const headers = [
            'Name',
            'Phone',
            'Ward',
            'Level',
            'Submitted At',
            ...questions.map(q => q.question_text)
        ]

        // Build CSV rows
        const rows = (responses || []).map(r => {
            const responseAnswers = answers.filter(a =>
                a.response_id === r.id
            )

            const answerMap = {}
            responseAnswers.forEach(a => {
                answerMap[a.question_id] = a.answer_text
            })

            return [
                r.respondent_name,
                r.respondent_phone,
                r.respondent_ward,
                r.respondent_level,
                new Date(r.submitted_at).toLocaleString('en-KE'),
                ...questions.map(q => answerMap[q.id] || '')
            ]
        })

        const csv = [headers, ...rows]
            .map(row => row.map(cell =>
                `"${String(cell).replace(/"/g, '""')}"`
            ).join(','))
            .join('\n')

        const blob = new Blob([csv], { type: 'text/csv' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `survey_${survey.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)

    } catch (error) {
        console.error('Export CSV error:', error)
    }
}

// ============================================
// CLOSE SURVEY
// ============================================
async function closeSurvey(surveyId) {
    if (!confirm('Close this survey? Field agents will no longer be able to access it.')) return

    try {
        const { error } = await db
            .from('surveys')
            .update({ status: 'closed' })
            .eq('id', surveyId)

        if (error) throw error

        await loadSurveys()

        // Refresh results panel if open for this survey
        if (currentSurveyId === surveyId) {
            viewSurveyResults(surveyId)
        }

    } catch (error) {
        console.error('Close survey error:', error)
    }
}

// ============================================
// DELETE SURVEY
// ============================================
async function deleteSurvey(surveyId, responseCount) {
    const message = responseCount > 0
        ? `This will permanently delete this survey and all ${responseCount} response${responseCount !== 1 ? 's' : ''}. This cannot be undone. Continue?`
        : 'Delete this survey permanently? This cannot be undone.'

    if (!confirm(message)) return

    try {
        const { error } = await db
            .from('surveys')
            .delete()
            .eq('id', surveyId)

        if (error) throw error

        // Hide results panel if open for deleted survey
        if (currentSurveyId === surveyId) {
            const panel = document.getElementById('survey-results-panel')
            if (panel) panel.style.display = 'none'
            currentSurveyId = null
        }

        await loadSurveys()

    } catch (error) {
        console.error('Delete survey error:', error)
    }
}

window.deleteQuestion = deleteQuestion
window.toggleQuestionType = toggleQuestionType
window.addChoiceOption = addChoiceOption
window.removeChoiceOption = removeChoiceOption
window.viewSurveyResults = viewSurveyResults
window.closeSurvey = closeSurvey
window.deleteSurvey = deleteSurvey