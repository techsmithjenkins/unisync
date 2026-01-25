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

// --- 3. CHANGE PASSWORD (STRICT SECURITY) ---
function setupPasswordForm() {
    const form = document.getElementById('passwordForm');
    const btn = document.getElementById('updatePassBtn');

    // Live Validation Visuals (Attach listener)
    const newPassInput = document.getElementById('newPassword');
    if(newPassInput) newPassInput.addEventListener('input', validatePasswordStrength);

    if (!form || !btn) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmPassword').value;
        const email = document.getElementById('adminEmail').value; 

        // A. Basic Client Checks
        if (!currentPass) return Modal.confirm("Action Required", "Please enter your current password.", "OK", "red");
        if (newPass !== confirmPass) return Modal.confirm("Mismatch", "New passwords do not match.", "OK", "red");
        
        // B. Strict Regex Eligibility Check
        // At least 8 chars, 1 Upper, 1 Number, 1 Special Char
        const strongRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!strongRegex.test(newPass)) {
            return Modal.confirm("Security Policy", "Password is too weak. Please meet all requirements listed.", "OK", "red");
        }

        // UI Loading
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span>Verifying...</span>`;
        btn.disabled = true;

        try {
            // C. RE-AUTHENTICATION (Silent Check)
            // We verify the "Old Password" by trying to sign in with it.
            const { error: verifyError } = await supabase.auth.signInWithPassword({
                email: email,
                password: currentPass
            });

            if (verifyError) {
                // GENERIC ERROR - Do not reveal it was specifically the old password
                throw new Error("Security verification failed. Please check your credentials.");
            }

            // D. UPDATE PASSWORD
            btn.innerHTML = `<span>Updating...</span>`;
            const { error: updateError } = await supabase.auth.updateUser({ 
                password: newPass 
            });

            if (updateError) throw updateError;

            // E. FORCE LOGOUT (Fresh Start)
            await Modal.confirm("Success", "Password updated securely. You must now log in with your new password.", "Log Out", "green");
            
            await supabase.auth.signOut();
            window.location.href = '../index.html';

        } catch (err) {
            console.error(err);
            // Show generic error message to user
            const displayMsg = err.message || "An unexpected error occurred.";
            await Modal.confirm("Update Failed", displayMsg, "OK", "red");
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });
}

// Helper: Visual Strength Meter
function validatePasswordStrength(e) {
    const val = e.target.value;
    updateStatus('req-len', val.length >= 8);
    updateStatus('req-up', /[A-Z]/.test(val));
    updateStatus('req-num', /\d/.test(val));
    updateStatus('req-sym', /[@$!%*?&]/.test(val));
}

function updateStatus(id, isValid) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isValid) {
        el.innerText = el.innerText.replace('🔴', '🟢');
        el.classList.replace('text-gray-400', 'text-green-600');
    } else {
        el.innerText = el.innerText.replace('🟢', '🔴');
        el.classList.replace('text-green-600', 'text-gray-400');
    }
}