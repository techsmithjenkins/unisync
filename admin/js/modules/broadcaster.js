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
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-100 ${borderClass} flex justify-between items-start">
            <div>
                <h5 class="font-bold text-gray-800 text-sm flex items-center gap-2">
                    ${icon} ${msg.title}
                </h5>
                <p class="text-gray-600 text-xs mt-1 line-clamp-1">${msg.message}</p>
            </div>
            <span class="text-xs text-gray-400 font-mono whitespace-nowrap ml-4">${date}</span>
        </div>
        `;
    }).join('');
}