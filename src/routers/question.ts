import { Router } from "express";
import { QuestionProps } from "../models/question";
import { generateRandomString } from "../utils/randomString";
import { createDoc } from "../handle/firestore";
import { genAI } from "../config/firebase";
import fs from "fs";
import { scanStudentAnswers } from "../handle/test3";

const router = Router();

router.get("", async (req, res): Promise<any> => {
    return res.status(200).json({
        success: true,
        message: "Hello"
    });
})

router.get("/test", async (req, res): Promise<any> => {
    try {
        const question: QuestionProps = {
            id: generateRandomString(64),
            type: "multiple_choice",
            confidence: 0,
            question_content: "",
            choices: [
                {
                    label: "A",
                    text: "Hello"
                },
            ]
        }

        await createDoc<QuestionProps>({
            name: "question",
            data: question
        });

        return res.status(200).json({
            success: true,
            message: "Yes"
        });
    } catch (err) {
        console.log(err)
    }
});

router.get("/test-ai", async (_req, res) => {
    try {
        // Option 1: Provide a local image file path
        // For demonstration, let's assume an image named 'my_image.jpg' in the same directory
        const imagePath = './image2.jpg';
        const mimeType = 'image/jpg'; // Adjust based on your image type (e.g., 'image/png', 'image/webp')

        // Read the image file and convert it to a base64 string
        const imageBuffer = await fs.promises.readFile(imagePath);
        const base64Image = imageBuffer.toString('base64');

        const response = await genAI.models.generateContent({
            model: "gemini-2.0-flash-001",
            contents: [
                {
                    text: "บอกข้อมูลใน QR Code ในภาพนี้",
                },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image
                    }
                }
            ],
        });

        // ดึงคำตอบ
        const answer =
            response.candidates?.[0]?.content?.parts?.[0]?.text || "No answer";

        res.json({ answer: answer });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/test-ai2", async (_req, res) => {
    try {
        const response = await scanStudentAnswers(["essay_1.png"]);

        res.json({ response });
    } catch (err) {
        console.log(err)
    }
});


export default router;