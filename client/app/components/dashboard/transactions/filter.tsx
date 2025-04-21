import {
   FormControl,
   InputLabel,
   MenuItem,
   Select,
   type SelectChangeEvent,
   Stack
} from "@mui/material";
import type { GridFilterInputMultipleValueProps, GridFilterItem } from "@mui/x-data-grid";
import type { Account } from "capital/accounts";
import type { BudgetCategory, BudgetPeriod, BudgetType, OrganizedBudgets } from "capital/budgets";
import type { Transaction } from "capital/transactions";
import { useCallback, useRef } from "react";
import { useSelector } from "react-redux";

import { RenderAccountChip, RenderCategoryChip } from "@/components/dashboard/transactions/render";
import type { TransactionRowModel } from "@/components/dashboard/transactions/table";
import { type BudgetsState } from "@/redux/slices/budgets";
import type { RootState } from "@/redux/store";

/**
 * Gets the category information for a given category ID.
 *
 * @param {OrganizedBudgets} budgets - The organized budgets.
 * @param {string | null | undefined} categoryId - The ID of the category.
 * @param {BudgetType} type - The type of the category (Income or Expenses)
 * @returns {Object | null} The category information.
 */
function getCategoryInfo(
   budgets: OrganizedBudgets,
   categoryId: string | null | undefined,
   type: BudgetType
): { name: string; type: BudgetType } | null {
   if (!categoryId) return null;

   const category: BudgetCategory | null = budgets[type].categories.find((c) => {
      return c.budget_category_id === categoryId;
   }) || null;

   // Missing based on an invalid budget category ID or deletion
   return category ? { name: category.name || "", type: type } : null;
};

/**
 * Gets the apply filter function for a given filter item shared across
 * both account and category filters.
 *
 * @param {GridFilterItem} filterItem - The filter item to apply.
 * @returns {Function} The apply filter function.
 */
export function getApplyFilterFn(filterItem: GridFilterItem): (_item: string) => boolean {
   const selected = filterItem.value;

   return (item: string) => {
      if (Array.isArray(selected)) {
         return selected.length === 0 || (selected.length === 1 && selected[0] === "all") || selected.includes(item);
      }

      return true;
   };
}

/**
 * Filters the transactions based on the current applied filter-identifier combination.
 *
 * @param {Transaction[]} transactions - The transactions to filter.
 * @param {Record<string, Account>} accountsMap - The mapping of account IDs to accounts.
 * @param {BudgetsState["value"]} budgets - The organized budgets state.
 * @param {"account" | "budget" | undefined} filter - The filter to apply.
 * @param {string | undefined} identifier - The identifier to filter by.
 * @returns {TransactionRowModel[]} The filtered transactions.
 */
export function filterTransactions(
   transactions: Transaction[],
   accountsMap: Record<string, Account>,
   budgets: BudgetsState["value"],
   filter: "account" | "budget" | undefined,
   identifier: string | undefined
): TransactionRowModel[] {
   const period: BudgetPeriod = budgets.period;
   const balances: Record<string, number> = Object.values(accountsMap).reduce((acc, record) => {
      acc[record.account_id || ""] = Number(record.balance);

      return acc;
   }, {} as Record<string, number>);

   return transactions.reduce((acc, record, index) => {
      // Determine the type of the transaction based on the budget category ID or the amount
      const categoryInfo = getCategoryInfo(budgets, record.budget_category_id, record.type);
      const transaction: TransactionRowModel = {
         ...record,
         index,
         id: record.transaction_id || "",
         account: accountsMap[record.account_id ?? ""]?.name || "",
         category: categoryInfo?.name || "",
         balance: balances[record.account_id || ""] || undefined,
         type: record.type,
         budget_category_id: record.budget_category_id || budgets[record.type]?.budget_category_id
      };

      if (record.account_id && balances[record.account_id]) {
         // Update the propagating account balances
         balances[record.account_id] -= record.amount;
      }

      switch (filter) {
         case "account": {
            // Match transactions based on account ID's
            if (record.account_id === identifier) {
               acc.push(transaction);
            }

            break;
         }
         case "budget": {
            // Match transactions based on the current budget period
            const [year, month] = transaction.date.split("T")[0].split("-");
            const isValidType = identifier === record.type;

            if (isValidType && parseInt(year) === period.year && parseInt(month) === period.month) {
               acc.push(transaction);
            }

            break;
         }
         default: {
            acc.push(transaction);
         }
      }

      return acc;
   }, [] as TransactionRowModel[]);
}

