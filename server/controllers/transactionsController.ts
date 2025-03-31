import { Transaction } from "capital/transactions";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as transactionsService from "@/service/transactionsService";

/**
 * Handles GET requests for fetching all transactions for a user.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the fetch request
 */
export const GET = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => transactionsService.fetchTransactions(res.locals.user_id))
);

/**
 * Handles POST requests for creating a new transaction for a user.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the creation request
 */
export const POST = asyncHandler(async(req: Request, res: Response) =>
   submitServiceRequest(res, async() => transactionsService.createTransaction(res.locals.user_id, req.body as Transaction))
);

/**
 * Handles PUT requests for updating an existing transaction.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the update request
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transaction_id: string = req.params.id;
   const updates: Partial<Transaction> = { ...req.body, transaction_id };

   return submitServiceRequest(res, async() => transactionsService.updateTransaction(user_id, transaction_id, updates));
});

/**
 * Handles DELETE requests for deleting an existing transaction.
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} The service response for the deletion request
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transaction_id: string = req.params.id;

   return submitServiceRequest(res, async() => transactionsService.deleteTransaction(user_id, transaction_id));
});