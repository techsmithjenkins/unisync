// Z:\unisync-project\admin\js\components\header.js

// 🔴 FIX: Added one more "../" to reach the root folder
import { authAPI } from '../../../shared/js/api/auth_api.js';

export function loadAdminHeader(activePage) {
    console.log("Loading Header for:", activePage); // Debugging check

    // 1. Define Links
    const links = [
        { name: 'Dashboard', url: 'index.html', id: 'dashboard' },
        { name: 'Timetable', url: 'schedule.html', id: 'timetable' },
        { name: 'Broadcast', url: 'broadcast.html', id: 'broadcast' },
        { name: 'Resources', url: 'resources.html', id: 'resources' },
        { name: 'Students', url: 'users.html', id: 'students' }
    ];

    // 2. Build Links HTML
    const linksHTML = links.map(link => {
        const isActive = activePage === link.id;
        const classes = isActive
            ? 'bg-white text-gctu-blue font-bold shadow-sm'
            : 'text-gray-200 hover:bg-white hover:bg-opacity-10 hover:text-white';

        return `<a href="${link.url}" class="px-3 py-2 rounded-md text-sm transition-all duration-200 ${classes}">${link.name}</a>`;
    }).join('');

    // 3. Build Full Navbar HTML
    const navHTML = `
    <nav class="bg-gctu-blue text-white sticky top-0 z-50 shadow-lg border-b-4 border-gctu-gold">
        <div class="max-w-6xl mx-auto px-4">
            <div class="flex items-center justify-between h-16">
                
                <div class="flex items-center gap-6">
                    <div class="font-bold text-xl tracking-wider flex-shrink-0">
                        GCTU <span class="text-gctu-gold text-sm font-normal">ADMIN</span>
                    </div>

                    <div class="hidden md:flex space-x-2">
                        ${linksHTML}
                    </div>
                </div>

                <div class="flex items-center gap-3">
                  <a href="profile.html" 
                      class="text-xs font-bold text-white bg-white bg-opacity-10 hover:bg-opacity-20 border border-white border-opacity-10 px-3 py-1.5 rounded transition duration-200 flex items-center gap-2">
                          <span>👤 Profile</span>
                  </a>
                    
                  <div>
                      <button id="headerLogoutBtn" 
                          class="text-xs font-bold text-red-300 border border-red-900 bg-black bg-opacity-20 hover:bg-red-600 hover:text-white hover:border-red-600 px-3 py-1.5 rounded transition duration-200 flex items-center gap-2">
                          <span>Log Out</span>
                      </button>
                  </div>
                </div>

            </div>
            
            <div class="md:hidden flex overflow-x-auto pb-2 gap-2 mt-1">
                 ${linksHTML}
            </div>
        </div>
    </nav>
    `;

    // 4. Inject into Body
    document.body.insertAdjacentHTML('afterbegin', navHTML);

    // 5. Attach Logout Logic
    const btn = document.getElementById('headerLogoutBtn');
    if (btn) {
        btn.addEventListener('click', async () => {
            if (confirm('Are you sure you want to log out?')) {
                await authAPI.logout();
            }
        });
    }
}