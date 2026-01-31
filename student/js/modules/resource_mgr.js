import supabase from '../../../shared/js/supabase_client.js';
import { initTheme } from '../../../shared/js/theme_mgr.js';

let allFiles = []; // Store files globally for search filtering
let courseLookup = {}; // Store course names globally

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadResources();

    // Listen for search input
    const searchInput = document.getElementById('resourceSearch');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            filterResources(e.target.value);
        });
    }
});

async function loadResources() {
    const container = document.getElementById('resourceList');
    
    try {
        // 1. Fetch Course Names for the lookup map
        const { data: courses, error: courseError } = await supabase
            .from('courses')
            .select('code, name');

        if (courseError) throw courseError;

        courseLookup = courses.reduce((acc, c) => {
            acc[c.code.toUpperCase()] = c.name;
            return acc;
        }, {});

        // 2. Fetch all Actual Files
        const { data: files, error: fileError } = await supabase
            .from('resources')
            .select('*')
            .order('course', { ascending: true })
            .order('created_at', { ascending: false });

        if (fileError) throw fileError;

        allFiles = files || [];
        renderUI(allFiles);

    } catch (err) {
        console.error("Error loading resources:", err);
        container.innerHTML = `<p class="text-red-500 text-center py-10">Failed to load library. Please check your connection.</p>`;
    }
}

/**
 * Filters the global files list based on course name, code, or file title
 */
function filterResources(query) {
    const q = query.toLowerCase().trim();
    
    const filtered = allFiles.filter(file => {
        const courseCode = (file.course || '').toLowerCase();
        const courseName = (courseLookup[courseCode.toUpperCase()] || '').toLowerCase();
        const fileTitle = (file.title || '').toLowerCase();
        
        return courseCode.includes(q) || courseName.includes(q) || fileTitle.includes(q);
    });

    renderUI(filtered);
}

/**
 * Groups and renders the files into Course Cards
 */
function renderUI(filesToRender) {
    const container = document.getElementById('resourceList');

    if (!filesToRender || filesToRender.length === 0) {
        container.innerHTML = `
            <div class="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                <p class="text-gray-400 font-medium">No matching materials found.</p>
                <p class="text-xs text-gray-300">Try a different course code or keyword.</p>
            </div>`;
        return;
    }

    // Group Files by Course Code
    const grouped = filesToRender.reduce((acc, file) => {
        const code = (file.course || 'GENERAL').toUpperCase();
        if (!acc[code]) acc[code] = [];
        acc[code].push(file);
        return acc;
    }, {});

    container.innerHTML = Object.keys(grouped).map(code => {
        const courseFiles = grouped[code];
        const courseName = courseLookup[code] || (code === 'GENERAL' ? 'General Resources' : code);
        
        // Generate File List HTML
        const fileListHTML = courseFiles.map(file => {
            const icon = getFileIcon(file.file_type);
            const date = new Date(file.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
            
            return `
            <div class="flex items-center justify-between p-3 hover:bg-blue-50/30 rounded-lg transition group border-b border-gray-50 last:border-0">
                <div class="flex items-center gap-3 overflow-hidden">
                    <div class="w-10 h-10 bg-white shadow-sm border border-gray-100 text-blue-600 rounded-lg flex items-center justify-center text-lg shrink-0">${icon}</div>
                    <div class="min-w-0">
                        <h5 class="text-sm font-bold truncate text-gray-700 group-hover:text-gctu-blue transition">${file.title}</h5>
                        <p class="text-[10px] text-gray-400 uppercase tracking-wide font-medium">${file.category} • ${file.size_kb} KB • ${date}</p>
                    </div>
                </div>
                <a href="${file.file_url}" target="_blank" class="bg-white border border-gray-200 text-gctu-blue text-xs font-bold px-4 py-2 rounded-lg hover:bg-gctu-blue hover:text-white hover:border-gctu-blue transition shadow-sm">
                    Download
                </a>
            </div>
            `;
        }).join('');

        // Course Card Template
        return `
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            <div class="bg-gray-50/50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                <div class="flex flex-col">
                    <span class="text-[10px] font-black text-gctu-gold uppercase tracking-widest leading-none mb-1">${code}</span>
                    <h3 class="font-bold text-gctu-blue text-sm md:text-base truncate max-w-[200px] md:max-w-md">
                        ${courseName}
                    </h3>
                </div>
                <span class="text-[10px] font-bold bg-white border border-gray-200 px-3 py-1 rounded-full text-gray-400 shadow-sm">${courseFiles.length} FILES</span>
            </div>
            <div class="p-2">
                ${fileListHTML}
            </div>
        </div>
        `;
    }).join('');
}

function getFileIcon(type) {
    if (!type) return '📄';
    type = type.toLowerCase();
    if (type.includes('pdf')) return '📕';
    if (type.includes('ppt')) return '📊';
    if (type.includes('doc')) return '📝';
    if (type.includes('xls') || type.includes('csv')) return '📈';
    if (type.includes('jp') || type.includes('png') || type.includes('svg')) return '🖼️';
    if (type.includes('zip') || type.includes('rar')) return '📦';
    return '📄';
}