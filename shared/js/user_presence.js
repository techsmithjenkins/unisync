import supabase from './supabase_client.js';

export async function broadcastPresence(indexNumber) {
    if (!indexNumber) return;

    const channel = supabase.channel('online_users');

    channel.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
            // Send the signal immediately
            await channel.track({ 
                user: indexNumber, 
                online_at: new Date().toISOString() 
            });
            console.log(`🟢 Presence Active: ${indexNumber}`);
        }
    });
}