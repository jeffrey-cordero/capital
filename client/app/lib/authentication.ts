import { sendApiRequest } from "@/lib/server";

export async function getAuthentication(): Promise<boolean> {
   return (await sendApiRequest("authentication", "GET", null))?.data.authenticated;
};

export async function clearAuthentication(): Promise<void> {
   await sendApiRequest("authentication/logout", "POST", null);
};