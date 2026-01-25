// Z:\unisync-project\shared\js\api\schedule_api.js
import supabase from '../supabase_client.js';

const DAY_MAP = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
};

export const scheduleAPI = {

    // Get today's active classes count
    getTodayClassCount: async () => {
        const todayIndex = new Date().getDay(); // Returns 0-6

        const { count, error } = await supabase
            .from('weekly_schedule') 
            .select('*', { count: 'exact', head: true })
            .eq('day_of_week', todayIndex);

        if (error) {
            console.error("Error counting classes:", error);
            return 0;
        }
        return count;
    },

    // Fetch full schedule for a specific day string (e.g., 'Monday')
    getScheduleByDay: async (dayName) => {
        // Convert "Monday" to 1
        const dayInt = DAY_MAP[dayName];

        const { data, error } = await supabase
            .from('weekly_schedule') 
            .select('*')
            .eq('day_of_week', dayInt)
            .order('start_time', { ascending: true });

        if (error) {
            console.error("Error fetching schedule:", error);
            return [];
        }
        return data;
    }
};