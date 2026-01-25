import supabase from '../../../shared/js/supabase_client.js';
// Import path fixed. In 'modules', one level up (../) gets to 'js', then into 'components'.
// Importing the Global Modal system to replace browser 'alert()' boxes with professional popups.
import { Modal } from '../components/modal_system.js';

let allStudents = [];
// Object used to track sorting state. Keeps track of the currently sorted column 
// and the direction: Ascending (A-Z) or Descending (Z-A).
let currentSort = { column: 'surname', direction: 'asc' }; 
// NEW: A Set to store the Index Numbers of students who are currently online.
// Using a Set makes lookups extremely fast (O(1)) compared to arrays.
let onlineUsers = new Set();

document.addEventListener('DOMContentLoaded', () => {
    // Initialization of all subsystems. Data loading (loadStudents) is placed last 
    // to ensure the UI elements are ready before data is populated.
    initImporter();
    initModal();
    initDeleteAll();
    initPresenceListener(); //  <--- NEW: Starts listening for online students
    loadStudents();
});

// --- PART 0: REALTIME PRESENCE (NEW) ---
function initPresenceListener() {
    // Connects to the same 'online_users' channel that students broadcast to.
    const channel = supabase.channel('online_users');

    channel
        .on('presence', { event: 'sync' }, () => {
            // This runs whenever someone joins or leaves.
            // We get the full state of everyone currently in the channel.
            const newState = channel.presenceState();
            
            // Clear the old list and rebuild it from the new state.
            onlineUsers.clear();
            
            // Loop through all presence entries to find user IDs (Index Numbers).
            for (const id in newState) {
                const users = newState[id];
                users.forEach(u => {
                    if (u.user) onlineUsers.add(u.user.toString());
                });
            }

            // Re-render the table to show/hide the green dots.
            // We pass 'allStudents' to maintain the current list/search view.
            renderTable(allStudents);
        })
        .subscribe();
}

// --- PART 1: DELETE ALL (UPDATED WITH SAFETY MODAL) ---
function initDeleteAll() {
    const deleteBtn = document.getElementById('deleteAllBtn');
    if(deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            
            // Invokes the 'dangerousConfirm' method from the Modal system.
            // Requires the user to explicitly type "DELETE". This acts as a safeguard
            // to prevent accidental database wiping.
            const confirmed = await Modal.dangerousConfirm(
                "Delete ALL Students?", 
                "This action cannot be undone. It will remove every student from the database except the Admin account.",
                "DELETE"
            );

            // Stops execution if the user cancelled or failed to type "DELETE" correctly.
            if (!confirmed) return; 

            // Performs the deletion operation. A critical safety lock (.neq('index_number', 'admin'))
            // is applied to ensure the Admin account is excluded from the wipe.
            const { error } = await supabase
                .from('profiles')
                .delete()
                .neq('index_number', 'admin'); 

            if (error) {
                // Displays the 'red' theme modal to signal an error occurred during deletion.
                await Modal.confirm("Error", error.message, "OK", "red");
            } else {
                // Displays the 'green' theme modal to confirm successful deletion.
                await Modal.confirm("Success", "All students have been deleted.", "Great!", "green");
                // Refreshes the table immediately to reflect the empty database state in the UI.
                loadStudents(); 
            }
        });
    }
}

// --- PART 2: MODAL LOGIC (ADD & EDIT) ---
// --- PART 2: MODAL LOGIC (ADD & EDIT) ---
function initModal() {
    const modal = document.getElementById('studentModal');
    const addBtn = document.getElementById('addStudentBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('studentForm');
    const modalTitle = modal.querySelector('h3'); 

    // Variable to track context. Null indicates "Adding", ID indicates "Editing".
    let editId = null;

    addBtn.addEventListener('click', () => {
        editId = null; 
        form.reset();
        modalTitle.innerText = "Add Single Student";
        modal.classList.remove('hidden');
    });

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const surname = document.getElementById('inSurname').value.trim();
        const firstName = document.getElementById('inFirstName').value.trim();
        const otherNames = document.getElementById('inOtherNames').value.trim();
        const gender = document.getElementById('inGender').value;
        const indexNumber = document.getElementById('inIndexNumber').value.trim();
        const status = document.getElementById('inStatus').value;
        const fullName = `${surname} ${firstName} ${otherNames}`.trim();

        const payload = {
            surname, 
            first_name: firstName, 
            other_names: otherNames,
            gender, 
            index_number: indexNumber, 
            password: indexNumber, // <--- NEW: Sets default password to Index Number
            status, 
            full_name: fullName
        };

        let error;
        if (editId) {
            // Update existing (Don't overwrite password unless you want to reset it)
            // Ideally, we shouldn't change the password on a simple edit, 
            // but for a reset, this ensures consistency.
            const res = await supabase.from('profiles').update(payload).eq('id', editId);
            error = res.error;
        } else {
            // Insert new
            const res = await supabase.from('profiles').upsert([payload], { onConflict: 'index_number' });
            error = res.error;
        }

        if (error) {
            await Modal.confirm("Error", error.message, "OK", "red");
        } else {
            modal.classList.add('hidden');
            loadStudents();
        }
    });

    window.editStudent = (studentJson) => {
        const s = JSON.parse(decodeURIComponent(studentJson));
        editId = s.id; 
        document.getElementById('inSurname').value = s.surname || '';
        document.getElementById('inFirstName').value = s.first_name || '';
        document.getElementById('inOtherNames').value = s.other_names || '';
        document.getElementById('inGender').value = s.gender || 'M';
        document.getElementById('inIndexNumber').value = s.index_number || '';
        document.getElementById('inStatus').value = s.status || 'Active';
        modalTitle.innerText = "Edit Student Details";
        modal.classList.remove('hidden');
    };
}

