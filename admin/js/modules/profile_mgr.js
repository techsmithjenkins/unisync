import CONFIG from '../../../shared/js/config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import supabase from '../../../shared/js/supabase_client.js';
import { Modal } from '../components/modal_system.js';

// Admin client with Service Role Key for managing users
const adminSupabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

let selectedTargetRole = 'student'; // Default toggle state
let targetUserId = null; // Stored after "Check"

document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
    setupProfileForm();
    setupRoleToggle();
    setupUserChecker();
    setupExecutionBtn();
});

// --- 1. FETCH & DISPLAY LOGGED-IN ADMIN DATA ---
async function loadProfileData() {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const emailField = document.getElementById('adminEmail');
    if (emailField) emailField.value = user.email;

    const meta = user.user_metadata || {};
    const savedGender = meta.gender || 'male';

    const nameField = document.getElementById('fullName');
    const phoneField = document.getElementById('phone');
    if (nameField) nameField.value = meta.full_name || '';
    if (phoneField) phoneField.value = meta.phone || '';

    const genderInput = document.getElementById('gender');
    if (genderInput) genderInput.value = savedGender;

    const heroName = document.getElementById('heroName');
    if (heroName) heroName.innerText = meta.full_name || 'Welcome, Admin';

    if (window.updateAvatarDisplay) {
        window.updateAvatarDisplay(savedGender);
    }
}

