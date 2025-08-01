import React from 'react';
import styled from 'styled-components';

const LogoSvg = styled.svg`
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
`;

const PrivoLogo = ({ size = 60, color = "white" }) => {
  return (
    <LogoSvg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer shield */}
      <path
        d="M50 10L80 25V45C80 65 65 80 50 90C35 80 20 65 20 45V25L50 10Z"
        fill={color}
        fillOpacity="0.9"
      />
      
      {/* Inner shield */}
      <path
        d="M50 20L70 30V45C70 60 60 70 50 75C40 70 30 60 30 45V30L50 20Z"
        fill={color}
        fillOpacity="0.7"
      />
      
      {/* Lock icon in center */}
      <rect
        x="42"
        y="40"
        width="16"
        height="12"
        rx="2"
        fill={color}
        fillOpacity="0.3"
      />
      
      {/* Lock shackle */}
      <path
        d="M46 40V36C46 33.79 47.79 32 50 32C52.21 32 54 33.79 54 36V40"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        fillOpacity="0.8"
      />
      
      {/* Keyhole */}
      <circle
        cx="50"
        cy="46"
        r="2"
        fill={color}
        fillOpacity="0.4"
      />
      
      {/* P letter stylized */}
      <path
        d="M46 58L46 70M46 58L52 58C54 58 55 59 55 61C55 63 54 64 52 64L46 64"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fillOpacity="0.9"
      />
    </LogoSvg>
  );
};

export default PrivoLogo;