import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { DiscountType } from "@prisma/client";

export class CreateOrderLineDto {
  /** The specific size variant being ordered. */
  @IsString()
  @IsNotEmpty()
  menuItemSizeId!: string;

  /** Quantity of this size. Must be >= 1. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  /** Zero or more topping IDs to add to this line. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  toppingIds?: string[];
}

export class CreatePosOrderDto {
  /** At least one line is required (BR-POS-6.4). */
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateOrderLineDto)
  lines!: CreateOrderLineDto[];

  /**
   * Discount type. Both discountType and discountValue must be provided
   * together; omit both for no discount.
   */
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  /**
   * Discount value: a percentage (0–100) or a fixed KSh amount.
   * Validated against the cashier's maxDiscountPercent (BR-POS-7.4).
   */
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  discountValue?: number;
}
