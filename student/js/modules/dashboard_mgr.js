import supabase from '../../../shared/js/supabase_client.js';
import { initTheme } from '../../../shared/js/theme_mgr.js';
import { scheduleAPI } from '../../../shared/js/api/schedule_api.js';

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    updateDate();
    loadWelcomeMessage();
    loadTodaySchedule();
});

function updateDate() {
    const options = { weekday: 'long', month: 'short', day: 'numeric' };
    const dateString = new Date().toLocaleDateString('en-US', options);

    const mobileDate = document.getElementById('currentDate');
    const desktopDate = document.getElementById('desktopDate');

    if (mobileDate) mobileDate.innerText = dateString;
    if (desktopDate) desktopDate.innerText = dateString;
}

async function loadTodaySchedule() {
    const container = document.getElementById('dailyScheduleList');
    if (!container) return;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = days[new Date().getDay()];

    try {
        const classes = await scheduleAPI.getScheduleByDay(todayName);

        const header = container.querySelector('h3');
        container.innerHTML = '';
        container.appendChild(header);

        if (!classes || classes.length === 0) {
            container.innerHTML += `
                <div class="bg-white p-10 rounded-2xl border border-gray-100 text-center shadow-sm">
                    <span class="text-4xl">☕</span>
                    <p class="text-gray-500 font-medium mt-2">No classes scheduled for ${todayName}.</p>
                    <p class="text-xs text-gray-400 uppercase tracking-widest mt-1">Free Day</p>
                </div>`;
            return;
        }

        classes.forEach((cls, index) => {
            const card = document.createElement('div');

            const borderClass = index === 0 ? 'border-l-4 border-gctu-gold' : 'border border-gray-100';

            card.className = `bg-white rounded-xl shadow-sm ${borderClass} flex overflow-hidden mb-4 transition-transform hover:scale-[1.01]`;

            card.innerHTML = `
                <div class="bg-blue-50 w-20 md:w-24 flex flex-col items-center justify-center border-r border-blue-100 p-3">
                    <span class="text-gctu-blue font-bold text-lg">${cls.start_time.slice(0, 5)}</span>
                </div>
                <div class="p-4 flex-1">
                    <h4 class="font-bold text-base md:text-lg text-gctu-blue">${cls.course_name}</h4>
                    <p class="text-xs md:text-sm text-gray-500 mt-1">${cls.venue} • ${cls.lecturer_name || 'TBA'}</p>
                </div>
            `;
            container.appendChild(card);
        });

    } catch (err) {
        console.error("Error loading student schedule:", err);
        container.innerHTML += `<p class="text-red-500 text-xs">Failed to load schedule.</p>`;
    }
}

async function loadWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeName');
    if (!welcomeElement) return;

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.warn("No active session found.");
            return;
        }

        let fullName = user.user_metadata?.full_name;

        if (!fullName) {
            const indexNumber = localStorage.getItem('user_index');

            const { data: profile, error: dbError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle();

            if (profile) {
                fullName = profile.full_name;
            }
        }

        if (fullName) {
            const firstName = fullName.trim().split(' ')[0];
            welcomeElement.innerText = `Welcome back, ${firstName}!`;
        } else {
            welcomeElement.innerText = `Welcome back!`;
        }

    } catch (err) {
        console.error("Error loading welcome message:", err.message);
        welcomeElement.innerText = `Welcome back!`;
    }
}