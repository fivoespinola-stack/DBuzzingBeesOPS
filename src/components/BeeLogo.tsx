import React from 'react';

interface BeeLogoProps {
  className?: string;
  size?: number;
}

export const BeeLogo: React.FC<BeeLogoProps> = ({ className = 'w-6 h-6', size }) => {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      width={size}
      height={size}
      aria-label="DBuzzingBees Cleaning Bee Logo"
    >
      {/* Back Wing */}
      <path
        d="M26 16C29 9 37 8 40 12C42.5 15.5 40 23 31 22"
        fill="#FFFFFF"
        fillOpacity="0.75"
        stroke="#171717"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Front Wing with subtle detail */}
      <path
        d="M21 15C24 7 33 6 36 10C38.5 13.5 36 21 27 21"
        fill="#FFFFFF"
        fillOpacity="0.9"
        stroke="#171717"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M26 12C28 15 31 17 33 16"
        stroke="#D4D4D8"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Cleaning Mop / Squeegee handle */}
      <path
        d="M13 38L21 28"
        stroke="#171717"
        strokeWidth="2.8"
        strokeLinecap="round"
      />
      {/* Squeegee Rubber Blade Head */}
      <path
        d="M8 34L17 43"
        stroke="#171717"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M9 35L16 42"
        stroke="#38BDF8"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* Clean sparkles */}
      <path
        d="M38 31L40 29M40 29L42 31M40 29V33M40 29V25"
        stroke="#FFB509"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="43" cy="37" r="1.5" fill="#38BDF8" />
      <circle cx="35" cy="38" r="1" fill="#38BDF8" />

      {/* Bee Body (Striped Oval) */}
      <ellipse
        cx="21"
        cy="26"
        rx="11.5"
        ry="8.5"
        transform="rotate(-15 21 26)"
        fill="#FFB509"
        stroke="#171717"
        strokeWidth="2.5"
      />

      {/* Bee Stripes */}
      <path
        d="M18 18C18.5 20.5 18.5 29.5 17 33"
        stroke="#171717"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M23 17C23.5 20.5 23.5 30 22 34"
        stroke="#171717"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Stinger */}
      <path
        d="M9 29.5L6.5 30.5L9.5 27.5Z"
        fill="#171717"
        stroke="#171717"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Bee Head */}
      <circle
        cx="29"
        cy="23"
        r="6.5"
        fill="#FFB509"
        stroke="#171717"
        strokeWidth="2.5"
      />

      {/* Eye & Smile */}
      <circle cx="31" cy="21.5" r="1.4" fill="#171717" />
      <path
        d="M30 24.5C31 25.5 32.5 25.3 33.2 24.2"
        stroke="#171717"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* Antennae */}
      <path
        d="M30.5 17C31.5 13 34.5 11 36.5 12"
        stroke="#171717"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="37" cy="12.5" r="1.8" fill="#171717" />

      <path
        d="M28 17C28.5 14 30.5 12.5 32 13"
        stroke="#171717"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="32.5" cy="13.5" r="1.5" fill="#171717" />
    </svg>
  );
};
