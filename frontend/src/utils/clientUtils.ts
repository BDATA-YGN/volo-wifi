"use client";
import dayjs, { Dayjs } from "dayjs";
import Cookies from 'js-cookie';
import { COOKIES_CONSTANTS } from "./constants";
import {
    getCookie,
    getCookies,
    setCookie,
    deleteCookie,
    hasCookie,
    useGetCookies,
    useSetCookie,
    useHasCookie,
    useDeleteCookie,
    useGetCookie,
  } from 'cookies-next/client';

// Date formatter using dayjs
export const formatDateTime = (date: Date): string => {
    return dayjs(date).format('DD/MM/YYYY HH:mm:ss');
};

export const formatDate = (timestamp: string): string => {
    if (!timestamp) {
        return '';
    }
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return dayjs(date).format('DD-MM-YYYY');
};

export const getAge = (dateOfBirth: string | Date) => {
    return dayjs().diff(dayjs(dateOfBirth), 'years');
}

export function convertFormNameCamelCase(str: string): string {
    return str
        .toLowerCase() // Convert to lowercase
        .split(' ')    // Split by spaces
        .map((word, index) =>
            index === 0
                ? word // Keep first word in lowercase
                : word.charAt(0).toUpperCase() + word.slice(1) // Capitalize first letter of the rest
        )
        .join(''); // Join back to form the camelCase string
}

export const formatDateTimestamp = (timestamp: string | number): string => {
    if (!timestamp) {
        return '';
    }
    // Convert the timestamp to a Date object if it’s a number (milliseconds)
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return dayjs(date).format('DD/MM/YYYY h:mm:ss A');
};

export const formatTime = (timestamp: string | number): string => {
    // Convert the timestamp to a Date object if it’s a number (milliseconds)
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    return dayjs(date).format('hh:mm A');
};

export const formatTitle = (key: string) => {
    return key
        .replace(/_/g, ' ') // Replace underscores with spaces
        .split(' ') // Split the string into words
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize the first letter of each word
        .join(' '); // Join the words back together
};

// Get the Authorization token from cookies
export const getAuthToken = () => {
    const authToken = Cookies.get(COOKIES_CONSTANTS.AUTHORIZATION) ?? null; // Ensure null safety
    return authToken;
};

// Set the Authorization token in cookies
export const setAuthToken = (token: string) => {
    Cookies.set(COOKIES_CONSTANTS.AUTHORIZATION, token, { expires: 7, secure: true }); // Customize options as needed
};

// Get the user role from cookies
export const getUserRole = () => {
    const userRole = Cookies.get(COOKIES_CONSTANTS.X_USER_ROLE) ?? null; // Ensure null safety
    return userRole;
};

// Set the user role in cookies
export const setUserRole = (role: any) => {
    Cookies.set(COOKIES_CONSTANTS.X_USER_ROLE, role, { expires: 7, secure: true }); // Customize options as needed
};

// Get the user access data from cookies (array)
export const getUserAccess = () => {
    const userAccess = Cookies.get(COOKIES_CONSTANTS.X_USER_ACCESS) ?? null; // Ensure null safety
    return userAccess ? JSON.parse(userAccess) : null; // Return an empty array if no data is found
};

// Set the user access data in cookies (array)
export const setUserAccess = (access: any) => {
    Cookies.set(COOKIES_CONSTANTS.X_USER_ACCESS, JSON.stringify(access), { expires: 7, secure: true }); // Customize options as needed
};

// Get the user access data from cookies (array)
export const getUserLastPath = () => {
    const userHistory = Cookies.get(COOKIES_CONSTANTS.X_USER_HISTORY) ?? null; // Ensure null safety
    return userHistory ? JSON.parse(userHistory) : null; // Return an empty array if no data is found
};

// Set the user access data in cookies (array)
export const setUserLastPath = (access: any) => {
    Cookies.set(COOKIES_CONSTANTS.X_USER_HISTORY, JSON.stringify(access), { expires: 7, secure: true }); // Customize options as needed
};

export const clearClientCookies = () => {
    deleteCookie(COOKIES_CONSTANTS.AUTHORIZATION, {});
    deleteCookie(COOKIES_CONSTANTS.X_USER_ACCESS, {});
    deleteCookie(COOKIES_CONSTANTS.X_USER_HISTORY, {});
    deleteCookie(COOKIES_CONSTANTS.X_USER_ROLE, {});
    deleteCookie(COOKIES_CONSTANTS.MENUS, { path: "/" });
    Cookies.remove(COOKIES_CONSTANTS.MENUS, { path: "/" });
}

export const getClientLocale = () => {
    const locale = Cookies.get(COOKIES_CONSTANTS.NEXT_LOCALE) ?? 'en';
    return locale;
}