// Z:\unisync-project\shared\js\supabase_client.js

import CONFIG from './config.js';

// Import the Supabase SDK directly from the internet (CDN)
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);

export default supabase;