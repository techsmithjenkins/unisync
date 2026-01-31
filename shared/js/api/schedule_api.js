import supabase from '../supabase_client.js';

export const scheduleAPI = {

    /**
     * Get today's active classes count dynamically.
     * Automatically detects the current day and queries the database.
     */
    getTodayClassCount: async () => {
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const todayName = days[new Date().getDay()]; 

        const { count, error } = await supabase
            .from('weekly_schedule') 
            .select('*', { count: 'exact', head: true })
            .eq('day', todayName);

        if (error) {
            console.error("Error counting classes:", error);
            return 0;
        }
        
        return count || 0;
    },

    /**
     * Fetch full schedule for a specific day string.
     * @param {string} dayName - e.g., 'Monday'
     */
    getScheduleByDay: async (dayName) => {
        const { data, error } = await supabase
            .from('weekly_schedule') 
            .select('*')
            .eq('day', dayName)
            .order('start_time', { ascending: true });

        if (error) {
            console.error("Error fetching schedule:", error);
            return [];
        }
        return data;
    }
};