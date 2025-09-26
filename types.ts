export interface EditResult {
  editedImageBase64: string;
  editedText: string | null;
  mimeType?: string;
}

export interface GalleryItem extends EditResult {
  id: string;
}

export interface Character {
  id:string;
  name: string;
  description: string;
  referenceImageBase64?: string | null;
  referenceImageMimeType?: string | null;
}