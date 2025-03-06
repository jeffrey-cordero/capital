export type ServerResponse = {
   code: number;
   message: string;
   data?: any;
   errors?: Record<string, string>;
};