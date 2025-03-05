import { supabase } from './supabase.js';
import { SUBSCRIPTION_TIERS, TIER_LIMITS } from './constants.js';

// Helper function to initialize user data
async function initializeUserData(userId, email, username = null) {
    const tierLimits = TIER_LIMITS[SUBSCRIPTION_TIERS.FREE];
    const now = new Date().toISOString();

    try {
        // Prepare the user data object
        const userData = {
            id: userId,
            email: email,
            username: username || email.split('@')[0],
            created_at: now,
            last_login_at: now,
            face_count: 0,
            meme_storage_enabled: tierLimits.meme_storage_enabled,
            stored_meme_quota: tierLimits.stored_meme_quota,
            stored_meme_count: 0,
            is_paid: false,
            last_updated_at: now
        };

        // Use upsert instead of insert to handle both insert and update cases
        const { data, error } = await supabase
            .from('users')
            .upsert(userData, { 
                onConflict: 'id', // This is the column to check for conflicts
                returning: 'minimal' // Don't need to return the whole object
            });

        if (error) {
            console.error('Error in upsert operation:', error);
            console.log('Error details:', JSON.stringify(error));
            throw error;
        }

        console.log('User data saved successfully');
        return { success: true };
    } catch (error) {
        console.error('Exception in initializeUserData:', error);
        // Try a more direct approach if the standard approach fails
        try {
            console.log('Attempting alternative approach...');
            // Try a direct RPC call if available
            const { data, error } = await supabase.rpc('create_user_profile', {
                user_id: userId,
                user_email: email,
                user_name: username || email.split('@')[0]
            });
            
            if (error) throw error;
            console.log('User created through RPC');
            return { success: true };
        } catch (rpcError) {
            console.error('RPC fallback also failed:', rpcError);
            throw error; // Throw the original error
        }
    }
}

// Make sure to export this function
export { initializeUserData };

export const auth = {
    // Sign up with email and password
    async signUp(email, password, username = null) {
        try {
            // Get the current site URL to use as the redirect URL
            const redirectTo = window.location.origin;
            
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: redirectTo,
                    data: {
                        username: username || email.split('@')[0]
                    }
                }
            });

            if (error) throw error;

            // Just return the authentication result
            return { data, error: null };
        } catch (error) {
            console.error('Error in signUp:', error);
            return { data: null, error };
        }
    },

    // Sign in with email and password
    async signIn(email, password, rememberMe = true) {
        // Configure session lifetime based on rememberMe flag
        const sessionOptions = {
            // If rememberMe is true, session lasts for 30 days, otherwise 1 hour
            expiresIn: rememberMe ? 60 * 60 * 24 * 30 : 60 * 60
        };

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
            options: sessionOptions
        });

        if (!error && data.user) {
            // Update last login timestamp
            const now = new Date().toISOString();
            const { error: updateError } = await supabase
                .from('users')
                .update({ last_login_at: now })
                .eq('id', data.user.id);

            if (updateError) {
                console.error('Error updating last login:', updateError);
            }
        }

        return { data, error };
    },

    // Sign in with OAuth provider (e.g., Google, GitHub)
    async signInWithProvider(provider) {
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
        });

        return { data, error };
    },

    // Sign out
    async signOut() {
        const { error } = await supabase.auth.signOut();
        return { error };
    },

    // Get current session
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        return { session, error };
    },

    // Get current user
    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        return { user, error };
    },

    // Listen to auth changes
    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                if (session?.user) {
                    // Check if user exists in our users table
                    const { data: existingUser } = await supabase
                        .from('users')
                        .select('id')
                        .eq('id', session.user.id)
                        .single();

                    // If user doesn't exist in our table, initialize them
                    if (!existingUser) {
                        try {
                            await initializeUserData(
                                session.user.id,
                                session.user.email,
                                session.user.user_metadata?.username
                            );
                        } catch (error) {
                            console.error('Error initializing user data:', error);
                        }
                    }
                }
            }
            callback(event, session);
        });
    },

    // Require authentication
    async requireAuth() {
        const { session, error } = await this.getSession();
        if (!session) {
            // Redirect to login or show auth modal
            const authModal = document.getElementById('authModal');
            if (authModal) {
                authModal.style.display = 'block';
            }
            throw new Error('Authentication required');
        }
        return session.user;
    }
}; 