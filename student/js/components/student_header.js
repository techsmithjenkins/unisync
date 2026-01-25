// student/js/components/student_header.js
import { authAPI } from '../../../shared/js/api/auth_api.js';
import { broadcastPresence } from '../../../shared/js/user_presence.js';
import { checkAuth } from '../auth_guard.js';

export async function loadStudentHeader(activePage) {
    // 1. Security Check
    const indexNumber = checkAuth();
    if (!indexNumber) return;

    // 2. 🟢 BROADCAST PRESENCE (The "Online" Signal)
    // This runs immediately on every page load
    broadcastPresence(indexNumber);

    // 3. Inject Navigation UI
    const body = document.body;
    
    // A. Desktop Sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = "hidden md:flex flex-col w-64 bg-gctu-blue text-white h-full shadow-xl z-20 flex-shrink-0";
    sidebar.innerHTML = `
        <div class="p-6 border-b border-gray-700 flex items-center gap-3">
            <div class="w-10 h-10 bg-white text-gctu-blue rounded-full flex items-center justify-center font-bold text-lg border-2 border-gctu-gold">G</div>
            <div>
                <h1 class="text-lg font-bold leading-tight">GCTU</h1>
                <p class="text-[10px] text-gctu-gold uppercase tracking-wider">Student Portal</p>
            </div>
        </div>
        <nav class="flex-1 p-4 space-y-2">
            ${getNavLink('index.html', '📅', 'Schedule', activePage === 'dashboard')}
            ${getNavLink('resources.html', '📂', 'Resources', activePage === 'resources')}
            ${getNavLink('events.html', '📢', 'News & Events', activePage === 'events')}
            ${getNavLink('settings.html', '⚙️', 'Profile', activePage === 'settings')}
        </nav>
        <div class="p-4 border-t border-gray-700">
            <button id="logoutBtn" class="w-full flex items-center justify-center gap-2 text-sm text-red-300 hover:text-red-100 transition">
                🚪 Logout
            </button>
        </div>
    `;

    // B. Mobile Bottom Nav
    const mobileNav = document.createElement('nav');
    mobileNav.className = "md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center p-2 z-50 text-[10px] font-bold shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]";
    mobileNav.innerHTML = `
        ${getMobileLink('index.html', '📅', 'Schedule', activePage === 'dashboard')}
        ${getMobileLink('resources.html', '📂', 'Files', activePage === 'resources')}
        ${getMobileLink('events.html', '📢', 'News', activePage === 'events')}
        ${getMobileLink('settings.html', '⚙️', 'Profile', activePage === 'settings')}
    `;

    // Insert into DOM
    // We assume the page has a container. We prepend sidebar to body (flex container).
    body.insertBefore(sidebar, body.firstChild);
    body.appendChild(mobileNav);

    // 4. Attach Logout Logic
    document.getElementById('logoutBtn').addEventListener('click', () => {
        authAPI.logout();
    });
}

// Helper: Generate Desktop Links
function getNavLink(url, icon, text, isActive) {
    const activeClass = isActive 
        ? "bg-white/10 text-gctu-gold font-semibold" 
        : "hover:bg-white/5 text-gray-300 hover:text-white";
    
    return `<a href="${url}" class="flex items-center gap-3 px-4 py-3 rounded-lg transition ${activeClass}">
        <span>${icon}</span> ${text}
    </a>`;
}

// Helper: Generate Mobile Links
function getMobileLink(url, icon, text, isActive) {
    const colorClass = isActive ? "text-gctu-blue" : "text-gray-400 hover:text-gctu-blue";
    return `<a href="${url}" class="flex flex-col items-center ${colorClass} transition p-2">
        <span class="text-xl mb-1">${icon}</span> ${text}
    </a>`;
}