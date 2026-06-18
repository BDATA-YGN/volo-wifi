"use client";
import jwt from "jsonwebtoken";

// Interface for the JWT payload (optional, for TypeScript typing)
interface JwtPayload {
  exp?: number;
  [key: string]: any;
}

// Function to decode the token
export const decodeToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    if (decoded && typeof decoded === "object") {
      return decoded; // Return the full decoded payload
    }
    return null;
  } catch (error) {
    console.log(error);
    return null;
  }
};

// Function to parse expiration time in seconds
export const parseExpirationSeconds = (decoded: JwtPayload | null): number | null => {
  if (decoded && "exp" in decoded && typeof decoded.exp === "number") {
    const expirationTime = decoded.exp - decoded.iat;
    const expirationTimeInMilliSeconds = expirationTime * 1000;
    return expirationTimeInMilliSeconds;
  }
  return null; // Return null if exp is missing or invalid
};
