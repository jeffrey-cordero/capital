import {
   faCalendarDay,
   faCalendarDays,
   faCaretDown,
   faClockRotateLeft,
   faPenToSquare,
   faTrashCan
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
   Box,
   Button,
   Collapse,
   FormControl,
   FormHelperText,
   InputLabel,
   List,
   ListItemButton,
   ListItemIcon,
   ListItemText,
   OutlinedInput,
   Stack,
   TextField,
   useTheme
} from "@mui/material";
import { type Account, type AccountHistory, accountHistorySchema } from "capital/accounts";
import { useCallback, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { z } from "zod";

import { Expand } from "@/components/global/expand";
import Graph from "@/components/global/graph";
import { Modal, ModalSection } from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { normalizeDate } from "@/lib/dates";
import { displayCurrency, displayDate } from "@/lib/display";
import { handleValidationErrors } from "@/lib/validation";
import { updateAccount } from "@/redux/slices/accounts";
import { addNotification } from "@/redux/slices/notifications";

// Define date constraints for the date picker
const [minDate, maxDate] = [
   new Date("1800-01-01").toISOString().split("T")[0],
   new Date().toISOString().split("T")[0]
];

// Schema for validating account history updates
const accountHistoryUpdateSchema = z.object({
   history_balance: accountHistorySchema.shape.balance,
   last_updated: accountHistorySchema.shape.last_updated
});

// Type definition for the HistoryEdits component props
interface HistoryEditsProps {
   account: Account;
   month: string;
   history: AccountHistory[];
}

function HistoryEdits({ account, month, history }: HistoryEditsProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const [expanded, setExpanded] = useState<boolean>(false);

   const deleteAccountHistory = useCallback(async(last_updated: string) => {
      // Prevent deletion of the only history record
      if (account.history.length === 1) {
         dispatch(addNotification({
            type: "error",
            message: "At least one history record must remain for this account"
         }));

         return;
      }

      try {
         const result = await sendApiRequest<number>(
            `dashboard/accounts/${account.account_id}`, "DELETE",
            { last_updated },
            dispatch,
            navigate
         );

         if (result === 204) {
            // Update the account state by filtering out the deleted record
            dispatch(updateAccount({
               account: {
                  ...account,
                  history: account.history.filter((record) => record.last_updated !== last_updated)
               }
            }));
         }
      } catch (error) {
         console.error(error);
      }
   }, [account, dispatch, navigate]);

   return (
      <Stack
         direction = "column"
         spacing = { 1 }
      >
         <ListItemButton onClick = { () => setExpanded(!expanded) }>
            <ListItemIcon sx = { { mr: -3.5 } }>
               <FontAwesomeIcon icon = { faCalendarDays } />
            </ListItemIcon>
            <ListItemText primary = { month } />
            <Expand
               disableRipple = { true }
               expand = { expanded }
            >
               <FontAwesomeIcon
                  icon = { faCaretDown }
                  style = { { padding: "0 5px" } }
               />
            </Expand>
         </ListItemButton>
         <Collapse
            in = { expanded }
            timeout = "auto"
            unmountOnExit = { true }
         >
            <List
               component = "div"
               disablePadding = { true }
            >
               {
                  history.map((historyItem) => (
                     <ListItemButton
                        disableRipple = { true }
                        disableTouchRipple = { true }
                        key = { `${account.account_id}-${historyItem.last_updated}` }
                        sx = {
                           {
                              pl: 4,
                              flexWrap: "wrap",
                              justifyContent: "center",
                              cursor: "default",
                              "&:hover": {
                                 backgroundColor: "transparent"
                              }
                           }
                        }
                     >
                        <ListItemIcon sx = { { mr: -3.5 } }>
                           <FontAwesomeIcon icon = { faCalendarDay } />
                        </ListItemIcon>
                        <ListItemText
                           primary = { displayCurrency(historyItem.balance) }
                           secondary = { displayDate(historyItem.last_updated) }
                           sx = { { userSelect: "text", cursor: "text" } }
                        />
                        <FontAwesomeIcon
                           color = "hsl(0, 90%, 50%)"
                           fontSize = "15px"
                           icon = { faTrashCan }
                           onClick = { () => deleteAccountHistory(historyItem.last_updated) }
                           style = { { cursor: "pointer", paddingRight: "12px" } }
                        />
                     </ListItemButton>
                  ))
               }
            </List>
         </Collapse>
      </Stack>
   );
}

function HistoryModal({ account, disabled }: { account: Account, disabled: boolean }) {
   // Allows users to view history records by month and add new history records
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme();
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors }
   } = useForm();
   const [open, setOpen] = useState<boolean>(false);

   // Groups account history records by month/year for organized display
   const historyByMonth = useMemo(() => {
      return account.history.reduce((acc: Record<string, AccountHistory[]>, record) => {
         // Extract month and year from the date string
         const parts = record.last_updated.split("-");
         // Format as "MM/YYYY"
         const key = parts[1].padStart(2, "0") + "/" + parts[0];

         if (!acc[key]) {
            acc[key] = [];
         }

         acc[key].push(record);
         return acc;
      }, {});
   }, [account.history]);

   const onSubmit = async(data: any) => {
      try {
         const fields = accountHistoryUpdateSchema.safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError);
         } else {
            const update = {
               balance: data.history_balance,
               last_updated: normalizeDate(data.last_updated)
            };

            const result = await sendApiRequest<number>(
               `dashboard/accounts/${account.account_id}`, "PUT", update, dispatch, navigate
            );

            if (result === 204) {
               // Update the account state with the new history record
               dispatch(updateAccount({
                  account: account,
                  history: {
                     balance: update.balance,
                     last_updated: update.last_updated.toISOString().split("T")[0]
                  }
               }));

               // Reset the form for future submissions
               reset();
            }
         }
      } catch (error) {
         console.error(error);
      }
   };

   // Handler to close the modal
   const closeHistoryModal = useCallback(() => {
      setOpen(false);
      // Reset form when closing modal to clear any previous input
      reset({
         history_balance: "",
         last_updated: ""
      });
   }, [reset]);

   return (
      <Box>
         <Button
            className = "btn-primary"
            color = "info"
            disabled = { isSubmitting || disabled }
            fullWidth = { true }
            loading = { isSubmitting }
            onClick = { () => setOpen(true) }
            startIcon = { <FontAwesomeIcon icon = { faClockRotateLeft } /> }
            type = "button"
            variant = "contained"
         >
            History
         </Button>
         <Modal
            onClose = { closeHistoryModal }
            open = { open }
            sx = { { width: { xs: "85%", md: "65%", lg: "55%", xl: "40%" }, maxWidth: "85%", p: { xs: 2, sm: 3 }, maxHeight: "80%" } }
         >
            <ModalSection title = "History">
               <Box>
                  <form onSubmit = { handleSubmit(onSubmit) }>
                     <Stack
                        direction = "column"
                        spacing = { 2 }
                        sx = { { mt: 0 } }
                     >
                        { /* Display history records grouped by month */ }
                        {
                           Object.keys(historyByMonth).map((month) => (
                              <HistoryEdits
                                 account = { account }
                                 history = { historyByMonth[month] }
                                 key = { `${account.account_id}-${month}` }
                                 month = { month }
                              />
                           ))
                        }

                        { /* Form for adding new history records */ }
                        <Stack
                           direction = "column"
                           spacing = { 2 }
                        >
                           <Controller
                              control = { control }
                              name = "history_balance"
                              render = {
                                 ({ field }) => (
                                    <FormControl error = { Boolean(errors.history_balance) }>
                                       <InputLabel htmlFor = "history-balance">
                                          Balance
                                       </InputLabel>
                                       <OutlinedInput
                                          { ...field }
                                          aria-label = "Balance"
                                          disabled = { isSubmitting || disabled }
                                          fullWidth = { true }
                                          id = "history-balance"
                                          inputProps = { { step: 0.01 } }
                                          label = "Balance"
                                          type = "number"
                                          value = { field.value || "" }
                                       />
                                       {
                                          errors.history_balance && (
                                             <FormHelperText>
                                                { errors.history_balance?.message?.toString() }
                                             </FormHelperText>
                                          )
                                       }
                                    </FormControl>
                                 )
                              }
                           />
                           <Controller
                              control = { control }
                              name = "last_updated"
                              render = {
                                 ({ field }) => (
                                    <FormControl error = { Boolean(errors.last_updated) }>
                                       <TextField
                                          { ...field }
                                          color = { errors.last_updated ? "error" : "info" }
                                          disabled = { isSubmitting || disabled }
                                          error = { Boolean(errors.last_updated) }
                                          fullWidth = { true }
                                          id = "balance-date"
                                          label = "Date"
                                          size = "small"
                                          slotProps = {
                                             {
                                                htmlInput: {
                                                   min: minDate,
                                                   max: maxDate
                                                },
                                                inputLabel: {
                                                   shrink: true
                                                },
                                                input: {
                                                   size: "medium"
                                                }
                                             }
                                          }
                                          sx = {
                                             {
                                                colorScheme: theme.palette.mode === "dark" ? "dark" : "inherit"
                                             }
                                          }
                                          type = "date"
                                          value = { field.value || "" }
                                       />
                                       {
                                          errors.last_updated && (
                                             <FormHelperText>
                                                { errors.last_updated?.message?.toString() }
                                             </FormHelperText>
                                          )
                                       }
                                    </FormControl>
                                 )
                              }
                           />
                           <Button
                              className = "btn-primary"
                              color = "primary"
                              disabled = { isSubmitting || disabled }
                              fullWidth = { true }
                              loading = { isSubmitting }
                              startIcon = { <FontAwesomeIcon icon = { faPenToSquare } /> }
                              type = "submit"
                              variant = "contained"
                           >
                              Submit
                           </Button>
                        </Stack>
                     </Stack>
                  </form>
               </Box>
            </ModalSection>
         </Modal>
      </Box>
   );
}

export default function AccountHistoryView({ account, disabled }: { account: Account, disabled: boolean }) {
   // Format history data for the graph component
   const historyData = useMemo(() => {
      return {
         [account.name]: account.history.map((historyItem) => ({
            value: historyItem.balance.toString(),
            date: historyItem.last_updated.split("T")[0]
         }))
      };
   }, [account.name, account.history]);

   return (
      <Box>
         <Stack
            direction = "column"
            sx = { { mt: 1, pt: 1, px: 1 } }
         >
            <Graph
               average = { false }
               card = { false }
               data = { historyData }
               defaultOption = { account.name }
               indicators = { false }
               title = "Accounts"
            />
            <HistoryModal
               account = { account }
               disabled = { disabled }
            />
         </Stack>
      </Box>
   );
}