import { faClockRotateLeft, faCloudArrowUp } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Box, Button, Chip, Divider, FormControl, FormHelperText, InputLabel, NativeSelect, OutlinedInput, Stack, TextField } from "@mui/material";
import { type Account, type AccountHistory, accountHistorySchema } from "capital-types/accounts";
import React, { useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router";

import Graph from "@/components/global/graph";
import { sendApiRequest } from "@/lib/api";
import { constructDate, months, years } from "@/lib/dates";
import { handleValidationErrors } from "@/lib/validation";
import { updateAccount } from "@/redux/slices/accounts";
import Modal from "@/components/global/modal";

const [minDate, maxDate] = [
   new Date("1800-01-01").toISOString().split("T")[0],
   new Date().toISOString().split("T")[0]
];

function HistoryModal({ account, disabled }: { account: Account, disabled: boolean }) {
   const dispatch = useDispatch(), navigate = useNavigate();
   const {
      watch,
      control,
      setError,
      handleSubmit,
      reset,
      formState: { isSubmitting, errors }
   } = useForm();
   const { month, year } = {
      month: watch("month", months[new Date().getMonth()]),
      year: watch("year", years[years.length - 1]),
   }
   const [open, setOpen] = useState<boolean>(false);

   const onSubmit = async (data: any) => {
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

                  if (!found && update.getTime() >= current.getTime()) {
                     // Insert the new history record
                     history.push({
                        balance: data.balance,
                        last_updated: update.toISOString()
                     });

                     // Insert the old non-updating record for different date
                     if (update.getTime() !== current.getTime()) {
                        history.push(record);
                     }

                     found = true;
                  } else {
                     // Insert the old history record
                     history.push(record);
                  }

                  return history;
               }, []);

               // Insert new oldest history record
               if (!found) {
                  newHistory.push({
                     balance: data.balance,
                     last_updated: update.toISOString()
                  });
               }

               // Submit history updates with a potential current balance update
               const today = new Date();
               today.setHours(0, 0, 0, 0);

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

   const filteredHistory = account.history.reduce<React.ReactNode[]>((acc, history) => {
      const parts = history.last_updated.split("-");
      if (Number(parts[0]) === year && months[Number(parts[1]) - 1] === month) {
        acc.push(
         <p key = {account.account_id + history.last_updated}>
            { history.last_updated } - { history.balance }
         </p>
      );
      }
      return acc;
    }, []);    

   return (
      <Box>
         <Button
            className="btn-primary"
            color="primary"
            disabled={isSubmitting || disabled}
            fullWidth={true}
            loading={isSubmitting}
            onClick={() => setOpen(true)}
            startIcon={<FontAwesomeIcon icon={faClockRotateLeft} />}
            type="button"
            variant="contained"
         >
            History
         </Button>
         <Modal onClose={() => setOpen(false)}
            open={open}
            sx={{ width: { xs: "85%", md: "65%", lg: "55%" }, maxWidth: "85%", p: 4 }}>
            <form onSubmit={handleSubmit(onSubmit)}>
               <Stack
                  direction="column"
                  spacing={2}
               >
                  <Stack direction="row" spacing={1}>
                     <Controller
                        control={control}
                        name="month"
                        render={
                           ({ field }) => (
                              <FormControl>
                                 <InputLabel
                                    htmlFor="month"
                                    variant="standard"
                                 >
                                    Month
                                 </InputLabel>
                                 <NativeSelect
                                    {...field}
                                    id="month"
                                    value={month}
                                 >
                                    {
                                       Object.values(months).map((month) => {
                                          return (
                                             <option key={month} value={month}>
                                                {month}
                                             </option>
                                          );
                                       })
                                    }
                                 </NativeSelect>
                              </FormControl>
                           )
                        }
                     />
                     <Controller
                        control={control}
                        name="year"
                        render={
                           ({ field }) => (
                              <FormControl>
                                 <InputLabel
                                    htmlFor="year"
                                    variant="standard"
                                 >
                                    Year
                                 </InputLabel>
                                 <NativeSelect
                                    {...field}
                                    id="year"
                                    value={year}
                                 >
                                    {
                                       years.map((year) => {
                                          return (
                                             <option key={year} value={year}>
                                                {year}
                                             </option>
                                          )
                                       })
                                    }
                                 </NativeSelect>
                              </FormControl>
                           )
                        }
                     />
                     { filteredHistory }
                  </Stack>
                  <Stack direction="column" spacing={2}>
                     <Controller
                        control={control}
                        name="balance"
                        render={
                           ({ field }) => (
                              <FormControl error={Boolean(errors.balance)}>
                                 <InputLabel htmlFor="history-balance">
                                    Balance
                                 </InputLabel>
                                 <OutlinedInput
                                    {...field}
                                    aria-label="Balance"
                                    disabled={isSubmitting || disabled}
                                    fullWidth={true}
                                    id="history-balance"
                                    label="Balance"
                                    type="number"
                                    value={field.value || ""}
                                 />
                                 {
                                    errors.balance && (
                                       <FormHelperText>
                                          {errors.balance?.message?.toString()}
                                       </FormHelperText>
                                    )
                                 }
                              </FormControl>
                           )
                        }
                     />
                     <Controller
                        control={control}
                        name="last_updated"
                        render={
                           ({ field }) => (
                              <FormControl error={Boolean(errors.last_updated)}>
                                 <TextField
                                    {...field}
                                    color={errors.last_updated ? "error" : "info"}
                                    disabled={isSubmitting || disabled}
                                    error={Boolean(errors.last_updated)}
                                    fullWidth={true}
                                    id="balance-date"
                                    label="Date"
                                    size="small"
                                    slotProps={
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
                                    type="date"
                                 />
                                 {
                                    errors.last_updated && (
                                       <FormHelperText>
                                          {errors.last_updated?.message?.toString()}
                                       </FormHelperText>
                                    )
                                 }
                              </FormControl>
                           )
                        }
                     />
                     <Button
                        className="btn-primary"
                        color="primary"
                        disabled={isSubmitting || disabled}
                        fullWidth={true}
                        loading={isSubmitting}
                        startIcon={<FontAwesomeIcon icon={faCloudArrowUp} />}
                        type="submit"
                        variant="contained"
                     >
                        Submit
                     </Button>
                  </Stack>
               </Stack>
            </form>
         </Modal>
      </Box>
   )
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
               label="Analytics"
            />
         </Divider>
         <Stack
            direction="column"
            spacing = {1}
            sx={{ mt: 1, px: 1 }}
         >
            <Graph
               card={false}
               data={historyData}
               defaultOption={account.name}
               indicators={false}
               title="Accounts"
            />
            <HistoryModal
               account={account}
               disabled={disabled}
            />
         </Stack>
      </Box>
   );
}