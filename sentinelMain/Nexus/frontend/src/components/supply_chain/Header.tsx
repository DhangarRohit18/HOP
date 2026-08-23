import React from "react";

export interface SupplyChainHeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<SupplyChainHeaderProps> = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col gap-1">
      {title && <h1 className="text-lg font-bold text-[#1B082C] font-mono-tech">{title}</h1>}
      {subtitle && <p className="text-sm text-[#81758F] font-mono-tech">{subtitle}</p>}
    </div>
  );
};

export default Header;