// --- PART 3: CSV IMPORT LOGIC ---
function initImporter() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('csvInput');
    const fileLabel = document.getElementById('fileLabel');
    const importBtn = document.getElementById('importBtn');

    // Sets up drag-and-drop visual feedback.
    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('bg-blue-50', 'border-gctu-blue'); });
    dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('bg-blue-50', 'border-gctu-blue'); });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('bg-blue-50', 'border-gctu-blue');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', (e) => { if (e.target.files.length) handleFile(e.target.files[0]); });

    function handleFile(file) {
        // Validates file extension immediately to prevent errors during processing.
        if (!file.name.endsWith('.csv')) { 
            Modal.confirm("Invalid File", "Please upload a valid .csv file", "OK", "blue");
            return; 
        }
        fileLabel.innerText = `✅ ${file.name}`;
        importBtn.disabled = false;
        importBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        importBtn.onclick = () => processCSV(file);
    }
}

async function processCSV(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').map(row => row.split(','));
        rows.shift(); // Removes the header row to prevent importing headers as data.

        const studentsToInsert = [];
        
        rows.forEach(row => {
            if (row.length < 2) return; // Skips empty lines to avoid errors.

            let surname, firstName, otherNames, index, gender, status;

            // Scenario 1: Old Format (4 columns), assumes Gender is null.
            if (row.length === 4) { 
                surname = row[0]?.trim(); 
                firstName = row[1]?.trim();
                otherNames = row[2]?.trim(); 
                index = row[3]?.trim();
                gender = null; 
                status = 'Active';
            }
            // Scenario 2: New Format (5+ columns), maps Gender correctly.
            else if (row.length >= 5) { 
                surname = row[0]?.trim(); 
                firstName = row[1]?.trim();
                otherNames = row[2]?.trim(); 
                
                // Smart Gender Parsing: Handles "Male", "M", "male" -> "M"
                const rawGen = row[3]?.trim().toUpperCase() || '';
                if (rawGen.startsWith('M')) gender = 'M';      
                else if (rawGen.startsWith('F')) gender = 'F'; 
                else gender = null;

                index = row[4]?.trim(); 
                status = row[5]?.trim() || 'Active';
            }

            // Ensures a student is only added if an Index Number exists (Unique Key).
            if (index) {
                studentsToInsert.push({
                    surname, 
                    first_name: firstName, 
                    other_names: otherNames,
                    gender, 
                    index_number: index, 
                    password: index, // <--- NEW: Sets default password to Index Number
                    status,
                    full_name: `${surname} ${firstName} ${otherNames}`.trim()
                });
            }
        });

        if (studentsToInsert.length === 0) { 
            Modal.confirm("Empty", "No valid data found in CSV.", "OK", "blue");
            return; 
        }

        // Updates UI to indicate uploading state.
        const btn = document.getElementById('importBtn');
        const originalText = btn.innerText;
        btn.innerText = "⏳ Uploading...";
        btn.disabled = true;

        // Performs the Upsert operation to database.
        const { error } = await supabase.from('profiles').upsert(studentsToInsert, { onConflict: 'index_number' });

        if (error) {
            Modal.confirm("Import Failed", error.message, "OK", "red");
        } else {
            // Triggers the Green Success Modal upon completion.
            await Modal.confirm("Success", `Imported ${studentsToInsert.length} students successfully!`, "Awesome", "green");
            loadStudents();
        }
        
        // Resets the button state after operation.
        btn.innerText = originalText;
        btn.disabled = true;
        btn.classList.add('opacity-50');
    };
    reader.readAsText(file);
}

// --- PART 4: LOAD, SORT, RENDER ---
async function loadStudents() {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">Loading...</td></tr>';

    // Fetches all students sorted by Surname (A-Z) by default.
    const { data, error } = await supabase.from('profiles').select('*').order('surname', { ascending: true });

    if (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-red-500 p-4">Error loading data</td></tr>';
        return;
    }

    allStudents = data;
    document.getElementById('totalCount').innerText = data.length;
    renderTable(allStudents);

    // Attaches the search filter to enable instant filtering as user types.
    document.getElementById('searchInput').addEventListener('input', applyFilterAndSort);
}

// --- PART 5: TABLE ACTIONS ---

