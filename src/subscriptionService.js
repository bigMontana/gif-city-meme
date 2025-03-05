import { supabase } from './supabase.js';
import { DEFAULT_USER_SETTINGS } from './constants.js';

export const subscriptionService = {
    // Get user's current account info
    async getUserAccount(userId) {
        const { data: user, error } = await supabase
            .from('users')
            .select('face_count, stored_meme_quota, stored_meme_count, meme_storage_enabled')
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        return user;
    },

    // Check if user can store more memes
    async canStoreMeme(userId) {
        const user = await this.getUserAccount(userId);
        return user.meme_storage_enabled && user.stored_meme_count < user.stored_meme_quota;
    },

    // You can remove updatePaidStatus or modify it to simply reset user settings
    // For example:
    async resetUserSettings(userId) {
        const now = new Date().toISOString();
        
        const { data, error } = await supabase
            .from('users')
            .update({
                meme_storage_enabled: DEFAULT_USER_SETTINGS.meme_storage_enabled,
                stored_meme_quota: DEFAULT_USER_SETTINGS.stored_meme_quota,
                last_updated_at: now
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    },

    // Increment face count for user
    async incrementFaceCount(userId) {
        const { data, error } = await supabase
            .from('users')
            .update({
                face_count: supabase.raw('face_count + 1'),
                last_updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    },

    // Increment stored meme count for user
    async incrementStoredMemeCount(userId) {
        const { data, error } = await supabase
            .from('users')
            .update({
                stored_meme_count: supabase.raw('stored_meme_count + 1'),
                last_updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    }
}; 