import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-yellow-400">
        MJ AI
      </h1>
      <p className="mt-2 text-lg text-gray-400">
        Bring your creative visions to life. Edit images with the power of generative AI.
      </p>
    </header>
  );
};