import { Trends } from "@/components/dashboard/trends";

/**
 * The AccountTrends component to display the account trends in the dashboard
 *
 * @param {boolean} isCard - Whether the component is within a card or standalone
 * @returns {React.ReactNode} The AccountTrends component
 */
export default function AccountTrends({ isCard }: { isCard: boolean }): React.ReactNode {
   return (
      <Trends
         isCard = { isCard }
         type = "accounts"
      />
   );
};