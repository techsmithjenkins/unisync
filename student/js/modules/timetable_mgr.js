import { scheduleAPI } from '../../../shared/js/api/schedule_api.js';
import { initTheme } from '../../../shared/js/theme_mgr.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initTimetable();
});

async function initTimetable() {
    const tabs = document.querySelectorAll('.day-tab');
    
    // Auto-detect current day for initial load
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = days[new Date().getDay()];
    const defaultDay = (today === 'Saturday' || today === 'Sunday') ? 'Monday' : today;

    // Set initial tab styling
    updateTabUI(defaultDay);
    loadSchedule(defaultDay);

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const selectedDay = tab.dataset.day;
            updateTabUI(selectedDay);
            loadSchedule(selectedDay);
        });
    });
}

function updateTabUI(activeDay) {
    const tabs = document.querySelectorAll('.day-tab');
    tabs.forEach(tab => {
        if (tab.dataset.day === activeDay) {
            tab.className = "day-tab px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap bg-gctu-blue text-white shadow-md";
        } else {
            tab.className = "day-tab px-6 py-2 rounded-xl font-bold text-sm transition-all whitespace-nowrap bg-white text-gray-500 border border-gray-100 hover:bg-gray-50";
        }
    });
}

async function loadSchedule(day) {
    const container = document.getElementById('timetableList');
    container.innerHTML = '<div class="text-center py-20 animate-pulse text-gray-400">Opening books...</div>';

    try {
        const classes = await scheduleAPI.getScheduleByDay(day);

        if (!classes || classes.length === 0) {
            container.innerHTML = `
                <div class="bg-white p-12 rounded-2xl border-2 border-dashed border-gray-100 text-center shadow-sm">
                    <p class="text-gray-500 font-medium">No classes scheduled for ${day}.</p>
                </div>`;
            return;
        }

        container.innerHTML = classes.map(cls => `
            <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-gctu-blue/30 transition-all">
                <div class="flex items-center gap-4">
                    <div class="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-gctu-blue font-bold text-xs shrink-0">
                        ${cls.course_code.substring(0, 2)}
                    </div>
                    <div>
                        <h4 class="font-bold text-gctu-blue group-hover:text-blue-700 transition-colors">${cls.course_name}</h4>
                        <div class="flex items-center gap-3 mt-1">
                            <span class="text-xs font-mono text-gray-400 font-bold uppercase">${cls.course_code}</span>
                            <span class="text-gray-300">•</span>
                            <span class="text-xs text-gray-500">👨‍🏫 ${cls.lecturer_name || 'TBA'}</span>
                        </div>
                    </div>
                </div>
                
                <div class="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0">
                    <div class="text-right">
                        <span class="block text-sm font-bold text-gray-700">${cls.start_time.slice(0, 5)} - ${cls.end_time.slice(0, 5)}</span>
                        <span class="block text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">📍 ${cls.venue}</span>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (err) {
        container.innerHTML = '<p class="text-red-500 text-center">Failed to load schedule.</p>';
    }
}