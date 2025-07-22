import { firestore } from "../config/firebase";
import { CollectionTypes } from "../types/collection";


/**
 * Creates a document in the specified Firestore collection.
 * @param name - The collection name.
 * @param data - The document data, must include an 'id' field.
 */
export const createDoc = async <T extends { id: string }>({
    name,
    data,
}: {
    name: CollectionTypes;
    data: T;
}) => {
    try {
        // Set the document with the provided id and data
        await firestore.collection(name).doc(data.id).set(data);
        console.log(`[CreateDoc] Document created in collection ${name}`);
    } catch (error) {
        console.error(`Error creating document in collection ${name}. Error: ${error}`);
    }
};

/**
 * Retrieves documents from a Firestore collection based on conditions.
 * @param name - The collection name.
 * @param condition - Array of where conditions.
 * @param limit - Maximum number of documents to retrieve.
 * @param sortBy - Field to sort by.
 * @param sortType - Sort direction ("ASC" or "DESC").
 * @returns Array of documents matching the query.
 */
export const getDoc = async <T extends { id: string }>({
    name,
    condition,
    limit = 1,
    sortBy,
    sortType,
}: {
    name: CollectionTypes;
    condition: {
        field: keyof T;
        operator: FirebaseFirestore.WhereFilterOp;
        value: any;
    }[];
    limit?: number;
    sortBy?: keyof T;
    sortType?: "ASC" | "DESC";
}): Promise<T[]> => {
    try {
        let query: FirebaseFirestore.Query = firestore.collection(name);

        // Apply each where condition to the query
        for (const { field, operator, value } of condition) {
            query = query.where(field as string, operator, value);
        }

        // Apply sorting if specified
        if (sortBy) {
            query = query.orderBy(
                sortBy as string,
                sortType?.toLowerCase() as FirebaseFirestore.OrderByDirection || "asc"
            );
        }

        // Limit the number of documents returned
        query = query.limit(limit);

        // Execute the query and get the snapshot
        const snapshot = await query.get();

        // Map snapshot documents to result array
        const results: T[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as T));

        console.log(`[GetDoc] Get ${snapshot.size} documents in ${name}`);
        return results;
    } catch (error) {
        console.error(`Error fetching documents from collection ${name}:`, error);
        return [];
    }
};

/**
 * Updates documents in a Firestore collection based on conditions.
 * @param name - The collection name.
 * @param condition - Array of where conditions to match documents.
 * @param update - Array of fields and values to update.
 */
export const updateDoc = async <T>({
    name,
    condition,
    update
}: {
    name: CollectionTypes;
    condition: {
        field: keyof T;
        operator: FirebaseFirestore.WhereFilterOp;
        value: any;
    }[];
    update: {
        field: keyof T;
        value: any;
    }[];
}): Promise<void> => {
    // Build the query with where conditions
    let query: FirebaseFirestore.Query = firestore.collection(name);

    for (const { field, operator, value } of condition) {
        query = query.where(field as string, operator, value);
    }

    // Get matching documents
    const snapshot = await query.get();

    if (snapshot.empty) {
        console.warn(`[updateDoc] No documents matched the condition in ${name}`);
        return;
    }

    // Create a batch for atomic updates
    const batch = firestore.batch();

    snapshot.docs.forEach(doc => {
        const docRef = firestore.collection(name).doc(doc.id);
        const updates: Record<string, any> = {};

        // Prepare update fields
        for (const { field, value } of update) {
            updates[field as string] = value;
        }

        // Add update operation to batch
        batch.update(docRef, updates);
    });

    // Commit the batch update
    await batch.commit();
    console.log(`[updateDoc] Updated ${snapshot.size} documents in ${name}`);
};