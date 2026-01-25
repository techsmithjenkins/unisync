import supabase from '../../../shared/js/supabase_client.js';
import { Modal } from '../components/modal_system.js';

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    initBroadcaster();
});

function initBroadcaster() {
    const form = document.getElementById('broadcastForm');
    const btn = document.getElementById('sendBtn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Get Values
        const title = document.getElementById('broadcastTitle').value.trim();
        const body = document.getElementById('broadcastBody').value.trim();
        // Get selected radio button value
        const priority = document.querySelector('input[name="priority"]:checked').value;

        // 2. Set Loading State
        const originalText = btn.innerHTML;
        btn.innerHTML = "⏳ Sending...";
        btn.disabled = true;

        try {
            // 3. Insert into Supabase
            const { error } = await supabase
                .from('notifications')
                .insert([
                    { title: title, message: body, priority: priority, type: 'broadcast' }
                ]);

            if (error) throw error;

            // 4. Success
            await Modal.confirm("Broadcast Sent", "Your message has been posted to all students.", "Done", "green");
            form.reset();
            loadHistory(); // Refresh the list below

        } catch (err) {
            console.error(err);
            await Modal.confirm("Failed", err.message, "OK", "red");
        } finally {
            // 5. Reset Button
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

async function loadHistory() {
    const list = document.getElementById('historyList');

    // Fetch last 3 messages
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (!data || data.length === 0) {
        list.innerHTML = `<p class="text-gray-400 text-center text-sm py-4">No recent broadcasts found.</p>`;
        return;
    }

    list.innerHTML = data.map(msg => {
        const isCritical = msg.priority === 'critical';
        const icon = isCritical ? '🔴' : '🔵';
        const borderClass = isCritical ? 'border-l-4 border-red-500' : 'border-l-4 border-blue-500';

        // Format date niceley (e.g., "Jan 25, 10:30 AM")
        const date = new Date(msg.created_at).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
        });

        return `
<div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${borderClass} flex justify-between items-center mb-3 group">
    <div class="flex-1 min-w-0">
        <div class="flex items-center justify-between mb-1">
            <h5 class="font-bold text-gray-800 text-sm flex items-center gap-2 truncate">
                ${icon} ${msg.title}
            </h5>
            <span class="text-[10px] text-gray-400 font-mono whitespace-nowrap ml-2">${date}</span>
        </div>
        <p class="text-gray-600 text-xs line-clamp-1 pr-4">${msg.message}</p>
    </div>
    
    <button onclick="deleteNotification('${msg.id}')" 
            class="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
            title="Delete Notification">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
    </button>
</div>
`;
    }).join('');
}


// Function to delete a notification
async function deleteNotification(id) {
    // 1. Confirm with user
    const confirmDelete = await Modal.confirm(
        "Delete Notification",
        "Are you sure you want to remove this message? This cannot be undone.",
        "Delete",
        "red"
    );

    if (!confirmDelete) return;

    try {
        // 2. Delete from 'notifications' table
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // 3. Refresh the UI list
        if (window.loadNotifications) {
            window.loadNotifications();
        } else {
            location.reload(); // Fallback if no refresh function exists
        }

    } catch (err) {
        console.error("Deletion failed:", err);
        await Modal.confirm("Error", "Could not delete: " + err.message, "OK", "red");
    }
}

// Ensure it's globally accessible for the onclick attribute
window.deleteNotification = deleteNotification;