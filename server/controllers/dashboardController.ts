import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { sendErrors, sendSuccess } from "@/lib/api/response";
import { fetchAccounts } from "@/service/accountsService";
import { fetchFinancialNews, fetchMarketTrends } from "@/service/dashboardService";

export const GET = asyncHandler(async(_req: Request, res: Response) => {
   try {
      const user_id = res.locals.user.id;
      const [marketTrends, financialNews, accounts] = await Promise.all([
         fetchMarketTrends(),
         fetchFinancialNews(),
         fetchAccounts(user_id)
      ]);

      return sendSuccess(res, 200, "Dashboard", {
         marketTrends: marketTrends.data,
         financialNews: financialNews.data,
         accounts: accounts.data
      });
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { System: error.message });
   }
});