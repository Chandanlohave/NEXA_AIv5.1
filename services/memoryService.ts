import { UserProfile, UserRole, ChatMessage, StudyHubSubject } from '../types';

const STORAGE_KEYS = {
    // Dynamic keys based on user ID to ensure total privacy separation
    SCHEDULE: 'nexa_schedule',
    PROFILE: 'nexa_profile',
    NOTIFICATIONS: 'nexa_admin_incidents' 
};

// --- HELPER TO GET UNIQUE KEY ---
const getStorageKey = (user: UserProfile, type: string) => {
    if (user.role === UserRole.ADMIN) {
        return `nexa_data_ADMIN_${type}`;
    }
    return `nexa_data_USER_${user.mobile}_${type}`;
};

// --- User Profile ---
export const syncUserProfile = async (user: UserProfile): Promise<void> => {
    localStorage.setItem(getStorageKey(user, 'profile'), JSON.stringify(user));
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

export const getMemoryForPrompt = async (user: UserProfile): Promise<{role: 'user' | 'assistant', content: string}[]> => {
    const allMessages = getLocalMessages(user);
    // Send last 15 messages for context window
    return allMessages.slice(-15).map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.text
    }));
};

export const clearAllMemory = async (user: UserProfile): Promise<void> => {
    const key = getStorageKey(user, 'messages');
    localStorage.removeItem(key);
    if(user.role === UserRole.ADMIN) {
         localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
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
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, '[]');
};
