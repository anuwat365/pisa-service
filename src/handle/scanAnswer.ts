import { Timestamp } from "firebase-admin/firestore";
import { genAI } from "../config/firebase";
import { generateRandomString } from "../utils/randomString";
import * as fs from "fs";
import { AnswerProps } from "../models/answer";

export interface ScanAnswerProps {
    /** Array of file paths to images to be scanned */
    filePaths: string[];
    /** ID of the user who owns the document */
    ownerUserId: string;
}
export async function scanAnswers({
    filePaths,
    ownerUserId
}: ScanAnswerProps): Promise<AnswerProps[]> {
    // Prepare prompt and images for a single AI request
    const prompt = `
คุณคือ AI ผู้ช่วยตรวจข้อสอบจากภาพที่แนบมา (ไม่ใช้ OCR)  
หน้าที่ของคุณคือวิเคราะห์เนื้อหาที่ปรากฏในภาพอย่างละเอียดและเป็นระบบ เพื่อจำแนกคำตอบแต่ละข้อให้อยู่ในประเภทที่ถูกต้องที่สุด พร้อมระบุค่า accuracy ที่สะท้อนความมั่นใจตามหลักฐานจากภาพ โดยห้ามเดาหรือสร้างข้อมูลที่ไม่มีอยู่จริงในภาพ

**โปรดสแกนและระบุ student_id และ student_name ที่ปรากฏในภาพ (ถ้ามี):**
- หากไม่พบ ให้เว้นว่างหรือใส่ null
- หากพบ student_id หรือ student_name ของนักเรียนหลายคน ให้สร้าง object สำหรับแต่ละคน
- หากไมม่พบข้อมูลนักเรียนในบางภาพหรือไฟล์ ให้สังเกตด้วยลายมือหรือทำนองการเขียน

**โปรดระบุชื่อคำถาม (question_name) ตามชื่อนักเรียนและชื่อคำถามที่ปรากฏในภาพ:**
- หากไม่พบ ให้เว้นว่าง
- หากพบคำถามหลายข้อในภาพ ให้ระบุชื่อคำถามที่เกี่ยวข้องกับคำตอบที่ตรวจสอบ

**โปรดพิจารณาคุณภาพของการสแกนภาพอย่างละเอียด:**  
- หากภาพเบลอ มืด สว่างเกินไป มีรอยพับ รอยขีดข่วน หรือมีส่วนที่ขาดหาย ให้ระบุ accuracy ต่ำ  
- หากภาพมีคุณภาพดี สามารถมองเห็นรายละเอียดชัดเจน ให้ระบุ accuracy สูง  
- หากพบปัญหาเกี่ยวกับคุณภาพภาพ ให้ระบุใน accuracy และเลือก "critical" เพื่อให้มนุษย์ตรวจสอบต่อ

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
- หากเนื้อหาไม่ชัด เบลอ หรือมีร่องรอยลบ/แก้ไข ให้ตั้งค่า accuracy ต่ำเพื่อให้มนุษย์ตรวจสอบต่อ

**การให้ค่า accuracy:**
- ให้ค่า accuracy เป็น perfect เมื่อคำตอบชัดเจนและตรงตามประเภทที่ระบุ
- ให้ค่า accuracy เป็น partial เมื่อคำตอบมีความไม่ชัดเจนหรือไม่ตรง
- ให้ค่า accuracy เป็น critical เมื่อคำตอบไม่สามารถจำแนกประเภทได้ชัดเจน หรือมีความไม่แน่นอนสูง

**การให้คะแนน (score):**
- "multiple_choice": ให้ 1 คะแนนถ้าคำตอบถูกต้องตรงกับภาพ, 0 ถ้าผิด/ไม่พบ, 0.5 ถ้ามีร่องรอยคำตอบบางส่วน
- "short_answer": ให้ 1 คะแนนถ้าถูกต้องครบถ้วน, 0.5 ถ้าถูกต้องบางส่วน, 0 ถ้าผิด/ไม่พบ
- "essay_writing": ให้ 1 คะแนนถ้าเนื้อหาครบถ้วนและตรงตามโจทย์, 0.5 ถ้าครอบคลุมบางส่วน, 0 ถ้าไม่ตรง/ไม่พบ
- "mathematical_work": ให้ 1 คะแนนถ้าคำตอบและวิธีทำถูกต้องครบถ้วน, 0.5 ถ้าถูกต้องบางส่วน, 0 ถ้าผิด/ไม่พบ

**ถ้าไม่พบคำตอบหรือไม่ชัดเจน ให้ 0 คะแนนเสมอ**

**รูปแบบผลลัพธ์:**
- สรุปผลการวิเคราะห์เป็น JSON array เฉพาะของ student objects เท่านั้น
- ตัวอย่างโครงสร้าง:
[
  {
    "question_name": string,
    "student_id": string | null | "many",
    "student_name": string | null | "many",
    "answers": [
      {
        "type": "multiple_choice" | "short_answer" | "essay_writing" | "mathematical_work",
        "problem": string,
        "answer": string,
        "accuracy": "perfect" | "partial" | "critical",
        "score": number
      },
      ...
    ]
  },
  ...
]

**เงื่อนไขสำคัญ:**
- ให้ใส่คำตอบทุกข้อที่สามารถระบุได้
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
                    ...filePaths.map(fp => ({
                        inlineData: {
                            mimeType: "image/jpeg",
                            data: fs.readFileSync(fp).toString("base64")
                        }
                    }))
                ]
            }
        ],
    });

    // Match JSON array containing student objects
    const jsonMatch = response.candidates?.[0]?.content?.parts?.[0]?.text?.match(/\[[\s\S]*\]/i);
    let answerPropsArray: AnswerProps[] = [];
    try {
        const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : "[]");
        if (Array.isArray(parsed) && parsed.length > 0) {
            answerPropsArray = parsed.map((genAIs: any) => ({
                id: generateRandomString(64),
                question_id: "",
                question_name: genAIs.question_name || "",
                owner_user_id: ownerUserId,
                student_id: genAIs.student_id ?? null,
                student_name: genAIs.student_name ?? null,
                scanned_at: Timestamp.now(),
                updated_at: Timestamp.now(),
                answers: Array.isArray(genAIs.answers) ? genAIs.answers.map((item: any) => ({
                    type: item.type,
                    problem: item.problem,
                    answer: item.answer,
                    accuracy: item.accuracy,
                    score: item.score !== undefined ? item.score : 0
                })) : [],
            }));
        } else {
            throw new Error("No answers found in AI response");
        }
    } catch {
        throw new Error("AI parsing error");
    }

    return answerPropsArray;
}
