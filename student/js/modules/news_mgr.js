import supabase from '../../../shared/js/supabase_client.js';
import { initTheme } from '../../../shared/js/theme_mgr.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadNews();
});

async function loadNews() {
    const container = document.getElementById('newsList');

    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-gray-400">No announcements at this time.</div>`;
        return;
    }

    container.innerHTML = data.map(item => {
        const isCritical = item.priority === 'critical';

        // Styles based on priority
        const cardBg = isCritical ? 'bg-red-50 border-l-danger' : 'bg-white border-l-gctu-gold';
        const icon = isCritical ? '🚨' : '📌';
        const badgeClass = isCritical ? 'text-danger bg-red-100' : 'text-gctu-blue bg-blue-50';
        const badgeText = isCritical ? 'Urgent Alert' : 'General Info';

        // Time ago logic (simple)
        const date = new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

        return `
        <div class="${cardBg} p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 flex gap-4 transition hover:shadow-md">
            <div class="text-3xl hidden sm:block">${icon}</div>
            <div class="flex-1">
                <div class="flex justify-between items-start mb-1">
                    <span class="${badgeClass} font-bold text-xs tracking-wide uppercase px-2 py-0.5 rounded">${badgeText}</span>
                    <span class="text-gray-400 text-xs">${date}</span>
                </div>
                <h4 class="font-bold text-lg">${item.title}</h4>
                <p class="text-sm mt-2 leading-relaxed whitespace-pre-line">${item.message}</p>
            </div>
        </div>
        `;
    }).join('');
}