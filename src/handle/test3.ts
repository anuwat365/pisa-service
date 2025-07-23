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

export async function scanStudentAnswers(filePaths: string[]): Promise<AnswerScanResultProps[]> {
    return Promise.all(
        filePaths.map(async (filePath) => {

            const imageBuffer = fs.readFileSync(filePath);

            let student_id: string | null = null;


            const prompt = `
คุณคือ AI ผู้ช่วยตรวจข้อสอบจากภาพที่แนบมา (ไม่ใช้ OCR)  
หน้าที่ของคุณคือวิเคราะห์เนื้อหาที่ปรากฏในภาพอย่างละเอียดและเป็นระบบ เพื่อจำแนกคำตอบแต่ละข้อให้อยู่ในประเภทที่ถูกต้องที่สุด พร้อมระบุค่า confidence ที่สะท้อนความมั่นใจตามหลักฐานจากภาพ โดยห้ามเดาหรือสร้างข้อมูลที่ไม่มีอยู่จริงในภาพ

โปรดจำแนกประเภทคำตอบตามเกณฑ์นี้:

1. multiple_choice:
   - คำตอบแสดงออกเป็นการระบาย bubble, ขีดเครื่องหมาย หรือทำเครื่องหมายในกล่อง
   - อาจเป็นตัวอักษรหรือตัวเลขสั้น ๆ แทนคำตอบ
   - มักอยู่ในรูปแบบตาราง ช่อง หรือแถวที่จัดเรียงเป็นระเบียบ
   - ใส่เนื้อหาคำตอบที่ตรวจด้วย เช่น "A - Hello" หรือ "B - World"

2. short_answer:
   - คำตอบเป็นคำเดียว วลีสั้น ๆ หรือประโยคสั้น
   - มักเขียนลงในกล่องเล็กหรือเส้นบรรทัดสั้น
   - ไม่มีคำอธิบาย ขยายความ หรือเหตุผลประกอบหลายบรรทัด

3. essay_writing:
   - คำตอบเป็นข้อความยาว มีหลายบรรทัดหรือย่อหน้า
   - แสดงความต่อเนื่องทางความคิด เช่น การอธิบาย การให้เหตุผล หรือการเล่าเรื่อง
   - มักเขียนในช่องว่างขนาดใหญ่ที่จัดให้บนกระดาษ

4. mathematical_work:
   - คำตอบประกอบด้วยตัวเลข สมการ สัญลักษณ์ทางคณิตศาสตร์ หรือวิธีทำทีละขั้นตอน
   - ให้ส่งคำตอบในรูปแบบคำอธิบาย ร่วมกับ LaTeX เพื่อให้ผู้อ่านเข้าใจสมการและวิธีทำได้ชัดเจน

**ขั้นตอนการวิเคราะห์ (อย่างละเอียด):**
- ตรวจสอบโครงสร้างข้อสอบ เช่น ลักษณะช่องระบาย ช่องเขียน พื้นที่สำหรับคำตอบ
- สังเกตตำแหน่ง กล่อง เส้นบรรทัด และความยาวของข้อความที่เขียนในแต่ละข้อ
- พิจารณาลายมือ ความหนาแน่นของเนื้อหา และสัญลักษณ์พิเศษที่อาจสื่อถึงวิธีทำทางคณิตศาสตร์
- สังเกตบริบทของคำถาม คำสั่ง หรือหมายเลขข้อสอบที่อาจบอกประเภทของคำตอบ
- ประเมินว่าข้อความที่ปรากฏเป็นคำตอบสั้น ตอบเลือก หรือเป็นงานเขียนยาว
- หากเนื้อหาไม่ชัด เบลอ หรือมีร่องรอยลบ/แก้ไข ให้ตั้งค่า confidence ต่ำเพื่อให้มนุษย์ตรวจสอบต่อ

**การให้ค่า confidence:**
- เป็นตัวเลขทศนิยมระหว่าง 0–1
- ควรสัมพันธ์กับความคมชัด ความครบถ้วน และความสอดคล้องของข้อมูลที่วิเคราะห์ได้จากภาพ
- ไม่ควรตั้งค่า confidence สูงสุด (1) เว้นแต่ภาพคมชัดและมีหลักฐานชัดเจน

**รูปแบบผลลัพธ์:**
- สรุปผลการวิเคราะห์เป็น JSON array เท่านั้น
- สำหรับแต่ละคำตอบ ต้องระบุ:
  - "confidence": number (0-1)
  - "type": "multiple_choice" | "short_answer" | "essay_writing" | "mathematical_work"
  - "answer": string (ถ้าเป็น mathematical_work ให้ใช้ plain text รวมกับ LaTeX)

**ตัวอย่างโครงสร้าง:**
[
  {
    "confidence": number (0-1),
    "type": "multiple_choice" | "short_answer" | "essay_writing" | "mathematical_work",
    "answer": string
  },
  ...
]

**เงื่อนไขสำคัญ:**
- ห้ามสร้างหรือสมมติคำถาม/คำตอบที่ไม่มีในภาพจริง
- ห้ามใส่คำอธิบาย คำบรรยาย หรือข้อความอื่น ๆ นอกจาก JSON array นี้
- หากพบข้อที่ไม่ชัดเจน ควรใส่ค่า confidence ต่ำเพื่อให้เจ้าหน้าที่ตรวจสอบต่อ

จงทำงานตามขั้นตอนและหลักเกณฑ์ข้างต้นอย่างเคร่งครัด
`;

            const response = await genAI.models.generateContent({
                model: "gemini-2.0-flash-lite",
                contents: [
                    {
                        role: "user", parts: [
                            { text: prompt },
                            { inlineData: { mimeType: "image/jpeg", data: imageBuffer.toString("base64") } }
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
        })
    );
}
