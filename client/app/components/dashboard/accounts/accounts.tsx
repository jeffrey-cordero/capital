import {
   closestCenter,
   DndContext,
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
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import AccountCard from "@/components/dashboard/accounts/account";
import { sendApiRequest } from "@/lib/api";
import { setAccounts } from "@/redux/slices/accounts";

export default function Accounts({ accounts }: { accounts: Account[] }) {
   // Drag and drop for accounts
   const dispatch = useDispatch(), navigate = useNavigate();
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

   const handleDragEnd = async(event: any) => {
      const { active, over } = event;

      if (active.id !== over?.id) {
         let oldIndex: number | undefined, newIndex: number | undefined;

         for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];

            if (account.account_id === active.id) {
               // Original account
               oldIndex = i;
            }

            if (account.account_id === over?.id) {
               // Swapping account
               newIndex = i;
            }
         }

         if (oldIndex !== undefined && newIndex !== undefined) {
            // Optimistic ordering update
            const oldAccounts = accounts.map(account => ({ ...account }));
            const newAccounts = arrayMove(accounts, oldIndex, newIndex).map(
               (account, index) => ({ ...account, account_order: index })
            );
            dispatch(setAccounts(newAccounts));

            // Send ordering request to the server
            const ordering = newAccounts.map(account => account.account_id);
            sendApiRequest(
               "dashboard/accounts/ordering", "POST", { accounts: ordering }, dispatch, navigate
            ).then((result) => {
               // Revert back the optimistic update
               if (result !== 204) dispatch(setAccounts(oldAccounts));
            }).catch((error) => {
               console.error(error);
            });
         }
      }
   };

   return (
      <Box
         id = "accounts"
      >
         <Box className = "animation-container">
            <Box
               alt = "Accounts"
               className = "floating"
               component = "img"
               src = "/svg/accounts.svg"
               sx = { { width: 350, height: "auto", mb: 6 } }
            />
         </Box>
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
                  items = { accounts.map((account) => account.account_id ?? "") }
                  strategy = { rectSortingStrategy }
               >
                  {
                     accounts.length > 0 ? accounts.map((account, index) => {
                        return (
                           <Grow
                              in = { true }
                              key = { `grow-${account.account_id}` }
                              mountOnEnter = { true }
                              timeout = { 200 + index * 200 }
                              unmountOnExit = { true }
                           >
                              <Grid
                                 size = { { xs: 12, sm: 6, md: 4, lg: 3  } }
                              >
                                 <AccountCard
                                    account = { account }
                                 />
                              </Grid>
                           </Grow>
                        );
                     }) : (
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
            <AccountCard
               account = { undefined }
            />
         </Box>
      </Box>
   );
}