// Updated delete function uses the Global Modal System instead of native confirm().
window.deleteStudent = async (id) => {
    // Awaits user confirmation ("Yes" or "Cancel") via the custom modal.
    const confirmed = await Modal.confirm(
        "Remove Student?", 
        "Are you sure you want to remove this student? They will lose access to the portal.", 
        "Yes, Remove", 
        "red"
    );

    if (confirmed) {
        const { error } = await supabase.from('profiles').delete().eq('id', id);
        if (!error) loadStudents();
    }
};

// Handles sorting logic. Toggles direction if the same column is clicked twice.
window.sortStudents = (column) => {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    updateSortIcons();
    applyFilterAndSort();
};

function updateSortIcons() {
    // Resets all sorting icons to the neutral '↕'.
    ['surname', 'first_name', 'gender', 'index_number', 'status'].forEach(id => {
        const el = document.getElementById(`sort-${id}`);
        if(el) { el.innerText = '↕'; el.className = 'text-gray-300'; }
    });
    // Highlights the active column icon.
    const activeIcon = document.getElementById(`sort-${currentSort.column}`);
    if (activeIcon) {
        activeIcon.innerText = currentSort.direction === 'asc' ? '↑' : '↓';
        activeIcon.className = 'text-gctu-blue font-bold';
    }
}

function applyFilterAndSort() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    
    // 1. Filters list based on search term matching Surname, Index, or First Name.
    let filtered = allStudents.filter(s => 
        (s.surname && s.surname.toLowerCase().includes(searchTerm)) || 
        (s.index_number && s.index_number.includes(searchTerm)) ||
        (s.first_name && s.first_name.toLowerCase().includes(searchTerm))
    );

    // 2. Sorts the filtered list based on the currentSort configuration.
    filtered.sort((a, b) => {
        const valA = (a[currentSort.column] || '').toString().toLowerCase();
        const valB = (b[currentSort.column] || '').toString().toLowerCase();
        if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
        if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    renderTable(filtered);
}

function renderTable(students) {
    const tbody = document.getElementById('studentTableBody');
    if (students.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">No students found.</td></tr>';
        return;
    }

    tbody.innerHTML = students.map(s => {
        // 1. Badge Logic
        let genderBadge = '<span class="text-gray-300">-</span>';
        if (s.gender === 'M' || s.gender === 'Male') genderBadge = '<span class="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-bold">M</span>';
        if (s.gender === 'F' || s.gender === 'Female') genderBadge = '<span class="bg-pink-50 text-pink-600 px-2 py-0.5 rounded text-xs font-bold">F</span>';

        // 2. NEW: Online Status Logic
        const isOnline = onlineUsers.has(s.index_number.toString());
        const onlineIndicator = isOnline 
            ? '<span class="w-2.5 h-2.5 bg-green-500 rounded-full inline-block mr-2 animate-pulse shadow-sm" title="Online now"></span>' 
            : '';

        return `
        <tr class="hover:bg-gray-50 group border-b border-gray-100 transition">
            <td class="p-4 font-bold text-gray-700 flex items-center">
                ${onlineIndicator}
                ${s.surname || ''}
            </td>
            <td class="p-4 text-gray-600">${s.first_name || ''}</td>
            <td class="p-4 text-gray-500">${s.other_names || '-'}</td>
            <td class="p-4 text-center">${genderBadge}</td>
            <td class="p-4 font-mono text-xs text-gctu-blue font-bold">${s.index_number}</td>
            
            <td class="p-4">
                <select onchange="updateStatus('${s.id}', this.value)" 
                    class="bg-white border border-gray-200 text-xs rounded px-2 py-1 outline-none focus:border-gctu-blue cursor-pointer
                    ${getStatusColor(s.status)}">
                    <option value="Active" ${s.status === 'Active' ? 'selected' : ''}>Active</option>
                    <option value="Inactive" ${s.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
                    <option value="Alumni" ${s.status === 'Alumni' ? 'selected' : ''}>Alumni</option>
                </select>
            </td>

            <td class="p-4 text-right flex justify-end gap-2">
                <button onclick="editStudent('${encodeURIComponent(JSON.stringify(s))}')" 
                    class="text-blue-500 hover:text-blue-700 p-2 rounded hover:bg-blue-50 transition opacity-0 group-hover:opacity-100">
                    ✏️
                </button>
                <button onclick="deleteStudent('${s.id}')" 
                    class="text-red-400 hover:text-red-600 p-2 rounded hover:bg-red-50 transition opacity-0 group-hover:opacity-100">
                    🗑️
                </button>
            </td>
        </tr>
    `}).join('');
}

// Helper function to assign color classes based on student status.
function getStatusColor(status) {
    switch (status) {
        case 'Active': return 'text-green-600 font-bold bg-green-50';
        case 'Inactive': return 'text-red-500 bg-red-10';
        default: return 'text-gray-500 bg-gray-50';
    }
}

// Updates the student status instantly in the database when the dropdown changes.
window.updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('profiles').update({ status: newStatus }).eq('id', id);
    if (!error) loadStudents();
};