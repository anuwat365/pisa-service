import { Timestamp } from "firebase-admin/firestore";

/**
 * Represents the properties of a user in the system.
 *
 * @property id - Unique identifier for the user.
 * @property username - The user's display name.
 * @property handle - The user's unique handle (e.g., @username).
 * @property email - The user's email address.
 * @property created_at - Timestamp when the user was created.
 * @property updated_at - Timestamp when the user was last updated.
 */
export interface UsersProps {
    /** Unique identifier for the user */
    id: string;
    /** The user's display name */
    username: string;
    /** The user's unique handle (e.g., @username) */
    handle: string;
    /** The user's email address */
    email: string;
    /** Timestamp when the user was created */
    created_at: Timestamp;
    /** Timestamp when the user was last updated */
    updated_at: Timestamp;
}