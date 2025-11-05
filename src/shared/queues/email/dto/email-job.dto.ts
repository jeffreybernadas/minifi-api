import { IsEmail, IsNotEmpty, IsString, IsOptional } from 'class-validator';

/**
 * DTO for sending email job
 * Used when publishing email tasks to RabbitMQ queue
 */
export class SendEmailJobDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsString()
  @IsNotEmpty()
  html: string;

  @IsString()
  @IsOptional()
  from?: string;
}
