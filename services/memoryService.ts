import { UserProfile, UserRole, ChatMessage } from '../types';

const MAX_MEMORY_LENGTH = 30; // Max number of turns (user + model) to keep in memory for the prompt

// --- Core Memory Functions ---

const getMemoryKey = (user: UserProfile): string => {
    if (user.role === UserRole.ADMIN) {
        return 'nexa_memory_admin';
    }
    // Use mobile number as the unique ID for users
    return `nexa_memory_user_${user.mobile}`;
};

export const loadMemory = (user: UserProfile): ChatMessage[] => {
    try {
        const key = getMemoryKey(user);
        const storedMemory = localStorage.getItem(key);
        return storedMemory ? JSON.parse(storedMemory) : [];
    } catch (error) {
        console.error("Failed to load memory:", error);
        return [];
    }
};

export const saveMemory = (user: UserProfile, messages: ChatMessage[]): void => {
    try {
        const key = getMemoryKey(user);
        // Ensure memory doesn't grow indefinitely
        const truncatedMessages = messages.slice(-MAX_MEMORY_LENGTH * 2);
        localStorage.setItem(key, JSON.stringify(truncatedMessages));
    } catch (error) {
        console.error("Failed to save memory:", error);
    }
};

export const appendMessageToMemory = (user: UserProfile, message: ChatMessage): void => {
    const currentMemory = loadMemory(user);
    currentMemory.push(message);
    saveMemory(user, currentMemory);
};

export const getMemoryForPrompt = (user: UserProfile): {role: string, parts: {text: string}[]}[] => {
    const memory = loadMemory(user);
    // Return the last N messages, formatted for the Gemini API
    return memory.slice(-MAX_MEMORY_LENGTH).map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
    }));
};

export const clearAllMemory = (): void => {
    try {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('nexa_memory_') || key === 'nexa_admin_notifications') {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
        console.error("Failed to clear all memory:", error);
    }
};

// --- Admin Notification Functions ---

export const getAdminNotifications = (): string[] => {
    try {
        const notifications = localStorage.getItem('nexa_admin_notifications');
        return notifications ? JSON.parse(notifications) : [];
    } catch (error) {
        console.error("Failed to get admin notifications:", error);
        return [];
    }
};

export const clearAdminNotifications = (): void => {
    try {
        localStorage.setItem('nexa_admin_notifications', '[]');
    } catch (error) {
        console.error("Failed to clear admin notifications:", error);
    }
};
