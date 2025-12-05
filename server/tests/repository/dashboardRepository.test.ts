import { Economy } from "capital/economy";
import { createMockEconomyData } from "capital/mocks/economy";

import {
   arrangeMockQuery,
   arrangeMockQueryError,
   arrangeMockTransactionFlow,
   assertObjectProperties,
   assertQueryCalledWithKeyPhrases,
   assertQueryResult,
   assertRepositoryThrows,
   assertTransactionResult,
   assertTransactionRollback,
   createMockClient,
   createMockPool,
   MockClient,
   MockPool,
   resetDatabaseMocks
} from "@/tests/utils/repositories";

/**
 * Global mock pool for the instance database connection
 */
const globalMockPool: MockPool = createMockPool();

jest.mock("pg", () => ({
   Pool: jest.fn(() => globalMockPool)
}));

import * as dashboardRepository from "@/repository/dashboardRepository";

describe("Dashboard Repository", () => {
   let mockPool: MockPool;
   let mockClient: MockClient;

   beforeEach(async() => {
      mockPool = createMockPool();
      mockClient = createMockClient();
      resetDatabaseMocks(globalMockPool, mockPool, mockClient);
   });

   describe("getEconomicData", () => {
      /**
       * Asserts the economic data fetch query structure
       */
      const assertGetEconomicDataStructure = (): void => {
         assertQueryCalledWithKeyPhrases(["SELECT *", "FROM economy", "LIMIT 1"], [], 0, mockPool);
      };

      it("should return economy data when record exists", async() => {
         const mockTime: string = new Date().toISOString();
         const mockEconomy: Economy = createMockEconomyData();
         const mockResult = { time: mockTime, data: mockEconomy };
         arrangeMockQuery([mockResult], mockPool);

         const result = await dashboardRepository.getEconomicData();

         assertGetEconomicDataStructure();
         assertQueryResult(result, mockResult);
         assertObjectProperties(result!, ["time", "data"]);
         assertObjectProperties(result!.data, ["news", "trends"]);
      });

      it("should return null when table is empty", async() => {
         arrangeMockQuery([], mockPool);

         const result = await dashboardRepository.getEconomicData();

         assertGetEconomicDataStructure();
         assertQueryResult(result, null);
      });

      it("should throw error on database failure", async() => {
         arrangeMockQueryError("Database connection failed", mockPool);

         await assertRepositoryThrows(
            () => dashboardRepository.getEconomicData(),
            "Database connection failed"
         );
         assertGetEconomicDataStructure();
      });
   });

   describe("updateEconomicData", () => {
      let time: Date;
      let data: string;

      beforeEach(() => {
         time = new Date();
         data = JSON.stringify(createMockEconomyData());
      });

      /**
       * Arranges transaction flow for successful economic data update
       */
      const arrangeUpdateEconomicDataTransactionSuccess = (): void => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            {}, // DELETE
            {}  // INSERT
         ]);
      };

      /**
       * Asserts the economic data deletion query structure
       */
      const assertDeleteEconomicDataStructure = (): void => {
         assertQueryCalledWithKeyPhrases(["DELETE FROM economy"], [], 1, mockPool);
      };

      /**
       * Asserts the economic data insertion query structure and parameters
       *
       * @param {Date} time - Expected time parameter
       * @param {string} data - Expected data parameter
       */
      const assertInsertEconomicDataStructure = (time: Date, data: string): void => {
         assertQueryCalledWithKeyPhrases(
            ["INSERT INTO economy", "(time, data)", "VALUES", "($1, $2)"],
            [time, data],
            2,
            mockPool
         );
      };

      it("should successfully complete the entire economic data update transaction", async() => {
         arrangeUpdateEconomicDataTransactionSuccess();

         await dashboardRepository.updateEconomicData(time, data);

         assertDeleteEconomicDataStructure();
         assertInsertEconomicDataStructure(time, data);
         assertTransactionResult(undefined, undefined, mockClient, 2);
      });

      it("should throw error when the economic data update transaction BEGIN fails", async() => {
         arrangeMockTransactionFlow(mockClient.query, [new Error("BEGIN failed")]);

         await assertRepositoryThrows(
            () => dashboardRepository.updateEconomicData(time, data),
            "BEGIN failed"
         );
         assertTransactionRollback(mockClient, 0);
      });

      it("should rollback the economic data update transaction when DELETE fails", async() => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            new Error("DELETE failed")
         ]);

         await assertRepositoryThrows(
            () => dashboardRepository.updateEconomicData(time, data),
            "DELETE failed"
         );
         assertTransactionRollback(mockClient, 1);
      });

      it("should rollback the economic data update transaction when INSERT fails", async() => {
         arrangeMockTransactionFlow(mockClient.query, [
            {}, // BEGIN
            {}, // DELETE
            new Error("INSERT failed")
         ]);

         await assertRepositoryThrows(
            () => dashboardRepository.updateEconomicData(time, data),
            "INSERT failed"
         );
         assertTransactionRollback(mockClient, 2);
      });
   });
});