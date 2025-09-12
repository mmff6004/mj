import React, { useState, useCallback } from 'react';
import { UploadIcon } from './icons/UploadIcon';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  preview: string | null;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, preview }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleDragEvents = useCallback((e: React.DragEvent<HTMLLabelElement>, dragging: boolean) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(dragging);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
      handleDragEvents(e, false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        onImageUpload(e.dataTransfer.files[0]);
      }
  }, [handleDragEvents, onImageUpload]);


  return (
    <div>
      <label
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDrop={handleDrop}
        className={`flex justify-center items-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300
        ${isDragging ? 'border-orange-500 bg-gray-800' : 'border-gray-700 hover:border-orange-500 hover:bg-gray-800/50'}`}
      >
        {preview ? (
          <img src={preview} alt="Image preview" className="object-contain h-full w-full rounded-md p-2" />
        ) : (
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-500">
            <UploadIcon className="w-10 h-10 mb-3" />
            <p className="mb-2 text-sm"><span className="font-semibold">Click to upload</span> or drag and drop</p>
            <p className="text-xs">PNG, JPG, WEBP, etc.</p>
          </div>
        )}
        <input id="dropzone-file" type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
      </label>
    </div>
  );
};