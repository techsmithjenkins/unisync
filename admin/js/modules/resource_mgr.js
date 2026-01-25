import supabase from '../../../shared/js/supabase_client.js';
import { Modal } from '../components/modal_system.js';

document.addEventListener('DOMContentLoaded', () => {
    initUploadForm();
    loadResources();
    loadCourseOptions(); // <--- NEW: Loads the dropdown from DB
});

// --- PART 1: LOAD COURSE DROPDOWN ---
async function loadCourseOptions() {
    const select = document.getElementById('fileCourse');
    if (!select) return;

    const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('code', { ascending: true });

    if (error) {
        console.error('Error loading courses:', error);
        select.innerHTML = '<option disabled>Error loading list</option>';
        return;
    }

    // Reset Dropdown
    select.innerHTML = '<option value="" disabled selected>-- Select Context --</option>';

    // Group 1: Academic
    const academic = data.filter(c => c.code !== 'GENERAL');
    if (academic.length > 0) {
        const group = document.createElement('optgroup');
        group.label = "Academic Courses";
        academic.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.innerText = `${c.code}: ${c.name}`;
            group.appendChild(opt);
        });
        select.appendChild(group);
    }

    // Group 2: General
    const general = data.filter(c => c.code === 'GENERAL');
    if (general.length > 0) {
        const group = document.createElement('optgroup');
        group.label = "General / Other";
        general.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.innerText = "📌 " + c.name;
            group.appendChild(opt);
        });
        select.appendChild(group);
    }
}

// --- PART 2: UPLOAD LOGIC ---
function initUploadForm() {
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const nameDisplay = document.getElementById('fileNameDisplay');
    const form = document.getElementById('uploadForm');

    // Drag & Drop Styles
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('border-gctu-blue', 'bg-blue-50', 'ring-2', 'ring-blue-100');
    });
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-gctu-blue', 'bg-blue-50', 'ring-2', 'ring-blue-100');
    });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('border-gctu-blue', 'bg-blue-50', 'ring-2', 'ring-blue-100');
        if (e.dataTransfer.files.length > 0) {
            fileInput.files = e.dataTransfer.files; 
            updateFileName(fileInput.files[0]);
        }
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) updateFileName(e.target.files[0]);
    });

    function updateFileName(file) {
        nameDisplay.innerText = "✅ Ready: " + file.name;
        nameDisplay.classList.remove('hidden');
    }

    // SUBMIT HANDLER
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const file = fileInput.files[0];
        if (!file) return Modal.confirm("Error", "Please select a file.", "OK", "red");

        // 1. Get Values
        const title = document.getElementById('fileTitle').value.trim();
        const course = document.getElementById('fileCourse').value; // <--- NEW: Get Course Code
        const category = document.getElementById('fileCategory') ? document.getElementById('fileCategory').value : 'Resource';
        
        if (!course) return Modal.confirm("Error", "Please select a course.", "OK", "red");

        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${title.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
        const filePath = `${course}/${fileName}`; // Folder = Course Code

        setUploading(true);

        try {
            // 2. Upload File
            const { error: storageError } = await supabase.storage
                .from('course_materials')
                .upload(filePath, file);

            if (storageError) throw storageError;

            // 3. Get URL
            const { data: { publicUrl } } = supabase.storage
                .from('course_materials')
                .getPublicUrl(filePath);

            // 4. Save to DB
            const { error: dbError } = await supabase.from('resources').insert([{
                title: title,
                category: category,
                course: course,        // <--- NEW: Save Course Code
                file_path: filePath,
                file_url: publicUrl,
                file_type: fileExt.toUpperCase(),
                size_kb: (file.size / 1024).toFixed(1)
            }]);

            if (dbError) throw dbError;

            await Modal.confirm("Success", "Uploaded successfully!", "Great", "green");
            form.reset();
            nameDisplay.classList.add('hidden');
            loadResources();

        } catch (err) {
            console.error(err);
            await Modal.confirm("Upload Failed", err.message, "OK", "red");
        } finally {
            setUploading(false);
        }
    });
}

function setUploading(isUploading) {
    const btn = document.getElementById('uploadBtn');
    const bar = document.getElementById('progressContainer');
    const barInner = document.getElementById('progressBar');

    if (isUploading) {
        btn.disabled = true;
        btn.innerHTML = `<span>⏳ Uploading...</span>`;
        bar.classList.remove('hidden');
        setTimeout(() => barInner.style.width = '80%', 500);
    } else {
        btn.disabled = false;
        btn.innerHTML = `<span>☁️ Upload File</span>`;
        bar.classList.add('hidden');
        barInner.style.width = '0%';
    }
}

// --- PART 3: LIST & DELETE LOGIC ---
async function loadResources() {
    const grid = document.getElementById('resourceGrid');
    const countEl = document.getElementById('resourceCount');
    
    const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });

    if (error || !data) return;

    countEl.innerText = `${data.length} files`;
    if (data.length === 0) {
        grid.innerHTML = `<p class="col-span-full text-center text-gray-400 py-10">No files yet.</p>`;
        return;
    }

    grid.innerHTML = data.map(file => {
        const icon = getFileIcon(file.file_type);
        return `
        <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition flex flex-col justify-between group">
            <div class="flex items-start gap-3">
                <div class="text-3xl">${icon}</div>
                <div class="overflow-hidden w-full">
                    <h4 class="font-bold text-gray-800 truncate" title="${file.title}">${file.title}</h4>
                    <p class="text-xs text-gctu-blue font-bold mt-1 bg-blue-50 inline-block px-1 rounded">${file.course || 'General'}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${file.size_kb} KB • ${new Date(file.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="mt-4 flex gap-2 pt-3 border-t border-gray-100">
                <a href="${file.file_url}" target="_blank" class="flex-1 bg-blue-50 text-blue-600 text-center py-1.5 rounded text-sm font-bold hover:bg-blue-100 transition">⬇ Download</a>
                <button onclick="deleteResource('${file.id}', '${file.file_path}')" class="bg-red-50 text-red-500 px-3 rounded text-sm hover:bg-red-100 transition">🗑️</button>
            </div>
        </div>`;
    }).join('');
}

window.deleteResource = async (id, filePath) => {
    if (!await Modal.confirm("Delete?", "Permanently remove file?", "Delete", "red")) return;
    await supabase.storage.from('course_materials').remove([filePath]);
    await supabase.from('resources').delete().eq('id', id);
    loadResources();
};

function getFileIcon(type) {
    if (!type) return '📄';
    if (type.includes('PDF')) return '📕';
    if (type.includes('PPT')) return '📊';
    if (type.includes('DOC')) return '📝';
    if (type.includes('JP') || type.includes('PNG')) return '🖼️';
    return '📄';
}