import { Timestamp } from "firebase-admin/firestore";

/**
 * Represents the properties of a sign-up session.
 * @property id - Unique identifier for the session.
 * @property email - Email address associated with the session.
 * @property username - Optional username for the session.
 * @property user_agent - User agent string from the client.
 * @property ip_address - IP address of the client, can be null.
 * @property created_at - Timestamp when the session was created.
 * @property expiration_at - Timestamp when the session expires.
 * @property is_available - Indicates if the session is available.
 */
export interface SignUpSessionProps {
    /** Unique identifier for the session */
    id: string;
    /** Email address associated with the session */
    email: string;
    /** Optional username for the session */
    username?: string;
    /** User agent string from the client */
    user_agent: string;
    /** IP address of the client, can be null */
    ip_address: string | null;
    /** Timestamp when the session was created */
    created_at: Timestamp;
    /** Timestamp when the session expires */
    expiration_at: Timestamp;
    /** Indicates if the session is available */
    is_available: boolean;
}