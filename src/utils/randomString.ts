/**
 * Generates a random alphanumeric string of the specified length.
 * 
 * @param length - The desired length of the generated string.
 * @returns A random string containing uppercase, lowercase letters, and digits.
 */
export const generateRandomString = (length: number): string => {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}