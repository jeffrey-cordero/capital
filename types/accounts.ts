export type Account = {
   account_id: number;
   name: string;
   type: string;
   user_id: number;
   history: { 
      year: string; 
      month: string;
      amount: number; 
   }[];
}