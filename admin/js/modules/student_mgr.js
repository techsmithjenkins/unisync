import CONFIG from '../../../shared/js/config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import supabase from '../../../shared/js/supabase_client.js';
import { Modal } from '../components/modal_system.js';

const adminSupabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

let allStudents = [];
let currentSort = { column: 'surname', direction: 'asc' };
let onlineUsers = new Set();

document.addEventListener('DOMContentLoaded', () => {
    initImporter();
    initModal();
    initDeleteAll();
    initPresenceListener();
    loadStudents();
});

// --- PART 0: REALTIME PRESENCE ---
function initPresenceListener() {
    const channel = supabase.channel('online_users');
    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            onlineUsers.clear();
            for (const id in newState) {
                const users = newState[id];
                users.forEach(u => {
                    if (u.user) onlineUsers.add(u.user.toString());
                });
            }
            renderTable(allStudents);
        })
        .subscribe();
}

// --- PART 1: DELETE ALL ---
function initDeleteAll() {
    const deleteBtn = document.getElementById('deleteAllBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const confirmed = await Modal.dangerousConfirm(
                "Delete ALL Students?",
                "This will wipe the profiles table. Note: This does NOT delete their Auth accounts. Use the Supabase dashboard for full deletion.",
                "DELETE"
            );
            if (!confirmed) return;

            const { error } = await supabase.from('profiles').delete().neq('index_number', 'admin');

            if (error) {
                await Modal.confirm("Error", error.message, "OK", "red");
            } else {
                await Modal.confirm("Success", "All student profiles cleared.", "OK", "green");
                loadStudents();
            }
        });
    }
}

// --- PART 2: MODAL LOGIC (ADD & EDIT) ---
function initModal() {
    const modal = document.getElementById('studentModal');
    const addBtn = document.getElementById('addStudentBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    const form = document.getElementById('studentForm');
    const roleSelect = document.getElementById('inRole');
    const identifierLabel = document.getElementById('identifierLabel');
    const identifierInput = document.getElementById('inIdentifier');
    const modalTitle = modal.querySelector('h3');

    let editId = null;

    // Handle Role Change in Form
    roleSelect.addEventListener('change', (e) => {
        if (e.target.value === 'admin') {
            identifierLabel.innerText = "Email Address";
            identifierInput.placeholder = "e.g. teammate@gmail.com";
            identifierInput.type = "email";
        } else {
            identifierLabel.innerText = "Index Number";
            identifierInput.placeholder = "e.g. 170302123";
            identifierInput.type = "text";
        }
    });

    addBtn.addEventListener('click', () => {
        editId = null;
        form.reset();
        roleSelect.dispatchEvent(new Event('change'));
        modalTitle.innerText = "Add New User";
        modal.classList.remove('hidden');
    });

    // GLOBAL EDIT FUNCTION (Fixed)
    window.editStudent = (encodedData) => {
        const s = JSON.parse(decodeURIComponent(encodedData));
        editId = s.id;

        document.getElementById('inSurname').value = s.surname || '';
        document.getElementById('inFirstName').value = s.first_name || '';
        document.getElementById('inOtherNames').value = s.other_names || '';
        document.getElementById('inGender').value = s.gender || 'M';
        document.getElementById('inRole').value = s.role || 'student';
        document.getElementById('inStatus').value = s.status || 'Active';

        roleSelect.dispatchEvent(new Event('change'));
        identifierInput.value = s.index_number || '';

        modalTitle.innerText = "Edit User Details";
        modal.classList.remove('hidden');
    };

    closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const role = roleSelect.value;
        const identifier = identifierInput.value.trim();
        const surname = formatName(document.getElementById('inSurname').value);
        const firstName = formatName(document.getElementById('inFirstName').value);
        const otherNames = formatName(document.getElementById('inOtherNames').value);

        const email = role === 'student' ? `${identifier}@live.gctu.edu.gh` : identifier;

        const payload = {
            surname,
            first_name: firstName,
            other_names: otherNames,
            gender: document.getElementById('inGender').value,
            index_number: identifier,
            status: document.getElementById('inStatus').value,
            full_name: `${surname} ${firstName}`.trim(),
            role: role
        };

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerText = "Processing...";

        try {
            if (editId) {
                await adminSupabase.auth.admin.updateUserById(editId, {
                    user_metadata: { role: role, full_name: payload.full_name }
                });

                const { error } = await supabase.from('profiles').update(payload).eq('id', editId);
                if (error) throw error;
            } else {
                const { data: authData, error: authError } = await adminSupabase.auth.admin.createUser({
                    email: email,
                    password: role === 'student' ? identifier : 'Gctu@2026', // Default for admins
                    email_confirm: true,
                    user_metadata: { role: role, full_name: payload.full_name }
                });

                if (authError) throw authError;

                const { error: profileError } = await supabase.from('profiles').insert([{
                    id: authData.user.id,
                    ...payload
                }]);

                if (profileError) throw profileError;
            }

            modal.classList.add('hidden');
            await Modal.confirm("Success", "Account synchronized successfully.", "OK", "green");
            loadStudents();

        } catch (err) {
            await Modal.confirm("Error", err.message, "OK", "red");
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerText = "Save User";
        }
    });
}

