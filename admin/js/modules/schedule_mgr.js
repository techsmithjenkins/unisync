// Z:\unisync-project\admin\js\modules\schedule_mgr.js
import { scheduleAPI } from '../../../shared/js/api/schedule_api.js';
import supabase from '../../../shared/js/supabase_client.js';

let currentDay = 'Monday'; // Default day

export const scheduleManager = {
    init: () => {
        console.log("Schedule Manager Initialized");
        
        // 1. Setup Day Tabs
        setupTabs();
        
        // 2. Setup Modal (Open/Close)
        setupModal();

        // 3. Setup Form Submit (Create/Update)
        document.getElementById('classForm').addEventListener('submit', handleFormSubmit);

        // 4. Load Initial Data
        scheduleManager.loadDay('Monday');
    },

    loadDay: async (day) => {
        currentDay = day; // Remember current day
        const container = document.getElementById('schedule-container');
        container.innerHTML = '<p class="text-center text-gray-400 py-10">Loading schedule...</p>';

        const classes = await scheduleAPI.getScheduleByDay(day);

        if (!classes || classes.length === 0) {
            container.innerHTML = `
                <div class="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <p class="text-gray-500 font-bold">No classes for ${day}.</p>
                    <p class="text-sm text-gray-400">Click "+ Add Class" to create one.</p>
                </div>`;
            return;
        }

        // Render Cards with "Edit" and "Delete" buttons
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
                    <button class="edit-btn flex-1 sm:flex-none text-blue-600 hover:bg-blue-50 p-2 rounded border border-blue-200 transition text-sm sm:text-base" 
                        data-id="${cls.id}" data-json='${JSON.stringify(cls)}' title="Edit class">
                        ✏️ Edit
                    </button>
                    <button class="delete-btn flex-1 sm:flex-none text-red-600 hover:bg-red-50 p-2 rounded border border-red-200 transition text-sm sm:text-base" 
                        data-id="${cls.id}" title="Delete class">
                        🗑️ Delete
                    </button>
                </div>
            </div>
        `).join('');

        // Attach Event Listeners to new buttons
        attachButtonListeners();
    }
};

// --- Helper Functions ---

function setupTabs() {
    const tabs = document.querySelectorAll('.day-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => {
                t.classList.remove('bg-gctu-blue', 'text-white');
                t.classList.add('bg-gray-200', 'text-gray-500');
            });
            e.target.classList.remove('bg-gray-200', 'text-gray-500');
            e.target.classList.add('bg-gctu-blue', 'text-white');
            scheduleManager.loadDay(e.target.dataset.day);
        });
    });
}

function setupModal() {
    const modal = document.getElementById('classModal');
    const addBtn = document.getElementById('addClassBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('classForm');

    // Open Modal (Reset Form)
    addBtn.addEventListener('click', () => {
        document.getElementById('modalTitle').innerText = "Add New Class";
        document.getElementById('classId').value = ""; // Clear ID
        form.reset();
        modal.classList.remove('hidden');
    });

    // Close Modal
    closeBtn.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.add('hidden');
    });
}

// Handle Form Submit (Create OR UPDATE)
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('#classForm button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Saving...';
    submitBtn.classList.add('opacity-50');

    try {
        // 1. Collect Data
        const id = document.getElementById('classId').value;
        const course_code = document.getElementById('courseCode').value.toUpperCase();
        const course_name = document.getElementById('courseName').value;
        const start_time = document.getElementById('startTime').value;
        const end_time = document.getElementById('endTime').value;
        const venue = document.getElementById('venue').value;
        const lecturer_name = document.getElementById('lecturer').value;
        
        // Map Day Name to Number (Monday=1, etc.)
        const DAY_MAP = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
        const day_of_week = DAY_MAP[currentDay];

        const payload = { course_code, course_name, start_time, end_time, venue, lecturer_name, day_of_week };

        // 2. Send to Supabase
        let result;
        if (id) {
            // UPDATE Existing
            result = await supabase.from('weekly_schedule').update(payload).eq('id', id);
        } else {
            // INSERT New
            result = await supabase.from('weekly_schedule').insert([payload]);
        }

        // 3. Handle Result
        if (result.error) {
            showNotification(result.error.message, 'error');
        } else {
            showNotification(id ? '✅ Class updated successfully!' : '✅ Class added successfully!', 'success');
            document.getElementById('classModal').classList.add('hidden');
            await scheduleManager.loadDay(currentDay); // Refresh list
        }
    } catch (err) {
        showNotification('An unexpected error occurred: ' + err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
        submitBtn.classList.remove('opacity-50');
    }
}

// Show toast notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500';
    
    notification.className = `fixed top-4 right-4 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce`;
    notification.innerHTML = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function attachButtonListeners() {
    // Edit Buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const data = JSON.parse(btn.dataset.json);
            
            // Fill Form
            document.getElementById('classId').value = data.id;
            document.getElementById('courseCode').value = data.course_code;
            document.getElementById('courseName').value = data.course_name;
            document.getElementById('startTime').value = data.start_time; // Format must be HH:MM
            document.getElementById('endTime').value = data.end_time;
            document.getElementById('venue').value = data.venue;
            document.getElementById('lecturer').value = data.lecturer_name;

            // Show Modal
            document.getElementById('modalTitle').innerText = "Edit Class";
            document.getElementById('classModal').classList.remove('hidden');
        });
    });

    // Delete Buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (confirm("Are you sure you want to delete this class?")) {
                const id = btn.dataset.id;
                const { error } = await supabase.from('weekly_schedule').delete().eq('id', id);
                
                if (error) alert("Error deleting: " + error.message);
                else scheduleManager.loadDay(currentDay); // Refresh
            }
        });
    });
}

// Init
if (document.getElementById('schedule-container')) {
    document.addEventListener('DOMContentLoaded', scheduleManager.init);
}