import { sendApiRequest } from "@/lib/server";

export async function fetchAuthentication(): Promise<boolean> {
   return (await sendApiRequest("authentication", "GET", null))?.data.authenticated;
};

export async function clearAuthentication(): Promise<void> {
   await sendApiRequest("authentication/logout", "POST", null);
};