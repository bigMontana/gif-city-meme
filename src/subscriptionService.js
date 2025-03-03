import { supabase } from './supabase.js';
import { SUBSCRIPTION_TIERS, TIER_LIMITS } from './constants.js';

export const subscriptionService = {
    // Get user's current subscription info
    async getUserSubscription(userId) {
        const { data: user, error } = await supabase
            .from('users')
            .select('subscription_tier, subscription_start_date, subscription_end_date, face_quota, face_count, stored_meme_quota, stored_meme_count')
            .eq('id', userId)
            .single();

        if (error) {
            throw error;
        }

        return user;
    },

    // Check if user can upload more faces
    async canUploadFace(userId) {
        const user = await this.getUserSubscription(userId);
        return user.face_count < user.face_quota;
    },

    // Check if user can store more memes
    async canStoreMeme(userId) {
        const user = await this.getUserSubscription(userId);
        return user.meme_storage_enabled && user.stored_meme_count < user.stored_meme_quota;
    },

    // Update user's subscription tier
    async updateSubscriptionTier(userId, newTier) {
        if (!Object.values(SUBSCRIPTION_TIERS).includes(newTier)) {
            throw new Error('Invalid subscription tier');
        }

        const tierLimits = TIER_LIMITS[newTier];
        const now = new Date().toISOString();
        
        // For basic and premium tiers, set end date to 30 days from now
        const endDate = newTier !== SUBSCRIPTION_TIERS.FREE 
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

        const { data, error } = await supabase
            .from('users')
            .update({
                subscription_tier: newTier,
                subscription_start_date: now,
                subscription_end_date: endDate,
                face_quota: tierLimits.face_quota,
                meme_storage_enabled: tierLimits.meme_storage_enabled,
                stored_meme_quota: tierLimits.stored_meme_quota,
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
    },

    // Check if subscription is expired
    async isSubscriptionExpired(userId) {
        const user = await this.getUserSubscription(userId);
        
        if (user.subscription_tier === SUBSCRIPTION_TIERS.FREE) {
            return false;
        }

        const endDate = new Date(user.subscription_end_date);
        return endDate < new Date();
    },

    // Handle expired subscription (downgrade to FREE)
    async handleExpiredSubscription(userId) {
        if (await this.isSubscriptionExpired(userId)) {
            await this.updateSubscriptionTier(userId, SUBSCRIPTION_TIERS.FREE);
        }
    }
}; 