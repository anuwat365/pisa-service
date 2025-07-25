import { Timestamp } from "firebase-admin/firestore";
import { AccuracyTypes, QuestionTypes } from "../types/question";

/**
 * Represents a single answer item for a question.
 * @property id - Unique identifier for the answer.
 * @property type - Type of the question (e.g., multiple_choice, short_answer).
 * @property problem - Problem statement or question text.
 * @property answer - The answer provided by the student.
 * @property score - Optional score assigned to the answer.
 */
export interface AnswerItems {
    /** Unique identifier for the answer */
    id: string;
    /** Type of the question */
    type: QuestionTypes;
    /** Problem statement or question text */
    problem: string;
    /** The answer provided */
    answer: string;
    /** Accuracy of scanning */
    accuracy: AccuracyTypes;
    /** Score assigned to the answer */
    score: number;
}

/**
 * Represents the properties of an answer submission.
 * @property id - Unique identifier for the answer.
 * @property owner_user_id - ID of the user who owns the document.
 * @property question_name - Name of the question this answer belongs to.
 * @property student_id - ID of the student who submitted the answer (optional).
 * @property student_name - Name of the student who submitted the answer (optional).
 * @property scanned_at - Timestamp when the answer was scanned.
 * @property updated_at - Timestamp when the answer was last updated.
 * @property answers - Array of answer items.
 */
export interface ScannedAnswerProps {
    /** Unique identifier for the answer */
    id: string;
    /** Job ID associated with the scanned answer */
    job_id: string;
    /** ID of the user who owns the document */
    owner_user_id:string;
    /** Name of the question this answer belongs to */
    question_name: string;
    /** ID of the student who submitted the answer (optional) */
    student_id: string | null;
    /** Name of the student who submitted the answer (optional) */
    student_name: string | null;
    /** Timestamp when the answer was scanned */
    scanned_at: Timestamp;
    /** Timestamp when the answer was last updated */
    updated_at: Timestamp;
    /** Array of answer items */
    answers: AnswerItems[];
}