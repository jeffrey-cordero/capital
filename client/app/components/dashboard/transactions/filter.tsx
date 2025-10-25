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
 * Gets category information for a given category ID
 *
 * @param {OrganizedBudgets} budgets - Organized budgets structure
 * @param {string | null | undefined} categoryId - Category ID to look up
 * @param {BudgetType} type - Budget type (Income or Expenses)
 * @returns {Object | null} Category information or null if not found
 */
function getCategoryInfo(
   budgets: OrganizedBudgets,
   categoryId: string | null | undefined,
   type: BudgetType
): { name: string; type: BudgetType } | null {
   if (!categoryId) return null;

   // Search for the category based on the provided budget type and category ID
   const category: BudgetCategory | null = budgets[type].categories.find((c) => {
      return c.budget_category_id === categoryId;
   }) || null;

   // Could represent a main, missing, or deleted budget category
   return category ? { name: category.name || "", type: type } : null;
};

/**
 * Creates filter function for DataGrid filtering
 *
 * @param {GridFilterItem} filterItem - Filter item to apply
 * @returns {Function} Filter function that checks if an item is selected
 */
export function getApplyFilterFn(filterItem: GridFilterItem): (item: string) => boolean {
   const selected = filterItem.value;

   return (item: string) => {
      if (Array.isArray(selected)) {
         return selected.length === 0 || (selected.length === 1 && selected[0] === "all") || selected.includes(item);
      }

      return true;
   };
}

/**
 * Filters transactions based on account or budget or returns all normalized transactions
 *
 * @param {Transaction[]} transactions - Transactions to filter
 * @param {Record<string, Account>} accountsMap - Account ID to account mappings
 * @param {BudgetsState["value"]} budgets - Budget state value
 * @param {"account" | "budget" | undefined} filter - Filter type to apply
 * @param {string | undefined} identifier - Filter identifier
 * @returns {TransactionRowModel[]} Filtered transactions with UI metadata
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
      const budgetCategory = getCategoryInfo(budgets, record.budget_category_id, record.type);
      const transaction: TransactionRowModel = {
         ...record,
         index,
         id: record.transaction_id || "",
         account: accountsMap[record.account_id || ""]?.name || "",
         category: budgetCategory?.name || "",
         balance: balances[record.account_id || ""] || undefined,
         type: record.type,
         budget_category_id: record.budget_category_id || budgets[record.type]?.budget_category_id
      };

      if (record.account_id && balances[record.account_id]) {
         // Update the rolling account balance
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
            const isValidType = identifier === record.type;
            const [year, month] = transaction.date.split("T")[0].split("-");

            if (isValidType && Number(year) === period.year && Number(month) === period.month) {
               acc.push(transaction);
            }

            break;
         }
         default: {
            // Push all transactions for no applicable filter
            acc.push(transaction);
         }
      }

      return acc;
   }, [] as TransactionRowModel[]);
}

/**
 * Props for the transaction filter component
 *
 * @property {GridFilterInputMultipleValueProps} props - DataGrid filter input properties
 * @property {"Account" | "Category"} type - Filter type (Account or Category)
 * @property {Record<string, BudgetType>} budgetsMap - Budget category ID to type mapping
 */
interface TransactionFilterProps {
   props: GridFilterInputMultipleValueProps;
   type: "Account" | "Category";
   budgetsMap: Record<string, BudgetType>;
}

/**
 * Multi-select filter for transaction account or category columns
 *
 * @param {TransactionFilterProps} props - The TransactionFilter component props
 * @returns {React.ReactNode} Filter component for DataGrid
 */
export function TransactionFilter({ props, budgetsMap, type }: TransactionFilterProps): React.ReactNode {
   const { item, applyValue } = props; // eslint-disable-line react/prop-types
   const selectInputRef = useRef<string[]>(["all"]);

   // Fetch the accounts or budgets based on the type of the filter
   const accounts: Account[] | null = useSelector((state: RootState) => {
      return type === "Account" ? state.accounts.value : null;
   });
   const budgets: OrganizedBudgets | null = useSelector((state: RootState) => {
      return type === "Category" ? state.budgets.value : null;
   });

   const updatedSelectedItems = useCallback((event: SelectChangeEvent<string[]>) => {
      // Normalize the selected items from the event target
      const { value } = event.target;
      const selected: string[] = Array.isArray(value) ? value : [value];

      // Toggle between all and selected items
      if (selected.length === 1 && selected[0] === "all") {
         selectInputRef.current = ["all"];
      } else {
         selectInputRef.current = selected.filter((v: string) => v !== "all");
      }

      // Apply the updated filter within the data grid component
      applyValue({ ...item, value: selectInputRef.current });
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
            value = { selectInputRef.current }
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