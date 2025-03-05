export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    PREMIUM: 'premium'
};

export const TIER_LIMITS = {
    free: {
        meme_storage_enabled: true,
        stored_meme_quota: 50
    },
    premium: {
        meme_storage_enabled: true,
        stored_meme_quota: 250
    }
};

export const DEFAULT_USER_SETTINGS = {
    meme_storage_enabled: true,  // Enable storage for all users
    stored_meme_quota: 50        // Set a default quota for all users
}; 