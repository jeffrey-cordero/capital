import {
   closestCenter,
   DndContext,
   type DragEndEvent,
   KeyboardSensor,
   PointerSensor,
   TouchSensor,
   useSensor,
   useSensors
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Box, Grow, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type Account } from "capital/accounts";
import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import AccountCard from "@/components/dashboard/accounts/card";
import { sendApiRequest } from "@/lib/api";
import { setAccounts } from "@/redux/slices/accounts";
import type { RootState } from "@/redux/store";

/**
 * The Accounts component to display the accounts in the dashboard
 *
 * @returns {React.ReactNode} The Accounts component
 */
export default function Accounts(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const ids = useMemo(() => {
      return accounts.map(account => account.account_id ?? "");
   }, [accounts]);

   // Configure drag and drop attributes
   const sensors = useSensors(
      useSensor(TouchSensor),
      useSensor(PointerSensor, {
         activationConstraint: {
            distance: 8
         }
      }),
      useSensor(KeyboardSensor, {
         coordinateGetter: sortableKeyboardCoordinates
      })
   );

   const handleDragEnd = useCallback(async(event: DragEndEvent) => {
      const { active, over } = event;

      // Only proceed if dropping on a different position
      if (active.id !== over?.id) {
         let oldIndex: number | undefined;
         let newIndex: number | undefined;

         // Find the indices of the dragged and target accounts
         for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            if (account.account_id === active.id) {
               oldIndex = i;
            }
            if (account.account_id === over?.id) {
               newIndex = i;
            }
         }

         // Update account order if both indices are found
         if (oldIndex !== undefined && newIndex !== undefined) {
            // Update order optimistically with potential backup measures
            const oldAccounts = accounts.map(account => ({ ...account }));
            const newAccounts = arrayMove(accounts, oldIndex, newIndex).map(
               (account, index) => ({ ...account, account_order: index })
            );
            dispatch(setAccounts(newAccounts));

            // Sync new order with server
            try {
               const accountIds: string[] = newAccounts.map(account => account.account_id || "");
               const response = await sendApiRequest<number>(
                  "dashboard/accounts/ordering", "PUT", { accountsIds: accountIds }, dispatch, navigate
               );

               if (response !== 204) {
                  throw new Error("Failed to update account order");
               }
            } catch (error) {
               // Revert optimistic update if server request fails
               console.error("Failed to update account order:", error);
               dispatch(setAccounts(oldAccounts));
            }
         }
      }
   }, [accounts, dispatch, navigate]);

   return (
      <Box id = "accounts">
         <Grid
            container = { true }
            justifyContent = "center"
            spacing = { 3 }
            sx = { { mt: -6 } }
         >
            <DndContext
               collisionDetection = { closestCenter }
               onDragEnd = { handleDragEnd }
               sensors = { sensors }
            >
               <SortableContext
                  items = { ids }
                  strategy = { rectSortingStrategy }
               >
                  {
                     accounts.length > 0 ? (
                        accounts.map((account, index) => (
                           <Grow
                              in = { true }
                              key = { `grow-${account.account_id}` }
                              mountOnEnter = { true }
                              timeout = { 200 + index * 200 }
                              unmountOnExit = { true }
                           >
                              <Grid
                                 size = { { xs: 12, sm: 6, md: 4, lg: 3 } }
                              >
                                 <AccountCard account = { account } />
                              </Grid>
                           </Grow>
                        ))
                     ) : (
                        <Typography
                           fontWeight = "bold"
                           variant = "body1"
                        >
                           No available accounts
                        </Typography>
                     )
                  }
               </SortableContext>
            </DndContext>
         </Grid>
         <Box sx = { { mt: 6 } }>
            <AccountCard account = { undefined } />
         </Box>
      </Box>
   );
}