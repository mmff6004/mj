import React from 'react';
import { UploadIcon } from './icons/UploadIcon';
import { XCircleIcon } from './icons/XCircleIcon';

interface AdditionalImageUploaderProps {
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
  preview: string | null;
}

export const AdditionalImageUploader: React.FC<AdditionalImageUploaderProps> = ({ onImageUpload, onImageRemove, preview }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg">
      <label className="block mb-2 text-sm font-medium text-gray-300">
        Add Image (Optional)
      </label>
      <div className="mt-1">
        {preview ? (
          <div className="relative w-32 h-32 group">
            <img src={preview} alt="Additional content preview" className="object-cover w-full h-full rounded-md border border-gray-600" />
            <button
              onClick={(e) => {
                e.preventDefault();
                onImageRemove();
              }}
              className="absolute -top-2 -right-2 bg-gray-800 text-gray-300 rounded-full hover:bg-red-600 hover:text-white transition-colors"
              aria-label="Remove additional image"
              title="Remove"
            >
              <XCircleIcon className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <label
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="flex justify-center items-center w-full h-32 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-orange-500 hover:bg-gray-800/50 transition-colors"
          >
            <div className="flex flex-col items-center justify-center text-gray-500 text-center">
              <UploadIcon className="w-8 h-8 mb-2" />
              <p className="text-xs">
                <span className="font-semibold">Click or drop</span>
                <br/>
                an image to add
              </p>
            </div>
            <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
          </label>
        )}
      </div>
       <p className="text-xs text-gray-500 mt-2">Add an object or element to incorporate into the main image.</p>
    </div>
  );
};
