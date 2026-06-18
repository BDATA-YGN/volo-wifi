"use client";
import React from 'react';

const UnauthorizedPage: React.FC = () => {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="max-w-md w-full text-center">
        <svg
          aria-label="Illustration of a locked door with a red warning sign indicating unauthorized access"
          className="mx-auto mb-8 w-full max-w-xs text-orange-600"
          fill="none"
          height="200"
          role="img"
          viewBox="0 0 64 64"
          width="300"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect fill="#F87171" height="64" rx="12" width="64" />
          <rect fill="white" height="36" rx="6" width="28" x="18" y="14" />
          <rect fill="#F87171" height="12" rx="3" width="8" x="28" y="28" />
          <rect fill="#B91C1C" height="6" rx="1.5" width="4" x="30" y="32" />
          <circle cx="48" cy="16" fill="white" r="10" />
          <path
            d="M44 12l8 8M52 12l-8 8"
            stroke="#B91C1C"
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>

        <h1 className="text-4xl font-extrabold text-orange-600 mb-4">Unauthorized</h1>
        <p className="text-gray-700 mb-6 text-lg">
          You do not have permission to access this page. Please login with the appropriate
          credentials or contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
