/**
 * Creates a thumbnail from a video URL.
 * @param videoUrl The URL of the video (can be a blob URL).
 * @returns A promise that resolves to an object containing the base64 string and mime type of the thumbnail.
 */
export const createVideoThumbnail = (videoUrl: string): Promise<{ base64: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = "anonymous"; // Important for cross-origin sources
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return reject(new Error('Canvas 2D context not available.'));
    }

    // When the video metadata is loaded, we can get its dimensions
    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      // Seek to a frame that's likely to have content (e.g., 1 second in)
      video.currentTime = 1;
    };
    
    // When the video has seeked to the desired time, draw the frame
    video.onseeked = () => {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.8); // Use JPEG for smaller size
      
      // Cleanup DOM elements
      video.remove();
      canvas.remove();
      
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        resolve({ base64, mimeType });
      } else {
        reject(new Error('Failed to create base64 data from canvas.'));
      }
    };

    video.onerror = () => {
      // Cleanup DOM elements
      video.remove();
      canvas.remove();
      reject(new Error('Failed to load video for thumbnail generation.'));
    };
    
    // Start loading the video
    video.src = videoUrl;
    video.load(); // Some browsers require this
  });
};
