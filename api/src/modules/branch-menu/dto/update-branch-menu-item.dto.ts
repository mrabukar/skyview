import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class PricePatchDto {
  @IsString()
  @IsNotEmpty()
  sizeId!: string;

  /**
   * Branch price override in KSh. Pass null to revert the size to base price
   * (removes the BranchMenuItemPrice row).
   */
  @ValidateIf((o: PricePatchDto) => o.price !== null)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  price!: number | null;
}

export class UpdateBranchMenuItemDto {
  /** Admin/manager only: whether this branch carries the item at all. */
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  /** Admin, manager, or cashier: is the item physically available right now? */
  @IsOptional()
  @IsBoolean()
  isInStock?: boolean;

  /**
   * Admin/manager only: per-size price overrides.
   * Sizes omitted from the array are left untouched.
   * Pass price: null for a size to revert it to the catalogue base price.
   */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricePatchDto)
  prices?: PricePatchDto[];
}
