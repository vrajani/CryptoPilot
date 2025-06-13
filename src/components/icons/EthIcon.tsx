import type React from 'react';

interface EthIconProps {
  className?: string;
}

const EthIcon: React.FC<EthIconProps> = ({ className }) => {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Ethereum icon"
    >
      <path d="M12 2L12 8.26" />
      <path d="M12 22L12 15.74" />
      <path d="M12 2L5.5 12L12 15.74L18.5 12L12 2Z" />
      <path d="M5.5 12L12 22L18.5 12L12 15.74L5.5 12Z" />
    </svg>
  );
};

export default EthIcon;
