import { Timestamp } from "firebase-admin/firestore";
import { genAI } from "../config/firebase";
import { generateRandomString } from "../utils/randomString";
import * as fs from "fs";

export type QuestionTypes = "multiple_choice" | "short_answer" | "essay_writing" | "mathematical_work";

export interface AnswerItemsProps {
    id: string;
    confidence: number;
    type: QuestionTypes;
    answer: string;
}

export interface AnswerScanResultProps {
    id: string;
    student_id: string | null;
    scanned_at: Timestamp;
    answers: AnswerItemsProps[];
}

export async function scanStudentAnswer(filePath: string): Promise<AnswerScanResultProps> {
    let student_id: string | null = null;

    // Read image file as binary
    const imageBuffer = fs.readFileSync(filePath);

    // AI analysis
    const prompt = `
คุณคือ AI ช่วยตรวจข้อสอบและจำแนกประเภทคำตอบเป็น:
- multiple_choice
- short_answer
- essay_writing
- mathematical_work

วิเคราะห์เนื้อหาจากภาพที่แนบมา

และสรุปเป็น json array:
[
  {
    "confidence": number (0-1),
    "type": "multiple_choice" | "short_answer" | "essay_writing" | "mathematical_work",
    "answer": string (ถ้า mathematical_work ให้ใช้ plain text รวมกับ LaTeX)
  }
] โดยไม่ต้องใส่คำอธิบายหรือข้อความอื่น ๆ นอกจาก json array นี้
`;

    const response = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
            {
                role: "user", parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/png", data: imageBuffer.toString("base64") } }
                ]
            }
        ],
    });

    const jsonMatch = response.candidates?.[0]?.content?.parts?.[0]?.text?.match(/\[\s*{[\s\S]*}\s*\]/i);
    let answers: AnswerItemsProps[] = [];
    try {
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
        answers = parsed.map((item: any) => ({
            id: generateRandomString(64),
            confidence: item.confidence,
            type: item.type,
            answer: item.answer,
        }));
    } catch {
        throw new Error("AI parsing error");
    }

    return {
        id: generateRandomString(64),
        student_id,
        scanned_at: Timestamp.now(),
        answers,
    };
}
