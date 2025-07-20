import { firestore } from "../config/firebase";

export type collections = "users"
    | "question";

/**
 * Create document 
 */
export const createDoc = async <T extends { id: string }>({
    name,
    data,
}: {
    name: collections;
    data: T;
}) => {
    try {
        await firestore.collection(name).doc(data.id).set(data);
        console.log(`[CreateDoc] Document created in collection ${name}`);
    } catch (error) {
        console.error(`Error creating document in collection ${name}. Error: ${error}`);
    }
};

/**
 * Get document(s)
 */
export const getDoc = async <T extends { id: string }>({
    name,
    condition,
    limit = 1,
    sortBy,
    sortType,
}: {
    name: collections;
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

        // Apply where conditions
        for (const { field, operator, value } of condition) {
            query = query.where(field as string, operator, value);
        }

        // Apply sorting if specified
        if (sortBy) {
            query = query.orderBy(sortBy as string, sortType?.toLowerCase() as FirebaseFirestore.OrderByDirection || "asc");
        }

        // Apply limit
        query = query.limit(limit);

        const snapshot = await query.get();

        const results: T[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        } as T));

        console.log(`[GetDoc] Get ${snapshot.size} documents in ${name}`)
        return results;
    } catch (error) {
        console.error(`Error fetching documents from collection ${name}:`, error);
        return [];
    }
};

/**
 * Update document
 */
export const updateDoc = async <T>({
    name,
    condition,
    update
}: {
    name: collections;
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
    let query: FirebaseFirestore.Query = firestore.collection(name);

    // Apply where conditions
    for (const { field, operator, value } of condition) {
        query = query.where(field as string, operator, value);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
        console.warn(`[updateDoc] No documents matched the condition in ${name}`);
        return;
    }

    const batch = firestore.batch();

    snapshot.docs.forEach(doc => {
        const docRef = firestore.collection(name).doc(doc.id);
        const updates: Record<string, any> = {};

        for (const { field, value } of update) {
            updates[field as string] = value;
        }

        batch.update(docRef, updates);
    });

    await batch.commit();
    console.log(`[updateDoc] Updated ${snapshot.size} documents in ${name}`);
};