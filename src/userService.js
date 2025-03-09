import { supabase } from './supabase.js';

// Create a simple event system for user data updates
const userEvents = new EventTarget();

// Cache for user data
let userCache = null;

export const userService = {
    // Event to listen for user data changes
    USER_UPDATED: 'user_updated',
    
    // Get user data with optional force refresh
    async getUserData(userId, forceRefresh = false) {
        // Return cached data if available and not forcing refresh
        if (userCache && !forceRefresh) {
            return userCache;
        }
        
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();
                
            if (error) throw error;
            
            // Update cache
            userCache = data;
            
            // Dispatch event that user data has been updated
            userEvents.dispatchEvent(new CustomEvent(this.USER_UPDATED, { 
                detail: { userData: data } 
            }));
            
            return data;
        } catch (error) {
            console.error('Error fetching user data:', error);
            return null;
        }
    },
    
    // Update user credits (for when credits are spent or added)
    async updateUserCredits(userId, newCreditAmount) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ credits: newCreditAmount })
                .eq('id', userId)
                .select()
                .single();
                
            if (error) throw error;
            
            // Update cache
            userCache = data;
            
            // Dispatch event that user data has been updated
            userEvents.dispatchEvent(new CustomEvent(this.USER_UPDATED, { 
                detail: { userData: data } 
            }));
            
            return data;
        } catch (error) {
            console.error('Error updating user credits:', error);
            return null;
        }
    },
    
    // Add credits to user account
    async addCredits(userId, creditsToAdd) {
        // First get current credits
        const userData = await this.getUserData(userId, true);
        if (!userData) return null;
        
        const currentCredits = userData.credits || 0;
        const newCreditAmount = currentCredits + creditsToAdd;
        
        return this.updateUserCredits(userId, newCreditAmount);
    },
    
    // Subtract credits from user account
    async useCredits(userId, creditsToUse) {
        // First get current credits
        const userData = await this.getUserData(userId, true);
        if (!userData) return null;
        
        const currentCredits = userData.credits || 0;
        
        // Check if user has enough credits
        if (currentCredits < creditsToUse) {
            return { success: false, message: 'Not enough credits' };
        }
        
        const newCreditAmount = currentCredits - creditsToUse;
        const result = await this.updateUserCredits(userId, newCreditAmount);
        
        return { success: true, userData: result };
    },
    
    // Subscribe to user data changes
    onUserUpdate(callback) {
        userEvents.addEventListener(this.USER_UPDATED, (event) => {
            callback(event.detail.userData);
        });
    },
    
    // Clear cache (useful for logout)
    clearCache() {
        userCache = null;
    },
    
    // Update user face slots
    async updateUserFaceSlots(userId, newFaceSlotsAmount) {
        try {
            const { data, error } = await supabase
                .from('users')
                .update({ face_count: newFaceSlotsAmount })
                .eq('id', userId)
                .select()
                .single();
                
            if (error) throw error;
            
            // Update cache
            userCache = data;
            
            // Dispatch event that user data has been updated
            userEvents.dispatchEvent(new CustomEvent(this.USER_UPDATED, { 
                detail: { userData: data } 
            }));
            
            return data;
        } catch (error) {
            console.error('Error updating user face slots:', error);
            return null;
        }
    },

    // Get face_count from user table
    async getFaceCount(userId) {
        const { data, error } = await supabase
            .from('users')
            .select('face_count')
            .eq('id', userId)
            .single();

        if (error) throw error;
        return data.face_count;
    },

    async uploadFaceToSupabase(userId, file, slotIndex) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            // Create file path
            const filePath = `${userId}/${slotIndex}.png`;
            
            // First, ensure we have a valid auth session
            const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError || !sessionData.session) {
                console.error('Authentication error:', sessionError);
                throw new Error('Authentication failed: ' + (sessionError?.message || 'No active session'));
            }
            
            // Add detailed logging
            console.log('DEBUG - Storage Upload Details:', { 
                userId, 
                filePath,
                authUID: sessionData.session.user.id,
                matches: sessionData.session.user.id === userId
            });
            
            // Verify the authenticated user matches the requested user ID
            if (sessionData.session.user.id !== userId) {
                console.warn('Warning: Authenticated user ID does not match target user ID');
                // Optionally throw an error here if this is a security concern
            }
            
            console.log('Attempting to upload file:', { bucket: 'user_faces2', filePath });
            
            // Prepare the file as a proper Blob
            let fileBlob;
            
            if (file instanceof Blob) {
                fileBlob = new Blob([file], { type: 'image/png' });
            } else if (file instanceof File) {
                fileBlob = new Blob([await file.arrayBuffer()], { type: 'image/png' });
            } else {
                throw new Error('Invalid file type: must be File or Blob');
            }
            
            // Create a retry mechanism for the upload
            let retries = 0;
            const maxRetries = 3;
            let uploadResult = null;
            
            while (retries < maxRetries) {
                try {
                    console.log(`Upload attempt ${retries + 1} of ${maxRetries}...`);
                    
                    // Use the supabase instance with the current session
                    const { data, error } = await supabase.storage
                        .from('user_faces2')
                        .upload(filePath, fileBlob, {
                            cacheControl: '3600',
                            upsert: true
                        });
                    
                    if (error) {
                        console.warn(`Upload attempt ${retries + 1} failed:`, error);
                        throw error;
                    }
                    
                    // Upload succeeded
                    uploadResult = data;
                    console.log('Upload successful:', data);
                    break;
                    
                } catch (error) {
                    retries++;
                    
                    // If we've exhausted all retries, rethrow the error
                    if (retries >= maxRetries) {
                        console.error('All upload attempts failed');
                        throw error;
                    }
                    
                    // Add a small delay before retrying
                    console.log(`Retrying in ${retries * 1000}ms...`);
                    await new Promise(resolve => setTimeout(resolve, retries * 1000));
                }
            }
            
            // If we made it here, the upload was successful
            // Get the public URL for the uploaded file
            const { data: urlData } = supabase.storage
                .from('user_faces22')
                .getPublicUrl(filePath);
                
            return {
                ...uploadResult,
                publicUrl: urlData?.publicUrl
            };
            
        } catch (error) {
            // Comprehensive error handling with more details
            console.error('File upload failed with error:', error);
            
            // Enhance the error message with useful details
            let errorMessage = 'Error uploading image: ';
            
            if (error.message?.includes('Failed to fetch')) {
                errorMessage += 'Network connection issue. Check your internet connection or try again later.';
                console.error('This appears to be a network connectivity issue.');
            } else if (error.statusCode === 403) {
                errorMessage += 'Permission denied. You may not have permission to upload to this location.';
            } else if (error.statusCode === 413) {
                errorMessage += 'File too large. Please use a smaller image.';
            } else {
                errorMessage += error.message || 'Unknown error';
            }
            
            // Create an enhanced error object
            const enhancedError = new Error(errorMessage);
            enhancedError.originalError = error;
            throw enhancedError;
        }
    },

    // Add a new function to get auth session from auth.js
    async getAuthSession() {
        try {
            // Import auth module if needed
            let authModule;
            try {
                authModule = await import('./auth.js');
            } catch (error) {
                console.error('Error importing auth module:', error);
                // Fallback to direct Supabase call if can't import auth
                return await supabase.auth.getSession();
            }

            // Use the auth module's getSession function
            return await authModule.auth.getSession();
        } catch (error) {
            console.error('Error getting auth session:', error);
            throw error;
        }
    },

    // Add a function that uses the proper authentication for upload
    async authenticatedUploadFace(userId, file, slotIndex) {
        try {
            if (!userId) {
                throw new Error('User ID is required');
            }
            
            // Get session using our new function that uses auth.js
            const { session, error: sessionError } = await this.getAuthSession();
            
            if (sessionError || !session) {
                throw new Error('Authentication failed: No active session');
            }
            
            // Create file path
            const filePath = `${userId}/${slotIndex}.png`;
            
            // Log details for debugging
            console.log('Authentication confirmed. Upload details:', {
                userId,
                filePath,
                sessionUserId: session.user.id,
                accessToken: !!session.access_token
            });
            
            // Process the file
            let fileBlob;
            if (file instanceof Blob) {
                fileBlob = new Blob([file], { type: 'image/png' });
            } else if (file instanceof File) {
                fileBlob = new Blob([await file.arrayBuffer()], { type: 'image/png' });
            } else {
                throw new Error('Invalid file type: must be File or Blob');
            }
            
            // Get the Supabase URL and key
            const supabaseUrl = supabase.supabaseUrl;
            const supabaseKey = supabase.supabaseKey;
            
            console.log('Using Supabase API at:', supabaseUrl);
            
            // Create a formData object to hold the file
            const formData = new FormData();
            formData.append('file', fileBlob, 'image.png');
            
            // First try - using the session token
            try {
                console.log('Attempting upload with user session token...');
                
                const response = await fetch(`${supabaseUrl}/storage/v1/object/user_faces2/${filePath}`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    },
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Upload successful with user token:', data);
                    
                    const publicUrl = `${supabaseUrl}/storage/v1/object/public/user_faces2/${filePath}`;
                    return {
                        success: true,
                        data,
                        publicUrl
                    };
                } else {
                    const errorText = await response.text();
                    console.warn('User token upload failed:', errorText);
                    // Continue to next method if this fails
                }
            } catch (userTokenError) {
                console.warn('Error using user token:', userTokenError);
            }
            
            // Second try - using service key with URLSearchParams
            try {
                console.log('Attempting upload with service key and URL params...');
                
                // Try with URLSearchParams for compatibility with some proxies
                const url = new URL(`${supabaseUrl}/storage/v1/object/user_faces2/${filePath}`);
                url.searchParams.append('x-upsert', 'true');
                
                const response = await fetch(url.toString(), {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`
                    },
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Upload successful with service key and URL params:', data);
                    
                    const publicUrl = `${supabaseUrl}/storage/v1/object/public/user_faces2/${filePath}`;
                    return {
                        success: true,
                        data,
                        publicUrl
                    };
                } else {
                    const errorText = await response.text();
                    console.warn('Service key with URL params failed:', errorText);
                }
            } catch (serviceKeyError) {
                console.warn('Error using service key with URL params:', serviceKeyError);
            }
            
            // Third try - using direct fetch with specific content type
            try {
                console.log('Attempting direct upload with specific headers...');
                
                // Try with specific content-type header
                const response = await fetch(`${supabaseUrl}/storage/v1/object/user_faces2/${filePath}?x-upsert=true`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${supabaseKey}`,
                        'x-upsert': 'true'
                    },
                    body: formData
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('Upload successful with specific headers:', data);
                    
                    const publicUrl = `${supabaseUrl}/storage/v1/object/public/user_faces2/${filePath}`;
                    return {
                        success: true,
                        data,
                        publicUrl
                    };
                } else {
                    const errorText = await response.text();
                    console.error('All upload attempts failed. Last error:', errorText);
                    throw new Error(`Upload failed: ${errorText}`);
                }
            } catch (allMethodsError) {
                console.error('Error in final upload attempt:', allMethodsError);
                throw allMethodsError;
            }
        } catch (error) {
            console.error('Authenticated upload failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    },

    // New function to ensure bucket exists with proper permissions
    async ensureUserFacesBucketExists() {
        try {
            console.log('Checking if user_faces2 bucket exists...');
            
            // First, try to get the bucket
            const { data: bucketData, error: bucketError } = await supabase
                .storage
                .getBucket('user_faces2');
                
            // If bucket doesn't exist, create it
            if (bucketError && bucketError.code === 'PGRST116') {
                console.log('Bucket does not exist, creating it...');
                
                const { data, error } = await supabase
                    .storage
                    .createBucket('user_faces2', {
                        public: true,
                        allowedMimeTypes: ['image/png', 'image/jpeg'],
                        fileSizeLimit: 5242880 // 5MB
                    });
                    
                if (error) {
                    console.error('Failed to create bucket:', error);
                    throw error;
                }
                
                console.log('Bucket created successfully:', data);
                
                // Now, let's update RLS policies to allow authenticated users to upload files
                console.log('Setting up RLS policies for bucket...');
                
                try {
                    // Direct API call to set policies (this might require admin privileges)
                    const policyResponse = await fetch(`${supabase.supabaseUrl}/rest/v1/rpc/set_bucket_policy`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${supabase.supabaseKey}`
                        },
                        body: JSON.stringify({
                            bucket_name: 'user_faces2',
                            policy: {
                                read: true,
                                write: "authenticated"
                            }
                        })
                    });
                    
                    if (!policyResponse.ok) {
                        console.warn('Could not set bucket policy directly. This might require dashboard configuration.');
                    } else {
                        console.log('Bucket policy set successfully');
                    }
                } catch (policyError) {
                    console.warn('Failed to set policy programmatically:', policyError);
                    console.log('You may need to configure RLS policies in the Supabase dashboard');
                }
            } else {
                console.log('Bucket already exists:', bucketData);
            }
            
            return true;
        } catch (error) {
            console.error('Error ensuring bucket exists:', error);
            return false;
        }
    },

    async checkBucketConfiguration() {
        try {
            console.group('Storage Bucket Configuration Check');
            
            // Try to list the root of the bucket
            const { data, error } = await supabase
                .storage
                .from('user_faces2')
                .list();
                
            if (error) {
                console.error('Error listing bucket:', error);
                console.log('Bucket might not exist or you might not have permission to list it');
                
                // If the bucket doesn't exist, try to create it
                if (error.statusCode === 404) {
                    console.log('Attempting to create the bucket...');
                    
                    try {
                        // NOTE: This will only work if the authenticated user has permission to create buckets
                        // Most likely this will fail for normal users, but it's worth a try
                        const res = await fetch(`${supabase.supabaseUrl}/storage/v1/bucket`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${supabase.supabaseKey}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                id: 'user_faces2',
                                name: 'user_faces2',
                                public: true
                            })
                        });
                        
                        const result = await res.json();
                        console.log('Bucket creation result:', result);
                        
                        if (res.ok) {
                            console.log('Successfully created the bucket!');
                        } else {
                            console.log('Failed to create the bucket. You may need to do this in the Supabase dashboard.');
                        }
                    } catch (e) {
                        console.error('Error creating bucket:', e);
                    }
                }
            } else {
                console.log('Bucket exists and you have permission to list it!');
                console.log('Root contents:', data);
            }
            
            console.groupEnd();
            return { exists: !error || error.statusCode !== 404, contents: data };
        } catch (e) {
            console.error('Error checking bucket configuration:', e);
            return { exists: false, error: e };
        }
    }
};