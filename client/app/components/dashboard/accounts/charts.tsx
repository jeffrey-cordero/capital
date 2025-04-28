import { Trends } from "@/components/dashboard/trends";

/**
 * Displays account balance trends on the dashboard and accounts page
 *
 * @param {boolean} isCard - Whether to render with card styling
 * @returns {React.ReactNode} Account trends visualization component
 */
export default function AccountTrends({ isCard }: { isCard: boolean }): React.ReactNode {
   return (
      <Trends
         isCard = { isCard }
         type = "accounts"
      />
   );
};