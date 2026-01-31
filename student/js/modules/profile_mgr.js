import supabase from '../../../shared/js/supabase_client.js';
import { authAPI } from '../../../shared/js/api/auth_api.js';
import { initTheme, toggleTheme } from '../../../shared/js/theme_mgr.js';

const getToast = () => {
    const isDark = document.body.classList.contains('dark-mode');
    return Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        background: isDark ? '#1e293b' : '#fff',
        color: isDark ? '#f8fafc' : '#545454',
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer)
            toast.addEventListener('mouseleave', Swal.resumeTimer)
        }
    });
};

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    await loadProfileData();
    setupActions();

    const statusLabel = document.getElementById('darkModeStatus');
    if (statusLabel) {
        statusLabel.innerText = document.body.classList.contains('dark-mode') ? 'ON' : 'OFF';
    }
});

async function loadProfileData() {
    const indexNumber = localStorage.getItem('user_index');
    if (!indexNumber) {
        window.location.href = '../index.html';
        return;
    }

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

    if (student) {
        const fullName = `${student.first_name} ${student.other_names || ''} ${student.surname}`;
        document.getElementById('profileName').innerText = fullName;
        document.getElementById('profileIndex').innerText = student.index_number;

        const initials = (student.first_name[0] + (student.surname ? student.surname[0] : '')).toUpperCase();
        document.getElementById('profileInitials').innerText = initials;

        const statusEl = document.getElementById('profileStatus');
        const currentStatus = student.status || 'Active';
        statusEl.innerText = currentStatus;

        statusEl.className = currentStatus === 'Active'
            ? "bg-green-50 text-green-600 text-xs font-bold px-3 py-1 rounded-full border border-green-100"
            : "bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full border border-red-100";
    }
}

function setupActions() {
    const changePasswordRow = document.getElementById('changePasswordRow');
    const appearanceRow = document.getElementById('appearanceRow');

    changePasswordRow?.addEventListener('click', async () => {
        const { data: { user } } = await supabase.auth.getUser();

        const result = await Swal.fire({
            title: 'Reset Password?',
            text: `We will send a secure reset link to ${user.email}`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#002147',
            confirmButtonText: 'Send Link',
            cancelButtonColor: '#d33'
        });

        if (result.isConfirmed) {
            const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
                redirectTo: window.location.origin + '/reset-password.html',
            });

            if (error) {
                Swal.fire('Error', error.message, 'error');
            } else {
                Toast.fire({
                    icon: 'success',
                    title: 'Reset link sent to your email!'
                });
            }
        }
    });

    appearanceRow?.addEventListener('click', () => {
        const isDark = toggleTheme();
        const statusLabel = document.getElementById('darkModeStatus');
        if (statusLabel) statusLabel.innerText = isDark ? 'ON' : 'OFF';

        getToast().fire({
            icon: 'info',
            title: `Appearance set to ${isDark ? 'Dark' : 'Light'} Mode`
        });
    });

}