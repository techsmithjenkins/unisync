import supabase from './supabase_client.js';

export async function broadcastPresence(indexNumber) {
    if (!indexNumber) return;

    const { data: { user } } = await supabase.auth.getUser();
    const role = user?.user_metadata?.role || 'student';

    if (role !== 'student') {
        console.log(`ℹ️ Presence: Admin/Staff detected (${indexNumber}). Skipping broadcast.`);
        return;
    }

    const channel = supabase.channel('online_users');

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            // Send the signal immediately
            await channel.track({ 
                user: indexNumber, 
                online_at: new Date().toISOString() 
            });
            console.log(`🟢 Student Presence Active: ${indexNumber}`);
        }
    });
}