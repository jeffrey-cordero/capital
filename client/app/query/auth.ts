import { SERVER_URL } from "@/root";

export async function validateToken(): Promise<boolean> {
   try {
      // Fetch the authentication status from the server
      const response = await fetch(`${SERVER_URL}/auth`, {
         method: "GET"
      });

      if (response.ok) {
         return true;
      } else {
         return false;
      }
   } catch (error) {
      console.error(error);
      throw error;
   }
};