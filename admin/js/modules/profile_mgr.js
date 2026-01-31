import CONFIG from '../../../shared/js/config.js';
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import supabase from '../../../shared/js/supabase_client.js';
import { Modal } from '../components/modal_system.js';

const adminSupabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_SERVICE_KEY);

document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
    setupProfileForm();
    setupPromotionTool();
});

// --- 1. FETCH & DISPLAY DATA ---
async function loadProfileData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = '../index.html'; 
        return;
    }

    // A. Display Email (Read-Only)
    const emailField = document.getElementById('adminEmail');
    if (emailField) emailField.value = user.email;

    // B. Display Metadata (With Gender & Hero Name)
    const meta = user.user_metadata || {};
    const savedGender = meta.gender || 'male';

    const nameField = document.getElementById('fullName');
    const phoneField = document.getElementById('phone');
    if (nameField) nameField.value = meta.full_name || '';
    if (phoneField) phoneField.value = meta.phone || '';
    
    // Set Gender & Hero Text
    const genderInput = document.getElementById('gender');
    if (genderInput) genderInput.value = savedGender;
    
    const heroName = document.getElementById('heroName');
    if (heroName) heroName.innerText = meta.full_name || 'Welcome, Admin';

    // Sync Avatar Immediately
    if (window.updateAvatarDisplay) {
        window.updateAvatarDisplay(savedGender);
    }
}

// --- 2. SAVE PERSONAL INFO (Metadata) ---
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    const btn = document.getElementById('saveProfileBtn');

    if (!form || !btn) return; 

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const gender = document.getElementById('gender').value;

        // UI Loading State
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

            await Modal.confirm("Success", "Profile updated successfully!", "OK", "green");

        } catch (err) {
            console.error(err);
            await Modal.confirm("Error", "Could not save profile: " + err.message, "OK", "red");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// --- 3. ADMIN PROMOTION TOOL ---
function setupPromotionTool() {
    const btn = document.getElementById('promoteBtn');
    const logBox = document.getElementById('logs');
    const indexInput = document.getElementById('indexList');

    if (!btn || !logBox) return;

    function log(msg, isError = false) {
        const color = isError ? 'text-red-400' : 'text-green-400';
        logBox.innerHTML += `<div class="${color}">> ${msg}</div>`;
        logBox.scrollTop = logBox.scrollHeight;
    }

    btn.onclick = async () => {
        const input = indexInput.value;
        const indices = input.split(',').map(i => i.trim()).filter(i => i !== "");

        if (indices.length === 0) {
            log("Error: No index numbers provided.", true);
            return;
        }

        const confirmed = await Modal.confirm(
            "Security Action", 
            `Grant Admin access to ${indices.length} user(s)?`, 
            "Execute", 
            "red"
        );

        if (!confirmed) return;

        btn.disabled = true;
        const originalBtnText = btn.innerHTML;
        btn.innerText = "Processing...";
        log(`Initiating promotion for ${indices.length} users...`);

        for (const index of indices) {
            const email = `${index}@live.gctu.edu.gh`;
            log(`Searching for ${email}...`);

            try {
                // Find User via Service Role Client
                const { data: { users }, error: listError } = await adminSupabase.auth.admin.listUsers();
                if (listError) throw listError;

                const targetUser = users.find(u => u.email === email);

                if (!targetUser) {
                    log(`ERROR: ${index} not found in database.`, true);
                    continue;
                }

                // Update Auth Role
                const { error: authError } = await adminSupabase.auth.admin.updateUserById(
                    targetUser.id,
                    { user_metadata: { ...targetUser.user_metadata, role: 'admin' } }
                );
                if (authError) throw authError;

                // Sync Role in Public Profiles Table
                const { error: dbError } = await adminSupabase
                    .from('profiles')
                    .update({ role: 'admin' })
                    .eq('id', targetUser.id);
                if (dbError) throw dbError;

                log(`SUCCESS: ${index} is now an Admin.`);

            } catch (err) {
                log(`FAILED ${index}: ${err.message}`, true);
            }
        }

        btn.disabled = false;
        btn.innerHTML = originalBtnText;
        indexInput.value = ""; 
        log("=== PROCESS COMPLETE ===");
    };
}