// --- 2. SAVE PERSONAL INFO (Admin Self-Update) ---
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    const btn = document.getElementById('saveProfileBtn');

    if (!form || !btn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const gender = document.getElementById('gender').value;

        const originalText = btn.innerHTML;
        btn.innerHTML = `<span>Saving...</span>`;
        btn.disabled = true;

        try {
            const { error } = await supabase.auth.updateUser({
                data: {
                    full_name: fullName,
                    phone: phone,
                    gender: gender
                }
            });

            if (error) throw error;
            const heroName = document.getElementById('heroName');
            if (heroName) heroName.innerText = fullName || 'Admin User';

            await Modal.confirm("Success", "Your profile has been updated.", "OK", "green");

        } catch (err) {
            await Modal.confirm("Error", err.message, "OK", "red");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- 3. ROLE TOGGLE UI LOGIC ---
function setupRoleToggle() {
    const studentBtn = document.getElementById('setStudentMode');
    const adminBtn = document.getElementById('setAdminMode');
    const btnIcon = document.getElementById('btnIcon');

    studentBtn.onclick = () => {
        selectedTargetRole = 'student';
        studentBtn.className = "role-toggle-btn px-4 py-1.5 rounded text-[10px] font-black transition-all bg-white text-gray-800 shadow-sm";
        adminBtn.className = "role-toggle-btn px-4 py-1.5 rounded text-[10px] font-black transition-all text-gray-400";
        btnIcon.innerText = "📉";
        log("Action set to: Demote to Student.");
    };

    adminBtn.onclick = () => {
        selectedTargetRole = 'admin';
        adminBtn.className = "role-toggle-btn px-4 py-1.5 rounded text-[10px] font-black transition-all bg-white text-gray-800 shadow-sm";
        studentBtn.className = "role-toggle-btn px-4 py-1.5 rounded text-[10px] font-black transition-all text-gray-400";
        btnIcon.innerText = "🚀";
        log("Action set to: Promote to Admin.");
    };
}

// --- 4. USER STATS CHECKER ---
function setupUserChecker() {
    const checkBtn = document.getElementById('checkUserBtn');
    const indexInput = document.getElementById('targetIndex');

    checkBtn.onclick = async () => {
        const index = indexInput.value.trim();
        if(!index) return;

        const card = document.getElementById('userStatusCard');
        
        checkBtn.disabled = true;
        checkBtn.innerText = "⏳";

        try {
            const { data: profile, error: dbError } = await adminSupabase
                .from('profiles')
                .select('id, full_name, role')
                .eq('index_number', index) 
                .maybeSingle();

            if (dbError) throw dbError;

            if (!profile) {
                card.classList.add('hidden');
                log(`User ${index} was not found in the system.`, true);
                return;
            }

            const { data: { user: authUser }, error: authError } = await adminSupabase.auth.admin.getUserById(profile.id);

            if (authError || !authUser) {
                card.classList.add('hidden');
                log(`Account record for ${index} is unavailable.`, true);
                return;
            }

            targetUserId = authUser.id;

            const role = authUser.user_metadata?.role || profile.role || 'student';
            const name = authUser.user_metadata?.full_name || profile.full_name || 'Unnamed User';

            document.getElementById('statusName').innerText = name;
            document.getElementById('statusRole').innerText = `Current Role: ${role.toUpperCase()}`;
            
            const badge = document.getElementById('statusBadge');
            badge.className = `h-3 w-3 rounded-full ${role === 'admin' ? 'bg-red-500' : 'bg-green-500'}`;
            badge.classList.remove('animate-pulse');

            card.classList.remove('hidden');
            log(`Access Verified: ${name} (${index}) is active in the system.`);

        } catch (err) {
            log(`Error: Could not verify user.`, true);
        } finally {
            checkBtn.disabled = false;
            checkBtn.innerText = "🔍 CHECK";
        }
    };
}

// --- 5. EXECUTION ENGINE ---
function setupExecutionBtn() {
    const btn = document.getElementById('executeRoleBtn');

    btn.onclick = async () => {
        if (!targetUserId) {
            await Modal.confirm("Action Blocked", "Please verify a user via 'Check' first.", "OK", "red");
            return;
        }

        // --- SELF-DEMOTION FAIL-SAFE ---
        const { data: { user: currentAdmin } } = await supabase.auth.getUser();

        if (targetUserId === currentAdmin.id && selectedTargetRole === 'student') {
            log("CRITICAL: Self-demotion blocked. You cannot remove your own admin rights.", true);
            await Modal.confirm(
                "Security Alert",
                "You are attempting to demote your own account. This action is blocked to prevent permanent lockout.",
                "I Understand",
                "red"
            );
            return;
        }

        const confirmed = await Modal.confirm(
            "System Overwrite",
            `Confirm role change to ${selectedTargetRole.toUpperCase()}?`,
            "Apply Now",
            "red"
        );

        if (!confirmed) return;

        btn.disabled = true;
        const originalText = btn.innerHTML;
        btn.innerText = "Syncing with Server...";

        try {
            // 1. Update Auth Metadata via Admin API
            const { error: authErr } = await adminSupabase.auth.admin.updateUserById(
                targetUserId,
                { user_metadata: { role: selectedTargetRole } }
            );
            if (authErr) throw authErr;

            // 2. Update Public Profiles Table
            const { error: dbErr } = await adminSupabase
                .from('profiles')
                .update({ role: selectedTargetRole })
                .eq('id', targetUserId);
            if (dbErr) throw dbErr;

            log(`SUCCESS: Role for User ID ${targetUserId.substring(0, 8)}... set to ${selectedTargetRole}.`);
            await Modal.confirm("Success", `Account access updated to ${selectedTargetRole}.`, "Great", "green");

            // Reset state
            document.getElementById('userStatusCard').classList.add('hidden');
            document.getElementById('targetIndex').value = "";
            targetUserId = null;

        } catch (err) {
            log(`CRITICAL ERROR: ${err.message}`, true);
            await Modal.confirm("Process Failed", err.message, "OK", "red");
        } finally {
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    };
}

// --- LOGGING HELPER ---
function log(msg, isError = false) {
    const logBox = document.getElementById('logs');
    if (!logBox) return;
    const color = isError ? 'text-red-400' : 'text-green-400';
    logBox.innerHTML += `<div class="${color} mb-1"> ${msg}</div>`; // Removed '>'
    logBox.scrollTop = logBox.scrollHeight;
}