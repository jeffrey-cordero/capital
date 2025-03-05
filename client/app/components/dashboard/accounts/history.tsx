import { faCalendarDay, faCalendarDays, faCaretDown, faClockRotateLeft, faPenToSquare, faTrashCan } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Chip, Collapse, Divider, FormControl, FormHelperText, InputLabel, List, ListItemButton, ListItemIcon, ListItemText, OutlinedInput, Stack, TextField, useTheme } from "@mui/material";
import { type Account, type AccountHistory, accountHistorySchema } from "capital/accounts";
import { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";
import { z } from "zod";

import { Expand } from "@/components/global/expand";
import Graph from "@/components/global/graph";
import Modal from "@/components/global/modal";
import { sendApiRequest } from "@/lib/api";
import { constructDate } from "@/lib/dates";
import { displayCurrency, displayDate } from "@/lib/display";
import { handleValidationErrors } from "@/lib/validation";
import { updateAccount } from "@/redux/slices/accounts";
import { addNotification } from "@/redux/slices/notifications";

const [minDate, maxDate] = [
   new Date("1800-01-01").toISOString().split("T")[0],
   new Date().toISOString().split("T")[0]
];

const accountHistoryUpdateSchema = z.object({
   history_balance: accountHistorySchema.shape.balance,
   last_updated: accountHistorySchema.shape.last_updated
});

interface HistoryEditsProps {
   account: Account;
   month: string;
   history: AccountHistory[];
}

function HistoryEdits({ account, month, history }: HistoryEditsProps) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const [expanded, setExpanded] = useState<boolean>(false);

   const deleteAccountHistory = async(last_updated: string) => {
      try {
         const removal = { last_updated: last_updated };
         const result = await sendApiRequest(
            `dashboard/accounts/${account.account_id}`, "DELETE", { last_updated }, dispatch, navigate
         );

         if (result === 204) {
            dispatch(updateAccount({
               account: {
                  ...account,
                  history: account.history.filter((history) => history.last_updated !== removal.last_updated)
               }
            }));
         } else {
            if (account.history.length === 1) {
               // All accounts must have at least one history record
               dispatch(addNotification({
                  type: "Error",
                  message: "At least one history record must remain for this account"
               }));
            } else {
               // Mismatches between local and server state
               dispatch(addNotification({
                  type: "Error",
                  message: "There was an error removing your record. Please try again later."
               }));
            }
         }
      } catch (error) {
         console.error(error);
      }
   };

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
                  history.map((history) => {
                     return (
                        <ListItemButton
                           disableRipple = { true }
                           disableTouchRipple = { true }
                           key = { account.account_id + history.last_updated }
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
                              primary = { displayCurrency(history.balance) }
                              secondary = { displayDate(history.last_updated) }
                              sx = { { userSelect: "text", cursor: "text" } }
                           />
                           <FontAwesomeIcon
                              color = "hsl(0, 90%, 50%)"
                              fontSize = "15px"
                              icon = { faTrashCan }
                              onClick = { () => deleteAccountHistory(history.last_updated) }
                              style = { { cursor: "pointer" } }
                           />
                        </ListItemButton>
                     );
                  })
               }
            </List>
         </Collapse>
      </Stack>
   );
}

function HistoryModal({ account, disabled }: { account: Account, disabled: boolean }) {
   const dispatch = useDispatch(), navigate = useNavigate(), theme = useTheme();
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors }
   } = useForm();
   const [open, setOpen] = useState<boolean>(false);

   const history = useMemo(() => {
      return account.history.reduce((acc: Record<string, AccountHistory[]>, record) => {
         const parts = record.last_updated.split("-");
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
               last_updated: constructDate(data.last_updated)
            };
            const result = await sendApiRequest(
               `dashboard/accounts/${account.account_id}`, "POST", update, dispatch, navigate
            );

            if (result === 204) {
               dispatch(updateAccount({
                  account: account,
                  history: {
                     balance: update.balance,
                     last_updated: update.last_updated.toISOString()
                  }
               }));

               // Reset the history form for future submissions
               reset({
                  balance: "",
                  last_updated: ""
               });
            }
         }
      } catch (error) {
         console.error(error);
      }
   };

   return (
      <Box>
         <Button
            className = "btn-primary"
            color = "primary"
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
            onClose = { () => setOpen(false) }
            open = { open }
            sx = { { width: { xs: "85%", md: "65%", lg: "50%" }, maxWidth: "85%", p: 3, maxHeight: "80%" } }
         >
            <form onSubmit = { handleSubmit(onSubmit) }>
               <Stack
                  direction = "column"
                  spacing = { 2 }
                  sx = { { mt : 0 } }
               >
                  <Divider>
                     <Chip
                        color = "success"
                        label = "History"
                     />
                  </Divider>
                  {
                     Object.keys(history).map((month) => {
                        return (
                           <HistoryEdits
                              account = { account }
                              history = { history[month] }
                              key = { account.account_id + month }
                              month = { month }
                           />
                        );
                     })
                  }
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
         </Modal>
      </Box>
   );
}

export default function AccountHistoryView({ account, disabled }: { account: Account, disabled: boolean }) {
   const historyData = useMemo(() => {
      return {
         [account.name]: account.history.map((history) => {
            return {
               value: history.balance.toString(),
               date: history.last_updated.split("T")[0]
            };
         })
      };
   }, [account.name, account.history]);

   return (
      <Box>
         <Divider>
            <Chip
               color = "success"
               label = "Analytics"
            />
         </Divider>
         <Stack
            direction = "column"
            sx = { { mt: 1, px: 1 } }
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