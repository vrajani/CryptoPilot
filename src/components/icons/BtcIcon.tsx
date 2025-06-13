import { Bitcoin } from 'lucide-react';
import type React from 'react';

interface BtcIconProps {
  className?: string;
}

const BtcIcon: React.FC<BtcIconProps> = ({ className }) => {
  return <Bitcoin className={className} />;
};

export default BtcIcon;
