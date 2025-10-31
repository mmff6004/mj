export interface EditResult {
  editedImageBase64: string; // For images and video thumbnails
  editedText: string | null;
  mimeType?: string;
  videoUrl?: string; // New: URL if it's a video
}

export interface GalleryItem extends EditResult {
  id: string;
  type: 'image' | 'video'; // New
}

export interface Character {
  id:string;
  name: string;
  description: string;
  referenceImageBase64?: string | null;
  referenceImageMimeType?: string | null;
}
