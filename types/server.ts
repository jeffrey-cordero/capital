export type ServerResponse = {
   status: number;
   message: string;
   data?: any;
   errors?: Record<string, string>;
};