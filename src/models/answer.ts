import { Timestamp } from "firebase-admin/firestore";
import { QuestionTypes } from "../types/question";

/**
 * Represents a single answer item for a question.
 * @property id - Unique identifier for the answer.
 * @property type - Type of the question (e.g., multiple_choice, short_answer).
 * @property problem - Problem statement or question text.
 * @property answer - The answer provided by the student.
 * @property score - Optional score assigned to the answer.
 */
export interface AnswerItems{
    /** Unique identifier for the answer */
    id: string;
    /** Type of the question */
    type: QuestionTypes;
    /** Problem statement or question text */
    problem: string;
    /** The answer provided */
    answer: string;
    /** Score assigned to the answer */
    score?: number;
}

/**
 * Represents the properties of an answer submission.
 */
export interface AnswerProps{
    /** Unique identifier for the answer */
    id: string;
    /** ID of the question this answer belongs to */
    question_id: string;
    /** ID of the student who submitted the answer (optional) */
    student_id?: string;
    /** Name of the student who submitted the answer (optional) */
    student_name?: string;
    /** Timestamp when the answer was scanned */
    scanned_at: Timestamp;
    /** Timestamp when the answer was last updated */
    updated_at: Timestamp;
    /** Array of answer items */
    answers: AnswerItems[];
}