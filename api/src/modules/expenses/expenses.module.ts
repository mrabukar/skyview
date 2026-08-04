import { Module } from "@nestjs/common";
import { ExpenseCategoriesModule } from "../expense-categories/expense-categories.module";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";

@Module({
  imports: [ExpenseCategoriesModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
