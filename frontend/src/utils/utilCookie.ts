"use server";
import { cookies } from 'next/headers'
import { COOKIES_CONSTANTS, HTTP_ONLY_COOKIE_NAMES } from './constants';

/**
 * NOTE: These functions work with regular cookies, not HTTP-only cookies.
 * HTTP-only cookies can only be accessed and manipulated by the server (backend),
 * not by frontend code including Next.js server components.
 */

export const getAuthToken = async (): Promise<string | null> => {
    const cookieStore = await cookies();
    // Try both legacy name and HTTP-only cookie name
    const authToken = cookieStore.get(HTTP_ONLY_COOKIE_NAMES.ACCESS_TOKEN)?.value ??
                      cookieStore.get(COOKIES_CONSTANTS.AUTHORIZATION)?.value ?? null; // Ensure null safety
    return authToken;
};

export const setAuthToken = async (token: string): Promise<void> => {
    // This function is for regular cookies only
    // HTTP-only cookies must be set by the backend
    const headerMap = await cookies();
    headerMap.set(COOKIES_CONSTANTS.AUTHORIZATION, token);
}

export const getUserRole = async (): Promise<string | null> => {
    const cookieStore = await cookies();
    // Try both legacy name and HTTP-only cookie name
    const authToken = cookieStore.get(HTTP_ONLY_COOKIE_NAMES.USER_ROLE)?.value ??
                      cookieStore.get(COOKIES_CONSTANTS.X_USER_ROLE)?.value ?? null; // Ensure null safety
    return authToken;
};

export const setUserRole = async (role: string): Promise<void> => {
    // This function is for regular cookies only
    // HTTP-only cookies must be set by the backend
    const headerMap = await cookies();
    headerMap.set(COOKIES_CONSTANTS.X_USER_ROLE, role); // Adjust the key if needed
}

export const getUserAccess = async (): Promise<any | null> => {
    const cookieStore = await cookies();
    // Try both legacy name and HTTP-only cookie name
    const data = cookieStore.get(HTTP_ONLY_COOKIE_NAMES.USER_ACCESS)?.value ??
                 cookieStore.get(COOKIES_CONSTANTS.X_USER_ACCESS)?.value ?? null; // Ensure null safety
    return data ? JSON.parse(data) : null;
};

export const setUserAccess = async (role: any): Promise<void> => {
    // This function is for regular cookies only
    // HTTP-only cookies must be set by the backend
    const headerMap = await cookies();
    headerMap.set(COOKIES_CONSTANTS.X_USER_ACCESS, JSON.stringify(role)); // Adjust the key if needed
}

export const getUserLastPath = async (): Promise<any | null> => {
    const cookieStore = await cookies();
    const data = cookieStore.get(COOKIES_CONSTANTS.X_USER_HISTORY)?.value ?? null; // Ensure null safety
    return data ? JSON.parse(data) : null;
};

export const setUserLastPath = async (role: any): Promise<void> => {
    // This function is for regular cookies only
    // HTTP-only cookies must be set by the backend
    const headerMap = await cookies();
    headerMap.set(COOKIES_CONSTANTS.X_USER_HISTORY, JSON.stringify(role)); // Adjust the key if needed
}

export const clearCreditionals = async (): Promise<void> => {
    // This function clears regular cookies only
    // HTTP-only cookies can only be cleared by the backend setting an expired cookie
    const headerMap = await cookies();
    headerMap.delete(COOKIES_CONSTANTS.AUTHORIZATION);
    headerMap.delete(COOKIES_CONSTANTS.X_USER_ACCESS);
    headerMap.delete(COOKIES_CONSTANTS.X_USER_HISTORY);
    headerMap.delete(COOKIES_CONSTANTS.X_USER_ROLE);
}