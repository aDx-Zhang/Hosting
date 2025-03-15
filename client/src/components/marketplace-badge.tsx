import { SiShopify } from "react-icons/si";
import { ShoppingBag, Store } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MarketplaceBadgeProps {
  marketplace: string;
}

export function MarketplaceBadge({ marketplace }: MarketplaceBadgeProps) {
  const getMarketplaceColor = (marketplace: string) => {
    switch (marketplace) {
      case 'olx':
        return 'bg-[#34A853] text-white';
      case 'vinted':
        return 'bg-[#1A73E8] text-white';
      case 'allegro':
        return 'bg-[#EA4335] text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getMarketplaceIcon = (marketplace: string) => {
    switch (marketplace) {
      case 'olx':
        return <Store className="mr-1 h-3 w-3" />;
      case 'vinted':
        return <SiShopify className="mr-1 h-3 w-3" />;
      case 'allegro':
        return <ShoppingBag className="mr-1 h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <Badge className={`${getMarketplaceColor(marketplace)} flex items-center`}>
      {getMarketplaceIcon(marketplace)}
      {marketplace.toUpperCase()}
    </Badge>
  );
}