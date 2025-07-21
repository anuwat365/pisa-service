import { Router } from "express";
// import { QuestionProps } from "../models/question";
import { generateRandomString } from "../utils/randomString";
import { createDoc } from "../handle/firestore";
import { genAI } from "../config/firebase";
import fs from "fs";
import { scanStudentAnswers } from "../handle/test3";
import { scanStudentAnswer } from "../handle/test4";

const router = Router();

router.get("", async (req, res): Promise<any> => {
    return res.status(200).json({
        success: true,
        message: "Hello"
    });
})

// router.get("/test", async (req, res): Promise<any> => {
//     try {
//         const question: QuestionProps = {
//             id: generateRandomString(64),
//             type: "multiple_choice",
//             confidence: 0,
//             question_content: "",
//             choices: [
//                 {
//                     label: "A",
//                     text: "Hello"
//                 },
//             ]
//         }

//         await createDoc<QuestionProps>({
//             name: "questions",
//             data: question
//         });

//         return res.status(200).json({
//             success: true,
//             message: "Yes"
//         });
//     } catch (err) {
//         console.log(err)
//     }
// });

router.get("/test-ocr", async (req, res) => {
    try {
        const response = await scanStudentAnswer("choice_1.png");

        res.json({ response });
    } catch (err) {
        console.log(err)
    }
});

router.get("/test-ai", async (_req, res) => {
    try {
        const response = await scanStudentAnswers(["choice_1.png"]);

        res.json({ response });
    } catch (err) {
        console.log(err)
    }
});


export default router;