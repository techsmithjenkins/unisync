import supabase from '../../../shared/js/supabase_client.js';
import { authAPI } from '../../../shared/js/api/auth_api.js';

document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
    setupLogout();
});

async function loadProfileData() {
    // 1. Get User Index from Local Storage (Saved during login)
    const indexNumber = localStorage.getItem('user_index');

    if (!indexNumber) {
        window.location.href = '../index.html'; // Redirect if no session
        return;
    }

    // 2. Fetch Student Data from Supabase
    const { data: student, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('index_number', indexNumber)
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
        document.getElementById('profileName').innerText = "Error Loading Profile";
        return;
    }

    // 3. Update the UI
    if (student) {
        // Full Name
        const fullName = `${student.first_name} ${student.other_names || ''} ${student.surname}`;
        document.getElementById('profileName').innerText = fullName;
        
        // Index Number
        document.getElementById('profileIndex').innerText = student.index_number;

        // Initials (First letter of First Name + First letter of Surname)
        const initials = (student.first_name[0] + student.surname[0]).toUpperCase();
        document.getElementById('profileInitials').innerText = initials;

        // Status Badge logic
        const statusEl = document.getElementById('profileStatus');
        statusEl.innerText = student.status || 'Unknown';
        
        if (student.status === 'Active') {
            statusEl.className = "bg-green-50 text-green-600 text-xs font-bold px-3 py-1 rounded-full border border-green-100";
        } else {
            statusEl.className = "bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-100";
        }
    }
}

function setupLogout() {
    const btn = document.getElementById('logoutBtn');
    if (btn) {
        btn.addEventListener('click', () => {
            authAPI.logout();
        });
    }
}