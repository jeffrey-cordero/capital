import { Transaction } from "capital/transactions";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as transactionsService from "@/services/transactionsService";

/**
 * Handles GET requests for fetching all transactions for a user ordered by date descending.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the fetch request
 */
export const GET = asyncHandler(async(req: Request, res: Response) => {
   return submitServiceRequest(res, async() => transactionsService.fetchTransactions(res.locals.user_id));
});

/**
 * Handles POST requests for creating a new transaction for a user.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the creation request
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transaction: Transaction = { ...req.body };

   return submitServiceRequest(res, async() => transactionsService.createTransaction(user_id, transaction));
});

/**
 * Handles PUT requests for updating an existing transactions.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the update request
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transaction_id: string = req.params.id;
   const transaction: Partial<Transaction> = { ...req.body, transaction_id };

   return submitServiceRequest(res, async() => transactionsService.updateTransaction(user_id, transaction));
});

/**
 * Handles DELETE requests for deleting existing transactions.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the deletion request
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transactionIds: string[] = req.body.transactionIds || [req.params.id];

   return submitServiceRequest(res, async() => transactionsService.deleteTransactions(user_id, transactionIds));
});