/**
 * Props for the TransactionFilter component, which is used to filter the transactions
 * based on accounts or categories within the column header menu.
 *
 * @interface TransactionFilterProps
 * @property {GridFilterInputMultipleValueProps} props - The props for the grid filter multi-select input.
 * @property {"Account" | "Category"} type - The type of the filter.
 * @property {Record<string, BudgetType>} budgetsMap - The mapping of budget category IDs to budget types.
 */
interface TransactionFilterProps {
   props: GridFilterInputMultipleValueProps;
   type: "Account" | "Category";
   budgetsMap: Record<string, BudgetType>;
}

/**
 * The TransactionFilter component.
 *
 * @param {TransactionFilterProps} props - The props for the TransactionFilter component.
 * @returns {React.ReactNode} The TransactionFilter component.
 */
export function TransactionFilter({ props, budgetsMap, type }: TransactionFilterProps): React.ReactNode {
   const { item, applyValue } = props; // eslint-disable-line react/prop-types
   const multiSelectRef = useRef<string[]>(["all"]);

   const accounts: Account[] | null = useSelector((state: RootState) => {
      return type === "Account" ? state.accounts.value : null;
   });
   const budgets: OrganizedBudgets | null = useSelector((state: RootState) => {
      return type === "Category" ? state.budgets.value : null;
   });

   const updatedSelectedItems = useCallback((event: SelectChangeEvent<string[]>) => {
      const { value } = event.target;
      const selected: string[] = Array.isArray(value) ? value : [value];

      // Toggle between all and selected items
      if (selected.length === 1 && selected[0] === "all") {
         multiSelectRef.current = ["all"];
      } else {
         multiSelectRef.current = selected.filter((v: string) => v !== "all");
      }

      // Update the filter state within the data grid
      applyValue({ ...item, value: multiSelectRef.current });
   }, [item, applyValue]);

   return (
      <FormControl>
         <InputLabel
            htmlFor = { `filter-${type}` }
            shrink = { true }
            variant = "outlined"
         >
            { type }
         </InputLabel>
         <Select
            label = { type }
            multiple = { true }
            onChange = { updatedSelectedItems }
            renderValue = {
               (selected: string[]) => {
                  return (
                     <Stack
                        columnGap = { 1 }
                        direction = "row"
                        rowGap = { 1 }
                        sx = { { maxWidth: "226px", flexWrap: "wrap", justifyContent: "flex-start", alignItems: "center" } }
                     >
                        {
                           selected.length === 0 ? null : selected.map((value) => {
                              return value === "all" ? null : (
                                 type === "Account" ? (
                                    <RenderAccountChip
                                       account_id = { value }
                                       key = { `selected-${value}` }
                                    />
                                 ) : (
                                    <RenderCategoryChip
                                       budget_category_id = { value }
                                       key = { `selected-${value}` }
                                       type = { budgetsMap[value] || "Income" }
                                    />
                                 )
                              );
                           })
                        }
                     </Stack>
                  );
               }
            }
            slotProps = {
               {
                  input: {
                     id: `filter-${type}`
                  }
               }
            }
            value = { multiSelectRef.current }
            variant = "outlined"
         >
            <MenuItem
               key = { `filter-all-${type}` }
               sx = { { color: "transparent" } }
               value = { "all" }
            >
               -- Select --
            </MenuItem>
            {
               budgets !== null ? (
                  [
                     <MenuItem
                        key = { `filter-${budgets.Income.budget_category_id}` }
                        sx = { { fontWeight: "bold" } }
                        value = { budgets.Income.budget_category_id }
                     >
                        Income
                     </MenuItem>,
                     budgets?.Income.categories.map((category) => (
                        <MenuItem
                           key = { `filter-${category.budget_category_id}` }
                           sx = { { pl: 3.5 } }
                           value = { category.budget_category_id }
                        >
                           { category.name }
                        </MenuItem>
                     )),
                     <MenuItem
                        key = { `filter-${budgets?.Expenses.budget_category_id}` }
                        sx = { { fontWeight: "bold" } }
                        value = { budgets?.Expenses.budget_category_id }
                     >
                        Expenses
                     </MenuItem>,
                     budgets?.Expenses.categories.map((category) => (
                        <MenuItem
                           key = { `filter-${category.budget_category_id}` }
                           sx = { { pl: 3.5 } }
                           value = { category.budget_category_id }
                        >
                           { category.name }
                        </MenuItem>
                     ))
                  ]
               ) : (
                  [
                     accounts?.map((account) => (
                        <MenuItem
                           key = { `filter-${account.account_id}` }
                           value = { account.account_id }
                        >
                           { account.name }
                        </MenuItem>
                     ))
                  ]
               )
            }
         </Select>
      </FormControl>
   );
}