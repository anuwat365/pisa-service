import { Timestamp } from "firebase-admin/firestore";
import { QuestionTypes } from "../types/question";

/**
 * Represents a single question item in a template.
 * @property id - Unique identifier for the question.
 * @property type - Type of the question (e.g., multiple_choice, short_answer).
 * @property problem - The question/problem statement.
 * @property solution - The solution or answer to the question.
 * @property score - Score assigned to the question.
 */
export interface QuestionItemProps {
    /** Unique identifier for the question */
    id: string;
    /** Type of the question */
    type: QuestionTypes;
    /** The question/problem statement */
    problem: string;
    /** The solution or answer */
    solution: string;
    /** Score assigned to the question */
    score: number;
}

/**
 * Represents a template containing multiple questions.
 * @property id - Unique identifier for the template.
 * @property scanned_at - Timestamp when the template was scanned.
 * @property updated_at - Timestamp when the template was last updated.
 * @property questions - List of questions in the template.
 */
export interface TemplateProps {
    /** Unique identifier for the template  */
    id: string;
    /** Timestamp when the template was scanned */
    scanned_at: Timestamp;
    /** Timestamp when the template was last updated */
    updated_at: Timestamp;
    /** List of questions in the template */
    questions: QuestionItemProps[];
}