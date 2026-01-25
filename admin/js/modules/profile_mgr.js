import supabase from '../../../shared/js/supabase_client.js';
import { Modal } from '../components/modal_system.js';

document.addEventListener('DOMContentLoaded', () => {
    loadProfileData();
    setupProfileForm();
    setupPasswordForm();
});

// --- 1. FETCH & DISPLAY DATA ---
async function loadProfileData() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
        window.location.href = '../index.html'; // Kick out if not logged in
        return;
    }

    // A. Display Email (Read-Only)
    document.getElementById('adminEmail').value = user.email;

    // B. Display Metadata (With Gender & Hero Name)
    const meta = user.user_metadata || {};
    const savedGender = meta.gender || 'male';

    document.getElementById('fullName').value = meta.full_name || '';
    document.getElementById('phone').value = meta.phone || '';
    
    // NEW: Set Gender & Hero Text
    const genderInput = document.getElementById('gender');
    if (genderInput) genderInput.value = savedGender;
    
    const heroName = document.getElementById('heroName');
    if (heroName) heroName.innerText = meta.full_name || 'Welcome, Admin';

    // NEW: Sync Avatar Immediately
    if (window.updateAvatarDisplay) {
        window.updateAvatarDisplay(savedGender);
    }
}

// --- 2. SAVE PERSONAL INFO (Metadata) ---
function setupProfileForm() {
    const form = document.getElementById('profileForm');
    const btn = document.getElementById('saveProfileBtn');

    if (!form || !btn) return; // Guard clause

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const gender = document.getElementById('gender').value; // <--- NEW: Get Gender

        // UI Loading State
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span>Saving...</span>`;
        btn.disabled = true;

        try {
            // Update User Metadata (Including Gender)
            const { error } = await supabase.auth.updateUser({
                data: { 
                    full_name: fullName, 
                    phone: phone,
                    gender: gender // <--- NEW: Save Gender
                }
            });

            if (error) throw error;

            // NEW: Update the Big "Hero Name" instantly
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

// --- 3. CHANGE PASSWORD ---
function setupPasswordForm() {
    const form = document.getElementById('passwordForm');
    const btn = document.getElementById('updatePassBtn');

    if (!form || !btn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;

        // Validation
        if (newPass.length < 6) {
            return Modal.confirm("Weak Password", "Password must be at least 6 characters.", "OK", "red");
        }
        if (newPass !== confirmPass) {
            return Modal.confirm("Mismatch", "Passwords do not match.", "OK", "red");
        }

        // UI Loading State
        const originalText = btn.innerText;
        btn.innerText = "Updating...";
        btn.disabled = true;

        try {
            const { error } = await supabase.auth.updateUser({ 
                password: newPass 
            });

            if (error) throw error;

            await Modal.confirm("Success", "Password updated! Please login again.", "OK", "green");
            form.reset();

        } catch (err) {
            console.error(err);
            await Modal.confirm("Error", err.message, "OK", "red");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    });
}