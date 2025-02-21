import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { sendErrors, sendSuccess } from "@/lib/api/response";
import { fetchFinancialNews, fetchMarketTrends } from "@/service/homeService";

export const GET = asyncHandler(async(_req: Request, res: Response) => {
   try {
      const [marketTrends, financialNews] = await Promise.all([
         fetchMarketTrends(),
         fetchFinancialNews()
      ]);

      return sendSuccess(res, 200, "Home Data", { marketTrends, financialNews });
   } catch (error: any) {
      console.error(error);

      return sendErrors(res, 500, "Internal Server Error", { system: error.message });
   }
});