// --- PART 3: CSV IMPORT LOGIC (UPDATED FOR AUTH CREATION) ---
function initImporter() {
    const fileInput = document.getElementById('csvInput');
    const importBtn = document.getElementById('importBtn');

    document.getElementById('dropZone').addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            const file = e.target.files[0];
            document.getElementById('fileLabel').innerText = `✅ ${file.name}`;
            importBtn.disabled = false;
            importBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            importBtn.onclick = () => processCSV(file);
        }
    });
}

async function processCSV(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target.result;
        const rows = text.split('\n').filter(row => row.trim() !== '');
        rows.shift();

        const btn = document.getElementById('importBtn');
        btn.innerText = "⏳ Creating Accounts...";
        btn.disabled = true;

        let successCount = 0;
        let failCount = 0;

        for (const line of rows) {
            const cols = line.split(',');
            if (cols.length < 4) continue;

            const surname = cols[0]?.trim();
            const firstName = cols[1]?.trim();
            const otherNames = cols[2]?.trim();
            const indexNumber = cols[4]?.trim() || cols[3]?.trim();
            const email = `${indexNumber}@live.gctu.edu.gh`;

            try {
                // 1. Create Auth
                const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
                    email: email,
                    password: indexNumber,
                    email_confirm: true,
                    user_metadata: { role: 'student', full_name: `${firstName} ${surname}` }
                });

                if (authErr) {
                    if (!authErr.message.includes('already registered')) throw authErr;
                }

                // 2. Upsert Profile
                const profilePayload = {
                    surname,
                    first_name: firstName,
                    other_names: otherNames,
                    index_number: indexNumber,
                    role: 'student',
                    status: 'Active'
                };

                if (authData?.user) profilePayload.id = authData.user.id;

                await supabase.from('profiles').upsert([profilePayload], { onConflict: 'index_number' });
                successCount++;
            } catch (err) {
                console.error(`Failed ${indexNumber}:`, err.message);
                failCount++;
            }
        }

        await Modal.confirm("Import Complete", `Processed ${successCount} accounts. ${failCount} errors.`, "Done", "blue");
        loadStudents();
        btn.innerText = "🚀 Process Import";
    };
    reader.readAsText(file);
}

// --- PART 4: LOAD, SORT, RENDER ---
async function loadStudents() {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="p-8 text-center text-gray-400">Loading...</td></tr>';

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student')
        .order('surname', { ascending: true });

    if (error) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-red-500">Error loading data</td></tr>';
        return;
    }

    allStudents = data;
    document.getElementById('totalCount').innerText = data.length;
    renderTable(allStudents);

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.removeEventListener('input', applyFilterAndSort);
        searchInput.addEventListener('input', applyFilterAndSort);
    }
}

// --- PART 5: TABLE ACTIONS ---
window.deleteStudent = async (id) => {
    const confirmed = await Modal.confirm(
        "Permanent Deletion?",
        "This will delete the student's profile AND their login account. They will no longer be able to sign in.",
        "Yes, Delete Everything",
        "red"
    );

    if (confirmed) {
        try {
            const { error: authError } = await adminSupabase.auth.admin.deleteUser(id);

            if (authError) {
                console.error("Auth Deletion Error:", authError.message);
            }
            const { error: profileError } = await supabase
                .from('profiles')
                .delete()
                .eq('id', id);

            if (profileError) throw profileError;

            await Modal.confirm("Deleted", "Student and Auth account removed.", "OK", "green");
            loadStudents();

        } catch (err) {
            Modal.confirm("Deletion Failed", err.message, "OK", "red");
        }
    }
};

window.sortStudents = (column) => {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    applyFilterAndSort();
};

function applyFilterAndSort() {
    const term = document.getElementById('searchInput').value.toLowerCase().trim();

    const filtered = allStudents.filter(s =>
        (s.surname?.toLowerCase().includes(term)) ||
        (s.first_name?.toLowerCase().includes(term)) ||
        (s.index_number?.toString().includes(term))
    );

    filtered.sort((a, b) => {
        const valA = (a[currentSort.column] || '').toString().toLowerCase();
        const valB = (b[currentSort.column] || '').toString().toLowerCase();
        return currentSort.direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
    });

    renderTable(filtered);
}

function renderTable(students) {
    const tbody = document.getElementById('studentTableBody');
    tbody.innerHTML = students.map(s => {
        const isOnline = onlineUsers.has(s.index_number.toString());
        const onlineIndicator = isOnline ? '<span class="w-2.5 h-2.5 bg-green-500 rounded-full inline-block mr-2 animate-pulse"></span>' : '';

        return `
        <tr class="hover:bg-gray-50 border-b transition">
            <td class="p-4 font-bold text-gray-700 flex items-center">${onlineIndicator} ${s.surname}</td>
            <td class="p-4">${s.first_name}</td>
            <td class="p-4 text-gray-500">${s.other_names || '-'}</td>
            <td class="p-4 text-center">${s.gender || '-'}</td>
            <td class="p-4 font-mono text-xs text-gctu-blue font-bold">${s.index_number}</td>
            <td class="p-4">${s.status}</td>
            <td class="p-4 text-right flex justify-end gap-2">
                <button onclick="editStudent('${encodeURIComponent(JSON.stringify(s))}')" class="hover:scale-110">✏️</button>
                <button onclick="deleteStudent('${s.id}')" class="hover:scale-110">🗑️</button>
            </td>
        </tr>
    `}).join('');
}

function formatName(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ').trim();
}