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
import { Box, Grow } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { type Account } from "capital/accounts";
import { HTTP_STATUS } from "capital/server";
import { useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";

import AccountCard from "@/components/dashboard/accounts/card";
import { sendApiRequest } from "@/lib/api";
import { setAccounts } from "@/redux/slices/accounts";
import type { RootState } from "@/redux/store";

/**
 * Displays accounts in a draggable grid layout with persistence of order changes
 *
 * @returns {React.ReactNode} The Accounts component with drag-and-drop functionality
 */
export default function Accounts(): React.ReactNode {
   const dispatch = useDispatch(), navigate = useNavigate();
   const accounts: Account[] = useSelector((state: RootState) => state.accounts.value);
   const accountIds = useMemo(() => {
      return accounts.map(account => account.account_id ?? "");
   }, [accounts]);

   // Configure drag and drop sensors with touch, pointer and keyboard support
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

   // Handle account reordering with optimistic updates and server synchronization
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

         // Update account ordering optimistically with potential backup measures
         if (oldIndex !== undefined && newIndex !== undefined) {
            const oldAccounts = accounts.map(account => ({ ...account }));
            const newAccounts = arrayMove(accounts, oldIndex, newIndex).map(
               (account, index) => ({ ...account, account_order: index })
            );
            dispatch(setAccounts(newAccounts));

            // Sync new account ordering with server
            try {
               const accountIds: string[] = newAccounts.map(account => account.account_id || "");
               const response = await sendApiRequest<number>(
                  "dashboard/accounts/ordering", "PUT", { accountsIds: accountIds }, dispatch, navigate
               );

               if (response !== HTTP_STATUS.NO_CONTENT) {
                  throw new Error("Failed to update account ordering");
               }
            } catch (error) {
               // Revert optimistic update if server request fails
               console.error("Failed to update account ordering:", error);
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
                  items = { accountIds }
                  strategy = { rectSortingStrategy }
               >
                  {
                     accounts.length > 0 ? (
                        accounts.map((account, index) => (
                           <Grow
                              in = { true }
                              key = { `grow-${account.account_id}` }
                              mountOnEnter = { true }
                              timeout = { 125 + index * 125 }
                              unmountOnExit = { true }
                           >
                              <Grid
                                 size = { { xs: 12, sm: 6, md: 4, lg: 3 } }
                                 sx = {
                                    {
                                       minWidth: { xs: "none", sm: "330px" },
                                       maxWidth: "330px"
                                    }
                                 }
                              >
                                 <AccountCard account = { account } />
                              </Grid>
                           </Grow>
                        ))
                     ) : (
                        <Box
                           data-testid = "accounts-empty-message"
                           sx = { { display: "flex", justifyContent: "center", alignItems: "center", height: "175px ", width: "100%", fontWeight: "bold" } }
                        >
                           No available accounts
                        </Box>
                     )
                  }
               </SortableContext>
            </DndContext>
         </Grid>
         <Box sx = { { mt: 3 } }>
            <AccountCard account = { undefined } />
         </Box>
      </Box>
   );
}