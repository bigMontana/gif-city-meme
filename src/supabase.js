// Initialize the Supabase client with Worker URL during development
const supabaseUrl = import.meta.env.DEV 
  ? 'http://127.0.0.1:8787'  // Local development (Cloudflare Worker)
  : import.meta.env.VITE_SUPABASE_URL;

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zb29zeXRmbGNzZ3VreHZyZ2NkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MDc0ODEsImV4cCI6MjA1NjI4MzQ4MX0.uWa4pNN1FltUh_HLBgi02Ei34fPhTTAg05R4DlxMwgs';

// Configure client with persistence and headers
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storageKey: 'facemememaker-auth-token',
    autoRefreshToken: true,
    localStorage: window.localStorage
  }
});

// Function to get public URL for a file in storage
function getPublicUrl(bucket, path) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

// Function to fetch all templates
export async function fetchAllTemplates() {
    try {
        console.log('Fetching from Supabase URL:', supabaseUrl);
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates:', error);
            return [];
        }

        console.log('Templates received:', data);
        
        const templatesWithUrls = data?.map(template => ({
            ...template,
            thumbnail_url: template.thumbnail_path,
            video_url: template.video_path,
            json_url: template.json_path
        })) || [];

        return templatesWithUrls;
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

// Function to fetch a template by ID
export async function fetchTemplateById(id) {
    try {
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error fetching template by ID:', error);
            return null;
        }

        if (!data) {
            console.error('No template found with ID:', id);
            return null;
        }

        // The paths in the database are already complete URLs
        return {
            ...data,
            thumbnail_url: data.thumbnail_path,
            video_url: data.video_path,
            json_url: data.json_path
        };
    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}

// Login handler
window.login = async () => {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    try {
        // Pass the session configuration with login
        const { data, error } = await auth.signIn(email, password, rememberMe);
        if (error) {
            console.error('Login error:', error);
            alert('Error logging in: ' + error.message);
        } else {
            console.log('Login successful');
            authModal.style.display = 'none';
            // The auth state listener will update the UI
        }
    } catch (error) {
        console.error('Exception during login:', error);
        alert('Error logging in: ' + error.message);
    }
};




