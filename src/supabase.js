// Initialize the Supabase client with Worker URL during development
const supabaseUrl = import.meta.env.DEV 
  ? 'http://127.0.0.1:8787'  // Local development (Cloudflare Worker)
  : import.meta.env.VITE_SUPABASE_URL;

const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyY3lpZXpsd3V0Zmp2Zmtsa2dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNTQ1MjQsImV4cCI6MjA1NjczMDUyNH0.hlL8QRmt-efTiwcSZ_P3NfnWq8INKU7o0-3gTQt3prA';

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
    const { data } = supabase.storage.from(bucket).getPublicUrl(path, {
        transform: {
            mode: 'cors',
        }
    });
    return data.publicUrl;
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

// Function to upload user face
export const uploadUserFace = async (userID, file) => {
    try {
        const filePath = `${userID}/${file.name}`;
        // Upload the file to the 'user_faces2' bucket
        const { data: uploadData, error: uploadError } = await supabase
            .storage
            .from('user_faces2')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true // Changed to true to allow replacing existing files
            });

        if (uploadError) {
            console.error('Failed to upload file:', uploadError);
            throw uploadError;
        }

        console.log('File uploaded successfully:', uploadData);
        
        // Get the public URL using the storage API directly
        const { data } = supabase.storage.from('user_faces2').getPublicUrl(filePath);
        return data.publicUrl;
        
    } catch (error) {
        console.error('Error uploading file:', error);
        throw error;
    }
}

// Function to get user saved faces
export const getUserSavedFaces = async (userID) => {
    try {
        const { data, error } = await supabase
            .from('user_faces')
            .select('*')
            .eq('user_id', userID);

        if (error) {
            console.error('Error fetching user saved faces:', error);
            return [];
        }
        
        return data;
    } catch (error) {
        console.error('Error fetching user saved faces:', error);
        throw error;
    }
}

// Function to create a new user face
export const createUserFace = async (userID, facePath, faceNumber) => {
    try {
        // If facePath is an object with the publicUrl structure, extract just the URL
        const actualPath = typeof facePath === 'object' && facePath.data?.publicUrl 
            ? facePath.data.publicUrl 
            : facePath;

        const { data, error } = await supabase
            .from('user_faces')
            .insert({
                user_id: userID,
                face_path: actualPath,  // Store just the URL string
                face_number: faceNumber
            });

        if (error) {
            console.error('Error creating user face:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creating user face:', error);
        throw error;
    }
}

//function to remove a row from the user_faces table and delete the file from the user_faces2 bucket
export const removeUserFace = async (userID, faceNumber) => {
    try {
        // First, fetch the face_path from the user_faces table
        const { data: faceData, error: faceError } = await supabase
            .from('user_faces')
            .select('face_path')
            .eq('user_id', userID)
            .eq('face_number', faceNumber)
            .single();

        if (faceError) {
            console.error('Error fetching face path:', faceError);
            throw faceError;
        }

        if (!faceData?.face_path) {
            console.error('Face path not found for user ID:', userID, 'and face number:', faceNumber);
            return;
        }

        // Extract the file path from the URL
        const fullPath = faceData.face_path;
        const pathParts = fullPath.split('/user_faces2/');
        const filePath = pathParts[1];

        if (!filePath) {
            console.error('Could not extract file path from URL:', fullPath);
            return;
        }

        // Remove the image from the user_faces2 storage bucket
        const { error: storageError } = await supabase
            .storage
            .from('user_faces2')
            .remove([filePath]);

        if (storageError) {
            console.error('Error removing face image:', storageError);
            throw storageError;
        }

        // Remove the face from the user_faces table
        const { error: deleteError } = await supabase
            .from('user_faces')
            .delete()
            .eq('user_id', userID)
            .eq('face_number', faceNumber);

        if (deleteError) {
            console.error('Error removing user face:', deleteError);
            throw deleteError;
        }

        console.log('User face removed successfully:', userID, faceNumber);
    } catch (error) {
        console.error('Error removing user face:', error);
        throw error;
    }
}









