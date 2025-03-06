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
    }
};