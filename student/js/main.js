import { broadcastPresence } from '../../shared/js/user_presence.js'; // Adjust path as needed

document.addEventListener('DOMContentLoaded', () => {
    // 1. Get the logged-in user's index from Local Storage
    const userIndex = localStorage.getItem('user_index'); // Or 'user_index_number'

    if (userIndex) {
        // 2. Start Broadcasting!
        broadcastPresence(userIndex);
    }
});