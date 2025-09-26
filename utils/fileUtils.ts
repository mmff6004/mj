/**
 * Reads a File object and converts it to a base64 encoded string and its mime type.
 * @param file The file to read.
 * @returns A promise that resolves to an object containing the base64 string and mime type.
 */
export const fileToBase64 = (file: File): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      if (!result || !result.includes(',')) {
        return reject(new Error(`Could not read file "${file.name}" as a data URL.`));
      }
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = () => reject(reader.error || new Error(`An error occurred while reading file: ${file.name}`));
    reader.readAsDataURL(file);
  });
};
