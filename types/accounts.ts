export type Account = {
   account_id: string;
   user_id: string;
   account_order: number;
   name: string;
   type: string;
   image: string;
   lastUpdated: string;
   history: { 
      year: string; 
      month: string;
      amount: number; 
   }[];
}