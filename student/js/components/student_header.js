import { authAPI } from '../../../shared/js/api/auth_api.js';
import { broadcastPresence } from '../../../shared/js/user_presence.js';
import { checkAuth } from '../auth_guard.js';

export async function loadStudentHeader(activePage) {
    // 1. Security Check
    const indexNumber = checkAuth();
    if (!indexNumber) return;

    // 2. 🟢 BROADCAST PRESENCE (The "Online" Signal)
    broadcastPresence(indexNumber);

    // 3. Create Navigation Components
    const body = document.body;

    const pageTitles = {
        'dashboard': 'My Schedule',
        'resources': 'Course Library',
        'events': 'News & Events',
        'settings': 'My Profile',
        'timetable': 'Weekly Timetable'
    };

    const displayTitle = pageTitles[activePage] || 'Student Portal';

    // --- A. MOBILE TOP HEADER ---
    const topHeader = document.createElement('header');
    topHeader.className = "md:hidden bg-gctu-blue text-white sticky top-0 z-50 shadow-md border-b-4 border-gctu-gold px-4 py-3 flex justify-between items-center";
    
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateString = new Date().toLocaleDateString('en-US', options);

    topHeader.innerHTML = `
        <div class="flex items-center gap-3">
            <img src="../assets/images/icons/unisync.png" alt="Logo" class="h-8 w-8 bg-white rounded-full p-0.5">
            <div>
                <h3 class="font-bold text-sm tracking-tight leading-none">${displayTitle}</h3>
                <span class="text-[9px] text-gctu-gold font-bold uppercase tracking-widest">Unisync</span>
            </div>
        </div>
        <div class="text-right">
            <span class="block text-[10px] font-bold text-blue-200 uppercase tracking-tighter">${dateString}</span>
        </div>
    `;
    
    // --- B. DESKTOP SIDEBAR ---
    const sidebar = document.createElement('aside');
    sidebar.className = "hidden md:flex flex-col w-64 bg-gctu-blue text-white h-full shadow-xl z-20 flex-shrink-0";
    sidebar.innerHTML = `
        <div class="p-6 border-b border-gray-700 flex items-center gap-3">
            <img src="../assets/images/icons/unisync.png" alt="GCTU Logo" class="h-10 w-10 bg-white rounded-full p-1 border-2 border-gctu-gold">
            <div>
                <h1 class="text-lg font-bold leading-tight">Unisync</h1>
                <p class="text-[10px] text-gctu-gold uppercase tracking-wider font-semibold">Student Portal</p>
            </div>
        </div>
        <nav class="flex-1 p-4 space-y-2">
            ${getNavLink('index.html', '🏠', 'Dashboard', activePage === 'dashboard')}
            ${getNavLink('timetable.html', '📅', 'Timetable', activePage === 'timetable')}
            ${getNavLink('resources.html', '📂', 'Resources', activePage === 'resources')}
            ${getNavLink('events.html', '📢', 'News & Events', activePage === 'events')}
            ${getNavLink('settings.html', '⚙️', 'Profile', activePage === 'settings')}
        </nav>
        <div class="p-4 border-t border-gray-700">
            <button id="logoutBtn" class="w-full flex items-center justify-center gap-2 text-sm text-red-300 hover:text-red-100 transition font-medium">
                🚪 Logout
            </button>
        </div>
    `;

    // --- C. MOBILE BOTTOM NAV ---
    const mobileNav = document.createElement('nav');
    mobileNav.className = "md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center p-2 z-50 text-[10px] font-bold shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]";
    mobileNav.innerHTML = `
        ${getMobileLink('index.html', '🏠', 'Home', activePage === 'dashboard')}
        ${getMobileLink('timetable.html', '📅', 'T-Table', activePage === 'timetable')}
        ${getMobileLink('resources.html', '📂', 'Files', activePage === 'resources')}
        ${getMobileLink('events.html', '📢', 'News', activePage === 'events')}
        ${getMobileLink('settings.html', '⚙️', 'Profile', activePage === 'settings')}
    `;

    // 4. SMART INJECTION LOGIC
    const mainWrapper = body.querySelector('.flex-1.flex.flex-col');

    if (mainWrapper) {
        mainWrapper.insertBefore(topHeader, mainWrapper.firstChild);
    } else {
        body.insertBefore(topHeader, body.firstChild);
    }
    body.insertBefore(sidebar, body.firstChild);
    body.appendChild(mobileNav);

    // 5. Attach Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            authAPI.logout();
        });
    }
}

// Helper: Generate Desktop Links
function getNavLink(url, icon, text, isActive) {
    const activeClass = isActive 
        ? "bg-white/10 text-gctu-gold font-semibold border-l-4 border-gctu-gold" 
        : "hover:bg-white/5 text-gray-300 hover:text-white";
    
    return `<a href="${url}" class="flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeClass}">
        <span class="text-lg">${icon}</span> ${text}
    </a>`;
}

// Helper: Generate Mobile Links
function getMobileLink(url, icon, text, isActive) {
    const colorClass = isActive ? "text-gctu-blue" : "text-gray-400";
    return `<a href="${url}" class="flex flex-col items-center ${colorClass} transition p-2">
        <span class="text-xl mb-1">${icon}</span> ${text}
    </a>`;
}