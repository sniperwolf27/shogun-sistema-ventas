/**
 * CONFIG - Global configuration
 * Script clásico (NO module) - usado por backoffice y login
 */

window.API_BASE = window.location.origin + '/api';

window.SUPABASE_URL = 'https://namjhrpumgywarhjxjxx.supabase.co';
window.SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hbWpocnB1bWd5d2FyaGp4anh4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA2MDM2MDEsImV4cCI6MjA4NjE3OTYwMX0.-9LcDZxjKyT-J7MvAZOPWa0dMNEzmkKb3i6MhFsYaHI';

window.initSupabase = function() {
    if (window._supabaseClient) return window._supabaseClient;
    if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
        console.error('[Config] Supabase SDK not loaded');
        return null;
    }
    window._supabaseClient = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
    return window._supabaseClient;
};

window.getSupabase = function() {
    return window._supabaseClient || window.initSupabase();
};
