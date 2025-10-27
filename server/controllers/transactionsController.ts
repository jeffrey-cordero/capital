import { Transaction } from "capital/transactions";
import { Request, Response } from "express";
import asyncHandler from "express-async-handler";

import { submitServiceRequest } from "@/lib/services";
import * as transactionsService from "@/services/transactionsService";

/**
 * Fetches all transactions for the authenticated user
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with transactions
 */
export const GET = asyncHandler(async(_: Request, res: Response) => {
   return submitServiceRequest(res, async() => transactionsService.fetchTransactions(res.locals.user_id));
});

/**
 * Creates a new transaction
 *
 * @param {Request} req - Express request object with transaction data
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with creation confirmation
 */
export const POST = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transaction: Transaction = { ...req.body };

   return submitServiceRequest(res, async() => transactionsService.createTransaction(user_id, transaction));
});

/**
 * Updates an existing transaction
 *
 * @param {Request} req - Express request object with updated data
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with update confirmation
 */
export const PUT = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transaction_id: string = req.params.id;
   const transaction: Partial<Transaction> = { ...req.body, transaction_id };

   return submitServiceRequest(res, async() => transactionsService.updateTransaction(user_id, transaction));
});

/**
 * Deletes one or more transactions
 *
 * @param {Request} req - Express request object with transaction ID(s)
 * @param {Response} res - Express response object
 * @returns {Promise<Response>} Service response with deletion confirmation
 */
export const DELETE = asyncHandler(async(req: Request, res: Response) => {
   const user_id: string = res.locals.user_id;
   const transactionIds: string[] = req.body.transactionIds || [req.params.id];

   return submitServiceRequest(res, async() => transactionsService.deleteTransactions(user_id, transactionIds));
});