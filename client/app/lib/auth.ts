import { SERVER_URL } from "@/client/app/root";

export async function fetchAuthentication(): Promise<boolean> {
   try {
      // Fetch the authentication status from the server
      const response = await fetch(`${SERVER_URL}/auth`, {
         method: "GET",
         headers: {
            "Content-Type": "application/json"
         },
         credentials: "include"
      });

      const parsed = await response.json();

      if (parsed.data.authenticated) {
         return true;
      } else {
         return false;
      }
   } catch (error) {
      console.error(error);

      return false;
   }
};

export async function clearAuthentication(): Promise<void> {
   try {
      const response = await fetch(`${SERVER_URL}/auth/logout`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json"
         },
         credentials: "include"
      });

      if (!response.ok) {
         throw new Error("Failed to logout");
      }
   } catch (error) {
      console.error(error);

      throw error;
   }
};