import supabase from '../../../shared/js/supabase_client.js';
import { initTheme } from '../../../shared/js/theme_mgr.js';

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadResources();
});

async function loadResources() {
    const container = document.getElementById('resourceList');
    
    try {
        // STEP 1: Fetch the Course Names (The "Lookup" List)
        const { data: courses, error: courseError } = await supabase
            .from('courses')
            .select('code, name');

        if (courseError) throw courseError;

        // Create a quick lookup map: { "ENCE 315": "Software Engineering", ... }
        const courseMap = courses.reduce((acc, c) => {
            acc[c.code] = c.name;
            return acc;
        }, {});


        // STEP 2: Fetch the Actual Files
        const { data: files, error: fileError } = await supabase
            .from('resources')
            .select('*')
            .order('course', { ascending: true })
            .order('created_at', { ascending: false });

        if (fileError) throw fileError;

        if (!files || files.length === 0) {
            container.innerHTML = `<div class="text-center py-10 text-gray-400">No course materials uploaded yet.</div>`;
            return;
        }

        // STEP 3: Group Files by Course Code
        const grouped = files.reduce((acc, file) => {
            // Default to "General" if admin didn't pick a course
            const code = (file.course || 'GENERAL').toUpperCase();
            if (!acc[code]) acc[code] = [];
            acc[code].push(file);
            return acc;
        }, {});

        // STEP 4: Render the UI
        container.className = "space-y-8"; // Stack layout
        container.innerHTML = Object.keys(grouped).map(code => {
            const courseFiles = grouped[code];
            
            // Get the nice name from our DB lookup, or just use the code if missing
            const courseName = courseMap[code] || code;
            
            // HTML for the files inside this card
            const fileListHTML = courseFiles.map(file => {
                const icon = getFileIcon(file.file_type);
                const date = new Date(file.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                
                return `
                <div class="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition group border-b border-gray-100 last:border-0">
                    <div class="flex items-center gap-3 overflow-hidden">
                        <div class="w-8 h-8 bg-blue-50 text-blue-600 rounded flex items-center justify-center text-lg shrink-0">${icon}</div>
                        <div class="min-w-0">
                            <h5 class="text-sm font-bold text-gray-800 truncate group-hover:text-gctu-blue transition">${file.title}</h5>
                            <p class="text-[10px] text-gray-400 uppercase tracking-wide">${file.category} • ${file.size_kb} KB • ${date}</p>
                        </div>
                    </div>
                    <a href="${file.file_url}" target="_blank" class="bg-white border border-gray-200 text-gctu-blue text-xs font-bold px-3 py-1.5 rounded hover:bg-gctu-blue hover:text-white transition">
                        Download
                    </a>
                </div>
                `;
            }).join('');

            // HTML for the Course Card itself
            return `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div class="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 class="font-bold text-gctu-blue text-sm md:text-base flex items-center gap-2">
                        <span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded border border-blue-200 hidden md:inline-block">${code}</span>
                        <span class="truncate">${courseName}</span>
                    </h3>
                    <span class="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-500 whitespace-nowrap">${courseFiles.length} files</span>
                </div>
                <div class="p-2">
                    ${fileListHTML}
                </div>
            </div>
            `;
        }).join('');

    } catch (err) {
        console.error("Error loading resources:", err);
        container.innerHTML = `<p class="text-red-500 text-center">Failed to load resources.</p>`;
    }
}

function getFileIcon(type) {
    if (!type) return '📄';
    type = type.toLowerCase();
    if (type.includes('pdf')) return '📕';
    if (type.includes('ppt')) return '📊';
    if (type.includes('doc')) return '📝';
    if (type.includes('jp') || type.includes('png')) return '🖼️';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📄';
}