import { storage } from "../config/firebase";
import sharp from "sharp";


/**
 * Uploads an image file to Firebase Storage.
 * Only allows image files (jpg, jpeg, png, gif, webp).
 * @param files - Array of file buffers to upload.
 * @param destination - The destination path in Firebase Storage.
 */
interface UploadImageProps {
    image: Buffer;
    name: string;
    folder: string;
    imageType: "png" | "jpg" | "webp" | "avif";
}

/**
 * Uploads an image buffer to Firebase Storage after converting to the specified format.
 * @param image - The image buffer to upload.
 * @param name - The desired file name (without extension).
 * @param folder - The destination folder in Firebase Storage.
 * @param imageType - Desired output format ("png", "jpg", "webp", "avif").
 * @returns The public URL of the uploaded image.
 */
export const uploadImage = async ({ image, name, folder, imageType }: UploadImageProps): Promise<string> => {
    try {
        const fileName = `${folder}/${name}.${imageType}`;
        const storageFile = storage.file(fileName);

        // Convert image to the specified format
        const processedBuffer = await sharp(image)
            .withMetadata({ orientation: undefined })
            .toFormat(imageType)
            .toBuffer();

        const accessUrl: string = await new Promise<string>((resolve, reject) => {
            const stream = storageFile.createWriteStream({
                metadata: {
                    contentType: `image/${imageType}`,
                },
            });

            stream.on('error', (error) => {
                console.error('Error uploading image:', error);
                reject(new Error('Error uploading image'));
            });

            stream.on('finish', () => {
                const publicUrl = `https://storage.googleapis.com/${storage.name}/${encodeURIComponent(storageFile.name)}`;
                resolve(publicUrl);
            });

            stream.end(processedBuffer);
        });

        return accessUrl;
    } catch (error) {
        console.error('Error uploading image:', error);
        return "Error and no Image Url";
    }
};