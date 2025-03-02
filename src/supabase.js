// Initialize the Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Function to get public URL for a file in storage
function getPublicUrl(bucket, path) {
    return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

// Function to fetch all templates
export async function fetchAllTemplates() {
    try {
        const { data, error } = await supabase
            .from('templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching templates:', error);
            return [];
        }

        // The paths in the database are already complete URLs
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




