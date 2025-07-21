import { Timestamp } from "firebase-admin/firestore";

/**
 * Represents the properties of a user login session.
 * @property id - Unique identifier for the session.
 * @property session_token - Token used to identify the session.
 * @property user_id - ID of the user associated with the session.
 * @property created_at - Timestamp when the session was created.
 * @property expiration_at - Timestamp when the session expires.
 * @property ended_at - Timestamp when the session ended (optional).
 * @property is_available - Indicates if the session is currently available.
 * @property user_agent - User agent string from the client.
 * @property ip_address - IP address of the client.
 */
export interface LoginSessionProps {
    /** Unique identifier for the session */
    id: string;
    /** Token used to identify the session */
    session_token: string;
    /** ID of the user associated with the session */
    user_id: string;
    /** Timestamp when the session was created */
    created_at: Timestamp;
    /** Timestamp when the session expires */
    expiration_at: Timestamp;
    /** Timestamp when the session ended (optional) */
    ended_at?: Timestamp;
    /** Indicates if the session is currently available */
    is_available: boolean;
    /** User agent string from the client */
    user_agent: string;
    /** IP address of the client */
    ip_address: string;
}