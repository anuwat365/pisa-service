import { Timestamp } from "firebase-admin/firestore";
import { genAI, visionClient } from "../config/firebase";
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
    let extractedText = "";
    let student_id: string | null = null;

    // OCR
    const [textResult] = await visionClient.textDetection(filePath);
    if (textResult.textAnnotations?.length) {
        extractedText = textResult.textAnnotations[0].description || "";
    }

    // Barcode/QR detection
    const [barcodes] = await visionClient.documentTextDetection(filePath);
    const match = barcodes.fullTextAnnotation?.text?.match(/ID:(\w+)/);
    if (match) {
        student_id = match[1];
    }

    // AI analysis
    const prompt = `
คุณคือ AI ที่ช่วยตรวจข้อสอบจากภาพที่แนบมา  
โปรดวิเคราะห์เนื้อหาภายในภาพโดยตรง เพื่อจำแนกประเภทคำตอบออกเป็น 4 ประเภทเท่านั้น:
- multiple_choice (ตัวเลือกหลายข้อ เช่น ระบาย bubble)
- short_answer (ตอบสั้น เช่น กล่องข้อความสั้น)
- essay_writing (ตอบยาว เช่น เรียงความ)
- mathematical_work (งานคณิตศาสตร์ เช่น สมการ หรือวิธีทำ โดยให้ตอบในรูปแบบ plain text รวมกับ LaTeX)

กรุณาวิเคราะห์ภาพที่แนบมาโดยใช้บริบทจากภาพทั้งหมด เพื่อให้เข้าใจคำถามและคำตอบที่แท้จริง หลีกเลี่ยงการสร้างหรือเพิ่มคำถาม ข้อสอบ หรือเนื้อหาอื่นใดที่ไม่มีอยู่ในภาพ

สำหรับแต่ละคำตอบ ให้สรุปเป็น JSON array ดังนี้:

[
  {
    "confidence": ตัวเลข 0 ถึง 1 แสดงความมั่นใจของการจำแนกประเภทและคำตอบ,
    "type": "multiple_choice" | "short_answer" | "essay_writing" | "mathematical_work",
    "answer": "ข้อความคำตอบที่ตรวจได้ (ถ้าเป็น mathematical_work ให้ใช้ plain text รวมกับ LaTeX)"
  }
]

**ข้อสำคัญ:**  
- ตอบเฉพาะ JSON array นี้เท่านั้น  
- ไม่ต้องมีคำอธิบายหรือข้อความอื่นใด  
- ให้พิจารณาความไม่แน่ใจโดยใส่ confidence ต่ำเพื่อส่งต่อให้เจ้าหน้าที่ตรวจสอบ
`;

    const imageBuffer = fs.readFileSync(filePath);

    const response = await genAI.models.generateContent({
        model: "gemini-2.5-pro",
        contents: [
            {
                role: "user", parts: [
                    { text: prompt },
                    { inlineData: { mimeType: "image/jpg", data: imageBuffer.toString("base64") } }
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
