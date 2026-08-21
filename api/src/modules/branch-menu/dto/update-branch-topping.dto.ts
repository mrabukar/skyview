import { IsBoolean } from "class-validator";

export class UpdateBranchToppingDto {
  /** Whether this topping is currently in stock at the branch. */
  @IsBoolean()
  isInStock!: boolean;
}
