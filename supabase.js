// Remove the import and use the global supabase object from the CDN
// Initialize the Supabase client
const supabaseUrl = document.querySelector('meta[name="supabase-url"]').content;
const supabaseKey = document.querySelector('meta[name="supabase-key"]').content;
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

// For testing purposes
console.log(supabase);




