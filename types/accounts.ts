export type Account = {
   account_id: number;
   name: string;
   type: string;
   user_id: number;
}

export type AccountBalance = {
   account_balance_id: number;
   account_id: number;
   balance: number;
   year: number;
   month: number;
}