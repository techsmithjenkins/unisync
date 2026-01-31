import { scheduleAPI } from '../../../shared/js/api/schedule_api.js';
import supabase from '../../../shared/js/supabase_client.js';
import { Modal } from '../components/modal_system.js';

let currentDay = 'Monday'; 

export const scheduleManager = {
    init: () => {
        console.log("🚀 Schedule Manager Initialized");
        
        // 1. Autonomous Day Detection
        // Get today's real day name (e.g., "Saturday")
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayRealName = days[new Date().getDay()];
        
        // If it's the weekend, default the UI to Monday. Otherwise, open today's schedule.
        const activeDay = (todayRealName === 'Saturday' || todayRealName === 'Sunday') ? 'Monday' : todayRealName;
        currentDay = activeDay;

        // 2. Setup UI Components
        setupTabs(activeDay);
        setupModal();

        // 3. Setup Form Submit
        const form = document.getElementById('classForm');
        if (form) form.addEventListener('submit', handleFormSubmit);

        // 4. Load initial data for the detected day
        scheduleManager.loadDay(activeDay);
    },

    loadDay: async (day) => {
        currentDay = day; 
        const container = document.getElementById('schedule-container');
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-10">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gctu-blue mb-2"></div>
                <p class="text-gray-400 text-sm">Fetching ${day} schedule...</p>
            </div>`;

        const classes = await scheduleAPI.getScheduleByDay(day);

        if (!classes || classes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p class="text-gray-500 font-bold">No classes scheduled for ${day}.</p>
                    <p class="text-sm text-gray-400">Rest day or holiday.</p>
                </div>`;
            return;
        }

        container.innerHTML = classes.map(cls => `
            <div class="bg-gray-50 p-3 sm:p-4 rounded-lg shadow-sm border-l-4 border-gctu-blue border-b border-t border-r flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 group hover:shadow-md transition mb-3">
                <div class="flex-1 w-full">
                    <div class="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-2">
                        <h3 class="font-bold text-base sm:text-lg text-gctu-blue">${cls.course_name}</h3>
                        <span class="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200 font-mono">${cls.course_code}</span>
                    </div>
                    <p class="text-xs sm:text-sm text-gray-600 mb-2">
                        📍 ${cls.venue} &nbsp;|&nbsp; 👨‍🏫 ${cls.lecturer_name || 'TBA'}
                    </p>
                    <span class="text-xs font-bold text-gctu-gold bg-gray-900 px-2 py-1 rounded inline-block">
                        ${cls.start_time.slice(0,5)} - ${cls.end_time.slice(0,5)}
                    </span>
                </div>
                
                <div class="flex gap-2 w-full sm:w-auto opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button class="edit-btn flex-1 sm:flex-none text-blue-600 hover:bg-blue-50 p-2 rounded border border-blue-200 transition text-sm" 
                        onclick="window.openEditModal('${encodeURIComponent(JSON.stringify(cls))}')">
                        ✏️ Edit
                    </button>
                    <button class="delete-btn flex-1 sm:flex-none text-red-600 hover:bg-red-50 p-2 rounded border border-red-200 transition text-sm" 
                        onclick="window.deleteClass('${cls.id}')">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');
    }
};

// --- Helper Functions ---

function setupTabs(activeDay) {
    const tabs = document.querySelectorAll('.day-tab');
    tabs.forEach(tab => {
        // Highlight the current day tab on load
        if (tab.dataset.day === activeDay) {
            tab.classList.replace('bg-gray-200', 'bg-gctu-blue');
            tab.classList.replace('text-gray-500', 'text-white');
            tab.classList.add('shadow-md');
        }

        tab.addEventListener('click', (e) => {
            tabs.forEach(t => {
                t.classList.remove('bg-gctu-blue', 'text-white', 'shadow-md');
                t.classList.add('bg-gray-200', 'text-gray-500');
            });
            e.currentTarget.classList.replace('bg-gray-200', 'bg-gctu-blue');
            e.currentTarget.classList.replace('text-gray-500', 'text-white');
            e.currentTarget.classList.add('shadow-md');
            scheduleManager.loadDay(e.currentTarget.dataset.day);
        });
    });
}

function setupModal() {
    const modal = document.getElementById('classModal');
    const addBtn = document.getElementById('addClassBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('classForm');

    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = `Add Class for ${currentDay}`;
        document.getElementById('classId').value = ""; 
        form.reset();
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
}

async function handleFormSubmit(e) {
    e.preventDefault();
    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Saving...';

    const id = document.getElementById('classId').value;
    const payload = {
        course_code: document.getElementById('courseCode').value.toUpperCase(),
        course_name: document.getElementById('courseName').value,
        start_time: document.getElementById('startTime').value,
        end_time: document.getElementById('endTime').value,
        venue: document.getElementById('venue').value,
        lecturer_name: document.getElementById('lecturer').value,
        day: currentDay // SYNC FIX: Store string name ("Monday") for dashboard matching
    };

    try {
        let result;
        if (id) {
            result = await supabase.from('weekly_schedule').update(payload).eq('id', id);
        } else {
            result = await supabase.from('weekly_schedule').insert([payload]);
        }

        if (result.error) throw result.error;

        document.getElementById('classModal').classList.add('hidden');
        await Modal.confirm("Success", "Schedule updated and synced with dashboard.", "OK", "green");
        scheduleManager.loadDay(currentDay);

    } catch (err) {
        Modal.confirm("Error", err.message, "OK", "red");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Global Window Actions
window.openEditModal = (jsonStr) => {
    const data = JSON.parse(decodeURIComponent(jsonStr));
    document.getElementById('classId').value = data.id;
    document.getElementById('courseCode').value = data.course_code;
    document.getElementById('courseName').value = data.course_name;
    document.getElementById('startTime').value = data.start_time;
    document.getElementById('endTime').value = data.end_time;
    document.getElementById('venue').value = data.venue;
    document.getElementById('lecturer').value = data.lecturer_name;

    document.getElementById('modalTitle').innerText = "Edit Class Entry";
    document.getElementById('classModal').classList.remove('hidden');
};

window.deleteClass = async (id) => {
    const confirmed = await Modal.confirm("Remove Class?", "This will update the timetable and dashboard count.", "Delete", "red");
    if (confirmed) {
        const { error } = await supabase.from('weekly_schedule').delete().eq('id', id);
        if (error) Modal.confirm("Error", error.message, "OK", "red");
        else scheduleManager.loadDay(currentDay);
    }
};

// Start
document.addEventListener('DOMContentLoaded', scheduleManager.init);