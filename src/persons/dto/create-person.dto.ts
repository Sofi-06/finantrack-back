import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreatePersonDto {
  @ApiProperty({ example: 'Sofia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;
}
