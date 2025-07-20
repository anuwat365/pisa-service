export type QuestionType =
    | "multiple_choice"
    | "short_answer"
    | "essay_writing"
    | "mathematical_work";

export interface Choice {
    label: string;     // เช่น "A", "B", "C"
    text: string;      // เนื้อหาช้อยส์
}

export interface QuestionProps {
    id: string;                     // ไอดีคำถาม
    type: QuestionType;             // ประเภทคำถาม
    confidence: number;             // ความแม่นยำในการอ่าน (0-1)
    page_number?: number;            // หน้า PDF (optional)
    points?: number;                // คะแนน (optional)
    question_content: string;

    // properties เฉพาะบางประเภท
    choices?: Choice[];             // สำหรับ multiple_choice
    answer?: string;                // สำหรับ multiple_choice, short_answer, mathematical_work
    answer_guideline?: string;       // สำหรับ essay_writing
    steps_guideline?: string;        // สำหรับ mathematical_work
}