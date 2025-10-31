
import React from 'react';
import type { EditResult } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { DownloadIcon } from './icons/DownloadIcon';

interface ResultDisplayProps {
  isLoading: boolean;
  error: string | null;
  result: EditResult | null;
  originalImagePreview: string | null;
  mode: 'edit' | 'generate';
  loadingText?: string;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, error, result, originalImagePreview, mode, loadingText }) => {
  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = `data:${result.mimeType || 'image/png'};base64,${result.editedImageBase64}`;
    link.download = `generated-image-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <LoadingSpinner />
          <p className="text-gray-400 animate-pulse">{loadingText || 'AI is thinking...'}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-red-900/20 border border-red-500 p-4 rounded-lg">
          <p className="font-semibold text-red-400">An Error Occurred</p>
          <p className="text-sm text-red-300 mt-2">{error}</p>
        </div>
      );
    }
    
    if (result) {
      return (
        <div className="space-y-4 relative group">
          <img 
            src={`data:${result.mimeType || 'image/png'};base64,${result.editedImageBase64}`} 
            alt="Generated result" 
            className="w-full h-auto object-contain rounded-lg border-2 border-gray-700"
          />
           <button
              onClick={handleDownload}
              className="absolute top-4 right-4 bg-black/70 text-gray-100 p-3 rounded-full hover:bg-orange-600/90 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all duration-300 opacity-0 group-hover:opacity-100"
              aria-label="Download image"
              title="Download Image"
            >
              <DownloadIcon className="w-6 h-6" />
            </button>
          {result.editedText && (
            <div className="p-4 bg-gray-950/70 rounded-lg border border-gray-700">
              <p className="text-sm text-gray-300 italic">
                {result.editedText}
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <p className="text-lg">Your generated image will appear here.</p>
        {mode === 'edit' ? (
          <p className="text-sm mt-2">Upload an image and provide a prompt to get started.</p>
        ) : (
          <p className="text-sm mt-2">Describe the image you want to create in the prompt box.</p>
        )}
      </div>
    );
  };
  
  return (
    <div className="w-full h-full min-h-[30rem] flex justify-center items-center p-2 bg-gray-950 rounded-lg">
      {renderContent()}
    </div>
  );
};
