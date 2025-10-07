/**
 * Tests for indexRouter health check endpoint
 */

import { HTTP_STATUS } from "capital/server";
import express from "express";
import request from "supertest";

import indexRouter from "@/routers/indexRouter";

const app = express();
app.use("/", indexRouter);

describe("Index Router", () => {
   describe("GET /", () => {
      it("should return healthy status", async() => {
         const response = await request(app)
            .get("/")
            .expect(HTTP_STATUS.OK);

         expect(response.body).toEqual({
            code: HTTP_STATUS.OK,
            data: "Healthy REST API"
         });
      });

      it("should return JSON response", async() => {
         const response = await request(app)
            .get("/")
            .expect("Content-Type", /json/);

         expect(response.body).toHaveProperty("code");
         expect(response.body).toHaveProperty("data");
      });
   });
});