import { userAPI } from '../../shared/js/api/user_api.js';
import { scheduleAPI } from '../../shared/js/api/schedule_api.js';
import { authAPI } from '../../shared/js/api/auth_api.js';
import supabase from '../../shared/js/supabase_client.js';

document.addEventListener('DOMContentLoaded', async () => {

    // 1. Security: Check if user is logged in
    const user = await authAPI.getCurrentUser();
    if (!user) window.location.href = '../index.html';

    // 2. Setup Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await authAPI.logout();
        });
    }

    // 3. Load All Dashboard Data
    console.log("🚀 Initializing Dashboard...");
    loadUserWelcome(user.id);       // "Welcome back, [Name]"
    loadClassStats();               // "Classes Today"
    initStudentRealtimeStats();     // "Total Students" + Online/Offline Logic
    initSystemStatus();             // "System Status: Online"
});

// --- SECTION 1: WELCOME MESSAGE ---
async function loadUserWelcome(userId) {
    const welcomeEl = document.getElementById('welcomeMessage');
    if (!welcomeEl) return;

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', userId)
            .single();

        if (data && data.full_name) {
            // "Jurist Jenkins" -> "Jurist"
            const firstName = data.full_name.split(' ')[0];
            welcomeEl.innerHTML = `Welcome back, <span class="text-gctu-gold font-bold">${firstName}</span>. Manage your class updates here.`;
        }
    } catch (err) {
        console.error("Could not load name:", err);
    }
}

// --- SECTION 2: CLASS STATS ---
async function loadClassStats() {
    const classCountEl = document.getElementById('activeClasses');
    if (!classCountEl) return;

    try {
        const classCount = await scheduleAPI.getTodayClassCount();
        animateValue(classCountEl, 0, classCount, 1000);
    } catch (err) {
        console.error("Error loading classes:", err);
        classCountEl.innerText = "0";
    }
}

// --- SECTION 3: STUDENT STATS (REALTIME) ---
async function initStudentRealtimeStats() {
    const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

    if (error) {
        console.error("Error fetching student count:", error);
    }

    let totalStudents = count || 0;
    
    // Update HTML immediately
    const totalEl = document.getElementById('totalStudents');
    if (totalEl) {
        animateValue(totalEl, 0, totalStudents, 1000);
    }

    // B. Start Listening for Online Users
    const channel = supabase.channel('online_users');

    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();

            // Count unique online users
            const onlineIds = new Set();
            for (const id in newState) {
                const users = newState[id];
                users.forEach(u => {
                    if (u.user) onlineIds.add(u.user.toString());
                });
            }

            const onlineCount = onlineIds.size;

            const offlineCount = Math.max(0, totalStudents - onlineCount);

            // Update the new HTML badges
            const onlineEl = document.getElementById('onlineCount');
            const offlineEl = document.getElementById('offlineCount');

            if (onlineEl) onlineEl.innerText = onlineCount;
            if (offlineEl) offlineEl.innerText = offlineCount;
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log("📡 Listening for student presence...");
            }
        });
}

// --- SECTION 4: SYSTEM STATUS MONITOR ---
function initSystemStatus() {
    const statusEl = document.getElementById('systemStatus');
    if (!statusEl) return;

    updateOnlineStatus(statusEl);

    window.addEventListener('online', () => updateOnlineStatus(statusEl));
    window.addEventListener('offline', () => updateOnlineStatus(statusEl));
    setInterval(() => updateOnlineStatus(statusEl), 30000);
}

async function updateOnlineStatus(statusEl) {
    const isOnline = navigator.onLine && await checkBackendConnection();
    const statusContainer = document.getElementById('statusContainer');

    if (isOnline) {
        statusEl.className = 'text-2xl font-bold text-green-600 mt-1';
        statusEl.textContent = '🟢 Online';
        if (statusContainer) {
            statusContainer.classList.remove('border-red-500');
            statusContainer.classList.add('border-green-500');
        }
    } else {
        statusEl.className = 'text-2xl font-bold text-red-600 mt-1';
        statusEl.textContent = '🔴 Offline';
        if (statusContainer) {
            statusContainer.classList.remove('border-green-500');
            statusContainer.classList.add('border-red-500');
        }
    }
}

async function checkBackendConnection() {
    try {
        // Simple ping to check if we can reach the server
        const response = await fetch(window.location.href, { method: 'HEAD', cache: 'no-store' });
        return response.ok;
    } catch {
        return false;
    }
}

// --- HELPER: Number Animation ---
function animateValue(obj, start, end, duration) {
    if (!obj) return;
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}