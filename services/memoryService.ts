import { UserProfile, UserRole, ChatMessage, StudyHubSubject } from '../types';

const STORAGE_KEYS = {
    // Dynamic keys based on user ID to ensure total privacy separation
    SCHEDULE: 'nexa_schedule',
    PROFILE: 'nexa_profile',
    NOTIFICATIONS: 'nexa_admin_incidents',
    ADMIN_API_KEY: 'nexa_admin_override_key' // New key for Admin override
};

// --- HELPER TO GET UNIQUE KEY ---
const getStorageKey = (user: UserProfile, type: string) => {
    if (user.role === UserRole.ADMIN) {
        return `nexa_data_ADMIN_${type}`;
    }
    return `nexa_data_USER_${user.mobile}_${type}`;
};

// --- Admin API Key (Override) ---
export const saveAdminApiKey = (apiKey: string): void => {
    localStorage.setItem(STORAGE_KEYS.ADMIN_API_KEY, apiKey);
};

export const getAdminApiKey = (): string | null => {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_API_KEY);
};

export const clearAdminApiKey = (): void => {
    localStorage.removeItem(STORAGE_KEYS.ADMIN_API_KEY);
};


// --- User API Key (Privacy First: Stored locally only) ---
const getUserApiKeyStorageKey = (user: UserProfile) => {
    if (user.role === UserRole.USER) {
        return `nexa_user_key_${user.mobile}`;
    }
    return null; // Admin key is not stored here
};

export const saveUserApiKey = (user: UserProfile, apiKey: string): void => {
    const key = getUserApiKeyStorageKey(user);
    if (key) {
        localStorage.setItem(key, apiKey);
    }
};

export const getUserApiKey = (user: UserProfile): string | null => {
    const key = getUserApiKeyStorageKey(user);
    return key ? localStorage.getItem(key) : null;
};

export const clearUserApiKey = (user: UserProfile): void => {
    const key = getUserApiKeyStorageKey(user);
    if (key) {
        localStorage.removeItem(key);
    }
};

// --- User Profile ---
export const syncUserProfile = async (user: UserProfile): Promise<void> => {
    localStorage.setItem(getStorageKey(user, 'profile'), JSON.stringify(user));
};

export const getAllUserProfiles = (): UserProfile[] => {
    const profiles: UserProfile[] = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('nexa_data_USER_') && key.endsWith('_profile')) {
            const profileData = localStorage.getItem(key);
            if (profileData) {
                profiles.push(JSON.parse(profileData));
            }
        }
    }
    return profiles;
};

export const deleteUser = (user: UserProfile): void => {
    Object.keys(localStorage).forEach(key => {
        if (key.includes(`_USER_${user.mobile}_`)) {
            localStorage.removeItem(key);
        }
    });
    // Also remove their API key
    clearUserApiKey(user);
};


// --- Schedule ---
export const getUserSchedule = async (userId: string): Promise<StudyHubSubject[]> => {
    // For schedule we use the mobile directly as ID
    const data = localStorage.getItem(`${STORAGE_KEYS.SCHEDULE}_${userId}`);
    return data ? JSON.parse(data) : [];
};

export const saveUserSchedule = async (userId: string, subjects: StudyHubSubject[]): Promise<void> => {
    localStorage.setItem(`${STORAGE_KEYS.SCHEDULE}_${userId}`, JSON.stringify(subjects));
};

// --- Chat History (Memory) ---
export const getLocalMessages = (user: UserProfile): ChatMessage[] => {
    try {
        const key = getStorageKey(user, 'messages');
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : [];
    } catch (e) { return []; }
};

export const appendMessageToMemory = async (user: UserProfile, message: ChatMessage): Promise<void> => {
    try {
        const key = getStorageKey(user, 'messages');
        const currentMessages = getLocalMessages(user);
        currentMessages.push(message);
        
        // Keep last 50 messages strictly
        if (currentMessages.length > 50) currentMessages.shift(); 

        localStorage.setItem(key, JSON.stringify(currentMessages));
    } catch (error) { console.error("Memory Save Error", error); }
};

export const getMemoryForPrompt = async (user: UserProfile): Promise<{role: 'user' | 'model', parts: {text: string}[]}[]> => {
    const allMessages = getLocalMessages(user);
    // Send last 15 messages for context window
    return allMessages.slice(-15).map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user', // FIX: Changed 'assistant' to 'model'
        parts: [{ text: msg.text }]
    }));
};

export const clearAllMemory = async (user: UserProfile): Promise<void> => {
    const key = getStorageKey(user, 'messages');
    localStorage.removeItem(key);
    if(user.role === UserRole.ADMIN) {
         localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
         // BUG FIX: DO NOT CLEAR THE ADMIN'S API KEY WHEN PURGING MEMORY.
         // clearAdminApiKey(); 
    }
    // Also clear user API key on full memory purge if it's a user
    if (user.role === UserRole.USER) {
        clearUserApiKey(user);
    }
};

// --- Admin Notifications (Incidents) ---
// These are global logs available only to Admin
export const getAdminNotifications = async (): Promise<string[]> => {
    try {
        const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        return data ? JSON.parse(data) : [];
    } catch (error) { return []; }
};

export const logAdminNotification = (note: string) => {
     try {
        const current = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
        const arr = current ? JSON.parse(current) : [];
        arr.push(note);
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(arr));
    } catch (error) { console.error("Log Error", error); }
}

export const clearAdminNotifications = (): void => {
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
};

// --- User Status (Penitence Mode) ---
const getPenitenceKey = (user: UserProfile) => `nexa_penitence_${user.role}_${user.mobile}`;

export const setUserPenitenceStatus = (user: UserProfile, status: boolean): void => {
    // SECURITY FIX: Admins cannot be put in penitence mode.
    if (user.role === UserRole.ADMIN) return;
    const key = getPenitenceKey(user);
    if (status) {
        localStorage.setItem(key, 'true');
    } else {
        localStorage.removeItem(key);
    }
};

export const checkUserPenitenceStatus = (user: UserProfile): boolean => {
    if (user.role === UserRole.ADMIN) return false;
    const key = getPenitenceKey(user);
    return localStorage.getItem(key) === 'true';
};