import supabase from '../../../shared/js/supabase_client.js';

document.addEventListener('DOMContentLoaded', async () => {
    updateDate();
    loadWelcomeMessage();
});

function updateDate() {
    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    document.getElementById('currentDate').innerText = new Date().toLocaleDateString('en-US', options);
}

async function loadWelcomeMessage() {
    const indexNumber = localStorage.getItem('user_index');
    if (!indexNumber) return;

    // Fetch just the first name for the "Welcome, [Name]" banner
    const { data, error } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('index_number', indexNumber)
        .single();

    if (data) {
        document.getElementById('welcomeName').innerText = `Welcome back, ${data.first_name}!`;
    }
}