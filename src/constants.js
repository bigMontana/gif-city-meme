export const SUBSCRIPTION_TIERS = {
    FREE: 'free',
    BASIC: 'basic',
    PREMIUM: 'premium'
};

export const TIER_LIMITS = {
    [SUBSCRIPTION_TIERS.FREE]: {
        face_quota: 3,
        meme_storage_enabled: false,
        stored_meme_quota: 0
    },
    [SUBSCRIPTION_TIERS.BASIC]: {
        face_quota: 10,
        meme_storage_enabled: true,
        stored_meme_quota: 20
    },
    [SUBSCRIPTION_TIERS.PREMIUM]: {
        face_quota: 50,
        meme_storage_enabled: true,
        stored_meme_quota: 100
    }
}; 