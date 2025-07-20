import { Timestamp } from "firebase-admin/firestore";

export type QuestionTypes = "multiple_choice" | "short_answer" | "essay_writing" | "mathematical_work";     // Question Types

export interface AnswerItemsProps {
    id: string;                         // Answer items Id
    confidence: number;                 // Accuracy rate 0-1
    type: QuestionTypes;                // Question Type
    answer: string;                     // Student Answer
}

export interface AnswerScanResultProps {
    id: string;                         // Answer Id
    student_id: string | null;          // Extracted From QR
    scanned_at: Timestamp;              // Firebase timestamp
    answers: AnswerItemsProps[];        // Scaned Answer list
}  