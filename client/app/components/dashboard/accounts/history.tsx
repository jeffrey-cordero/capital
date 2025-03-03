import { faClockRotateLeft } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Chip, Divider, FormControl, FormHelperText, InputLabel, OutlinedInput, Stack, TextField } from "@mui/material";
import { type Account, type AccountHistory, accountHistorySchema } from "capital-types/accounts";
import { useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import { sendApiRequest } from "@/lib/api";
import { constructDate } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateAccount } from "@/redux/slices/accounts";

export default function AccountHistoryView({ account, disabled }: { account: Account, disabled: boolean }) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const {
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors }
   } = useForm();

   const [minDate, maxDate] = useMemo(() => {
      return [
         new Date("1800-01-01").toISOString().split("T")[0],
         new Date().toISOString().split("T")[0]
      ];
   }, []);

   const onSubmit = async(data: any) => {
      try {
         const fields = accountHistorySchema.safeParse(data);

         if (!fields.success) {
            handleValidationErrors(fields, setError);
         } else {
            const result = await sendApiRequest(
               `dashboard/accounts/${account.account_id}`, "POST", data, dispatch, navigate
            );

            if (result === 204) {
               let found: boolean = false;
               const update = constructDate(data.last_updated);

               const newHistory = account.history.reduce((history: AccountHistory[], record) => {
                  const current = new Date(record.last_updated);

                  if (update.getTime() >= current.getTime()) {
                     // Insert new history record
                     history.push({
                        balance: data.balance,
                        last_updated: update.toISOString()
                     });

                     found = true;
                  } else {
                     // Insert old history record
                     history.push(record);
                  }

                  return history;
               }, []);

               if (!found) {
                  newHistory.push({
                     balance: data.balance,
                     last_updated: update.toISOString()
                  });
               }

               // Submit history updates with a potential current balance update
               const today = new Date(new Date().toISOString().split('T')[0]);

               dispatch(updateAccount({
                  ...account,
                  balance: update.getTime() === today.getTime() ? data.balance : account.balance,
                  history: newHistory
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
         <Divider>
            <Chip
               label = "History"
            />
         </Divider>
         <Stack
            direction = "column"
            spacing = { 2 }
            sx = { { mt: 1 } }
         >
            <Box>
               {
                  account.history.map((history) =>
                     <p key = { `${account.account_id}-${history.last_updated}` }>
                        { history.balance } - { new Date(history.last_updated).toLocaleDateString() }
                     </p>
                  )
               }
            </Box>
            <form onSubmit = { handleSubmit(onSubmit) }>
               <Stack
                  direction = "column"
                  spacing = { 2 }
               >

                  <Controller
                     control = { control }
                     name = "balance"
                     render = {
                        ({ field }) => (
                           <FormControl error = { Boolean(errors.balance) }>
                              <InputLabel htmlFor = "history-balance">
                                 Balance
                              </InputLabel>
                              <OutlinedInput
                                 { ...field }
                                 aria-label = "Balance"
                                 autoFocus = { true }
                                 disabled = { isSubmitting || disabled }
                                 fullWidth = { true }
                                 id = "history-balance"
                                 label = "Balance"
                                 type = "number"
                                 value = { field.value || "" }
                              />
                              {
                                 errors.balance && (
                                    <FormHelperText>
                                       { errors.balance?.message?.toString() }
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
                                 type = "date"
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
                     color = "primary"
                     disabled = { isSubmitting || disabled }
                     fullWidth = { true }
                     loading = { isSubmitting }
                     startIcon = { <FontAwesomeIcon icon = { faClockRotateLeft } /> }
                     type = "submit"
                     variant = "contained"
                  >
                     Submit
                  </Button>
               </Stack>
            </form>
         </Stack>
      </Box>
   );
}