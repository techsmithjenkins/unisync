import supabase from '../../../shared/js/supabase_client.js';
import { initTheme } from '../../../shared/js/theme_mgr.js';

document.addEventListener('DOMContentLoaded', async () => {
    initTheme();
    updateDate();
    loadWelcomeMessage();
});

function updateDate() {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    const dateString = new Date().toLocaleDateString('en-US', options);

    const mobileDate = document.getElementById('currentDate');
    if (mobileDate) mobileDate.innerText = dateString;

    const desktopDate = document.getElementById('desktopDate');
    if (desktopDate) desktopDate.innerText = dateString;
}

async function loadWelcomeMessage() {
    const welcomeElement = document.getElementById('welcomeName');
    if (!welcomeElement) return;

    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            console.warn("No active session found.");
            return;
        }

        let fullName = user.user_metadata?.full_name;

        if (!fullName) {
            const indexNumber = localStorage.getItem('user_index');
            
            const { data: profile, error: dbError } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', user.id)
                .maybeSingle();

            if (profile) {
                fullName = profile.full_name;
            }
        }

        if (fullName) {
            const firstName = fullName.trim().split(' ')[0];
            welcomeElement.innerText = `Welcome back, ${firstName}!`;
        } else {
            welcomeElement.innerText = `Welcome back!`;
        }

    } catch (err) {
        console.error("Error loading welcome message:", err.message);
        welcomeElement.innerText = `Welcome back!`;
    }
}